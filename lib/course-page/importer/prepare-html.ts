import { parse as parseScript } from 'acorn'
import { parse, parseFragment, serialize } from 'parse5'
import postcss from 'postcss'
import tailwind from 'tailwindcss-importer'
import { BRIDGE } from './zip-browser'

const MAX_BYTES = 8 * 1024 * 1024

// Chỉ đọc dữ liệu tĩnh; tuyệt đối không chạy JavaScript do người nhập cung cấp.
function staticValue(node: any, depth = 0): any {
  if (depth > 30) throw new Error('Cấu hình Tailwind quá phức tạp.')
  if (node.type === 'Literal' && !node.regex) return node.value
  if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal' && typeof node.argument.value === 'number') return -node.argument.value
  if (node.type === 'ArrayExpression') return node.elements.map((item: any) => staticValue(item, depth + 1))
  if (node.type === 'ObjectExpression') {
    const value: Record<string, unknown> = Object.create(null)
    for (const property of node.properties) {
      if (property.type !== 'Property' || property.computed || property.method || property.kind !== 'init') throw new Error('Tailwind chỉ hỗ trợ cấu hình dữ liệu tĩnh, không hỗ trợ hàm hoặc spread.')
      const key = property.key.name ?? property.key.value
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Khóa cấu hình Tailwind không hợp lệ.')
      value[key] = staticValue(property.value, depth + 1)
    }
    return value
  }
  throw new Error('Tailwind có cấu hình động hoặc plugin chưa hỗ trợ. Hãy xuất CSS đã biên dịch trước khi nhập.')
}

export function readTailwindConfig(scripts: string[]): Record<string, any> {
  let config: Record<string, any> = {}
  for (const script of scripts) {
    if (!/tailwind\s*\.\s*config\s*=/.test(script)) continue
    const tree = parseScript(script, { ecmaVersion: 'latest' }) as any
    for (const statement of tree.body) {
      const assignment = statement.expression
      if (statement.type !== 'ExpressionStatement' || assignment?.type !== 'AssignmentExpression' || assignment.operator !== '=') continue
      const left = assignment.left
      if (left.type !== 'MemberExpression' || left.computed || left.object.name !== 'tailwind' || left.property.name !== 'config') continue
      config = staticValue(assignment.right)
    }
  }
  const allowed = ['theme', 'darkMode', 'prefix', 'important', 'separator', 'corePlugins', 'safelist']
  if (Object.keys(config).some(key => !allowed.includes(key))) throw new Error('Cấu hình Tailwind có plugin, nguồn file hoặc tùy chọn chưa hỗ trợ. Hãy xuất CSS đã biên dịch trước khi nhập.')
  return config
}

// parse5 xử lý HTML bằng parser thật, kể cả thuộc tính không có dấu nháy.
export async function prepareStandaloneHtml(html: string, sourceUrl?: string) {
  if (Buffer.byteLength(html, 'utf8') > MAX_BYTES) throw new Error('File HTML vượt quá giới hạn 8MB.')
  const doc = parse(html)
  const elements: any[] = []
  const visit = (node: any) => {
    if (node.tagName) elements.push(node)
    for (const child of node.childNodes || []) visit(child)
    if (node.content) visit(node.content)
  }
  visit(doc)
  const get = (node: any, name: string): string => node.attrs?.find((item: any) => item.name === name)?.value || ''
  const set = (node: any, name: string, value: string) => {
    const existing = node.attrs.find((item: any) => item.name === name)
    if (existing) existing.value = value
    else node.attrs.push({ name, value })
  }
  const remove = (node: any) => {
    const parent = node.parentNode
    if (parent?.childNodes) parent.childNodes = parent.childNodes.filter((child: any) => child !== node)
  }
  const text = (node: any) => (node.childNodes || []).map((child: any) => child.value || '').join('')
  const scripts = elements.filter(node => node.tagName === 'script')
  const sources = scripts.map(node => get(node, 'src'))
  if (sources.some(src => /@tailwindcss\/browser/.test(src))) throw new Error('Tailwind v4 qua browser CDN chưa được hỗ trợ. Hãy xuất CSS có sẵn trước khi nhập.')
  const hasTailwind = sources.some(src => {
    try { return new URL(src).hostname === 'cdn.tailwindcss.com' } catch { return false }
  })
  const warnings: string[] = []
  const missing = new Set<string>()
  const resolve = (value: string, required = false): string => {
    if (!value || value.startsWith('#') || /^(data:|https:)/i.test(value)) return value
    try {
      const url = new URL(value, sourceUrl)
      if (url.protocol === 'https:') return url.href
    } catch {}
    if (required) missing.add(value.slice(0, 120))
    return ''
  }
  const rewriteCss = (css: string) => {
    // Đơn vị vh phải theo màn hình cha, không theo chiều cao toàn bộ iframe.
    const styles = postcss.parse(css)
    styles.walkDecls(declaration => {
      declaration.value = declaration.value.replace(/(-?(?:\d*\.)?\d+)vh\b/gi,
        (_, value) => `calc(var(--mfc-viewport-height, 100vh) * ${Number(value) / 100})`)
    })
    return styles.toString().replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (all, quote, raw) => {
    const url = resolve(raw.trim(), true)
    return url ? `url("${url.replace(/"/g, '%22')}")` : 'none'
  }).replace(/@import\s+(?:url\()?\s*(['"])([^'"]+)\1\s*\)?([^;]*);/gi, (all, quote, raw, media) => {
    const url = resolve(raw.trim(), true)
    return url ? `@import url("${url}")${media};` : ''
  })
  }
  const head = elements.find(node => node.tagName === 'head')
  let compiledCss = ''
  if (hasTailwind) {
    const config = readTailwindConfig(scripts.map(text))
    const tailwindStyles = elements.filter(node => node.tagName === 'style' && get(node, 'type') === 'text/tailwindcss')
    const customCss = tailwindStyles.map(text).join('\n')
    if (/@(?:config|plugin|import)\b/i.test(customCss)) throw new Error('CSS Tailwind có phụ thuộc file/plugin. Hãy đóng gói CSS trước khi nhập.')
    compiledCss = (await postcss([tailwind({ ...config, content: [{ raw: html, extension: 'html' }], plugins: [] })])
      .process('@tailwind base;\n@tailwind components;\n@tailwind utilities;\n' + customCss, { from: undefined })).css
    tailwindStyles.forEach(remove)
    warnings.push('Tailwind đã được chuyển thành CSS trong trang; không cần script CDN để hiển thị.')
  }
  const structural = new Set(['header', 'section', 'footer', 'nav'])
  const keys = new Set<string>()
  let blockNumber = 0
  let removedScripts = 0
  for (const node of elements) {
    if (node.tagName === 'script') { remove(node); removedScripts++; continue }
    if (['iframe', 'object', 'embed', 'base'].includes(node.tagName) || (node.tagName === 'meta' && get(node, 'http-equiv'))) {
      remove(node)
      warnings.push('Thành phần nhúng hoặc chuyển hướng của trang nguồn đã bị loại; hãy kiểm tra bản xem trước.')
      continue
    }
    node.attrs = node.attrs.filter((item: any) => !/^on/i.test(item.name) && !['srcdoc', 'action', 'formaction', 'data-mfc-block'].includes(item.name))
    if (structural.has(node.tagName)) {
      let parent = node.parentNode
      while (parent && !structural.has(parent.tagName)) parent = parent.parentNode
      if (!parent) {
        const id = get(node, 'id')
        const key = id && !keys.has(id) ? id : `html-block-${++blockNumber}`
        keys.add(key)
        set(node, 'data-mfc-block', key)
      }
    }
    for (const attribute of node.attrs) {
      if (['src', 'poster', 'data-src', 'xlink:href'].includes(attribute.name)) attribute.value = resolve(attribute.value, true)
      if (attribute.name === 'href') {
        if (node.tagName === 'link') attribute.value = resolve(attribute.value, get(node, 'rel').includes('stylesheet'))
        else if (!/^(#|mailto:|tel:)/i.test(attribute.value)) attribute.value = resolve(attribute.value) || '#'
      }
      if (attribute.name === 'style') attribute.value = rewriteCss(attribute.value)
      if (attribute.name === 'srcset' && !attribute.value.startsWith('data:')) {
        attribute.value = attribute.value.split(',').map((part: string) => {
          const [url, ...descriptor] = part.trim().split(/\s+/)
          return [resolve(url, true), ...descriptor].join(' ')
        }).join(', ')
      }
    }
    if (node.tagName === 'style') node.childNodes = [{ nodeName: '#text', value: rewriteCss(text(node)), parentNode: node }]
    // Nội dung reveal phải đọc được dù thư viện hiệu ứng đã bị loại.
    if (/(?:gs_reveal|\breveal\b)/.test(get(node, 'class')) || get(node, 'data-aos')) {
      set(node, 'class', get(node, 'class').split(/\s+/).filter((name: string) => !['opacity-0', 'invisible'].includes(name)).join(' '))
      set(node, 'style', get(node, 'style') + ';opacity:1;visibility:visible;transform:none;')
    }
    if (node.tagName === 'link' && get(node, 'rel').includes('stylesheet') && get(node, 'href')) {
      warnings.push('Font/icon/CSS ngoài được giữ qua HTTPS và vẫn cần kết nối mạng.')
    }
  }
  if (missing.size) throw new Error(`Thiếu tài nguyên HTML: ${[...missing].slice(0, 5).join(', ')}. Hãy gửi ZIP kèm tài nguyên hoặc nhập URL nguồn HTTPS.`)
  if (removedScripts) warnings.push('Script nguồn và xử lý form nguồn đã bị loại. Hiệu ứng CSS được giữ; nút đăng ký dùng quy trình khóa học MFC. Hãy kiểm tra các tương tác khác trước khi lưu.')
  const menuButton = elements.find(node => get(node, 'id') === 'mobile-menu-btn')
  if (menuButton && elements.some(node => get(node, 'id') === 'mobile-menu')) {
    set(menuButton, 'data-mfc-menu', 'mobile-menu')
    set(menuButton, 'aria-controls', 'mobile-menu')
    set(menuButton, 'aria-expanded', 'false')
    set(menuButton, 'aria-label', 'Mở menu')
  }
  // CSS được đặt trước style gốc để giữ thứ tự ghi đè của thiết kế.
  const cssFragment = parseFragment(`<style data-mfc-compiled-tailwind>${rewriteCss(compiledCss).replace(/<\/style/gi, '<\\/style')}</style>`)
  for (const child of cssFragment.childNodes) (child as any).parentNode = head
  head.childNodes.unshift(...cssFragment.childNodes)
  const analysisHtml = serialize(doc)
  const bridgeFragment = parseFragment(BRIDGE + `<script data-mfc-html-menu>
addEventListener('message',function(e){if(e.source!==parent)return;var d=e.data||{};if(d.source==='mfc-zip-parent'&&d.type==='viewport'&&Number.isFinite(d.height)&&d.height>0&&d.height<10000){document.documentElement.style.setProperty('--mfc-viewport-height',d.height+'px');}});
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-mfc-menu]');if(!b)return;var m=document.getElementById(b.getAttribute('data-mfc-menu'));if(m){m.classList.toggle('hidden');b.setAttribute('aria-expanded',String(!m.classList.contains('hidden')));}});
</script>`)
  for (const child of bridgeFragment.childNodes) (child as any).parentNode = head
  head.childNodes.push(...bridgeFragment.childNodes)
  const preparedHtml = '<!doctype html>\n' + serialize(doc)
  if (Buffer.byteLength(preparedHtml, 'utf8') > MAX_BYTES) throw new Error('HTML sau đóng gói CSS vượt quá giới hạn 8MB.')
  return { html: preparedHtml, analysisHtml, warnings: [...new Set(warnings)] }
}
