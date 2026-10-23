// Nhận diện các trang Wi công khai khi build; không đưa trang tài khoản/quản trị vào CMS.
const fs = require('node:fs'), path = require('node:path')
const root = path.resolve(__dirname, '..'), app = path.join(root, 'app')
const labels = { '': ['home', 'Trang chủ'], 'khoa-hoc': ['courses', 'Khóa học'], 'du-an': ['projects', 'Dự án'], 'giang-vien': ['teachers', 'Giảng viên'], 'gioi-thieu': ['about', 'Giới thiệu Wi300'], 'san-pham': ['products', 'Sản phẩm'], 'dich-vu': ['services', 'Dịch vụ'], 'doi-tac': ['partners', 'Đăng ký đối tác'], 'bai-viet': ['articles', 'Bài viết'] }
const directories = fs.readdirSync(app, { withFileTypes: true }).filter(item => item.isDirectory() && !/[\[\]()]/.test(item.name)).map(item => item.name).sort()
const excluded = new Set(['my-space', 'kham-pha', 'login', 'register', 'account-settings', 'my-requests', 'support', 'complete-profile', 'forgot-password'])
const pages = ['', ...directories].filter(slug => {
  const file = path.join(app, slug, 'page.tsx')
  if (excluded.has(slug) || !fs.existsSync(file)) return false
  const source = fs.readFileSync(file, 'utf8')
  return !!labels[slug] || (/getCurrentDeploymentBrand|WiContentPage|WiOfferingCatalog/.test(source) && !/redirect\(['"]\/login/.test(source))
}).map(slug => {
  const source = fs.readFileSync(path.join(app, slug, 'page.tsx'), 'utf8')
  const [id, label] = labels[slug] || [source.match(/systemPageContent\([^,]+,\s*['"]([^'"]+)/)?.[1] || slug, source.match(/title:\s*['"]([^'"]+)/)?.[1] || slug]
  return { id, label, url: '/' + slug }
}).sort((a, b) => {
  const ids = Object.values(labels).map(([id]) => id), index = id => ids.includes(id) ? ids.indexOf(id) : ids.length
  return index(a.id) - index(b.id) || a.url.localeCompare(b.url)
})
const data = { pages, reserved: directories }
fs.writeFileSync(path.join(root, 'lib/wi300/page-inventory.json'), JSON.stringify(data, null, 2) + '\n', 'utf8')
console.log(`Detected ${pages.length} public Wi pages and ${directories.length} reserved routes.`)
