// Mock database, API and UI only; no live project is changed or deleted.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript'), React = require('react'), { JSDOM } = require('jsdom')
const repo = path.resolve(__dirname, '..')
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
function load(file, mocks = {}) {
  if (!fs.existsSync(path.join(repo, file)) && file.endsWith('.ts')) file += 'x'
  const mod = { exports: {} }, code = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : name === '@/lib/crm/service' || name === './service' ? { CrmError } : name.startsWith('@/') || name.startsWith('./') ? load(name.startsWith('@/') ? name.slice(2) + '.ts' : path.posix.join(path.posix.dirname(file), name + '.ts'), mocks) : require(name), mod, mod.exports)
  return mod.exports
}
async function run() {
  const shared = load('lib/wi300/projects.ts'), service = load('lib/wi300/project-service.ts')
  const rows = new Map(), users = new Map([[0, { role: 'ADMIN' }], [8, { role: 'TEACHER' }]])
  let writes = 0, queue = Promise.resolve(), failWrite = 0
  const db = { user: { findUnique: async ({ where }) => users.get(where.id) || null }, $executeRaw: async () => {}, systemConfig: {
    findMany: async ({ where }) => [...rows].filter(([key]) => where.key.in ? where.key.in.includes(key) : key.startsWith(where.key.startsWith)).map(([key, value]) => ({ key, value })),
    upsert: async ({ where, create, update }) => { writes++; if (writes === failWrite) throw new Error('Write failed'); rows.set(where.key, structuredClone(rows.has(where.key) ? update.value : create.value)) },
  }, $transaction: fn => { const result = queue.then(async () => { const before = structuredClone(rows); try { return await fn(db) } catch (error) { rows.clear(); for (const entry of before) rows.set(...entry); throw error } }); queue = result.catch(() => {}); return result } }
  const chosen = ['wi-art', 'wi-grow'].map(slug => ({ slug, revision: 0 }))
  await assert.rejects(() => service.bulkProjects(db, 8, { action: 'hide', projects: chosen }), error => error.status === 403); assert.equal(writes, 0)
  await assert.rejects(() => service.bulkProjects(db, 0, { action: 'hide', projects: [...chosen, chosen[0]] })); assert.equal(writes, 0)
  await assert.rejects(() => service.bulkProjects(db, 0, { action: 'hide', projects: [chosen[0], { ...chosen[1], revision: 99 }] }), error => error.status === 409); assert.equal(writes, 0, 'Validate every revision before writing')
  await assert.rejects(() => service.bulkProjects(db, 0, { action: 'delete', projects: [{ slug: 'missing', revision: 0 }] }), error => error.status === 409)
  const result = await service.bulkProjects(db, 0, { action: 'hide', projects: chosen }); assert.equal(result.count, 2)
  assert.ok(result.projects.every(project => !project.published && project.featured && project.showOnHomepage && project.revision === 1), 'Only requested flag changes')
  const concurrent = await Promise.allSettled([service.bulkProjects(db, 0, { action: 'publish', projects: chosen.map(item => ({ ...item, revision: 1 })) }), service.bulkProjects(db, 0, { action: 'feature', projects: chosen.map(item => ({ ...item, revision: 1 })) })])
  assert.equal(concurrent.filter(item => item.status === 'fulfilled').length, 1); assert.equal(concurrent.find(item => item.status === 'rejected').reason.status, 409)
  const prefix = shared.PROJECT_PREFIX, grow = rows.get(prefix + 'wi-grow'); grow.courseIds = [1]; grow.offerings = [{ kind: 'SERVICE', name: 'Service', description: '', url: 'https://example.invalid' }]
  const deleted = await service.bulkProjects(db, 0, { action: 'delete', projects: [{ slug: 'wi-grow', revision: 2 }] })
  assert.equal(deleted.projects[0].deleted, true); assert.deepEqual(rows.get(prefix + 'wi-grow').courseIds, [1]); assert.equal(rows.get(prefix + 'wi-grow').offerings.length, 1); assert.equal(users.size, 2)
  assert.ok(!shared.mergeProjects([...rows].map(([key, value]) => ({ key, value }))).some(item => item.slug === 'wi-grow'))
  failWrite = writes + 2; const before = structuredClone(rows)
  await assert.rejects(() => service.bulkProjects(db, 0, { action: 'hide', projects: [{ slug: 'wi-art', revision: 2 }, { slug: 'wi-tech', revision: 0 }] }))
  assert.deepEqual(rows, before, 'Write failure rolls back all projects'); failWrite = 0
  users.get(0).role = 'STUDENT'; await assert.rejects(() => service.bulkProjects(db, 0, { action: 'hide', projects: [{ slug: 'wi-tech', revision: 0 }] }), error => error.status === 403); users.get(0).role = 'ADMIN'
  let session = { user: { id: '0' } }, brand = {}
  const api = load('app/api/wi300/projects/bulk/route.ts', { '@/auth': { auth: async () => session }, '@/lib/prisma': { __esModule: true, default: db }, '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand }, '@/lib/wi300/project-service': service, 'next/cache': { revalidatePath: () => {} } })
  const request = (origin = 'https://test.invalid') => new Request('https://test.invalid/api/wi300/projects/bulk', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'unhomepage', projects: [{ slug: 'wi-tech', revision: 0 }] }) })
  assert.equal((await api.POST(request('https://other.invalid'))).status, 403); assert.equal((await api.POST(request())).status, 200)
  session = null; assert.equal((await api.POST(request())).status, 401); session = { user: { id: '0' } }; brand = null; assert.equal((await api.POST(request())).status, 404)
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.invalid/du-an/quan-ly' })
  global.window = dom.window; global.document = dom.window.document; global.Node = dom.window.Node; global.FormData = dom.window.FormData; global.IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
  const uiProjects = Array.from({ length: 12 }, (_, i) => ({ ...shared.projectDefaults[0], slug: 'test-' + i, name: 'Project ' + i }))
  let sent, deny = false
  const originalFetch = global.fetch
  global.fetch = async (url, init = {}) => {
    if (!init.method) return Response.json({ admin: true, projects: uiProjects })
    sent = JSON.parse(init.body)
    if (init.method === 'PUT') return Response.json({ project: { ...uiProjects[0], ...sent.content, ...sent.controls, revision: 1 } })
    if (deny) return Response.json({ error: 'Stale project' }, { status: 409 })
    return Response.json({ count: sent.projects.length, projects: sent.projects.map(item => ({ ...uiProjects.find(project => project.slug === item.slug), published: false, revision: 1 })) })
  }
  const ui = load('components/wi300/WiProjectManager.tsx', { 'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }, 'next/image': { __esModule: true, default: ({ children, ...props }) => React.createElement('img', props, children) }, 'next/navigation': { useRouter: () => ({ refresh: () => {}, replace: () => {} }) }, './WiProjectTeamEditor': { __esModule: true, default: () => null } }).default
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  const click = async label => React.act(async () => { const node = document.querySelector(`[aria-label="${label}"]`) || [...document.querySelectorAll('button')].find(node => node.textContent === label); assert.ok(node, label); node.click() })
  try {
    await React.act(async () => root.render(React.createElement(ui, { courses: [], initial: { admin: true, projects: uiProjects } })))
    assert.ok(document.body.textContent.includes('Trạng thái'));
    assert.ok(document.body.textContent.includes('Tiêu biểu'));
    assert.ok(document.body.textContent.includes('Trang chủ'));
    function snapshot(name) { if (process.env.PROJECT_UI_SNAPSHOT_DIR) { fs.mkdirSync(process.env.PROJECT_UI_SNAPSHOT_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.PROJECT_UI_SNAPSHOT_DIR, name + '.html'), document.getElementById('root').innerHTML) } }
    snapshot('projects-list');
    await click('Chọn tất cả dự án đang lọc'); assert.match(document.body.textContent, /Đã chọn 12 dự án/)
    await click('Sau'); assert.equal(document.querySelectorAll('article').length, 2); assert.ok(document.querySelector('[aria-label="Chọn dự án Project 11"]').checked)
    await click('Chọn tất cả dự án đang lọc'); assert.ok(!document.body.textContent.includes('Đã chọn 12 dự án'))
    await click('Chọn dự án Project 11')
    window.confirm = () => false; await click('Áp dụng'); assert.equal(sent, undefined, 'Confirmation precedes mutation')
    window.confirm = () => true; deny = true; await click('Áp dụng'); assert.match(document.body.textContent, /Stale project/); assert.equal([...document.querySelectorAll('button')].find(node => node.textContent === 'Áp dụng').disabled, true)
    await click('Tải lại dữ liệu'); deny = false; await click('Chọn dự án Project 11')
    const select = document.querySelector('[aria-label="Thao tác với dự án đã chọn"]'); await React.act(async () => { select.value = 'hide'; select.dispatchEvent(new window.Event('change', { bubbles: true })) }); await click('Áp dụng')
    assert.deepEqual(sent, { action: 'hide', projects: [{ slug: 'test-11', revision: 0 }] }); assert.match(document.body.textContent, /Đã áp dụng/)
    const courses = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name_lop: 'Khóa học kiểm thử ' + (i + 1), id_khoa: 'TEST-' + (i + 1), teacherName: 'Giảng viên kiểm thử', status: true }))
    const detail = { ...uiProjects[0], name: 'Dự án kiểm thử', ownerId: 8, category: 'OTHER', courseIds: courses.map(course => course.id), members: [] }
    await React.act(async () => root.render(React.createElement(ui, { key: 'detail', courses, initialSlug: detail.slug, initial: { admin: true, projects: [detail], ownerNames: { 8: 'Chủ dự án kiểm thử' } } })))
    assert.ok(document.querySelector('a[href="/du-an/' + detail.slug + '"]'), 'Overview links to the actual public project')
    assert.equal(document.querySelectorAll('input[role="switch"]').length, 3, 'Independent display switches')
    assert.ok(document.body.textContent.includes('Thay đổi chủ dự án'))
    assert.ok(document.body.textContent.includes('Lĩnh vực'))
    snapshot('projects-overview')
    await click('Xem tất cả 6 khóa học →')
    assert.ok(document.body.textContent.includes('Khóa học kiểm thử 6'))
    const checkbox = document.querySelector('input[name="featured"]')
    await React.act(async () => checkbox.click())
    await React.act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
    assert.equal(sent.controls.featured, !detail.featured, 'Overview switch is included in save')
    assert.equal(sent.controls.published, detail.published)
    assert.equal(sent.controls.showOnHomepage, detail.showOnHomepage)
    assert.equal(sent.controls.ownerId, 8, 'Hidden owner field remains in the form')
    assert.deepEqual(sent.content.courseIds, courses.map(course => course.id), 'Saving overview retains all linked courses')
    assert.equal(sent.content.name, detail.name)
  } finally { await React.act(async () => root.unmount()); dom.window.close(); global.fetch = originalFetch }
  console.log('PASS bulk projects: fresh admin permissions, complete revision checks, atomic rollback/concurrency, independent flags, soft deletion, API guards, cross-page selection, confirmation and stale-data recovery')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
