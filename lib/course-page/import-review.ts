import { parse, serialize, type DefaultTreeAdapterMap } from 'parse5'
import { isRegistrationAnchor } from './importer/registration'

// Lib thuần cho bước rà soát khi nhập trang bán: kiểm kê ảnh, gán sự kiện và
// duyệt khối. Chỉ dùng parse5 (không DOM, không fetch) nên chạy được cả ở
// client (wizard) lẫn server và trong test cách ly.

type ElementNode = DefaultTreeAdapterMap['element']
type AnyNode = DefaultTreeAdapterMap['node']

export type ImportImageItem = {
  id: string
  source: 'img' | 'css'
  currentUrl: string
  kind: 'url' | 'data'
  alt?: string
  summary?: string
  bytes?: number
}

export type ImportImageAssignment = { url: string; alt?: string }
export type ImportEventAction = 'register' | 'share' | 'scroll' | 'external' | 'course' | 'none'

export type ImportInteractiveItem = {
  id: string
  tag: string
  label: string
  href?: string
  suggestedAction: ImportEventAction
}

export type ImportEventAssignment = { action: ImportEventAction; href?: string; target?: string }

export type ImportBlockItem = { key: string; tag: string; heading?: string }

function walk(root: AnyNode, visit: (node: AnyNode) => void) {
  visit(root)
  if ('childNodes' in root) for (const child of [...root.childNodes]) walk(child, visit)
  const content = (root as unknown as { content?: AnyNode }).content
  if (content) walk(content, visit)
}

function elements(doc: AnyNode): ElementNode[] {
  const out: ElementNode[] = []
  walk(doc, node => { if ('tagName' in node) out.push(node) })
  return out
}

function attr(node: ElementNode, name: string): string | undefined {
  return node.attrs?.find(item => item.name === name)?.value
}

function setAttr(node: ElementNode, name: string, value: string) {
  const existing = node.attrs.find(item => item.name === name)
  if (existing) existing.value = value
  else node.attrs.push({ name, value })
}

function textOf(node: AnyNode): string {
  let out = ''
  walk(node, child => { if (child.nodeName === '#text' && 'value' in child) out += child.value + ' ' })
  return out.replace(/\s+/g, ' ').trim()
}

function dataUriInfo(value: string): { mime: string; bytes: number } {
  const match = value.match(/^data:([^;,]+)?(?:;[^,]*)?,([\s\S]*)$/)
  const mime = match?.[1] || 'application/octet-stream'
  const payload = match?.[2] || ''
  const bytes = /;base64/i.test(value.slice(0, value.indexOf(','))) ? Math.floor(payload.length * 3 / 4) : payload.length
  return { mime, bytes }
}

function isImageRef(value: string): boolean {
  if (value.startsWith('data:image/')) return true
  return /\.(?:png|jpe?g|webp|gif|avif|svg)(?:[?#]|$)/i.test(value)
}

function cssUrls(text: string): string[] {
  const out: string[] = []
  for (const match of text.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) {
    const value = match[2].trim()
    if (value && isImageRef(value)) out.push(value)
  }
  return out
}

function imageItemFromValue(id: string, source: 'img' | 'css', value: string, alt?: string): ImportImageItem {
  if (value.startsWith('data:')) {
    const info = dataUriInfo(value)
    return { id, source, kind: 'data', currentUrl: `data:${info.mime};base64,… (${info.bytes} bytes)`, summary: `data:${info.mime}`, bytes: info.bytes, alt }
  }
  return { id, source, kind: 'url', currentUrl: value, alt }
}

// Thứ tự duyệt dùng chung cho extract/apply: ảnh img theo thứ tự tài liệu,
// sau đó URL ảnh trong CSS — id ổn định giữa hai lần chạy trên cùng một HTML.
function collectImages(doc: AnyNode) {
  const nodes = elements(doc)
  const imgs: Array<{ node: ElementNode; value: string; fromSrcset: boolean }> = []
  for (const node of nodes) {
    if (node.tagName !== 'img') continue
    const src = attr(node, 'src') || ''
    const srcsetFirst = (attr(node, 'srcset') || '').split(',')[0]?.trim().split(/\s+/)[0] || ''
    const value = src || srcsetFirst
    if (value) imgs.push({ node, value, fromSrcset: !src && !!srcsetFirst })
  }
  const cssRefs: Array<{ owner: ElementNode; inStyleTag: boolean; value: string }> = []
  for (const node of nodes) {
    if (node.tagName === 'style') {
      const text = (node.childNodes || []).map(child => ('value' in child ? child.value : '')).join('')
      for (const value of cssUrls(text)) cssRefs.push({ owner: node, inStyleTag: true, value })
    }
    const styleAttr = attr(node, 'style')
    if (styleAttr) for (const value of cssUrls(styleAttr)) cssRefs.push({ owner: node, inStyleTag: false, value })
  }
  return { nodes, imgs, cssRefs }
}

export function extractImageInventory(html: string): ImportImageItem[] {
  const doc = parse(html)
  const { imgs, cssRefs } = collectImages(doc)
  const items: ImportImageItem[] = imgs.map((img, index) => imageItemFromValue(`img-${index + 1}`, 'img', img.value, attr(img.node, 'alt') || undefined))
  cssRefs.forEach((ref, index) => items.push(imageItemFromValue(`css-${index + 1}`, 'css', ref.value)))
  return items
}

export function applyImageMap(html: string, map: Record<string, ImportImageAssignment>): string {
  const doc = parse(html)
  const { nodes, imgs, cssRefs } = collectImages(doc)
  imgs.forEach((img, index) => {
    const assignment = map[`img-${index + 1}`]
    if (assignment?.url) {
      setAttr(img.node, 'src', assignment.url)
      const srcset = attr(img.node, 'srcset')
      if (srcset) {
        const parts = srcset.split(',').map(part => part.trim()).filter(Boolean)
        if (parts.length) {
          const [first, ...rest] = parts
          const descriptor = first.split(/\s+/).slice(1)
          setAttr(img.node, 'srcset', [[assignment.url, ...descriptor].join(' '), ...rest].join(', '))
        }
      }
    }
    if (assignment?.alt !== undefined) setAttr(img.node, 'alt', assignment.alt)
  })
  cssRefs.forEach((ref, index) => {
    const assignment = map[`css-${index + 1}`]
    if (!assignment?.url) return
    const replace = (text: string) => text.split(ref.value).join(assignment.url)
    if (ref.inStyleTag) {
      ref.owner.childNodes = (ref.owner.childNodes || []).map(child => ('value' in child ? { ...child, value: replace(child.value) } : child)) as typeof ref.owner.childNodes
    } else {
      setAttr(ref.owner, 'style', replace(attr(ref.owner, 'style') || ''))
    }
  })
  // Ảnh đầu tiên giữ tải ngay (hero); các ảnh sau tải lười để trang nhẹ.
  const allImgs = nodes.filter(node => node.tagName === 'img')
  allImgs.forEach((img, index) => {
    if (index === 0) return
    if (!attr(img, 'loading')) setAttr(img, 'loading', 'lazy')
    if (!attr(img, 'decoding')) setAttr(img, 'decoding', 'async')
  })
  return '<!doctype html>\n' + serialize(doc)
}

function interactiveNodes(doc: AnyNode): ElementNode[] {
  return elements(doc).filter(node =>
    (node.tagName === 'a' && attr(node, 'href') !== undefined) || node.tagName === 'button' || node.tagName === 'form')
}

function suggestAction(node: ElementNode): ImportEventAction {
  const href = attr(node, 'href') || ''
  const label = textOf(node)
  if (node.tagName === 'form') return 'register'
  if (isRegistrationAnchor(href) || isRegistrationAnchor(label)) return 'register'
  if (href.startsWith('#')) return 'scroll'
  if (/^(?:https?:|tel:|mailto:)/i.test(href)) return 'external'
  return 'none'
}

export function extractInteractiveElements(html: string): ImportInteractiveItem[] {
  const doc = parse(html)
  return interactiveNodes(doc).map((node, index) => ({
    id: `el-${index + 1}`,
    tag: node.tagName,
    label: textOf(node).slice(0, 60) || (node.tagName === 'form' ? 'Form' : node.tagName),
    href: attr(node, 'href') || undefined,
    suggestedAction: suggestAction(node),
  }))
}

const SAFE_EXTERNAL = /^(?:https?:|tel:|mailto:)/i

export function applyEventMap(html: string, assignments: Record<string, ImportEventAssignment>): { html: string; warnings: string[] } {
  const doc = parse(html)
  const warnings: string[] = []
  interactiveNodes(doc).forEach((node, index) => {
    const assignment = assignments[`el-${index + 1}`]
    if (!assignment || assignment.action === 'none') return
    if (assignment.action === 'register') {
      setAttr(node, 'data-mfc-action', 'register')
      if (node.tagName === 'a') setAttr(node, 'href', '#dang-ky')
      return
    }
    if (assignment.action === 'share') { setAttr(node, 'data-mfc-action', 'share'); return }
    if (assignment.action === 'scroll') {
      if (!assignment.target) { warnings.push(`Phần tử ${index + 1}: chưa chọn khối đích để cuộn tới.`); return }
      setAttr(node, 'data-mfc-action', 'scroll')
      setAttr(node, 'data-mfc-target', assignment.target)
      return
    }
    if (assignment.action === 'external') {
      const candidate = assignment.href || attr(node, 'href') || ''
      if (!SAFE_EXTERNAL.test(candidate)) { warnings.push(`Phần tử ${index + 1}: link ngoài không hợp lệ nên đã bỏ qua (${candidate.slice(0, 60)}).`); return }
      setAttr(node, 'data-mfc-action', 'external')
      if (node.tagName === 'a') setAttr(node, 'href', candidate)
      else setAttr(node, 'data-mfc-target', candidate)
      return
    }
    if (assignment.action === 'course') {
      const raw = (assignment.target || '').trim()
      const target = /^\/khoa-hoc\/[A-Za-z0-9_-]+$/.test(raw) ? raw : /^[A-Za-z0-9_-]+$/.test(raw) ? `/khoa-hoc/${raw}` : ''
      if (!target) { warnings.push(`Phần tử ${index + 1}: khóa học đích không hợp lệ nên đã bỏ qua.`); return }
      setAttr(node, 'data-mfc-action', 'course')
      setAttr(node, 'data-mfc-target', target)
    }
  })
  return { html: '<!doctype html>\n' + serialize(doc), warnings }
}

const STRUCTURAL = new Set(['header', 'nav', 'section', 'footer'])

export function extractBlocks(html: string): ImportBlockItem[] {
  const doc = parse(html)
  const nodes = elements(doc)
  const hasStructuralAncestor = (node: ElementNode) => {
    let parent = node.parentNode as AnyNode | null
    while (parent) {
      if ('tagName' in parent && STRUCTURAL.has(parent.tagName)) return true
      parent = (parent as ElementNode).parentNode as AnyNode | null
    }
    return false
  }
  const blocks: ImportBlockItem[] = []
  const used = new Set<string>()
  for (const node of nodes) {
    const explicit = attr(node, 'data-mfc-block')
    if (!explicit && !(STRUCTURAL.has(node.tagName) && !hasStructuralAncestor(node))) continue
    let key = explicit || attr(node, 'id') || `block-${blocks.length + 1}`
    let suffix = 2
    const base = key
    while (used.has(key)) key = `${base}-${suffix++}`
    used.add(key)
    let heading: string | undefined
    walk(node, child => {
      if (heading || !('tagName' in child)) return
      if (['h1', 'h2', 'h3'].includes(child.tagName)) heading = textOf(child).slice(0, 80) || undefined
    })
    blocks.push({ key, tag: node.tagName, heading })
  }
  return blocks
}

// Map tên trường form nguồn phổ biến sang thông tin liên hệ của luồng đăng ký.
export function mapFormDataToContact(formData: Record<string, string>): { fullName?: string; phone?: string; email?: string } {
  const normalize = (key: string) => key.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '')
  const contact: { fullName?: string; phone?: string; email?: string } = {}
  for (const [rawKey, rawValue] of Object.entries(formData)) {
    const value = typeof rawValue === 'string' ? rawValue.trim() : ''
    if (!value) continue
    const key = normalize(rawKey)
    if (!contact.fullName && ['name', 'hoten', 'fullname'].includes(key)) contact.fullName = value
    else if (!contact.phone && ['phone', 'sdt', 'tel', 'sodienthoai'].includes(key)) contact.phone = value
    else if (!contact.email && key === 'email') contact.email = value
  }
  return contact
}
