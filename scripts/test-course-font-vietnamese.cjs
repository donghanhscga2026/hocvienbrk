#!/usr/bin/env node
// Font trang bán khóa học phải có subset vietnamese: font tự host
// Cormorant Garamond (tiêu đề) và Inter (thân bài) chỉ gồm subset latin,
// thiếu toàn bộ glyph tiếng Việt đặc thù (đ, ế, ữ, ơ...) khiến trình duyệt
// mượn font dự phòng giữa từ và dấu bị tách rời. Test này khóa việc
// CourseThemeProvider khai @font-face vietnamese + chèn họ VN vào ngăn
// xếp font, và các file woff2 vietnamese phải tồn tại đúng định dạng.
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const provider = fs.readFileSync(path.join(root, 'components/course-page/CourseThemeProvider.tsx'), 'utf8')

const VIETNAMESE_RANGE = 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB'
const esc = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const faces = [
  { family: 'Cormorant Garamond VN', file: 'cormorant-garamond-vietnamese-variable-normal.woff2', style: 'normal', weight: '300 700' },
  { family: 'Cormorant Garamond VN', file: 'cormorant-garamond-vietnamese-variable-italic.woff2', style: 'italic', weight: '300 700' },
  { family: 'Inter VN', file: 'inter-vietnamese-variable-normal.woff2', style: 'normal', weight: '100 900' },
]

for (const face of faces) {
  const block = new RegExp(`@font-face \\{[^}]*font-family: '${esc(face.family)}';[^}]*font-style: ${face.style};[^}]*font-weight: ${esc(face.weight)};[^}]*${esc(face.file)}[^}]*unicode-range: ${esc(VIETNAMESE_RANGE)};`, 's')
  assert.match(provider, block, `Thiếu @font-face vietnamese cho ${face.family} ${face.style}`)
  const filePath = path.join(root, 'public/fonts', face.file)
  const data = fs.readFileSync(filePath)
  assert.equal(data.subarray(0, 4).toString('ascii'), 'wOF2', `${face.file} phải là woff2`)
  assert.ok(data.length > 5000 && data.length < 60000, `${face.file} dung lượng bất thường: ${data.length}`)
}

assert.match(provider, /--font-course-serif\), 'Cormorant Garamond VN', Georgia/, 'Ngăn xếp font tiêu đề phải có Cormorant Garamond VN trước Georgia')
assert.match(provider, /--font-course-sans\), 'Inter VN', system-ui/, 'Ngăn xếp font thân bài phải có Inter VN trước system-ui')

// Trang dán code chạy trong iframe nên font trang cha không áp dụng được:
// bản vá lúc hiển thị phải mượn tên font hệ thống (Georgia, Segoe UI...)
// với unicode-range tiếng Việt, và ZipSourceSection phải chèn bản vá vào
// mọi tài liệu iframe. Các kiểm này khóa cả hai phía của cơ chế vá.
async function checkIframePatch() {
  const load = require('./helpers/load-ts.cjs')
  const zipBrowser = load('lib/course-page/importer/zip-browser.ts')
  const { injectVietnameseFontPatch, VIETNAMESE_FONT_PATCH } = zipBrowser
  assert.equal(typeof injectVietnameseFontPatch, 'function', 'Thiếu injectVietnameseFontPatch')
  for (const family of ['Georgia', 'Times New Roman', 'Segoe UI', 'Arial', 'Helvetica Neue', 'Helvetica']) {
    assert.ok(VIETNAMESE_FONT_PATCH.includes(`font-family:'${family}'`), `Bản vá thiếu họ ${family}`)
  }
  assert.ok(VIETNAMESE_FONT_PATCH.includes(`unicode-range:${VIETNAMESE_RANGE};`), 'Bản vá thiếu unicode-range tiếng Việt')
  assert.ok(VIETNAMESE_FONT_PATCH.includes('/fonts/cormorant-garamond-vietnamese-variable-normal.woff2'), 'Bản vá serif phải trỏ file Cormorant VN')
  assert.ok(VIETNAMESE_FONT_PATCH.includes('/fonts/inter-vietnamese-variable-normal.woff2'), 'Bản vá sans phải trỏ file Inter VN')

  const sample = '<!doctype html><html><head><meta charset="utf-8"><style>h2{font-family:Georgia,serif}</style></head><body><h2>Đến</h2></body></html>'
  const patched = injectVietnameseFontPatch(sample)
  assert.ok(patched.includes('data-mfc-vn-font-patch'), 'Chưa chèn style bản vá')
  assert.ok(patched.indexOf('data-mfc-vn-font-patch') < patched.indexOf('font-family:Georgia,serif'), 'Bản vá phải nằm trong head trước CSS của trang')
  assert.equal(injectVietnameseFontPatch(patched), patched, 'Chèn bản vá phải idempotent')
  assert.ok(injectVietnameseFontPatch('<p>không có head</p>').startsWith('<style data-mfc-vn-font-patch>'), 'Trang không có head vẫn phải được vá ở đầu tài liệu')
  assert.equal(injectVietnameseFontPatch(''), '', 'HTML rỗng giữ nguyên')

  const section = fs.readFileSync(path.join(root, 'components/course-page/sections/ZipSourceSection.tsx'), 'utf8')
  assert.match(section, /injectVietnameseFontPatch\(upgradeZipBridge\(templateViewportHtml\(rawHtml\)\)\)/, 'ZipSourceSection phải áp bản vá cho mọi tài liệu iframe')
}

checkIframePatch().then(
  () => console.log('PASS course fonts: vietnamese subsets declared, stacked and present for Cormorant Garamond + Inter; iframe patch injected for saved code pages'),
  error => { console.error(error); process.exit(1) },
)
