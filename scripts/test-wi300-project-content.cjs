// Mock database only; never touches live user data.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
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
  const contentService = load('lib/wi300/project-content-service.ts', { './projects': shared, './project-service': service, '@/lib/crm/service': { CrmError } })
  let rows = new Map(), queue = Promise.resolve(), writes = 0
  const users = new Map([[0, { id: 0, role: 'ADMIN', name: 'Admin' }], [8, { id: 8, role: 'TEACHER', name: 'Owner' }], [9, { id: 9, role: 'TEACHER', name: 'Helper' }], [10, { id: 10, role: 'STUDENT', name: 'Member' }]])
  const db = { user: { findUnique: async ({ where }) => users.get(where.id) || null }, course: { findUnique: async ({ where }) => where.id === 1 ? { teacherId: 9 } : null, count: async ({ where }) => where.id.in.filter(id => id === 1).length }, systemConfig: {
    findMany: async ({ where }) => [...rows].filter(([key]) => key.startsWith(where.key.startsWith)).map(([key, value]) => ({ key, value: structuredClone(value) })),
    findUnique: async ({ where }) => rows.has(where.key) ? { key: where.key, value: structuredClone(rows.get(where.key)) } : null,
    upsert: async ({ where, create, update }) => { writes++; rows.set(where.key, structuredClone(rows.has(where.key) ? update.value : create.value)) },
  }, $executeRaw: async (strings, key) => { assert.equal(key, shared.PROJECT_PREFIX) }, $transaction: callback => {
    const task = queue.then(async () => { const backup = structuredClone(rows); try { return await callback(db) } catch (error) { rows = backup; throw error } }); queue = task.catch(() => {}); return task
  } }
  const get = async slug => (await service.readProjects(db)).find(project => project.slug === slug)
  const body = project => Object.fromEntries(Object.keys(shared.projectContent.shape).map(key => [key, project[key]]))
  const grow = await get('wi-grow')
  await service.saveProject(db, 0, 'wi-grow', { revision: 0, content: body(grow), controls: { ownerId: 8, published: true, featured: true, order: 0 }, members: [{ userId: 9, title: 'Helper', visible: false, canManage: true }, { userId: 10, title: 'Member', visible: true, canManage: false }] })
  assert.equal((await service.managedProjects(db, 9)).projects.length, 1)
  assert.equal((await service.managedProjects(db, 10)).projects.length, 0)
  assert.equal('members' in shared.publicProject(await get('wi-grow')), false)
  await assert.rejects(() => service.saveProject(db, 9, 'wi-grow', { revision: 1, content: body(grow), members: [] }), error => error.status === 403)
  await assert.rejects(() => service.saveProject(db, 8, 'wi-grow', { revision: 1, content: body(grow), members: [{ userId: 999, title: '', visible: true, canManage: false }] }), /không tồn tại/)
  await assert.rejects(() => service.saveProject(db, 8, 'wi-grow', { revision: 1, content: body(grow), members: [{ userId: 9, title: '', visible: true, canManage: false }, { userId: 9, title: '', visible: true, canManage: false }] }))
  assert.equal((await contentService.courseProjectOptions(db, 9, 1))[0].selected, false)
  assert.equal((await contentService.courseProjectOptions(db, 0, 1)).length, 7, 'Admin sees all projects')
  await assert.rejects(() => contentService.courseProjectOptions(db, 8, 1), error => error.status === 403)
  const link = { projects: [{ slug: 'wi-grow', revision: 1, selected: true }] }
  await contentService.saveCourseProjects(db, 9, 1, link)
  assert.deepEqual((await get('wi-grow')).courseIds, [1])
  await assert.rejects(() => contentService.saveCourseProjects(db, 9, 1, link), error => error.status === 409)
  await assert.rejects(() => contentService.saveCourseProjects(db, 9, 1, { projects: [{ slug: 'wi-art', revision: 0, selected: true }] }), error => error.status === 403)
  await contentService.saveCourseProjects(db, 0, 1, { projects: [{ slug: 'wi-art', revision: 0, selected: true }] })
  await contentService.saveCourseProjects(db, 9, 1, { projects: [{ slug: 'wi-grow', revision: 2, selected: false }] })
  assert.deepEqual((await get('wi-art')).courseIds, [1], 'Other project memberships are preserved')
  await service.saveProject(db, 8, 'wi-grow', { revision: 3, content: body(await get('wi-grow')), members: [] })
  assert.equal((await service.managedProjects(db, 9)).projects.length, 0)
  await assert.rejects(() => contentService.saveCourseProjects(db, 9, 1, { projects: [{ slug: 'wi-grow', revision: 4, selected: true }] }), error => error.status === 403)
  const offering = { kind: 'SERVICE', name: 'Website service', description: 'Description', url: 'https://example.com' }
  await contentService.saveOffering(db, 8, { target: { slug: 'wi-grow', revision: 4 }, offering })
  assert.equal((await get('wi-grow')).offerings[0].name, offering.name)
  assert.equal(shared.projectDefaults.find(project => project.slug === 'wi-grow').offerings.length, 0, 'No module-level defaults mutated')
  await assert.rejects(() => contentService.saveOffering(db, 8, { source: { slug: 'wi-grow', revision: 5, index: 0 }, target: { slug: 'wi-art', revision: 1 }, offering }), error => error.status === 403)
  await assert.rejects(() => contentService.saveOffering(db, 0, { source: { slug: 'wi-grow', revision: 5, index: 0 }, target: { slug: 'wi-art', revision: 0 }, offering }), error => error.status === 409)
  assert.equal((await get('wi-grow')).offerings.length, 1, 'Failed transfer is atomic')
  await contentService.saveOffering(db, 0, { source: { slug: 'wi-grow', revision: 5, index: 0 }, target: { slug: 'wi-art', revision: 1 }, offering })
  assert.equal((await get('wi-grow')).offerings.length, 0); assert.equal((await get('wi-art')).offerings.length, 1)
  const edit = { source: { slug: 'wi-art', revision: 2, index: 0 }, target: { slug: 'wi-art', revision: 2 }, offering: { ...offering, name: 'New service' } }
  const concurrent = await Promise.allSettled([contentService.saveOffering(db, 0, edit), contentService.saveOffering(db, 0, edit)])
  assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1)
  await contentService.saveOffering(db, 0, { source: { slug: 'wi-art', revision: 3, index: 0 }, remove: true })
  assert.equal((await get('wi-art')).offerings.length, 0)
  const before = writes
  await assert.rejects(() => contentService.saveOffering(db, 0, { target: { slug: 'wi-art', revision: 4 }, offering: { ...offering, url: 'javascript:alert(1)' } }))
  assert.equal(writes, before)
  let brand = {}, session = { user: { id: '9' } }
  const http = load('lib/crm/http.ts', { './service': { CrmError } })
  const api = load('app/api/wi300/project-content/route.ts', { '@/auth': { auth: async () => session }, '@/lib/prisma': { default: db, __esModule: true }, '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand }, '@/lib/crm/http': http, '@/lib/crm/service': { CrmError }, '@/lib/wi300/project-content-service': contentService, 'next/cache': { revalidatePath: () => {} } })
  const request = origin => new Request('https://wi300.vn/api/wi300/project-content?course=1', { method: 'PUT', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ projects: [] }) })
  assert.equal((await api.PUT(request('https://evil.example'))).status, 403)
  assert.equal((await api.PUT(request('https://wi300.vn'))).status, 200)
  session = null; assert.equal((await api.GET(new Request('https://wi300.vn/api/wi300/project-content?course=1'))).status, 401)
  brand = null; assert.equal((await api.PUT(request('https://wi300.vn'))).status, 404)
  const React = require('react'), { JSDOM } = require('jsdom')
  const publicCatalog = load('components/wi300/WiOfferingCatalog.tsx', {
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    'next/navigation': { notFound: () => { throw new Error('404') } },
    '@/lib/prisma': { __esModule: true, default: {} },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => ({ name: 'Wi300' }) },
    '@/lib/wi300/project-service': { readProjects: async () => [{ ...grow, published: true, offerings: [offering] }, { ...grow, slug: 'wi-hidden', published: false, offerings: [{ ...offering, name: 'Private draft' }] }] },
  }).default
  const html = require('react-dom/server').renderToStaticMarkup(await publicCatalog({ kind: 'SERVICE' }))
  assert.ok(html.includes('Website service')); assert.ok(!html.includes('Private draft'))
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/du-an/noi-dung' })
  global.window = dom.window; global.document = dom.window.document; global.FormData = dom.window.FormData; global.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = require('react-dom/client'), root = createRoot(document.getElementById('root'))
  const Manager = load('components/wi300/WiOfferingManager.tsx').default
  const Team = load('components/wi300/WiProjectTeamEditor.tsx').default
  const savedFetch = global.fetch; let calls = 0
  global.fetch = async () => { calls++; return { ok: false, json: async () => ({ error: 'Dự án đã thay đổi. Tải lại.' }) } }
  try {
    await React.act(async () => root.render(React.createElement(Manager, { initial: [{ ...grow, revision: 8, offerings: [offering] }] })))
    await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Chỉnh sửa →').click())
    document.querySelector('[name="name"]').value = 'Draft in progress'
    await React.act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
    assert.match(document.querySelector('[role="alert"]').textContent, /Tải lại/)
    assert.equal(document.querySelector('[name="name"]').value, 'Draft in progress')
    await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Gỡ nội dung').click())
    assert.equal(calls, 1, 'Remove waits for confirmation')
    await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Hủy').click())
    assert.equal(calls, 1)
    await React.act(async () => root.render(React.createElement(Team, { members: [{ userId: 0, title: 'Admin helper', visible: false, canManage: true }], names: { '0': 'Admin' }, editable: true })))
    assert.equal(JSON.parse(document.querySelector('[name="members"]').value)[0].userId, 0)
    await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Gỡ thành viên').click())
    assert.deepEqual(JSON.parse(document.querySelector('[name="members"]').value), [])
    await React.act(async () => root.render(React.createElement(Team, { key: 'readonly', members: [{ userId: 9, title: 'Helper', visible: true, canManage: true }], names: {}, editable: false })))
    assert.equal(document.querySelector('[name="members"]'), null, 'Helpers cannot submit team changes')
    assert.ok([...document.querySelectorAll('input')].every(input => input.disabled))
    const CourseProjects = load('components/wi300/WiCourseProjects.tsx').default
    for (const [key, status, projects] of [['no-projects', 200, []], ['forbidden', 403, undefined], ['guest', 401, undefined]]) {
      global.fetch = async () => ({ status, ok: status === 200, json: async () => ({ projects }) })
      await React.act(async () => root.render(React.createElement(CourseProjects, { key, courseId: '1' })))
      assert.equal(document.querySelector('section'), null, 'No permission or projects hides entire selector')
    }
    const options = [{ slug: 'wi-grow', name: 'Wi.Grow', selected: false, revision: 1 }, { slug: 'wi-art', name: 'Wi.Art', selected: true, revision: 2 }]
    let failSave = true, savedLinks
    global.fetch = async (url, init) => {
      if (init.method === 'PUT') {
        savedLinks = JSON.parse(init.body)
        return { status: failSave ? 409 : 200, ok: !failSave, json: async () => failSave ? { error: 'Dự án đã thay đổi. Tải lại.' } : { success: true } }
      }
      return { status: 200, ok: true, json: async () => ({ projects: options }) }
    }
    await React.act(async () => root.render(React.createElement(CourseProjects, { key: 'allowed', courseId: '1' })))
    assert.equal(document.querySelectorAll('input[type="checkbox"]').length, 2)
    assert.ok(document.querySelector('section').textContent.includes('Đã chọn: 1'))
    await React.act(async () => document.querySelector('input[type="checkbox"]').click())
    assert.ok(document.querySelector('section').textContent.includes('Đã chọn: 2'))
    const button = label => [...document.querySelectorAll('button')].find(item => item.textContent === label)
    await React.act(async () => button('Lưu liên kết').click())
    assert.equal(savedLinks.projects[0].selected, true)
    assert.equal(button('Lưu liên kết').disabled, true, 'Failed save requires a fresh version')
    assert.ok([...document.querySelectorAll('input')].every(input => input.disabled))
    await React.act(async () => button('Tải lại').click())
    assert.equal(button('Lưu liên kết').disabled, false)
    failSave = false
    await React.act(async () => button('Lưu liên kết').click())
    assert.match(document.querySelector('[role="status"]').textContent, /Đã lưu/)
    const realSetTimeout = global.setTimeout
    global.setTimeout = (callback, delay, ...args) => realSetTimeout(callback, delay === 20000 ? 1 : delay, ...args)
    try {
      global.fetch = (url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
      await React.act(async () => {
        root.render(React.createElement(CourseProjects, { key: 'timeout', courseId: '1' }))
      })
      await React.act(async () => { await new Promise(resolve => realSetTimeout(resolve, 10)) })
      assert.match(document.querySelector('[role="alert"]').textContent, /Phản hồi quá lâu/)
      assert.equal(button('Tải lại').disabled, false, 'Timeout leaves retry available')
    } finally { global.setTimeout = realSetTimeout }
  } finally { await React.act(async () => root.unmount()); dom.window.close(); global.fetch = savedFetch }
  console.log('Project teams/content: permissions, revocation, course links, atomic moves, concurrency, legacy/default preservation and origin passed (mock DB).')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
