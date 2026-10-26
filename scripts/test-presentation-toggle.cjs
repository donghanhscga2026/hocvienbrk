/* Công tắc giao diện theo từng trang (GĐ3):
   1) getSiteRuntimeConfig parse siteConfig.ui.pages — chỉ giữ khóa trang
      hợp lệ (khớp union PageKey trong presentation.ts) với đúng hai giá
      trị 'classic' | 'wi300'; khóa lạ, giá trị lạ, kiểu sai đều bỏ qua.
   2) getPagePresentation phân giải theo thứ tự: override ui.pages của
      SiteProfile hiện tại thắng deployment brand ở cả hai chiều; không
      có override thì giữ quy tắc GĐ2 (có brand → 'wi300', không → 'classic').
   3) getPresentationBrand: trang classic → null; có deployment brand →
      dùng deployment brand; không có brand mà trang được chọn dùng
      'wi300' → brand chọn-dùng dựng từ branding của chính profile
      (không lấy tên/logo WI300). */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')

const root = path.resolve(__dirname, '..')
function load(file, mocks = {}) {
  return require('./helpers/load-ts.cjs')(file, mocks)
}
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++ }

const EXPECTED_KEYS = [
  'home', 'courses', 'teachers', 'teacher-detail', 'products', 'services',
  'about', 'partners', 'explore', 'projects', 'project-detail',
  'project-owner', 'external-apps', 'external-app', 'my-space',
]

async function run() {
  // 1) Parse ui.pages trong config.ts (nạp module thật, không mock).
  const config = load('lib/site-profile/config.ts')
  eq([...config.PAGE_PRESENTATION_KEYS], EXPECTED_KEYS, 'Danh sách khóa trang hợp lệ khớp kỳ vọng')
  const presentationSource = fs.readFileSync(path.join(root, 'lib/site-profile/presentation.ts'), 'utf8')
  for (const key of EXPECTED_KEYS) {
    ok(presentationSource.includes(`'${key}'`), `Union PageKey có khóa ${key}`)
  }
  const parsed = config.getSiteRuntimeConfig({
    siteConfig: {
      ui: {
        pages: {
          courses: 'wi300', teachers: 'classic', 'my-space': 'wi300',
          'khóa-lạ': 'wi300', home: 'banana', products: 42, services: null,
        },
      },
    },
  })
  eq(parsed.ui.pages, { courses: 'wi300', teachers: 'classic', 'my-space': 'wi300' }, 'Giữ khóa/giá trị hợp lệ, bỏ khóa lạ và giá trị lạ')
  eq(config.getSiteRuntimeConfig({}).ui.pages, {}, 'Không có ui.pages thì mặc định rỗng')
  eq(config.getSiteRuntimeConfig({ siteConfig: { ui: { pages: ['wi300'] } } }).ui.pages, {}, 'ui.pages không phải object thì bỏ qua')
  eq(config.getSiteRuntimeConfig({ siteConfig: 'không-phải-object' }).ui.pages, {}, 'siteConfig không phải object thì mặc định rỗng')

  // 2) + 3) Phân giải trong presentation.ts với brand/profile được mock.
  const deploymentBrand = { variant: 'wi300', name: 'Deployment Brand' }
  const profileWith = pages => ({ title: 'Hồ sơ kiểm tra', siteConfig: { ui: { pages } } })
  function loadPresentation({ brand, profile }) {
    return load('lib/site-profile/presentation.ts', {
      '@/lib/prisma': {},
      '@/lib/wi300/appearance-service': {
        appearanceKey: () => 'test:appearance',
        readAppearance: async () => { throw new Error('Không có appearance trong test') },
      },
      '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand },
      '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => profile },
    })
  }

  let p = loadPresentation({ brand: null, profile: profileWith({ courses: 'wi300' }) })
  eq(await p.getPagePresentation('courses'), 'wi300', 'Override wi300 thắng khi không có deployment brand')
  eq(await p.getPagePresentation('teachers'), 'classic', 'Trang không override + không brand → classic (GĐ2)')
  p = loadPresentation({ brand: deploymentBrand, profile: profileWith({ courses: 'classic' }) })
  eq(await p.getPagePresentation('courses'), 'classic', 'Override classic thắng deployment brand wi300')
  eq(await p.getPagePresentation('teachers'), 'wi300', 'Trang không override + có brand → wi300 (GĐ2)')
  p = loadPresentation({ brand: deploymentBrand, profile: null })
  eq(await p.getPagePresentation('courses'), 'wi300', 'Không có profile → theo deployment brand')
  p = loadPresentation({ brand: null, profile: null })
  eq(await p.getPagePresentation('courses'), 'classic', 'Không profile, không brand → classic')

  const resolve = loadPresentation({ brand: null, profile: null }).resolvePagePresentation
  eq(resolve('wi300', false), 'wi300', 'resolve: override wi300 thắng')
  eq(resolve('classic', true), 'classic', 'resolve: override classic thắng')
  eq(resolve(undefined, true), 'wi300', 'resolve: không override + có brand → wi300')
  eq(resolve(undefined, false), 'classic', 'resolve: không override + không brand → classic')

  p = loadPresentation({ brand: deploymentBrand, profile: profileWith({ courses: 'classic' }) })
  eq(await p.getPresentationBrand('courses'), null, 'Trang đang classic → không trả brand wi300')
  p = loadPresentation({ brand: deploymentBrand, profile: profileWith({}) })
  ok(await p.getPresentationBrand('courses') === deploymentBrand, 'Có deployment brand → dùng đúng deployment brand')
  p = loadPresentation({ brand: null, profile: profileWith({}) })
  eq(await p.getPresentationBrand('courses'), null, 'Không override, không brand → brand null như trước')
  p = loadPresentation({
    brand: null,
    profile: {
      title: 'Hồ sơ Gia',
      siteConfig: {
        branding: { name: 'Tên của Gia', logoUrl: '/logo-gia.png', faviconUrl: '/favicon-gia.ico' },
        ui: { pages: { courses: 'wi300' } },
      },
    },
  })
  const optIn = await p.getPresentationBrand('courses')
  ok(optIn && optIn.variant === 'wi300', 'Brand chọn-dùng có variant wi300')
  eq(optIn.name, 'Tên của Gia', 'Brand chọn-dùng lấy tên từ branding của profile, không lấy tên WI300')
  eq(optIn.logoUrl, '/logo-gia.png', 'Brand chọn-dùng lấy logo từ branding của profile')
  eq(optIn.iconUrl, '/favicon-gia.ico', 'Brand chọn-dùng lấy favicon từ branding của profile')

  // Cách gắn ở các trang đã tách: nhánh wi300 lấy brand qua helper theo trang.
  for (const [file, key] of [
    ['app/khoa-hoc/page.tsx', 'courses'],
    ['app/giang-vien/page.tsx', 'teachers'],
    ['app/giang-vien/[id]/page.tsx', 'teacher-detail'],
    ['app/du-an/page.tsx', 'projects'],
    ['app/du-an/[slug]/page.tsx', 'project-detail'],
    ['app/du-an/chu-du-an/[id]/page.tsx', 'project-owner'],
    ['app/gioi-thieu/page.tsx', 'about'],
    ['app/doi-tac/page.tsx', 'partners'],
    ['app/my-space/page.tsx', 'my-space'],
    ['app/tools/apps/page.tsx', 'external-apps'],
    ['app/tools/apps/[slug]/page.tsx', 'external-app'],
  ]) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    ok(source.includes(`getPresentationBrand('${key}')`), `${file} lấy brand theo trang '${key}'`)
  }
  const offeringSource = fs.readFileSync(path.join(root, 'components/wi300/WiOfferingCatalog.tsx'), 'utf8')
  ok(offeringSource.includes('getPresentationBrand(pageId)'), 'WiOfferingCatalog lấy brand theo trang products/services')

  console.log(`test-presentation-toggle: PASS (${checks} kiểm chứng)`)
}

run().catch(error => { console.error(error); process.exit(1) })
