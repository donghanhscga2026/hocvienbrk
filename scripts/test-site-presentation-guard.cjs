// Gác cổng tách giao diện (GĐ2): không trang nào được trả 404/chuỗi rỗng
// chỉ vì project không có deployment brand wi300, trừ các trang thuần
// wi300 trong DANH SÁCH CHO PHÉP dưới đây. Mọi trang đã tách phải rẽ
// nhánh qua helper dùng chung getPagePresentation (lib/site-profile/presentation.ts):
// có brand → bản wi300, không có → bản classic của giautoandien.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')

const root = path.resolve(__dirname, '..')

// DANH SÁCH CHO PHÉP — trang thuần wi300, không có bản classic tương ứng.
// Thêm trang vào đây phải kèm lý do rõ ràng và được duyệt như một quyết
// định sản phẩm, không phải để né việc tách giao diện.
const ALLOWLIST = new Map([
  ['app/tools/wi-appearance/page.tsx', 'Trang quản trị giao diện của website-builder wi300.'],
  ['app/tools/wi-website/page.tsx', 'Trang quản trị website của website-builder wi300.'],
  ['app/du-an/quan-ly/page.tsx', 'Trang quản lý dự án của hệ wi300; phía gia chỉ tới được khi project bật wi300.'],
  ['app/du-an/noi-dung/page.tsx', 'Trang soạn nội dung dự án của hệ wi300.'],
  ['app/[slug]/page.tsx', 'Trang tự tạo đã xuất bản của website-builder wi300; slug lạ phía gia do proxy slug-guard chốt 404.'],
])

// Các trang GĐ2 đã tách hai bản hiển thị — bắt buộc gọi getPagePresentation.
const SPLIT_PAGES = [
  'app/khoa-hoc/page.tsx',
  'app/giang-vien/page.tsx',
  'app/giang-vien/[id]/page.tsx',
  'app/san-pham/page.tsx',
  'app/dich-vu/page.tsx',
  'app/gioi-thieu/page.tsx',
  'app/doi-tac/page.tsx',
  'app/kham-pha/page.tsx',
  'app/du-an/page.tsx',
  'app/du-an/[slug]/page.tsx',
  'app/du-an/chu-du-an/[id]/page.tsx',
  'app/tools/apps/page.tsx',
  'app/tools/apps/[slug]/page.tsx',
  'app/my-space/page.tsx',
]

// Mẫu "cổng brand": chặn hiển thị chỉ vì không có brand wi300.
const GATE_PATTERNS = [
  /if\s*\([^\n]*!(?:await\s+)?getCurrentDeploymentBrand\(\)[^\n]*\)\s*\{?\s*notFound\(\)/,
  /if\s*\([^\n]*!\s*brand\b[^\n]*\)\s*\{?\s*notFound\(\)/,
  /if\s*\([^\n]*!\s*brand\b[^\n]*\)\s*return\s+null/,
]

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name === 'page.tsx') out.push(path.relative(root, full))
  }
  return out
}

const helperPath = path.join(root, 'lib/site-profile/presentation.ts')
assert.ok(fs.existsSync(helperPath), 'Thiếu helper lib/site-profile/presentation.ts')
assert.match(fs.readFileSync(helperPath, 'utf8'), /export async function getPagePresentation/, 'Helper phải export getPagePresentation')

const failures = []
for (const rel of walk(path.join(root, 'app'))) {
  if (ALLOWLIST.has(rel)) continue
  const source = fs.readFileSync(path.join(root, rel), 'utf8')
  const gated = GATE_PATTERNS.some(pattern => pattern.test(source))
  if (gated && !source.includes('getPagePresentation')) {
    failures.push(`${rel}: còn cổng notFound()/return null chỉ vì thiếu brand wi300 mà chưa rẽ nhánh qua getPagePresentation`)
  }
}
assert.deepEqual(failures, [], failures.join('\n'))

for (const rel of SPLIT_PAGES) {
  const full = path.join(root, rel)
  assert.ok(fs.existsSync(full), `Trang đã tách không tồn tại: ${rel}`)
  assert.ok(fs.readFileSync(full, 'utf8').includes('getPagePresentation'), `${rel} phải rẽ nhánh qua getPagePresentation`)
}
for (const rel of ALLOWLIST.keys()) {
  assert.ok(fs.existsSync(path.join(root, rel)), `Trang trong danh sách cho phép không tồn tại: ${rel}`)
}

console.log(`Site presentation guard passed: ${SPLIT_PAGES.length} split pages branch via getPagePresentation, allowlist has ${ALLOWLIST.size} wi300-only pages, no unguarded brand gates remain.`)
