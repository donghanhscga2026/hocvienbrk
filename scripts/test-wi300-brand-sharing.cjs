const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { act } = React
function load(file, mocks = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : require(name), module, module.exports)
  return module.exports
}
async function run() {
  const { getDeploymentBrand } = load('lib/site-profile/deployment-brand.ts')
  assert.equal(getDeploymentBrand({}), null, 'Web cũ không đổi bảng màu')
  const brand = getDeploymentBrand({ SITE_VARIANT: 'wi300' })
  const { websiteTheme, contrastRatio } = load('lib/website/theme.ts')
  const theme = websiteTheme(brand.palette.primary, brand.palette.background, brand.palette)
  assert.ok(contrastRatio(brand.palette.primary, '#ffffff') >= 4.5)
  assert.ok(contrastRatio(theme.style['--color-accent'], theme.style['--color-on-accent']) >= 4.5)
  const css = fs.readFileSync(path.join(__dirname, '../components/wi300/Wi300Businesses.module.css'), 'utf8')
  assert.match(css, /translateX\(-50%\)/)
  assert.match(css, /prefers-reduced-motion: reduce/)

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://www.wi300.vn/' })
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = require('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
  const image = { __esModule: true, default: ({ fill, priority, unoptimized, ...props }) => React.createElement('img', props) }
  const styles = { viewport: 'viewport', track: 'track', group: 'group', copy: 'copy', paused: 'paused' }
  const Business = load('components/wi300/Wi300Businesses.tsx', { 'next/image': image, './Wi300Businesses.module.css': { __esModule: true, default: styles } }).default
  await act(async () => root.render(React.createElement(Business)))
  assert.equal(document.querySelectorAll('ul[aria-label] li').length, 7)
  assert.equal(document.querySelectorAll('ul[aria-hidden="true"] li').length, 7)
  await act(async () => document.querySelector('button').click())
  assert.equal(document.querySelector('button').getAttribute('aria-pressed'), 'true')
  assert.ok(document.querySelector('.viewport.paused'))
  await act(async () => document.querySelector('button').click())
  assert.equal(document.querySelector('.viewport.paused'), null)

  let domainBrand = null
  const Share = load('components/share/ShareModal.tsx', { '@/components/website/DomainShell': { useDomainBrand: () => domainBrand } }).default
  const Card = load('components/course/CourseCard.tsx', {
    'next/image': image, 'next/link': link, 'next/navigation': { useRouter: () => ({ refresh() {} }) },
    'next/dynamic': { __esModule: true, default: loader => String(loader).includes('ShareModal') ? Share : () => null },
    '@/app/actions/course-actions': { getBrkMbvBalanceAction: async () => 0 },
    '@/lib/affiliate/get-client-ref': { getClientRef: () => null }, '@/lib/image-validation': { isValidImageUrl: () => false },
  }).default
  const course = { id: 17, id_khoa: 'A/B & C', name_lop: 'Kích hoạt dòng tiền', teacher: { name: 'Hoàng Thu Hà' }, phi_coc: 199000, feeType: 'PHI_TOI_THIEU', mo_ta_ngan: 'Phù hợp nếu bạn cần một bước nhẹ.', _count: { lessons: 1, enrollments: 17 } }
  const props = { course, isLoggedIn: true, userId: 42, shareSiteName: 'WI300' }
  await act(async () => root.render(React.createElement(Card, props)))
  for (const text of ['Kích hoạt dòng tiền', 'Hoàng Thu Hà', '199.000', 'Phí tối thiểu', '1 bài', '17 thành viên', 'Phù hợp', 'Xem thêm', 'Kích hoạt ngay', 'Chia sẻ']) assert.ok(document.body.textContent.includes(text), text)
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Chia sẻ').click())
  const ownUrl = 'https://www.wi300.vn/khoa-hoc/A%2FB%20%26%20C?ref=42'
  assert.ok(document.body.textContent.includes(ownUrl), 'Link dùng đúng domain WI300 và mã người chia sẻ')
  let opened
  window.open = url => { opened = url }
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Telegram').click())
  assert.equal(new URL(opened).searchParams.get('url'), ownUrl)
  assert.match(new URL(opened).searchParams.get('text'), /WI300/)
  await act(async () => root.render(React.createElement(Card, { ...props, isLoggedIn: false, userId: null })))
  assert.ok(!document.body.textContent.includes('?ref=42'), 'Đăng xuất không giữ mã affiliate của phiên trước')
  assert.match(document.body.textContent, /Đăng nhập để có link affiliate/)
  await act(async () => root.render(React.createElement(Card, { ...props, userId: 0 })))
  assert.ok(document.body.textContent.includes('?ref=0'), 'Không bỏ mất userId bằng 0')
  domainBrand = { affiliate: false }
  await act(async () => root.render(React.createElement(Card, { ...props, userId: 0 })))
  assert.equal(document.querySelector('button')?.textContent === 'Telegram', false)
  assert.equal(document.body.textContent.includes('?ref=0'), false, 'Domain tắt affiliate vẫn giữ giới hạn cũ')
  domainBrand = null
  await act(async () => root.render(React.createElement(Card, { ...props, shareSiteName: undefined })))
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Telegram').click())
  assert.match(new URL(opened).searchParams.get('text'), /Cộng đồng học tập MFC/, 'Web cũ giữ tiêu đề chia sẻ')
  await act(async () => root.unmount())
  dom.window.close()
  console.log('WI300 green palette, contrast, six-business motion/pause, complete course card and current-account affiliate sharing passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
