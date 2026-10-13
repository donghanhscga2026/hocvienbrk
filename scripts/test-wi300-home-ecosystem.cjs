// Render giao diện thật với dữ liệu cách ly; không đọc hoặc ghi database thật.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const ts = require('typescript'), React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { JSDOM } = require('jsdom')
function load(file, mocks = {}) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : require(name), mod, mod.exports)
  return mod.exports
}
const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
const image = { __esModule: true, default: ({ priority, sizes, ...props }) => React.createElement('img', props) }
const shared = load('lib/wi300/projects.ts')
const Businesses = load('components/wi300/Wi300Businesses.tsx', { 'next/link': link, 'next/image': image, '@/lib/wi300/projects': shared })
const Home = load('components/wi300/Wi300HomeClient.tsx', {
  'next/link': link, 'next/image': image, 'next/dynamic': { __esModule: true, default: () => () => null },
  'next/navigation': { useSearchParams: () => new URLSearchParams() },
  '@/components/course/CourseCard': { __esModule: true, default: () => React.createElement('article', { 'data-course': true }) },
  '@/app/actions/course-actions': { checkEnrollmentStatusAction: async () => ({ status: 'PENDING' }) },
  '@/lib/wi300/catalog': load('lib/wi300/catalog.ts'), './Wi300Businesses': Businesses,
  './Wi300PersonalSpace': { __esModule: true, default: () => null },
  './Wi300Teachers': { __esModule: true, default: () => React.createElement('div', { 'data-teachers': true }) },
}).default
const base = { brand: { name: 'WI300', tagline: 'Cùng phát triển' }, courses: [], enrollments: [], userId: null, userPhone: null, loggedIn: false, catalogError: false, accountError: false }
function render(props) { return new JSDOM(renderToStaticMarkup(React.createElement(Home, { ...base, ...props }))) }
async function run() {
  const projects = Array.from({ length: 12 }, (_, i) => ({ ...shared.publicProject(shared.projectDefaults[0]), slug: 'project-' + i, name: 'Dự án ' + i, description: 'Mô tả ' + i, logo: i === 0 ? '' : '/logo.png' }))
  let dom = render({ projects }), doc = dom.window.document
  assert.deepEqual([...doc.querySelectorAll('h2')].map(el => el.textContent), ['Bạn đang tìm gì?', 'Các dự án trong hệ sinh thái Wi', 'Bắt đầu cùng Wi'])
  assert.deepEqual([...doc.querySelectorAll('[aria-label="Nội dung khám phá"] a')].map(el => el.getAttribute('href')), ['/khoa-hoc', '/san-pham', '/dich-vu'])
  const cards = [...doc.querySelectorAll('#du-an-wi li')]
  assert.equal(cards.length, 9)
  for (const [i, card] of cards.entries()) {
    assert.equal(card.querySelector('h3').textContent, 'Dự án ' + i)
    assert.match(card.textContent, /Xem dự án/)
    assert.equal(card.querySelector('a').getAttribute('href'), '/du-an/project-' + i)
  }
  assert.ok(doc.querySelector('#du-an-wi a[href="/du-an"]'))
  assert.ok(doc.querySelector('#du-an-wi ul').classList.contains('sm:grid-cols-2'))
  assert.ok(doc.querySelector('#du-an-wi ul').classList.contains('lg:grid-cols-3'))
  assert.ok(doc.querySelector('[aria-labelledby="wi300-partner-title"] a[href="/doi-tac"]'))
  assert.equal(doc.querySelectorAll('[aria-label="Tìm giải pháp phù hợp"] a').length, 3)
  assert.equal(doc.querySelector('[data-course]'), null)
  assert.equal(doc.querySelector('[data-teachers]'), null)
  assert.doesNotMatch(doc.body.textContent, /tiêu biểu/)
  dom.window.close()
  for (const props of [{ projects: [] }, { projects, projectsError: true }]) {
    dom = render(props); doc = dom.window.document
    assert.equal(doc.querySelectorAll('#du-an-wi li').length, 0, 'Empty/error does not show default or stale projects')
    if (props.projectsError) assert.ok(doc.querySelector('#du-an-wi [role="alert"]'))
    dom.window.close()
  }
  // CTA đứng sau danh sách, hoạt động cả khi danh mục trống hoặc tạm lỗi.
  for (const props of [{ view: 'catalog' }, { view: 'catalog', catalogError: true }]) {
    dom = render(props); doc = dom.window.document
    const cta = doc.querySelector('[aria-labelledby="wi300-course-partner-title"]')
    assert.ok(cta)
    assert.match(cta.textContent, /Bạn muốn chia sẻ chuyên môn/)
    assert.equal(cta.querySelector('a').getAttribute('href'), '/doi-tac')
    assert.ok(doc.querySelector('#khoa-hoc').compareDocumentPosition(cta) & 4)
    assert.equal(doc.querySelector('[data-teachers]'), null, 'Teacher placement remains a proposal')
    dom.window.close()
  }
  let brand = null
  const source = [
    { slug: 'public', name: 'Public', published: true, offerings: [{ kind: 'PRODUCT', name: 'Sản phẩm thật', description: 'Sản phẩm', url: 'https://example.com/product' }, { kind: 'SERVICE', name: 'Dịch vụ thật', description: 'Dịch vụ', url: 'https://example.com/service' }] },
    { slug: 'private', name: 'Private', published: false, offerings: [{ kind: 'PRODUCT', name: 'Nội dung riêng', url: 'https://example.com/private' }] },
  ]
  const Catalog = load('components/wi300/WiOfferingCatalog.tsx', {
    'next/link': link, 'next/navigation': { notFound: () => { throw Error('404') } },
    '@/lib/prisma': { __esModule: true, default: {} },
    '@/lib/wi300/project-service': { readProjects: async () => source },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand },
  }).default
  await assert.rejects(() => Catalog({ kind: 'PRODUCT' }), /404/)
  brand = { name: 'WI300' }
  for (const kind of ['PRODUCT', 'SERVICE']) {
    dom = new JSDOM(renderToStaticMarkup(await Catalog({ kind }))); doc = dom.window.document
    assert.equal(doc.querySelectorAll('article').length, 1)
    assert.match(doc.querySelector('article').textContent, kind === 'PRODUCT' ? /Sản phẩm thật/ : /Dịch vụ thật/)
    assert.doesNotMatch(doc.body.textContent, /Nội dung riêng/)
    assert.equal(doc.querySelector('article a[target="_blank"]').getAttribute('rel'), 'noopener noreferrer')
    dom.window.close()
  }
  console.log('WI homepage: section order, real destinations, nine unique project cards, empty/error states, partner CTA, brand isolation and separate offering catalogs passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
