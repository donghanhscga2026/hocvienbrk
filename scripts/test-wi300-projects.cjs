// Kiểm tra bằng database giả và DOM; không kết nối/ghi database thật.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const React = require('react'), { JSDOM } = require('jsdom')
function load(file, mocks = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : require(name), module, module.exports)
  return module.exports
}
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
async function run() {
  const shared = load('lib/wi300/projects.ts')
  const service = load('lib/wi300/project-service.ts', { './projects': shared, '@/lib/crm/service': { CrmError } })
  for (const url of ['javascript:alert(1)', '//evil.example', '/\\evil.example', 'https://name:secret@example.com', 'http://example.com', '/\nevil']) assert.equal(shared.safeProjectUrl(url), false, url)
  for (const url of ['', '/wi300/businesses/wi-grow.png', 'https://example.com/logo.png']) assert.equal(shared.safeProjectUrl(url), true)
  const rows = new Map(), users = new Map([[0, { id: 0, role: 'ADMIN', name: 'Admin' }], [8, { id: 8, role: 'STUDENT', name: 'Lucy' }], [9, { id: 9, role: 'STUDENT', name: 'Other' }]])
  let locks = 0, writes = 0, queue = Promise.resolve()
  const db = { user: { findUnique: async ({ where }) => users.get(where.id) || null }, course: { count: async ({ where }) => where.id.in.filter(id => [1, 2].includes(id)).length }, systemConfig: {
    findMany: async ({ where }) => [...rows].filter(([key]) => key.startsWith(where.key.startsWith)).map(([key, value]) => ({ key, value })),
    findUnique: async ({ where }) => rows.has(where.key) ? { key: where.key, value: rows.get(where.key) } : null,
    upsert: async ({ where, create, update }) => { writes++; rows.set(where.key, rows.has(where.key) ? update.value : create.value) },
  }, $executeRaw: async (strings, key) => { assert.match(strings.join(''), /pg_advisory_xact_lock/); assert.match(key, /^wi300:project:v1:/); locks++ },
    $transaction: callback => { const result = queue.then(() => callback(db)); queue = result.catch(() => {}); return result },
  }
  assert.equal((await service.readPublicProjects(db)).length, 7)
  assert.equal(writes, 0, 'Reading defaults never seeds data')
  assert.equal((await service.managedProjects(db, 9)).projects.length, 0)
  assert.equal((await service.managedProjects(db, 0)).projects.length, 7)
  await assert.rejects(() => service.managedProjects(db, 100), error => error.status === 401)
  const initial = shared.projectDefaults.find(project => project.slug === 'wi-grow')
  const content = Object.fromEntries(Object.keys(shared.projectContent.shape).map(key => [key, initial[key]]))
  const input = { revision: 0, content: { ...content, introduction: 'Giới thiệu thật', courseIds: [1] }, controls: { ownerId: 8, published: true, featured: true, order: 0 } }
  await assert.rejects(() => service.saveProject(db, 9, 'wi-grow', input), error => error.status === 403)
  await service.saveProject(db, 0, 'wi-grow', input)
  assert.equal((await service.managedProjects(db, 8)).projects.length, 1)
  const publicRow = (await service.readPublicProjects(db)).find(project => project.slug === 'wi-grow')
  assert.equal('ownerId' in publicRow, false); assert.equal('revision' in publicRow, false)
  await assert.rejects(() => service.saveProject(db, 8, 'wi-grow', { ...input, revision: 1 }), error => error.status === 403)
  await assert.rejects(() => service.saveProject(db, 9, 'wi-grow', { revision: 1, content }), error => error.status === 403)
  await assert.rejects(() => service.saveProject(db, 8, 'wi-grow', { revision: 0, content }), error => error.status === 409)
  const concurrent = await Promise.allSettled([service.saveProject(db, 8, 'wi-grow', { revision: 1, content: { ...content, name: 'Wi.Grow mới' } }), service.saveProject(db, 8, 'wi-grow', { revision: 1, content })])
  assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(concurrent.find(result => result.status === 'rejected').reason.status, 409)
  await assert.rejects(() => service.saveProject(db, 0, 'wi-grow', { ...input, revision: 2, controls: { ...input.controls, ownerId: 999 } }), /không tồn tại/)
  await assert.rejects(() => service.saveProject(db, 8, 'wi-grow', { revision: 2, content: { ...content, courseIds: [999] } }), /không tồn tại/)
  await service.saveProject(db, 0, 'wi-grow', { ...input, revision: 2, controls: { ...input.controls, ownerId: 9, published: false } })
  assert.equal((await service.readPublicProjects(db)).some(project => project.slug === 'wi-grow'), false)
  await assert.rejects(() => service.saveProject(db, 8, 'wi-grow', { revision: 3, content }), error => error.status === 403)
  users.get(0).role = 'STUDENT'
  await assert.rejects(() => service.saveProject(db, 0, 'wi-art', { revision: 0, content }), error => error.status === 403)
  users.get(0).role = 'ADMIN'
  assert.ok(locks >= writes)
  assert.equal(shared.projectContent.safeParse({ ...content, ownerId: 9 }).success, false)
  assert.equal(shared.projectContent.safeParse({ ...content, offerings: [{ name: 'Bad', description: '', kind: 'PRODUCT', url: 'javascript:alert(1)' }] }).success, false)

  let brand = null, session = null, invalidations = []
  const http = load('lib/crm/http.ts', { './service': { CrmError } })
  const api = load('app/api/wi300/projects/route.ts', { '@/auth': { auth: async () => session }, '@/lib/prisma': { __esModule: true, default: db }, '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand }, '@/lib/crm/http': http, '@/lib/crm/service': { CrmError }, '@/lib/wi300/project-service': service, 'next/cache': { revalidatePath: path => invalidations.push(path) } })
  assert.equal((await api.GET()).status, 404)
  brand = {}; assert.equal((await api.GET()).status, 401)
  session = { user: { id: '0', role: 'ADMIN' } }
  assert.equal((await api.GET()).status, 200)
  const request = (body, origin = 'https://wi300.vn') => new Request('https://wi300.vn/api/wi300/projects?slug=wi-art', { method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) })
  assert.equal((await api.PUT(request({ revision: 0, content }, 'https://evil.example'))).status, 403)
  assert.equal((await api.PUT(request({ revision: 0, content, userId: 9 }))).status, 400)
  assert.equal((await api.PUT(request({ revision: 0, content }))).status, 200)
  assert.deepEqual(invalidations, ['/', '/kham-pha', '/du-an', '/du-an/wi-art'])
  users.get(0).role = 'STUDENT'; assert.equal((await api.GET()).status, 200)
  assert.equal((await api.GET()).headers.get('cache-control'), 'private, no-store')
  assert.equal((await api.PUT(request({ revision: 1, content }))).status, 403, 'JWT admin role is not authorization')
  users.get(0).role = 'ADMIN'

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/du-an/quan-ly' })
  global.window = dom.window; global.document = dom.window.document; global.FormData = dom.window.FormData; global.IS_REACT_ACT_ENVIRONMENT = true
  const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
  const Manager = load('components/wi300/WiProjectManager.tsx', { 'next/link': link }).default
  const { createRoot } = require('react-dom/client'), root = createRoot(document.getElementById('root'))
  let payload, fail = true
  const savedFetch = global.fetch
  global.fetch = async (url, options) => { payload = JSON.parse(options.body); return { ok: !fail, json: async () => fail ? { error: 'Dữ liệu đã thay đổi. Tải lại.' } : { project: { ...initial, ...payload.content, revision: 1 } } } }
  try {
    await React.act(async () => root.render(React.createElement(Manager, { courses: [{ id: 1, name_lop: 'Khóa AI', id_khoa: 'AI' }], initial: { admin: false, projects: [{ ...initial, ownerId: 8, courseIds: [2] }] } })))
    assert.equal(document.querySelector('[name="ownerId"]'), null)
    document.querySelector('[name="name"]').value = 'Dự án mới'
    document.querySelector('[name="courseIds"]').checked = true
    const submit = () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    await React.act(async () => submit())
    assert.match(document.querySelector('[role="alert"]').textContent, /Tải lại/)
    assert.equal(document.querySelector('[name="name"]').value, 'Dự án mới', 'Save failure retains typed draft')
    assert.equal('controls' in payload, false); assert.deepEqual(payload.content.courseIds, [1, 2])
    fail = false; await React.act(async () => submit())
    assert.match(document.querySelector('[role="status"]').textContent, /Đã lưu/)
    assert.equal(document.querySelector('[name="name"]').value, 'Dự án mới')
  } finally { await React.act(async () => root.unmount()); dom.window.close(); global.fetch = savedFetch }

  const visibility = load('lib/wi300/course-visibility.ts')
  const scope = { teacherId: { in: [8] }, status: true }
  const page = load('app/du-an/[slug]/page.tsx', { 'next/link': link, 'next/image': { __esModule: true, default: props => React.createElement('img', props) }, 'next/navigation': { notFound: () => { throw new Error('404') } }, '@/lib/prisma': { __esModule: true, default: { user: { findUnique: async () => ({ name: 'Lucy' }) }, course: { findMany: async ({ where }) => { assert.deepEqual(where, { AND: [{ AND: [{ teacherId: { in: [8] } }, { id: { in: [1] } }] }, { id: { in: [1, 2] } }] }); return [{ id: 1, id_khoa: 'A/B', name_lop: 'AI thật', teacher: { name: 'Lucy' } }] } } } }, '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand }, '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => ({}), getCourseWhereForProfile: () => scope }, '@/lib/wi300/course-visibility': { ...visibility, wi300CoursePreferences: async () => new Map([[1, true], [2, false]]) }, '@/lib/wi300/project-service': { readProjects: async () => [{ ...initial, introduction: '<script>alert(1)</script>', courseIds: [1, 2] }] } }).default
  const html = require('react-dom/server').renderToStaticMarkup(await page({ params: Promise.resolve({ slug: 'wi-grow' }) }))
  assert.ok(html.includes('A%2FB')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'))
  brand = null; await assert.rejects(() => page({ params: Promise.resolve({ slug: 'wi-grow' }) }), /404/)
  console.log('WI projects: defaults/read-only, ownership, fresh roles, strict input, safe URLs, optimistic concurrency, admin controls, origin, invalidation, form save/retry, course scope, XSS and deployment isolation passed (mock DB only).')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
