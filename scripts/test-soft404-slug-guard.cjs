/* Kiểm chứng lớp chặn soft-404 tại proxy cho đường một đoạn trên host nền tảng:
   1) platformSlugCandidate chỉ nhận đúng nhóm đường sẽ rơi vào trang [slug]
      (một đoạn, không phải route thật, không phải từ khóa dự trữ, không có
      dấu chấm của tên file).
   2) shouldBlockUnknownSlug chỉ chặn khi đã đọc chắc danh sách slug trang tự
      tạo đã xuất bản và slug không nằm trong đó; chưa chắc thì cho qua
      (fail-open) để trang [slug] tự quyết như hiện tại.
   3) proxy.ts gắn lớp chặn này trong nhánh host nền tảng, sau lớp chặn
      /site-domain/ và dùng đúng nguồn dữ liệu đã xuất bản. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }

function run() {
  const proxySource = fs.readFileSync(path.join(root, 'proxy.ts'), 'utf8')
  const regionStart = proxySource.indexOf('const RESERVED_PATHS')
  const fnStart = proxySource.indexOf('export function shouldBlockUnknownSlug')
  ok(regionStart >= 0 && fnStart > regionStart, 'proxy.ts có vùng hằng số route và hàm shouldBlockUnknownSlug')
  const fnEnd = proxySource.indexOf('\n}\n', fnStart)
  const region = proxySource.slice(regionStart, fnEnd + 3).replaceAll('export function', 'function')
  const regionJs = ts.transpileModule(region, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const { platformSlugCandidate, shouldBlockUnknownSlug } = new Function(`${regionJs}; return { platformSlugCandidate, shouldBlockUnknownSlug }`)()
  ok(typeof platformSlugCandidate === 'function' && typeof shouldBlockUnknownSlug === 'function', 'Nạp được hai hàm quyết định từ proxy.ts')

  // 1) Nhận diện đường ứng viên
  ok(platformSlugCandidate('/duong-la-kiem-tra-zz25') === 'duong-la-kiem-tra-zz25', 'Đường lạ một đoạn là ứng viên')
  ok(platformSlugCandidate('/trang-tu-tao-co-that') === 'trang-tu-tao-co-that', 'Slug trang tự tạo cũng là ứng viên (quyết định ở bước 2)')
  for (const p of ['/', '/khoa-hoc/slug-bat-ky', '/bai-viet/123', '/a/b', '/a/b/c']) {
    ok(platformSlugCandidate(p) === null, 'Không phải ứng viên (khác số đoạn): ' + p)
  }
  for (const p of ['/khoa-hoc', '/tools', '/bai-viet', '/san-pham', '/vinh-danh-hoc-tap', '/site-domain', '/account-settings', '/forgot-password', '/lich-su-kien']) {
    ok(platformSlugCandidate(p) === null, 'Không phải ứng viên (route thật cấp 1): ' + p)
  }
  for (const p of ['/login', '/register', '/admin', '/dashboard', '/checkout']) {
    ok(platformSlugCandidate(p) === null, 'Không phải ứng viên (từ khóa dự trữ): ' + p)
  }
  ok(platformSlugCandidate('/favicon.ico') === null, 'Không phải ứng viên (tên file có dấu chấm)')
  ok(platformSlugCandidate('/robots.txt') === null, 'Không phải ứng viên (robots.txt)')

  // 2) Quyết định chặn
  const published = new Set(['trang-tu-tao-co-that', 'gioi-thieu-cong-ty'])
  ok(shouldBlockUnknownSlug('/duong-la-kiem-tra-zz25', published) === true, 'Chặn slug lạ khi đã có danh sách chắc chắn')
  ok(shouldBlockUnknownSlug('/trang-tu-tao-co-that', published) === false, 'Không chặn trang tự tạo đã xuất bản')
  ok(shouldBlockUnknownSlug('/duong-la-kiem-tra-zz25', null) === false, 'Chưa đọc được danh sách (null) thì cho qua')
  ok(shouldBlockUnknownSlug('/duong-la-kiem-tra-zz25', new Set()) === true, 'Danh sách rỗng chắc chắn (không có trang tự tạo nào) thì chặn slug lạ')
  ok(shouldBlockUnknownSlug('/khoa-hoc', published) === false, 'Không bao giờ chặn route thật')
  ok(shouldBlockUnknownSlug('/login', published) === false, 'Không bao giờ chặn từ khóa dự trữ')

  // 3) Cách gắn trong proxy.ts
  const wire = 'if(platformSlugCandidate(path) && shouldBlockUnknownSlug(path, await publishedCustomPageSlugs()))'
  const wireIndex = proxySource.indexOf(wire)
  const hostIndex = proxySource.indexOf('if(isPlatformHost(hostname))')
  const siteDomainIndex = proxySource.indexOf("if(path.startsWith('/site-domain/'))")
  ok(wireIndex > hostIndex && hostIndex >= 0, 'Lớp chặn soft-404 nằm trong nhánh host nền tảng')
  ok(wireIndex > siteDomainIndex && siteDomainIndex > hostIndex, 'Lớp chặn soft-404 chạy sau lớp chặn /site-domain/')
  ok(proxySource.includes('if (!getDeploymentBrand()) return null'), 'Chưa có thương hiệu triển khai thì cho qua (không chặn)')
  const loaderStart = proxySource.indexOf('async function publishedCustomPageSlugs')
  const loader = proxySource.slice(loaderStart, proxySource.indexOf('\n}\n', loaderStart))
  ok(loader.includes('readAppearance(prisma, appearanceKey())'), 'Danh sách slug lấy từ cấu hình đã xuất bản (readAppearance)')
  ok(loader.includes('page.published && !page.deleted'), 'Chỉ tính trang đã xuất bản và chưa xóa — khớp điều kiện của trang [slug]')
  ok(loader.includes('catch') && loader.includes('return null'), 'Lỗi đọc cấu hình thì cho qua (fail-open)')

  console.log(`test-soft404-slug-guard: PASS (${checks} kiểm chứng)`)
}

run()
