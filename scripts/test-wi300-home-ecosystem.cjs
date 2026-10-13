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
const image = { __esModule: true, default: ({ priority, sizes, unoptimized, ...props }) => React.createElement('img', props) }
const shared = load('lib/wi300/projects.ts')
const Businesses = load('components/wi300/Wi300Businesses.tsx', { 'next/link': link, 'next/image': image, '@/lib/wi300/projects': shared })
const Teachers = load('components/wi300/Wi300Teachers.tsx', {
  'next/link': link, 'next/image': image,
  './Wi300Businesses.module.css': { __esModule: true, default: { viewport: 'viewport', track: 'track', group: 'group', copy: 'copy', paused: 'paused' } },
})
let search = ''
const Home = load('components/wi300/Wi300HomeClient.tsx', {
  'next/link': link, 'next/image': image, 'next/dynamic': { __esModule: true, default: () => () => null },
  'next/navigation': { useSearchParams: () => new URLSearchParams(search) },
  '@/components/course/CourseCard': { __esModule: true, default: ({ course }) => React.createElement('article', { 'data-course': course.id }, course.name_lop) },
  '@/app/actions/course-actions': { checkEnrollmentStatusAction: async () => ({ status: 'PENDING' }) },
  '@/lib/wi300/catalog': load('lib/wi300/catalog.ts'), './Wi300Businesses': Businesses,
  './Wi300PersonalSpace': { __esModule: true, default: () => null },
  './Wi300Teachers': Teachers,
}).default
const base = { brand: { name: 'WI300', tagline: 'Cùng phát triển' }, courses: [], enrollments: [], userId: null, userPhone: null, loggedIn: false, catalogError: false, accountError: false }
function render(props) { return new JSDOM(renderToStaticMarkup(React.createElement(Home, { ...base, ...props }))) }
async function run() {
  const projects = Array.from({ length: 12 }, (_, i) => ({ ...shared.publicProject(shared.projectDefaults[0]), slug: 'project-' + i, name: 'Dự án ' + i, description: 'Mô tả ' + i, logo: i === 0 ? '' : '/logo.png' }))
  let dom = render({ projects }), doc = dom.window.document
  assert.deepEqual([...doc.querySelectorAll('h2')].map(el => el.textContent), ['Bạn đang tìm gì?', 'Khám phá hệ sinh thái Wi', 'Bắt đầu cùng Wi'])
  assert.deepEqual([...doc.querySelectorAll('[aria-label="Nội dung khám phá"] a')].map(el => el.getAttribute('href')), ['/khoa-hoc', '/san-pham', '/dich-vu'])
  const cards = [...doc.querySelectorAll('#du-an-wi li')]
  assert.equal(cards.length, 8)
  for (const [i, card] of cards.entries()) {
    assert.equal(card.querySelector('h3').textContent, 'Dự án ' + i)
    assert.match(card.textContent, /Khám phá dự án/)
    assert.equal(card.querySelector('a').getAttribute('href'), '/du-an/project-' + i)
  }
  assert.ok(doc.querySelector('#du-an-wi a[href="/du-an"]'))
  assert.ok(doc.querySelector('#du-an-wi ul').classList.contains('lg:grid-cols-2'))
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
    assert.equal(doc.querySelector('#giang-vien'), null, 'Empty catalog does not invent teacher profiles')
    dom.window.close()
  }
  const courses = [
    { id: 1, teacherId: 8, name_lop: 'Khóa AI', teacher: { name: 'Hương Lucy', image: '/lucy.png' }, phi_coc: 0 },
    { id: 2, teacherId: 9, name_lop: 'Khóa kỹ năng', teacher: { name: 'Hoàng Thu Hà', image: '/ha.png' }, phi_coc: 0 },
    { id: 3, teacherId: 10, name_lop: 'Khóa kinh doanh', teacher: { name: 'Cương Leo', image: null }, phi_coc: 0 },
  ]
  dom = render({ view: 'catalog', courses }); doc = dom.window.document
  const teachers = doc.querySelector('#giang-vien')
  assert.ok(doc.querySelector('#khoa-hoc').compareDocumentPosition(teachers) & 4)
  assert.ok(teachers.compareDocumentPosition(doc.querySelector('[aria-labelledby="wi300-course-partner-title"]')) & 4)
  assert.equal(teachers.querySelectorAll('ul[aria-label] li').length, 2, 'Only selected teachers with photos appear')
  assert.match(teachers.querySelector('h2').textContent, /Đội ngũ giảng viên/)
  assert.ok(teachers.querySelector('a[href="/khoa-hoc?q=H%C6%B0%C6%A1ng%20Lucy"]'))
  assert.equal(teachers.querySelectorAll('ul[aria-hidden="true"]').length, 0, 'No repeated marquee copies')
  assert.ok(teachers.querySelector('a[href="/giang-vien"]'))
  dom.window.close()
  // Danh sách giới thiệu không cố định ba người, khử trùng và giới hạn tám.
  const profiles = Array.from({ length: 12 }, (_, i) => ({ id: i, name: 'Giảng viên ' + i, image: '/teacher.png', count: 1 }))
  for (const directory of [false, true]) {
    dom = new JSDOM(renderToStaticMarkup(React.createElement(Teachers.default, { teachers: [...profiles, profiles[0], { id: 99, name: 'Không ảnh', count: 1, image: '' }], catalogError: false, directory })))
    doc = dom.window.document
    assert.equal(doc.querySelectorAll('ul li').length, directory ? 12 : 8)
    assert.equal(doc.querySelectorAll('ul[aria-hidden]').length, 0)
    if (directory) assert.equal(doc.querySelector('h1').textContent, 'Đội ngũ giảng viên')
    dom.window.close()
  }
  dom = render({ view: 'teachers', courses }); doc = dom.window.document
  assert.ok(doc.querySelector('#giang-vien h1'))
  assert.equal(doc.querySelector('#khoa-hoc'), null)
  assert.equal(doc.querySelector('[aria-labelledby="wi300-course-partner-title"] a').getAttribute('href'), '/doi-tac')
  dom.window.close()
  // Giảng viên ngoài danh sách tên cũ vẫn hiện; khóa cùng ID chỉ tạo một thẻ.
  const newCourses = [
    { id: 51, teacherId: 50, name_lop: 'Khóa mới', phi_coc: 0, teacher: { name: 'Giảng viên mới', image: null } },
    { id: 52, teacherId: 50, name_lop: 'Khóa tiếp theo', phi_coc: 0, teacher: { name: 'Giảng viên mới', image: '/new.png' } },
    { id: 53, teacherId: 51, name_lop: 'Khóa người trùng tên', phi_coc: 0, teacher: { name: 'Giảng viên mới', image: '/other.png' } },
    { id: 54, teacherId: 52, name_lop: 'Không ảnh', phi_coc: 0, teacher: { name: 'Người không ảnh', image: '' } },
  ]
  dom = render({ view: 'teachers', courses: newCourses }); doc = dom.window.document
  assert.equal(doc.querySelectorAll('#giang-vien li').length, 2)
  assert.match(doc.querySelector('#giang-vien li').textContent, /2 khóa học/)
  assert.ok(doc.querySelector('#giang-vien img[src="/new.png"]'))
  assert.equal(doc.querySelector('#wi300-course-partner-title br'), null)
  assert.equal(doc.querySelector('#wi300-course-partner-title').textContent, 'Bạn muốn chia sẻ chuyên môn?')
  dom.window.close()
  let directoryBrand = null
  const DirectoryPage = load('app/giang-vien/page.tsx', {
    'next/navigation': { notFound: () => { throw Error('404') } },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => directoryBrand },
    '@/lib/get-session': { getSession: async () => null },
    '@/components/wi300/Wi300Home': { __esModule: true, default: () => null },
  }).default
  await assert.rejects(() => DirectoryPage(), /404/)
  directoryBrand = base.brand
  assert.equal((await DirectoryPage()).props.view, 'teachers')
  // Chuyển URL trên cùng component phải đổi kết quả, không giữ từ khóa cũ.
  const ui = new JSDOM('<div id="root"></div>', { url: 'https://example.com/khoa-hoc' })
  global.window = ui.window; global.document = ui.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: ui.window.navigator })
  const renderer = require('react-dom/client').createRoot(document.getElementById('root'))
  try {
    await React.act(async () => renderer.render(React.createElement(Home, { ...base, view: 'catalog', courses })))
    assert.equal(document.querySelectorAll('[data-course]').length, 3)
    search = 'q=' + encodeURIComponent('Hương Lucy')
    await React.act(async () => renderer.render(React.createElement(Home, { ...base, view: 'catalog', courses })))
    assert.equal(document.querySelectorAll('[data-course]').length, 1)
    assert.equal(document.querySelector('[data-course]').getAttribute('data-course'), '1')
    assert.equal(document.querySelector('input[type="search"]').value, 'Hương Lucy')
    search = ''
    await React.act(async () => renderer.render(React.createElement(Home, { ...base, view: 'catalog', courses })))
    assert.equal(document.querySelectorAll('[data-course]').length, 3)
  } finally { await React.act(async () => renderer.unmount()); ui.window.close(); search = '' }
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
  console.log('WI homepage: section order, real destinations, eight unique project cards, empty/error states, partner CTA, brand isolation and separate offering catalogs passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
