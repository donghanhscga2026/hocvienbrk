/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const React = require('react')
const { JSDOM } = require('jsdom')
const { renderToStaticMarkup } = require('react-dom/server')
const load = require('./helpers/load-ts.cjs')
async function run() {
  const shared = load('lib/offerings/shared.ts')
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/san-pham' })
  global.window = dom.window; global.document = dom.window.document
  Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
  global.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = require('react-dom/client'), { act } = React
  const root = createRoot(document.getElementById('root'))
  const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
  const Catalog = load('components/offerings/OfferingCatalog.tsx', {
    'next/link': link, 'next-auth/react': { useSession: () => ({ data: { user: { id: '0' } } }) },
    '@/components/course/CourseProjectBadges': { __esModule: true, default: ({ projects }) => React.createElement('div', null, projects.map(p => p.name).join(', ')) },
    './OfferingShare': { __esModule: true, default: ({ userId }) => React.createElement('button', { 'data-share-user': userId }, 'Chia sẻ') },
  }).default
  const items = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, id_khoa: 'item-' + i, name_lop: 'Sản phẩm ' + i, phi_coc: i * 10000, category: 'AI', teacher: { name: 'Expert' }, projects: [{ slug: i % 2 ? 'b' : 'a', name: i % 2 ? 'Project B' : 'Project A', logo: '' }], details: shared.publicOfferingDetails(shared.parseOfferingDetails({ kind: i % 2 ? 'APP' : 'EBOOK' })) }))
  await act(async () => root.render(React.createElement(Catalog, { group: 'DIGITAL', items })))
  assert.equal(document.querySelectorAll('article').length, 9)
  assert.equal(document.querySelectorAll('[data-share-user="0"]').length, 9)
  const change = async (label, value) => act(async () => { const el = document.querySelector(`[aria-label="${label}"]`); el.value = value; el.dispatchEvent(new window.Event('change', { bubbles: true })) })
  await change('Chọn trang dưới', '2'); assert.equal(document.querySelectorAll('article').length, 3)
  await change('Lọc dự án', 'b'); assert.equal(document.querySelectorAll('article').length, 6)
  assert.equal(document.querySelector('[aria-label="Chọn trang trên"]').value, '1')
  await change('Sắp xếp', 'PRICE_DESC'); assert.ok(document.querySelector('article h2').textContent.includes('11'))
  await change('Lọc giá', 'FREE'); assert.equal(document.querySelectorAll('article').length, 0)
  await act(async () => [...document.querySelectorAll('button')].find(b => b.textContent === 'Xóa bộ lọc').click())
  assert.equal(document.querySelectorAll('article').length, 9)
  const Resources = load('components/offerings/OfferingResources.tsx', { 'next/link': link }).default
  await act(async () => root.render(React.createElement(Resources, { active: true, resources: [{ title: 'PDF', kind: 'EBOOK', url: 'https://example.com/pdf' }, { title: 'App', kind: 'APP', url: 'https://example.com/app' }] })))
  await act(async () => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Ebook')).click())
  assert.equal(document.querySelectorAll('article').length, 1)
  assert.equal(document.querySelector('article a').href, 'https://example.com/pdf')
  await act(async () => root.render(React.createElement(Resources, { active: false, resources: [] })))
  assert.ok(document.body.textContent.includes('Kích hoạt sản phẩm'))
  const RichText = load('components/offerings/OfferingRichText.tsx').default
  const html = renderToStaticMarkup(React.createElement(RichText, { text: '<script>alert(1)</script><a href="javascript:alert(1)" onclick="evil()">Link</a><p>**Bold**</p><a href="https://example.com">Safe</a>' }))
  assert.ok(!html.includes('<script') && !html.includes('javascript:') && !html.includes('onclick'))
  assert.ok(html.includes('<strong>Bold</strong>') && html.includes('href="https://example.com"'))
  let pathname = '/san-pham/item'
  window.scrollTo = () => {}
  const Shell = load('components/wi300/Wi300Shell.tsx', {
    'next/navigation': { usePathname: () => pathname }, 'next/link': link,
    './Wi300Header': { __esModule: true, default: () => React.createElement('header', { 'data-test-header': true }) },
    './Wi300Footer': { __esModule: true, default: () => React.createElement('footer', { 'data-test-footer': true }) },
    './Wi300ManagementFrame': { __esModule: true, default: ({ children }) => children },
  }).default
  for (const route of ['/san-pham/item', '/dich-vu/item', '/san-pham/item/su-dung', '/dich-vu/item/su-dung']) {
    pathname = route
    await act(async () => root.render(React.createElement(Shell, null, React.createElement('main', null, 'Detail'))))
    assert.equal(document.querySelectorAll('[data-test-header]').length, 1)
    assert.equal(document.querySelectorAll('[data-test-footer]').length, 1)
  }
  await act(async () => root.unmount()); dom.window.close()
  console.log('Offerings UI: project/price filters, sorting, synchronized pagination, account zero sharing, resource navigation, sanitized rich text and detail shell passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
