import { parse, serialize, type DefaultTreeAdapterMap } from 'parse5'
import postcss from 'postcss'

// Khung nguyên trang tự tăng chiều cao theo nội dung. vh bên trong khung phải
// tham chiếu màn hình cha, nếu không min-height:100vh tạo vòng lặp tăng chiều cao.
export function templateViewportCss(css: string) {
  try {
    const root = postcss.parse(css)
    root.walkDecls(declaration => {
      if (declaration.prop === '--mfc-viewport-height') return
      // Không sửa chuỗi, URL, comment hoặc giá trị đã chuẩn hóa khi mở lại mẫu.
      declaration.value = declaration.value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\/|url\((?:\\.|[^)])*\)|var\(\s*--mfc-viewport-height\b[^)]*\)|(^|[^\w.-])(-?(?:\d*\.)?\d+(?:e[+-]?\d+)?)(?:dvh|svh|lvh|vh)\b/gi,
        (token, prefix: string | undefined, number: string | undefined) => number === undefined ? token : `${prefix}calc(var(--mfc-viewport-height, 100vh) * ${Number(number) / 100})`)
    })
    return root.toString()
  } catch { return css } // CSS cũ chưa chuẩn không được làm mất toàn bộ trang.
}

/** Chuẩn hóa khi đọc để mẫu đã lưu được sửa mà không ghi lại DB hoặc ảnh. */
export function templateViewportHtml(html: string) {
  if (!/\d(?:dvh|svh|lvh|vh)\b/i.test(html)) return html
  const doc = parse(html)
  const visit = (node: DefaultTreeAdapterMap['node']) => {
    if ('tagName' in node) {
      if (node.tagName === 'style') {
        for (const child of node.childNodes) if ('value' in child) child.value = templateViewportCss(child.value)
      }
      for (const attribute of node.attrs) if (attribute.name === 'style') attribute.value = templateViewportCss(attribute.value)
    }
    if ('childNodes' in node) node.childNodes.forEach(visit)
  }
  visit(doc)
  return '<!doctype html>\n' + serialize(doc)
}
