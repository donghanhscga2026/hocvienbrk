const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { act } = React
function load(file, overrides = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in overrides ? overrides[name] : require(name), module, module.exports)
  return module.exports
}
async function run() {
  const config = load('lib/site-profile/deployment-brand.ts')
  const brand = config.getDeploymentBrand({ SITE_VARIANT: 'wi300', WI300_DESCRIPTION: 'Mô tả riêng', WI300_SEO_TITLE: 'Tên SEO riêng', WI300_FAVICON_URL: 'https://assets.example.com/icon.png', WI300_OG_IMAGE_URL: '/share.png' })
  assert.equal(brand.description, 'Mô tả riêng')
  assert.equal(brand.seoTitle, 'Tên SEO riêng')
  assert.equal(brand.iconUrl, 'https://assets.example.com/icon.png')
  assert.equal(brand.ogImageUrl, '/share.png')
  for (const invalid of ['javascript:alert(1)', '//evil.com/icon.png', 'http://evil.com/icon.png', '/\\evil.com']) assert.equal(config.getDeploymentBrand({ SITE_VARIANT: 'wi300', WI300_FAVICON_URL: invalid }).iconUrl, '/wi300/wipa-icon.png')
  const { recentActiveCourses } = load('lib/wi300/catalog.ts')
  const courses = Array.from({ length: 8 }, (_, i) => ({ id: i + 1 }))
  const rows = courses.map(course => ({ courseId: course.id, status: 'ACTIVE', hiddenFromGifts: false, completedCount: 1, totalLessons: 10, lastStudiedAt: new Date(`2026-10-0${course.id}T12:00:00Z`) }))
  rows[7].status = 'COMPLETED'
  rows[6].completedCount = 10
  rows[5].status = 'PENDING'
  rows[4].hiddenFromGifts = true
  assert.deepEqual(recentActiveCourses(courses, rows).map(c => c.id), [4, 3, 2])
  assert.deepEqual(recentActiveCourses(courses.slice(0, 1), rows).map(c => c.id), [1], 'Không lộ khóa ngoài phạm vi')
  assert.deepEqual(recentActiveCourses(courses, []).map(c => c.id), [])

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/' })
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  const link = { __esModule: true, default: ({ children, scroll, onNavigate, ...props }) => React.createElement('a', props, children) }
  let pathname = '/', scrollCalls = 0
  window.scrollTo = () => { scrollCalls++ }
  const Header = load('components/wi300/Wi300Header.tsx', {
    'next/link': link, 'next/image': { __esModule: true, default: ({ priority, unoptimized, ...props }) => React.createElement('img', props) },
    'next-auth/react': { useSession: () => ({ data: null }) }, 'next/navigation': { usePathname: () => pathname },
    './Wi300BrandContext': { useWi300Brand: () => brand }, '@/lib/web-push-client': {},
  }).default
  const Shell = load('components/wi300/Wi300Shell.tsx', { 'next/navigation': { usePathname: () => pathname }, './Wi300Header': { __esModule: true, default: Header },
    './Wi300Footer': load('components/wi300/Wi300Footer.tsx', { 'next/link': link, 'next/image': { __esModule: true, default: ({ unoptimized, ...props }) => React.createElement('img', props) }, './Wi300BrandContext': { useWi300Brand: () => brand } }), 'next/link': link, '@/lib/wi300/default-pages': load('lib/wi300/default-pages.ts') }).default
  const root = createRoot(document.getElementById('root'))
  const renderShell = () => root.render(React.createElement(Shell, null, React.createElement('div', null, 'Page')))
  await act(async () => renderShell())
  assert.equal(scrollCalls, 0, 'Không ép scroll khi khởi tạo')
  assert.ok(document.querySelector('[data-wi300-shell].min-h-dvh.flex-col'))
  assert.ok(document.querySelector('[data-wi300-content].flex-1'))
  assert.ok(document.querySelector('header.sticky.top-0'))
  assert.equal(document.querySelectorAll('footer').length, 1)
  assert.equal(document.querySelector('[data-wi300-shell]').lastElementChild.tagName, 'FOOTER')
  assert.ok(document.querySelector('footer a[href="/#doanh-nghiep-tieu-bieu"]'))
  const navLinks = [...document.querySelectorAll('header nav a')].map(a => a.getAttribute('href'))
  assert.deepEqual(navLinks, ['/', '/kham-pha', '/khoa-hoc', '/gioi-thieu', '/my-space'])
  assert.ok(navLinks.every(href => !href.includes('#')))
  pathname = '/khoa-hoc/example'
  window.history.pushState(null, '', pathname)
  await act(async () => renderShell())
  assert.equal(scrollCalls, 1, 'Chuyển khóa học mới về đầu')
  assert.equal(document.querySelectorAll('header').length, 0, 'Course tự sở hữu menu')
  assert.equal(document.querySelectorAll('footer').length, 0, 'Không thêm footer vào template khóa học')
  pathname = '/'
  window.history.replaceState(null, '', pathname)
  window.dispatchEvent(new window.PopStateEvent('popstate'))
  await act(async () => renderShell())
  assert.equal(scrollCalls, 1, 'Back giữ vị trí danh sách')
  pathname = '/khoa-hoc/example'
  window.history.pushState(null, '', pathname + '#bai-hoc')
  await act(async () => renderShell())
  assert.equal(scrollCalls, 1, 'Không ghi đè hash')
  pathname = '/khoa-hoc/another'
  window.history.pushState(null, '', pathname + '?notificationLesson=lesson1')
  await act(async () => renderShell())
  assert.equal(scrollCalls, 1, 'Không ghi đè đích thông báo')

  const Breadcrumb = load('components/wi300/Wi300Breadcrumb.tsx', { 'next/link': link }).default
  const View = load('components/course-page/CoursePageView.tsx', {
    'next/navigation': { useRouter: () => ({ push() {} }) }, '@/components/website/DomainShell': { useDomainBrand: () => null },
    './CourseThemeProvider': { __esModule: true, default: ({ children }) => React.createElement('div', null, children) },
    './SectionRenderer': { __esModule: true, default: () => React.createElement('section', null, 'Content') },
    './ShareLinkModal': { __esModule: true, default: () => null }, './RegistrationFlowModal': { __esModule: true, default: () => null },
    '@/components/notifications/NotificationBell': { __esModule: true, default: () => null }, '@/components/crm/CrmRequestButton': { __esModule: true, default: () => null },
    '@/app/actions/course-actions': {},
  }).default
  const coursePage = { theme: {}, navigation: { shortName: 'Khóa A', showProgress: false, ctaText: 'Tham gia' }, sections: [], name: 'Khóa A' }
  await act(async () => root.render(React.createElement(View, { coursePage, course: { id: 1, name_lop: 'Khóa A' }, session: null, wi300Breadcrumb: React.createElement(Breadcrumb, { title: 'Khóa A' }) })))
  assert.equal(document.querySelectorAll('nav:not([aria-label])').length, 1, 'Một menu riêng của template')
  assert.ok(document.querySelector('nav.sticky'))
  assert.equal(document.querySelector('[aria-current="page"]').textContent, 'Khóa A')
  await act(async () => root.render(React.createElement(View, { coursePage: { ...coursePage, theme: { importedLayout: true } }, course: { id: 1 }, session: null, wi300Breadcrumb: React.createElement(Breadcrumb, { title: 'Khóa A' }) })))
  assert.equal(document.querySelectorAll('nav:not([aria-label])').length, 0, 'HTML import không nhận thêm menu')
  const SpaceModule = load('components/wi300/Wi300PersonalSpace.tsx', {
    'next/dynamic': { __esModule: true, default: () => () => null },
    'next/link': link, 'next-auth/react': { useSession: () => ({ data: { user: { role: 'STUDENT', name: 'Lucy' } } }) },
    'next/navigation': { useSearchParams: () => new URLSearchParams('tab=learning'), useRouter: () => ({ refresh() {} }) },
    '@/components/course/CourseCard': { __esModule: true, default: ({ course }) => React.createElement('article', null, course.name_lop) },
    '@/lib/wi300/catalog': load('lib/wi300/catalog.ts'),
    '@/lib/wi300/personal-space': load('lib/wi300/personal-space.ts', { './catalog': load('lib/wi300/catalog.ts') }),
  })
  assert.equal(SpaceModule.canUseTool('STUDENT', ['ADMIN']), false)
  assert.equal(SpaceModule.canUseTool('TEACHER', ['STUDENT']), true)
  assert.equal(SpaceModule.canUseTool('ADMIN', ['DEVELOPER']), false)
  assert.equal(SpaceModule.canUseTool('ADMIN', ['TEACHER']), true)
  const savedFetch = global.fetch
  global.fetch = async () => ({ ok: true, json: async () => ({ tools: [] }) })
  try {
    await act(async () => root.render(React.createElement(SpaceModule.default, { courses: courses.map(c => ({ ...c, name_lop: `Khóa ${c.id}` })), enrollments: rows, userId: 1, userPhone: null, accountError: false })))
    assert.match(document.querySelector('h1').textContent, /Học tập/)
    assert.equal(document.querySelectorAll('article').length, 4)
    assert.deepEqual([...document.querySelectorAll('[role="tab"]')].map(h => h.textContent), ['Đang học (4)', 'Đã hoàn thành (2)', 'Chờ xử lý (1)'])
    await act(async () => document.getElementById('learning-tab-completed').click())
    assert.equal(document.querySelectorAll('article').length, 2)
    await act(async () => document.getElementById('learning-tab-pending').click())
    assert.equal(document.querySelectorAll('article').length, 1)
    assert.equal(document.querySelector('a[href="/my-space?tab=pages"]').textContent, 'Website & nội dung')
  } finally { global.fetch = savedFetch }
  pathname = '/tools/posts'
  await act(async () => renderShell())
  assert.equal(document.querySelector('h1').textContent, 'Bài viết cộng đồng')
  assert.ok(document.querySelector('div.max-w-7xl.px-4'), 'Trang mặc định có khung và khoảng lề')
  assert.match(document.querySelector('[aria-label="Đường dẫn trang"]').textContent, /Không gian của tôi/)
  pathname = '/page/custom-template'
  await act(async () => renderShell())
  assert.equal(document.querySelector('[aria-label="Đường dẫn trang"]'), null, 'Không bọc trang template riêng')
  assert.equal(document.querySelectorAll('footer').length, 0, 'Giữ footer của template riêng')
  let currentBrand = null
  const favicon = load('app/favicon.ico/route.ts', { '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => currentBrand } })
  let response = await favicon.GET(new Request('https://old.example.com/favicon.ico'))
  assert.equal(response.headers.get('location'), 'https://old.example.com/pwa/platform-favicon.ico')
  currentBrand = brand
  response = await favicon.GET(new Request('https://wi300.vn/favicon.ico'))
  assert.equal(response.headers.get('location'), brand.iconUrl)
  assert.match(response.headers.get('cache-control'), /no-store/)
  await act(async () => root.unmount())
  dom.window.close()
  console.log('WI300 navigation: recent active courses, separate SEO/assets, real menu routes, forward/Back/hash/notification scroll, template ownership and breadcrumb passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
