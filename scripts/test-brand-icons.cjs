/* Kiểm chứng tương thích lucide-react 1.x:
   1) Không file nào còn import Facebook/Youtube từ lucide-react (hai
      brand icon đã bị Lucide gỡ ở bản 1.x — import là lỗi build).
   2) components/icons/brands.tsx cung cấp FacebookBrandIcon và
      YoutubeBrandIcon nhận LucideProps (thay thế trực tiếp được ở
      mọi nơi chờ kiểu LucideIcon), giữ đúng nét vẽ stroke bản cũ.
   3) Các bảng icon của Wi300/tools vẫn có khóa 'Youtube' trỏ sang
      brand icon. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}
const offenders = []
for (const dir of ['app', 'components', 'lib']) {
  for (const file of walk(path.join(root, dir))) {
    const src = fs.readFileSync(file, 'utf8')
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'lucide-react'/g)) {
      const names = m[1].split(',').map((x) => x.trim().split(' as ')[0])
      if (names.includes('Facebook') || names.includes('Youtube')) offenders.push(path.relative(root, file))
    }
  }
}
ok(offenders.length === 0, `không còn import brand icon từ lucide-react (lỗi ở: ${offenders.join(', ') || 'không có'})`)

const brands = fs.readFileSync(path.join(root, 'components/icons/brands.tsx'), 'utf8')
ok(brands.includes('export const FacebookBrandIcon') && brands.includes('export const YoutubeBrandIcon'), 'brands.tsx: đủ 2 brand icon')
ok(brands.includes('LucideProps'), 'brands.tsx: nhận LucideProps như icon Lucide thật')
ok(fs.readFileSync(path.join(root, 'components/wi300/Wi300SpaceMenu.tsx'), 'utf8').includes('Youtube: YoutubeBrandIcon'), 'Wi300SpaceMenu: khóa Youtube trỏ brand icon')
ok(fs.readFileSync(path.join(root, 'components/wi300/Wi300PersonalSpace.tsx'), 'utf8').includes('Youtube: YoutubeBrandIcon'), 'Wi300PersonalSpace: khóa Youtube trỏ brand icon')

console.log(`test-brand-icons: ${checks} kiểm chứng PASS`)
