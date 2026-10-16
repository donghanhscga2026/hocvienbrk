// Real React navigation with isolated session/API fixtures; no production data.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript'), React = require('react'), { JSDOM } = require('jsdom')
const repo = path.resolve(__dirname, '..'), cache = new Map()
const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.invalid/tools/courses/new?id=7' })
global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
let route = '/tools/courses/new', query = new URLSearchParams('id=7'), session = { user: { id: '0', role: 'ADMIN' } }, fail = false, requests = 0
const tools = [
  { id: 1, slug: 'courses', name: 'Quản lý khóa học', url: '/tools/courses', roles: ['TEACHER'], isActive: true },
  { id: 2, slug: 'crm', name: 'CRM', url: '/tools/crm', roles: ['TEACHER'], isActive: true },
  { id: 3, slug: 'pages', name: 'Quản lý Page', url: '/tools/pages', roles: ['TEACHER'], isActive: true },
  { id: 4, slug: 'wi-projects', name: 'Dự án', url: '/du-an/quan-ly', roles: ['ADMIN'], isActive: true },
  { id: 5, slug: 'settings', name: 'Cài đặt hệ thống', url: '/tools/settings', roles: ['ADMIN'], isActive: true },
  { id: 6, slug: 'dev-flow', name: 'Developer only', url: '/tools/dev-flow', roles: ['DEVELOPER'], isActive: true },
  { id: 7, name: 'Unsafe', url: 'javascript:alert(1)', roles: [], isActive: true },
  { id: 8, slug: 'crm', name: 'Duplicate CRM', url: '/tools/crm', roles: ['TEACHER'], isActive: true },
  { id: 9, slug: 'reserved-ids', name: 'Số đẹp', url: '/tools/reserved-ids', roles: ['ADMIN'], isActive: true },
  { id: 10, slug: 'wi-appearance', name: 'Giao diện website', url: '/tools/wi-appearance', roles: ['ADMIN'], isActive: true },
]
const mocks = {
  'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  'next/navigation': { usePathname: () => route, useSearchParams: () => query },
  'next-auth/react': { useSession: () => ({ data: session, status: session ? 'authenticated' : 'unauthenticated' }) },
}
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name]
    if (!name.startsWith('@/') && !name.startsWith('./')) return require(name)
    const base = name.startsWith('@/') ? name.slice(2) : path.posix.join(path.posix.dirname(file), name)
    const resolved = ['.ts', '.tsx'].map(ext => base + ext).find(candidate => fs.existsSync(path.join(repo, candidate)))
    return load(resolved)
  }, mod, mod.exports)
  cache.set(file, mod.exports); return mod.exports
}
const model = load('lib/wi300/management-navigation.ts')
for (const role of ['guest', 'STUDENT', 'TEACHER', 'ADMIN', 'DEVELOPER']) {
  const groups = model.managementNavigation(role, tools), links = groups.flatMap(group => group.items.map(item => item.href))
  assert.equal(links.includes('/tools/crm'), ['ADMIN', 'TEACHER'].includes(role))
  assert.equal(links.includes('/tools/settings'), role === 'ADMIN')
  assert.equal(links.includes('/tools/dev-flow'), role === 'DEVELOPER')
  assert.equal(links.filter(href => href === '/tools/crm').length, ['ADMIN', 'TEACHER'].includes(role) ? 1 : 0)
  assert.ok(!links.some(href => href.startsWith('javascript:')))
}
for (const pathname of ['/my-space', '/tools', '/tools/crm', '/tools/courses/pages/one', '/du-an/quan-ly', '/account-settings']) assert.equal(model.isManagementRoute(pathname), true)
for (const pathname of ['/', '/khoa-hoc/AI', '/courses/AI/learn', '/page/lucy', '/tools/courses/templates/preview']) assert.equal(model.isManagementRoute(pathname), false)
const groups = model.managementNavigation('ADMIN', tools)
assert.deepEqual(groups, load('lib/wi300/personal-space.ts').spaceNavigation('ADMIN', tools), 'Cards, header and sidebar have one model')
assert.deepEqual(groups.map(group => group.label), ['Tổng quan', 'Học tập', 'Giảng dạy', 'Cộng tác viên', 'Quản lý & kinh doanh', 'Quản trị website', 'Công cụ & tiện ích', 'Tài khoản & tài chính', 'Quản trị hệ thống'])
assert.ok(groups.find(group => group.id === 'admin').items.some(item => item.href === '/tools/reserved-ids'))
assert.ok(groups.find(group => group.id === 'website-admin').items.some(item => item.href === '/tools/wi-appearance'))
assert.deepEqual(groups.find(group => group.id === 'website-admin').items.map(item => item.label), ['Cấu hình chung', 'Trang', 'Bài viết'])
assert.ok(groups.find(group => group.id === 'business').items.some(item => item.href === '/tools/pages'))
assert.equal(groups.some(group => group.id === 'pages'), false)
assert.equal(model.managementLocation('/tools/wi-appearance', new URLSearchParams('page=courses'), groups).back.href, '/tools/wi-appearance')
assert.ok(!groups.find(group => group.id === 'admin').items.some(item => item.href === '/tools/wi-appearance'))
assert.equal(model.managementNavigation('TEACHER', tools).some(group => group.id === 'website-admin'), false)
assert.equal(model.managementLocation('/tools/wi-website', new URLSearchParams('section=seo'), groups).title, 'Cấu hình chung')
assert.equal(model.managementLocation('/tools/wi-website', new URLSearchParams('section=footer'), groups).title, 'Cấu hình chung')
assert.equal(model.managementLocation('/tools/wi-website', new URLSearchParams(), groups).groupId, 'website-admin')
assert.ok(groups.find(group => group.id === 'business').items.some(item => item.href === '/du-an/quan-ly'))
assert.equal(model.managementLocation('/tools/courses/templates/legacy', new URLSearchParams('courseId=7&name=AI'), groups).back.href, '/tools/courses/new?id=7&tab=sales')
assert.equal(model.managementLocation('/tools/courses/templates', new URLSearchParams('courseId=https://evil.invalid'), groups).back.href, '/tools/courses')
assert.equal(model.managementLocation('/tools/crm', new URLSearchParams(), groups).groupId, 'business')
for (const role of ['TEACHER', 'ADMIN']) {
  for (const path of ['/tools/pages', '/tools/site-profiles/new', '/tools/site-profiles/7/edit', '/tools/my-site/manage', '/tools/my-site/edit', '/tools/my-site/pages/about/template']) {
    assert.equal(model.managementLocation(path, new URLSearchParams('profileId=7'), model.managementNavigation(role, tools)).groupId, 'business', role + ': ' + path)
  }
}
assert.equal(model.managementLocation('/tools/my-site/edit', new URLSearchParams('profileId=7'), groups).back.href, '/tools/my-site/manage?profileId=7')
assert.equal(model.managementLocation('/tools/my-site/edit', new URLSearchParams('profileId=https://evil.invalid'), groups).back.href, '/tools/my-site/manage')
assert.equal(model.isPageManagementRoute('/tools/my-site-other'), false)
assert.equal(model.managementLocation('/du-an/quan-ly', new URLSearchParams('project=wi-tech'), groups).back.href, '/du-an/quan-ly')
assert.equal(model.managementLocation('/du-an/noi-dung', new URLSearchParams('project=wi-tech'), groups).back.href, '/du-an/quan-ly?project=wi-tech')
assert.equal(model.managementLocation('/tools/courses/7/lib-access', new URLSearchParams(), groups).back.href, '/tools/courses/new?id=7')
for (const role of ['TEACHER', 'INSTRUCTOR', 'ADMIN', 'STUDENT']) {
  const nav = model.managementNavigation(role, tools)
  for (const id of ['0', '71']) {
    const own = model.managementLocation('/ho-so-hoc-tap/' + id, new URLSearchParams('course=7'), nav, id)
    assert.equal(own.groupId, 'learning', role + ': own learning belongs to Học tập')
    assert.equal(own.back.href, '/my-space?tab=learning')
    const other = model.managementLocation('/ho-so-hoc-tap/99', new URLSearchParams(), nav, id)
    assert.equal(other.groupId, role === 'STUDENT' ? 'learning' : 'teaching')
  }
}
assert.equal(model.managementLocation('/ho-so-hoc-tap/0', new URLSearchParams(), groups, null).groupId, 'learning', 'No teaching expansion while session loads')
const Frame = load('components/wi300/Wi300ManagementFrame.tsx').default, Workspace = load('components/layout/ManagementWorkspace.tsx').default
const root = require('react-dom/client').createRoot(document.getElementById('root'))
const originalFetch = global.fetch
global.fetch = async () => { requests++; return { ok: !fail, json: async () => ({ tools }) } }
const render = () => root.render(React.createElement(Frame, null, React.createElement(Workspace, { active: 'courses', appearance: 'forest' }, React.createElement('section', { className: 'rounded-xl border border-brk-outline bg-white p-5' }, React.createElement('h1', { className: 'text-2xl font-bold' }, 'Khóa học thực hành AI'), React.createElement('p', null, 'Thông tin · Bài giảng · Học viên · Trang bán khóa học')))))
async function click(label) { await React.act(async () => { const node = document.querySelector('[aria-label="' + label + '"]') || [...document.querySelectorAll('button')].find(node => node.textContent === label); assert.ok(node, label); node.click() }) }
function snapshot(name) { if (process.env.MANAGEMENT_UI_SNAPSHOT_DIR) { fs.mkdirSync(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, name + '.html'), document.getElementById('root').innerHTML) } }
async function run() {
  try {
    await React.act(async () => render())
    assert.equal(document.querySelectorAll('[aria-label="Menu quản lý chung"]').length, 1)
    assert.equal(document.querySelectorAll('[aria-label="Khu vực quản lý"]').length, 0, 'Nested management page cannot add a second sidebar')
    assert.equal(requests, 1)
    await click('Mở hoặc đóng menu quản lý'); assert.equal(document.querySelector('[aria-label="Mở hoặc đóng menu quản lý"]').getAttribute('aria-expanded'), 'true')
    snapshot('unified-course-navigation')
    route = '/tools/crm'; query = new URLSearchParams()
    await React.act(async () => render())
    assert.equal(document.querySelector('[aria-label="Mở hoặc đóng menu quản lý"]').getAttribute('aria-expanded'), 'false', 'Navigation closes mobile menu')
    assert.equal(document.querySelector('[aria-label="Menu quản lý chung"] a[aria-current="page"]').textContent, 'Quản lý & kinh doanh')
    assert.equal(requests, 1, 'Switching areas reuses the same loaded menu')
    session = { user: { id: '71', role: 'TEACHER' } }
    route = '/tools/site-profiles/new'; query = new URLSearchParams()
    await React.act(async () => render())
    assert.equal(document.querySelector('[aria-label="Menu quản lý chung"] a[aria-current="page"]').textContent, 'Quản lý & kinh doanh')
    assert.equal(document.querySelector('a[href="/tools/pages"]').getAttribute('aria-current'), 'page')
    route = '/ho-so-hoc-tap/71'; query = new URLSearchParams('course=7')
    await React.act(async () => render())
    assert.equal(document.querySelector('[aria-label="Các mục Học tập"]').getAttribute('aria-expanded'), 'true')
    assert.equal(document.querySelector('[aria-label="Các mục Giảng dạy"]').getAttribute('aria-expanded'), 'false')
    assert.equal(document.querySelector('a[href="/ho-so-hoc-tap"]').getAttribute('aria-current'), 'page')
    assert.equal(document.querySelector('[aria-label="Menu quản lý chung"] a[aria-current="page"]').textContent, 'Học tập')
    route = '/ho-so-hoc-tap/99'
    await React.act(async () => render())
    assert.equal(document.querySelector('[aria-label="Các mục Giảng dạy"]').getAttribute('aria-expanded'), 'true')
    assert.equal(document.querySelector('a[href="/ho-so-hoc-tap"]').getAttribute('aria-current'), null)
    session = { user: { id: '0', role: 'ADMIN' } }
    route = '/tools/courses/templates/legacy'; query = new URLSearchParams('courseId=7&name=Khóa AI')
    await React.act(async () => render())
    assert.ok([...document.querySelectorAll('a')].some(node => node.textContent === 'Về khóa học này' && node.getAttribute('href') === '/tools/courses/new?id=7&tab=sales'))
    snapshot('unified-template-navigation')
    session = { user: { id: '8', role: 'STUDENT' } }
    await React.act(async () => render())
    assert.ok(!document.querySelector('[aria-label="Menu quản lý chung"] a[href="/tools/crm"]'), 'Previous admin tools are removed when account changes')
    fail = true; session = { user: { id: '9', role: 'TEACHER' } }
    await React.act(async () => render()); assert.ok(document.body.textContent.includes('Tải lại menu'))
    fail = false; await click('Tải lại menu'); assert.ok(document.querySelector('a[href="/tools/crm"]'))
    console.log('PASS unified navigation: role isolation, URL guards, grouping/deduplication, route scope, one sidebar, mobile controls, contextual course return, account reset and retry')
  } finally { await React.act(async () => root.unmount()); dom.window.close(); global.fetch = originalFetch }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
