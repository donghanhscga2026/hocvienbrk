import DOMPurify from "dompurify"

export function normalizeGoogleDocsHtml(rawHtml: string) {
  if (!rawHtml) return ""

  // 1️⃣ Sanitize trước
  let clean = DOMPurify.sanitize(rawHtml)

  // 2️⃣ Xoá <p><br></p>
  clean = clean.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, "")

  // 3️⃣ Xoá &nbsp; thừa
  clean = clean.replace(/&nbsp;/gi, " ")

  // 4️⃣ Xoá div rỗng
  clean = clean.replace(/<div>\s*<\/div>/gi, "")

  // 5️⃣ Xoá page-break Google Docs
  clean = clean.replace(/page-break-after:\s*always;?/gi, "")

  // 6️⃣ Xoá margin inline lớn
  clean = clean.replace(/margin-[^:]+:\s*\d+px;?/gi, "")

  // 7️⃣ Xoá style width cố định
  clean = clean.replace(/width="\d+"/gi, "")
  clean = clean.replace(/style="[^"]*width:[^;"]*;?[^"]*"/gi, "")

  // 8️⃣ Gắn attribute để image viewer dễ xử lý (tùy chọn)
  clean = clean.replace(
    /<img([^>]+?)src="([^"]+)"([^>]*)>/gi,
    `<img $1 src="$2" $3 loading="lazy" />`
  )

  return clean
}
