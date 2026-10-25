import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse, parseFragment, serialize, type DefaultTreeAdapterMap } from 'parse5'

type Element = DefaultTreeAdapterMap['element']
const attr = (node: Element, name: string) => node.attrs.find(item => item.name === name)?.value || ''
const text = (node: Element) => node.childNodes.map(child => 'value' in child ? child.value : '').join('')
const marker = 'aos-2.3.4'
let aos: { js: string; css: string } | undefined

// Chỉ nhận đúng đường dẫn AOS 2.x. Không tải hoặc thực thi mã CDN trên máy chủ.
export function isAosAsset(value: string, extension: 'js' | 'css') {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return false
    if (url.hostname === 'unpkg.com') return new RegExp(`^/aos(?:@2\\.\\d+\\.\\d+)?/dist/aos\\.${extension}$`).test(url.pathname)
    if (url.hostname === 'cdn.jsdelivr.net') return new RegExp(`^/npm/aos(?:@2\\.\\d+\\.\\d+)?/dist/aos\\.${extension}$`).test(url.pathname)
    return url.hostname === 'cdnjs.cloudflare.com' && new RegExp(`^/ajax/libs/aos/2\\.\\d+\\.\\d+/aos\\.${extension}$`).test(url.pathname)
  } catch { return false }
}

/** Gộp thư viện đã ghim phiên bản từ dependency; ảnh và script ngoài khác giữ chính sách cũ. */
export function bundleCourseLibraries(html: string) {
  if (!/\bAOS\s*\.|data-aos|data-course-library/i.test(html)) return { html, warnings: [] as string[] }
  const doc = parse(html), nodes: Element[] = []
  const visit = (node: DefaultTreeAdapterMap['node']) => {
    if ('tagName' in node) nodes.push(node)
    if ('childNodes' in node) node.childNodes.forEach(visit)
  }
  visit(doc)
  const scripts = nodes.filter(node => node.tagName === 'script')
  const loaders = scripts.filter(node => isAosAsset(attr(node, 'src'), 'js') || attr(node, 'data-course-library') === marker)
  const calls = scripts.filter(node => !attr(node, 'src') && /\bAOS\s*\.\s*(?:init|refresh)/.test(text(node)))
  const styles = nodes.filter(node => node.tagName === 'link' && isAosAsset(attr(node, 'href'), 'css') || node.tagName === 'style' && attr(node, 'data-course-library-style') === marker)
  if (!loaders.length && !(styles.length && calls.length)) return { html, warnings: [] as string[] }
  if (!aos) {
    const license = readFileSync(join(process.cwd(), 'node_modules/aos/LICENSE'), 'utf8')
    aos = {
      js: `/*! AOS 2.3.4\n${license}\n*/\n` + readFileSync(join(process.cwd(), 'node_modules/aos/dist/aos.js'), 'utf8').replace(/\/\/# sourceMappingURL=.*$/gm, ''),
      css: readFileSync(join(process.cwd(), 'node_modules/aos/dist/aos.css'), 'utf8'),
    }
  }
  const remove = (node: Element) => { if (node.parentNode) node.parentNode.childNodes = node.parentNode.childNodes.filter(child => child !== node) }
  // Chèn đúng trước script khởi tạo, kể cả nguồn cũ đã bị loại mất CDN loader.
  const anchor = loaders[0] || calls[0]
  const parent = anchor.parentNode!
  const script = parseFragment(`<script data-course-library="${marker}">${aos.js.replace(/<\/script/gi, '<\\/script')}</script>`).childNodes[0]
  script.parentNode = parent
  parent.childNodes.splice(parent.childNodes.indexOf(anchor), 0, script)
  loaders.forEach(remove); styles.forEach(remove)
  const head = nodes.find(node => node.tagName === 'head')!
  const style = parseFragment(`<style data-course-library-style="${marker}">${aos.css.replace(/<\/style/gi, '<\\/style')}</style>`).childNodes[0]
  style.parentNode = head; head.childNodes.unshift(style)
  return { html: '<!doctype html>\n' + serialize(doc), warnings: ['Đã đóng gói AOS để hiệu ứng cuộn chạy mà không cần tải script CDN.'] }
}
