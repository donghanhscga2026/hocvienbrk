import { z } from 'zod'
import { parse, serialize } from 'parse5'
import { BRIDGE } from './importer/zip-browser'
import { prepareYouTubeSlot, YOUTUBE_BRIDGE } from './youtube-embed'

export const sourceFileSchema = z.object({ path: z.string().min(1).max(200).regex(/^[\w@() .\/-]+$/).refine(path => !path.startsWith('/') && !path.split('/').some(part => !part || part === '.' || part === '..'), 'Đường dẫn file không hợp lệ.'), kind: z.enum(['html', 'css', 'js', 'asset']), content: z.string().max(8 * 1024 * 1024) }).strict()
export const templateSourceSchema = z.object({ entryPath: z.string().min(1).max(200), baseUrl: z.string().url().optional(), files: z.array(sourceFileSchema).min(1).max(200) }).strict().superRefine((source, ctx) => {
  if (new Set(source.files.map(file => file.path)).size !== source.files.length) ctx.addIssue({ code: 'custom', message: 'Có tên file trùng nhau.' })
  if (!source.files.some(file => file.path === source.entryPath && file.kind === 'html')) ctx.addIssue({ code: 'custom', message: 'Không tìm thấy file HTML chính.' })
  if (new TextEncoder().encode(JSON.stringify(source)).length > 8 * 1024 * 1024) ctx.addIssue({ code: 'custom', message: 'Mã nguồn vượt 8 MB. Hãy giảm ảnh nhúng hoặc số file.' })
  if (source.baseUrl && !source.baseUrl.startsWith('https://')) ctx.addIssue({ code: 'custom', message: 'URL nguồn phải dùng HTTPS.' })
  for (const file of source.files) if (file.kind === 'asset' && !/^data:(?:image\/(?:png|jpeg|webp|gif|avif|svg\+xml|x-icon)|font\/(?:woff2?|ttf|otf)|application\/(?:font-woff|octet-stream));base64,[A-Za-z0-9+/=\s]+$/.test(file.content)) ctx.addIssue({ code: 'custom', message: `Tài nguyên không hợp lệ: ${file.path}` })
})
export type TemplateSource = z.infer<typeof templateSourceSchema>
export type TemplateSourceFile = z.infer<typeof sourceFileSchema>
export const TEMPLATE_CSP = "default-src 'none'; img-src data: https:; style-src 'unsafe-inline' https:; font-src data: https:; script-src 'unsafe-inline' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"

// Cùng bộ đóng gói cho preview và bản lưu: không chạy mã nguồn trên máy chủ.
export function compileTemplateSource(raw: TemplateSource) {
  const source = templateSourceSchema.parse(raw), files = new Map(source.files.map(file => [file.path, file]))
  const warnings = new Set<string>()
  function resolve(base: string, ref: string): { file?: TemplateSourceFile; url?: string } {
    if (!ref || ref.startsWith('#')) return { url: ref }
    if (/^(data:|https:)/i.test(ref)) return { url: ref }
    if (/^[a-z]+:|^\/\//i.test(ref)) throw new Error(`Đường dẫn chưa được hỗ trợ: ${ref.slice(0, 80)}`)
    const path = decodeURIComponent(new URL(ref, `https://template.local/${base}`).pathname.slice(1))
    const file = files.get(path)
    if (file) return { file }
    if (source.baseUrl) return { url: new URL(ref, source.baseUrl).href }
    throw new Error(`Thiếu file ${path}. Hãy nhập ZIP kèm tài nguyên hoặc dùng URL ảnh/CSS HTTPS.`)
  }
  function css(text: string, base: string, chain: string[] = []): string {
    if (chain.includes(base) || chain.length > 8) throw new Error('CSS có vòng lặp @import.')
    text = text.replace(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?\s*;/gi, (all, ref) => {
      const value = resolve(base, ref)
      return value.file ? css(value.file.content, value.file.path, [...chain, base]) : `@import url("${value.url}");`
    })
    return text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (all, quote, ref) => { const value = resolve(base, ref.trim()); return `url("${(value.file?.content || value.url || '').replace(/"/g, '%22')}")` }).replace(/<\/style/gi, '<\\/style')
  }
  const doc = parse(files.get(source.entryPath)!.content) as any
  const nodes: any[] = []
  const visit = (node: any) => { if (node.tagName) nodes.push(node); for (const child of node.childNodes || []) visit(child); if (node.content) visit(node.content) }; visit(doc)
  const attr = (node: any, name: string) => node.attrs?.find((item: any) => item.name === name)?.value || ''
  const set = (node: any, name: string, value: string) => { const item = node.attrs.find((item: any) => item.name === name); if (item) item.value = value; else node.attrs.push({ name, value }) }
  const remove = (node: any) => { if (node.parentNode) node.parentNode.childNodes = node.parentNode.childNodes.filter((child: any) => child !== node) }
  const structural = new Set(['header', 'nav', 'section', 'footer']), keys = new Set<string>(); let index = 0
  for (const node of nodes) {
    if (prepareYouTubeSlot(node)) continue
    if (node.tagName === 'script' && node.attrs.some((item: any) => item.name === 'data-mfc-youtube-bridge')) { remove(node); continue }
    if (['iframe', 'object', 'embed', 'base'].includes(node.tagName) || node.tagName === 'meta' && attr(node, 'http-equiv')) { remove(node); continue }
    if (node.tagName === 'script' && (attr(node, 'data-mfc-zip-bridge') || node.attrs.some((item: any) => item.name === 'data-mfc-zip-bridge'))) { remove(node); continue }
    node.attrs = node.attrs.filter((item: any) => !['action', 'formaction', 'srcdoc', 'data-mfc-block'].includes(item.name))
    if (structural.has(node.tagName)) {
      let parent = node.parentNode; while (parent && !structural.has(parent.tagName)) parent = parent.parentNode
      if (!parent) { const id = attr(node, 'id'), key = id && !keys.has(id) ? id : `editor-block-${++index}`; keys.add(key); set(node, 'data-mfc-block', key) }
    }
    if (node.tagName === 'link' && attr(node, 'rel').includes('stylesheet')) {
      const resolved = resolve(source.entryPath, attr(node, 'href'))
      if (resolved.file) { node.tagName = node.nodeName = 'style'; node.attrs = [{ name: 'data-mfc-inlined-from', value: resolved.file.path }]; node.childNodes = [{ nodeName: '#text', value: css(resolved.file.content, resolved.file.path), parentNode: node }] }
      else set(node, 'href', resolved.url || '')
    } else if (node.tagName === 'style') { const text = (node.childNodes || []).map((child: any) => child.value || '').join(''); node.childNodes = [{ nodeName: '#text', value: css(text, source.entryPath), parentNode: node }] }
    if (node.tagName === 'script' && attr(node, 'src')) {
      const resolved = resolve(source.entryPath, attr(node, 'src'))
      if (!resolved.file || resolved.file.kind !== 'js') { warnings.add('Script ngoài không chạy trong preview. Dùng ZIP kèm JavaScript để giữ tương tác.'); remove(node); continue }
      node.attrs = node.attrs.filter((item: any) => item.name !== 'src'); set(node, 'data-mfc-inlined-from', resolved.file.path)
      node.childNodes = [{ nodeName: '#text', value: resolved.file.content.replace(/<\/script/gi, '<\\/script'), parentNode: node }]
      // Script defer mất ý nghĩa khi đổi sang inline: chạy sau nội dung HTML.
      if (node.attrs.some((item: any) => item.name === 'defer')) {
        const body = nodes.find(item => item.tagName === 'body')
        remove(node); node.parentNode = body; body.childNodes.push(node)
        node.attrs = node.attrs.filter((item: any) => item.name !== 'defer')
      }
      if (attr(node, 'type') === 'module' && /\b(?:import|export)\b/.test(resolved.file.content)) warnings.add('Module JavaScript có import phụ thuộc cần được đóng gói trước khi dùng.')
    }
    for (const item of node.attrs) {
      if (['src', 'poster', 'data-src'].includes(item.name) || node.tagName === 'link' && item.name === 'href' && !attr(node, 'rel').includes('stylesheet')) { const resolved = resolve(source.entryPath, item.value); item.value = resolved.file?.content || resolved.url || '' }
      if (item.name === 'srcset' && !item.value.startsWith('data:')) item.value = item.value.split(',').map((part: string) => { const [ref, ...rest] = part.trim().split(/\s+/), resolved = resolve(source.entryPath, ref); return [resolved.file?.content || resolved.url, ...rest].join(' ') }).join(', ')
      if (item.name === 'style') item.value = css(item.value, source.entryPath)
      if (item.name === 'href' && node.tagName === 'a' && !/^(#|https:|mailto:|tel:)/i.test(item.value)) item.value = '#'
    }
  }
  const head = nodes.find(node => node.tagName === 'head')
  const policy = parse(`<html><head><meta http-equiv="Content-Security-Policy" content="${TEMPLATE_CSP}">${BRIDGE}${YOUTUBE_BRIDGE}</head><body></body></html>`) as any
  const extras = policy.childNodes.find((node: any) => node.tagName === 'html').childNodes.find((node: any) => node.tagName === 'head').childNodes
  for (const node of extras) node.parentNode = head
  const analysisHtml = '<!doctype html>\n' + serialize(doc)
  head.childNodes.unshift(...extras)
  const html = '<!doctype html>\n' + serialize(doc)
  if (new TextEncoder().encode(html).length > 8 * 1024 * 1024) throw new Error('Trang đóng gói vượt 8 MB.')
  return { html, analysisHtml, warnings: [...warnings] }
}

// Mẫu cũ đã gộp CSS/JS: lấy lại ranh giới file nếu importer có lưu tên nguồn.
export function sourceFromHtml(html: string, selectedBlockKeys?: string[] | null): TemplateSource {
  const files: TemplateSourceFile[] = [{ path: 'index.html', kind: 'html', content: html }]
  const doc = parse(html) as any
  const visit = (node: any) => {
    // Bridge do hệ thống chèn lúc render không thuộc mã nguồn người dùng chỉnh.
    if (node.tagName === 'script' && node.attrs?.some((attr: any) => ['data-mfc-zip-bridge', 'data-mfc-youtube-bridge'].includes(attr.name))) {
      node.parentNode.childNodes = node.parentNode.childNodes.filter((child: any) => child !== node)
      return
    }
    const blockKey = node.attrs?.find((item: any) => item.name === 'data-mfc-block')?.value
    if (selectedBlockKeys && blockKey && !selectedBlockKeys.includes(blockKey)) {
      node.parentNode.childNodes = node.parentNode.childNodes.filter((child: any) => child !== node)
      return
    }
    const path = node.attrs?.find((item: any) => item.name === 'data-mfc-inlined-from')?.value
    if (path && /\.(css|m?js)$/i.test(path) && sourceFileSchema.shape.path.safeParse(path).success && !files.some(file => file.path === path) && ['style', 'script'].includes(node.tagName)) {
      const content = (node.childNodes || []).map((child: any) => child.value || '').join('')
      files.push({ path, kind: node.tagName === 'style' ? 'css' : 'js', content })
      if (node.tagName === 'style') { node.tagName = node.nodeName = 'link'; node.attrs = [{ name: 'rel', value: 'stylesheet' }, { name: 'href', value: path }] }
      else node.attrs = [...node.attrs.filter((item: any) => item.name !== 'data-mfc-inlined-from'), { name: 'src', value: path }]
      node.childNodes = []
    }
    for (const child of [...node.childNodes || []]) visit(child)
  }
  visit(doc); files[0].content = '<!doctype html>\n' + serialize(doc)
  return { entryPath: 'index.html', files }
}
