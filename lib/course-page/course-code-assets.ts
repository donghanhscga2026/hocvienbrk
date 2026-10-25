import { parseFragment, type DefaultTreeAdapterMap } from 'parse5'

// Chỉ chấp nhận họa tiết vector nhỏ; ảnh chụp/file lớn vẫn dùng URL HTTPS.
const tags = new Set(['svg', 'g', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon', 'defs', 'linearGradient', 'radialGradient', 'stop', 'pattern', 'clipPath'])
const attributes = new Set(['xmlns', 'id', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'transform', 'offset', 'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform', 'patternUnits', 'patternTransform', 'clip-path'])
const message = 'Không nhúng ảnh hoặc file Base64 vào code. Chỉ hỗ trợ họa tiết SVG tĩnh tối đa 4 KB; ảnh khác dùng đường dẫn HTTPS.'

export function validateCourseCodeAssets(html: string) {
  let total = 0
  for (const match of html.matchAll(/data\s*:\s*([^\s"'<>]*);base64\s*,([^\s"'<>)]*)/gi)) {
    if (match[1].toLowerCase() !== 'image/svg+xml' || !/^[A-Za-z0-9+/]+={0,2}$/.test(match[2]) || match[2].length > 5500) throw new Error(message)
    let svg: string
    try {
      const bytes = Uint8Array.from(atob(match[2]), char => char.charCodeAt(0))
      total += bytes.length
      if (bytes.length > 4096 || total > 16384) throw new Error(message)
      svg = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch { throw new Error(message) }
    // Không nhận DTD/entity, script, HTML, tài nguyên ngoài hoặc CSS trong SVG.
    if (!/^\s*<svg[\s>]/i.test(svg) || /<!|<\?|&/.test(svg)) throw new Error(message)
    const fragment = parseFragment(svg)
    const roots = fragment.childNodes.filter(node => node.nodeName !== '#text' || ('value' in node && node.value.trim()))
    if (roots.length !== 1 || roots[0].nodeName !== 'svg') throw new Error(message)
    const visit = (node: DefaultTreeAdapterMap['node']) => {
      if ('tagName' in node) {
        if (node.namespaceURI !== 'http://www.w3.org/2000/svg' || !tags.has(node.tagName)) throw new Error(message)
        for (const attribute of node.attrs) {
          if (attribute.name === 'xmlns' && attribute.value === 'http://www.w3.org/2000/svg' && !attribute.prefix) continue
          if (!attributes.has(attribute.name) || attribute.prefix || /[<>\\]|(?:javascript|data|https?)\s*:|url\(\s*(?!#[\w-]+\s*\))/i.test(attribute.value)) throw new Error(message)
        }
      } else if (node.nodeName !== '#text') throw new Error(message)
      if ('childNodes' in node) node.childNodes.forEach(visit)
    }
    roots.forEach(visit)
  }
}
