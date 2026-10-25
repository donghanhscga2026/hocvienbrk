import { parse, parseFragment, serialize, type DefaultTreeAdapterMap } from 'parse5'
import postcss from 'postcss'
import tailwind from 'tailwindcss-importer'
import { readTailwindConfig } from './importer/prepare-html'
import { compileCourseCode, CourseCodeError, needsTailwindPreparation } from './course-code'

type Element = DefaultTreeAdapterMap['element']
const attr = (node: Element, name: string) => node.attrs.find(item => item.name === name)?.value || ''
const text = (node: Element) => node.childNodes.map(child => 'value' in child ? child.value : '').join('')
const remove = (node: Element) => { if (node.parentNode) node.parentNode.childNodes = node.parentNode.childNodes.filter(child => child !== node) }

/** Dùng chung cho preview và lưu. Không tải CDN/ảnh, không chạy JS của mẫu trên server. */
export async function prepareCourseCode(html: string) {
  const validated = compileCourseCode(html)
  if (!needsTailwindPreparation(html)) return validated
  try {
    const doc = parse(html), elements: Element[] = []
    const visit = (node: DefaultTreeAdapterMap['node']) => {
      if ('tagName' in node) elements.push(node)
      if ('childNodes' in node) node.childNodes.forEach(visit)
    }
    visit(doc)
    const scripts = elements.filter(node => node.tagName === 'script')
    if (scripts.some(node => /@tailwindcss\/browser/.test(attr(node, 'src')))) throw new Error('Mẫu dùng Tailwind v4 browser chưa được hỗ trợ. Mẫu dùng cdn.tailwindcss.com được xử lý tự động.')
    const loaders = scripts.filter(node => {
      try { const url = new URL(attr(node, 'src')); return url.protocol === 'https:' && url.hostname === 'cdn.tailwindcss.com' && !url.username && !url.password } catch { return false }
    })
    const saved = scripts.filter(node => node.attrs.some(item => item.name === 'data-course-tailwind-config'))
    if (!loaders.length && !saved.length) return validated
    if (saved.length > 1) throw new Error('Mẫu có nhiều cấu hình Tailwind đã lưu.')
    const configScripts = scripts.filter(node => !attr(node, 'src') && /tailwind\s*\.\s*config\s*=/.test(text(node)))
    // Parser chỉ đọc literal/object/array; không eval, không nạp plugin hoặc file cấu hình.
    const config = readTailwindConfig(saved.length ? ['tailwind.config = ' + text(saved[0])] : configScripts.map(text))
    const styles = elements.filter(node => node.tagName === 'style' && attr(node, 'type') === 'text/tailwindcss')
    const inputCss = styles.map(text).join('\n')
    if (/@(?:config|plugin|import)\b/i.test(inputCss)) throw new Error('CSS Tailwind có phụ thuộc file hoặc plugin chưa được hỗ trợ.')
    const generated = elements.filter(node => node.tagName === 'style' && node.attrs.some(item => item.name === 'data-course-tailwind-css'))
    ;[...loaders, ...configScripts, ...saved, ...styles, ...generated].forEach(remove)
    // Quét cả JS nội bộ để giữ class được thêm khi cuộn/hover; không quét CSS đã sinh.
    const css = (await postcss([tailwind({ ...config, content: [{ raw: serialize(doc), extension: 'html' }], plugins: [] })])
      .process('@tailwind base;\n@tailwind components;\n@tailwind utilities;\n' + inputCss, { from: undefined })).css
    const head = elements.find(node => node.tagName === 'head')!
    const safeCss = (value: string) => value.replace(/<\/style/gi, '<\\/style')
    // Giữ cấu hình tĩnh để mở lại và thêm class mới mà không tích lũy nhiều bản CSS.
    const fragment = parseFragment(`<style data-course-tailwind-css>${safeCss(css)}</style><script type="application/json" data-course-tailwind-config>${JSON.stringify(config).replace(/</g, '\\u003c')}</script>${inputCss ? `<style type="text/tailwindcss" data-course-tailwind-input>${safeCss(inputCss)}</style>` : ''}`)
    for (const child of fragment.childNodes) child.parentNode = head
    head.childNodes.unshift(...fragment.childNodes)
    const compiled = compileCourseCode('<!doctype html>\n' + serialize(doc))
    return { ...compiled, warnings: [...new Set([...compiled.warnings, 'Đã tự xử lý Tailwind; giữ nguyên link ảnh ngoài, không tải ảnh về Storage.'])] }
  } catch (error) { throw error instanceof CourseCodeError ? error : new CourseCodeError(error instanceof Error ? error.message : 'Không xử lý được Tailwind.') }
}
