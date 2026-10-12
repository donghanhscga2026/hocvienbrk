// Kiểm tra bằng database giả và DOM; không kết nối/ghi database thật.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const React = require('react'), { JSDOM } = require('jsdom')
function load(file, mocks = {}) {
  mocks = { '@/auth': { auth: async () => null }, ...mocks }
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : name === '@/lib/wi300/projects' ? load('lib/wi300/projects.ts') : name === './WiProjectTeamEditor' ? load('components/wi300/WiProjectTeamEditor.tsx') : require(name), module, module.exports)
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
  const newInput = { slug: 'wi-test', name: 'Wi.Test', description: 'Dự án kiểm thử' }
  await assert.rejects(() => service.createProject(db, 8, newInput), error => error.status === 403)
  await assert.rejects(() => service.createProject(db, 0, { ...newInput, slug: 'quan-ly' }))
  const creations = await Promise.allSettled([service.createProject(db, 0, newInput), service.createProject(db, 0, newInput)])
  assert.equal(creations.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(creations.find(result => result.status === 'rejected').reason.status, 409)
  const newlyCreated = (await service.readProjects(db)).find(project => project.slug === 'wi-test')
  assert.equal(newlyCreated.published, true, 'New project is public immediately')
  assert.equal(newlyCreated.featured, false, 'Featuring remains an explicit admin choice')
  assert.equal((await service.readPublicProjects(db)).some(project => project.slug === 'wi-test'), false, 'Non-featured project stays off featured home')
  await assert.rejects(() => service.createProject(db, 0, { ...newInput, slug: 'wi-invalid-owner', ownerId: 999 }), /không tồn tại/)
  assert.equal(rows.has(shared.PROJECT_PREFIX + 'wi-invalid-owner'), false)
  const fullProject = await service.createProject(db, 0, { ...newInput, slug: 'wi-full', introduction: 'Giới thiệu', logo: 'https://example.com/logo.png', website: 'https://example.com', ownerId: 8, published: true, featured: true, order: 12, members: [{ userId: 9, title: 'Helper', visible: true, canManage: true }] })
  assert.equal(fullProject.ownerId, 8); assert.equal(fullProject.introduction, 'Giới thiệu'); assert.equal(fullProject.members[0].userId, 9)
  assert.ok((await service.readPublicProjects(db)).some(project => project.slug === 'wi-full'))
  await service.deleteProject(db, 0, 'wi-full', { revision: 1 })
  await service.saveProject(db, 0, 'wi-test', { revision: 1, content, controls: { ownerId: 8, published: true, featured: false, order: 100 } })
  assert.ok((await service.managedProjects(db, 8)).projects.some(project => project.slug === 'wi-test'))
  assert.equal((await service.readPublicProjects(db)).some(project => project.slug === 'wi-test'), false, 'Public non-featured project stays off home')
  await assert.rejects(() => service.deleteProject(db, 8, 'wi-test', { revision: 2 }), error => error.status === 403)
  await assert.rejects(() => service.deleteProject(db, 0, 'wi-test', { revision: 1 }), error => error.status === 409)
  await service.deleteProject(db, 0, 'wi-test', { revision: 2 })
  assert.equal((await service.readProjects(db)).some(project => project.slug === 'wi-test'), false)
  await assert.rejects(() => service.saveProject(db, 0, 'wi-test', { revision: 2, content }), error => error.status === 404)
  await assert.rejects(() => service.createProject(db, 0, newInput), error => error.status === 409)
  await service.deleteProject(db, 0, 'wi-can', { revision: 0 })
  assert.equal((await service.readProjects(db)).some(project => project.slug === 'wi-can'), false, 'Deleted default does not return')
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

  const lifecycleRequest = (method, body, origin = 'https://wi300.vn') => new Request('https://wi300.vn/api/wi300/projects?slug=wi-api-test', { method, headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) })
  const apiInput = { slug: 'wi-api-test', name: 'Wi API Test', description: 'Kiểm tra API' }
  assert.equal((await api.POST(lifecycleRequest('POST', apiInput, 'https://evil.example'))).status, 403)
  assert.equal((await api.POST(lifecycleRequest('POST', apiInput))).status, 201)
  assert.equal((await api.DELETE(lifecycleRequest('DELETE', { revision: 1 }, 'https://evil.example'))).status, 403)
  users.get(0).role = 'STUDENT'
  assert.equal((await api.DELETE(lifecycleRequest('DELETE', { revision: 1 }))).status, 403)
  users.get(0).role = 'ADMIN'
  assert.equal((await api.DELETE(lifecycleRequest('DELETE', { revision: 1 }))).status, 200)

  const toolsApi = load('app/api/tools/route.ts', {
    '@/auth': { auth: async () => session }, '@/lib/prisma': { __esModule: true, default: { ...db, tool: { findMany: async () => [] } } },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand }, '@/lib/wi300/project-service': service,
  })
  const containsProject = async () => (await (await toolsApi.GET()).json()).tools.some(tool => tool.slug === 'wi-projects')
  session = null; assert.equal(await containsProject(), false)
  session = { user: { id: '0' } }; assert.equal(await containsProject(), true)
  session = { user: { id: '8' } }; assert.equal(await containsProject(), false)
  session = { user: { id: '9' } }; assert.equal(await containsProject(), true, 'Owner sees management even for unpublished project')
  brand = null; assert.equal(await containsProject(), false, 'No project menu on other deployments')
  brand = {}; session = { user: { id: '0' } }

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/du-an/quan-ly' })
  global.window = dom.window; global.document = dom.window.document; global.FormData = dom.window.FormData; global.IS_REACT_ACT_ENVIRONMENT = true
  const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
  const navigationCalls = []
  const Manager = load('components/wi300/WiProjectManager.tsx', { 'next/link': link, 'next/image': { __esModule: true, default: props => React.createElement('img', props) }, 'next/navigation': { useRouter: () => ({ refresh: () => navigationCalls.push(['refresh']), push: url => navigationCalls.push(['push', url]), replace: url => navigationCalls.push(['replace', url]) }) } }).default
  const { createRoot } = require('react-dom/client'), root = createRoot(document.getElementById('root'))
  let payload, fail = true
  const savedFetch = global.fetch
  global.fetch = async (url, options) => { payload = JSON.parse(options.body); return { ok: !fail, json: async () => fail ? { error: 'Dữ liệu đã thay đổi. Tải lại.' } : { project: { ...initial, ...payload.content, revision: 1 } } } }
  try {
    await React.act(async () => root.render(React.createElement(Manager, { initialSlug: 'wi-grow', courses: [{ id: 1, name_lop: 'Khóa AI', id_khoa: 'AI' }], initial: { admin: false, projects: [{ ...initial, ownerId: 8, courseIds: [2] }] } })))
    assert.equal(document.querySelector('[name="ownerId"]'), null)
    document.querySelector('[name="name"]').value = 'Dự án mới'
    const submit = () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    await React.act(async () => submit())
    assert.match(document.querySelector('[role="alert"]').textContent, /Tải lại/)
    assert.equal(document.querySelector('[name="name"]').value, 'Dự án mới', 'Save failure retains typed draft')
    assert.equal('controls' in payload, false); assert.deepEqual(payload.content.courseIds, [2])
    fail = false; await React.act(async () => submit())
    assert.match(document.querySelector('[role="status"]').textContent, /Đã lưu/)
    assert.equal(document.querySelector('[name="name"]').value, 'Dự án mới')
    const methods = []
    let createdProject
    global.fetch = async (url, options) => {
      methods.push(options.method)
      const input = JSON.parse(options.body)
      createdProject = { ...initial, ...input, revision: 1 }
      return { ok: true, json: async () => options.method === 'POST' ? { project: createdProject } : { slug: 'wi-ui-test' } }
    }
    await React.act(async () => root.render(React.createElement(Manager, { courses: [], initial: { admin: true, projects: [initial] } })))
    // Chuyển từ chủ dự án sang admin bằng remount, như đổi phiên đăng nhập.
    await React.act(async () => root.render(React.createElement(Manager, { key: 'admin', courses: [], initial: { admin: true, projects: [initial] } })))
    assert.equal(document.querySelector('select'), null, 'List is cards rather than a project dropdown')
    assert.equal(document.querySelector('form'), null, 'List does not automatically open the first project')
    assert.equal(document.querySelector('[aria-label="Quản lý Wi.Grow"]').getAttribute('href'), '/du-an/quan-ly?project=wi-grow')
    await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === '+ Thêm dự án').click())
    const createForm = document.querySelector('form')
    createForm.querySelector('[name="name"]').value = 'Wi UI Test'
    createForm.querySelector('[name="slug"]').value = 'wi-ui-test'
    createForm.querySelector('[name="description"]').value = 'Dự án UI'
    createForm.querySelector('[name="introduction"]').value = 'Giới thiệu từ form tạo mới'
    createForm.querySelector('[name="ownerId"]').value = '8'
    assert.equal(createForm.querySelector('[name="published"]').checked, true)
    assert.equal(createForm.querySelector('[name="featured"]').checked, false)
    await React.act(async () => createForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
    assert.deepEqual(navigationCalls.at(-1), ['refresh'])
    assert.equal(createdProject.ownerId, 8)
    assert.equal(createdProject.introduction, 'Giới thiệu từ form tạo mới')
    assert.equal(document.querySelector('form'), null, 'Creating returns to project cards in one step')
    await React.act(async () => root.render(React.createElement(Manager, { key: 'new-edit', initialSlug: 'wi-ui-test', courses: [], initial: { admin: true, projects: [initial, createdProject] } })))
    assert.equal(document.querySelector('[name="name"]').value, 'Wi UI Test')
    assert.ok([...document.querySelectorAll('a')].some(anchor => anchor.textContent.includes('Danh sách dự án') && anchor.getAttribute('href') === '/du-an/quan-ly'))
    assert.ok(document.querySelector('[name="featured"]'))
    await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Xóa dự án').click())
    assert.deepEqual(methods, ['POST'], 'Delete requires confirmation')
    await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Hủy').click())
    assert.deepEqual(methods, ['POST'], 'Cancel never deletes')
    await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Xóa dự án').click())
    await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Xác nhận xóa').click())
    assert.deepEqual(methods, ['POST', 'DELETE'])
    assert.deepEqual(navigationCalls.at(-1), ['replace', '/du-an/quan-ly'])
    assert.equal(document.querySelector('form'), null)
    assert.ok(document.querySelector('[aria-label="Quản lý Wi.Grow"]'))
    await React.act(async () => root.render(React.createElement(Manager, { key: 'owner-list', courses: [], initial: { admin: false, projects: [{ ...initial, ownerId: 8 }], ownerNames: { '8': 'Lucy' } } })))
    assert.equal(document.querySelectorAll('article').length, 1)
    assert.ok(document.querySelector('article').textContent.includes('Lucy'))
    assert.equal([...document.querySelectorAll('button')].some(button => button.textContent === '+ Thêm dự án'), false)
  } finally { await React.act(async () => root.unmount()); dom.window.close(); global.fetch = savedFetch }

  const visibility = load('lib/wi300/course-visibility.ts')
  const scope = { teacherId: { in: [8] }, status: true }
  const page = load('app/du-an/[slug]/page.tsx', { 'next/link': link, 'next/image': { __esModule: true, default: props => React.createElement('img', props) }, 'next/navigation': { notFound: () => { throw new Error('404') } }, '@/lib/prisma': { __esModule: true, default: { user: { findUnique: async () => ({ name: 'Lucy' }) }, course: { findMany: async ({ where }) => { assert.deepEqual(where, { AND: [{ AND: [{ teacherId: { in: [8] } }, { id: { in: [1] } }] }, { id: { in: [1, 2] } }] }); return [{ id: 1, id_khoa: 'A/B', name_lop: 'AI thật', teacher: { name: 'Lucy' } }] } } } }, '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand }, '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => ({}), getCourseWhereForProfile: () => scope }, '@/lib/wi300/course-visibility': { ...visibility, wi300CoursePreferences: async () => new Map([[1, true], [2, false]]) }, '@/lib/wi300/project-service': { readProjects: async () => [{ ...initial, introduction: '<script>alert(1)</script>', courseIds: [1, 2] }] } }).default
  const html = require('react-dom/server').renderToStaticMarkup(await page({ params: Promise.resolve({ slug: 'wi-grow' }) }))
  assert.ok(html.includes('A%2FB')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'))
  brand = null; await assert.rejects(() => page({ params: Promise.resolve({ slug: 'wi-grow' }) }), /404/)
  brand = {}
  const render = require('react-dom/server').renderToStaticMarkup
  let courseLoads = 0
  const managerPage = load('app/du-an/quan-ly/page.tsx', {
    'next/link': link, 'next/navigation': { notFound: () => { throw new Error('404') }, redirect: () => { throw new Error('login') } },
    '@/auth': { auth: async () => ({ user: { id: '8' } }) }, '@/lib/prisma': { __esModule: true, default: { course: { findMany: async () => { courseLoads++; return [] } } } },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => ({}) }, '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => ({}), getCourseWhereForProfile: () => scope },
    '@/lib/wi300/course-visibility': { ...visibility, wi300CoursePreferences: async () => new Map() },
    '@/lib/wi300/project-service': { managedProjects: async () => ({ admin: false, projects: [initial] }) },
    '@/components/wi300/WiProjectManager': { __esModule: true, default: ({ initialSlug }) => React.createElement('div', { 'data-project': initialSlug || 'list' }) },
  }).default
  assert.ok(render(await managerPage({ searchParams: Promise.resolve({}) })).includes('data-project="list"'))
  assert.equal(courseLoads, 0, 'Card list does not load the course catalog')
  assert.ok(render(await managerPage({ searchParams: Promise.resolve({ project: 'wi-grow' }) })).includes('data-project="wi-grow"'))
  assert.equal(courseLoads, 1)
  await assert.rejects(() => managerPage({ searchParams: Promise.resolve({ project: 'not-my-project' }) }), /404/)
  assert.equal(courseLoads, 1, 'Unauthorized project never loads course catalog')
  const projectPage = (actorId, role) => load('app/du-an/[slug]/page.tsx', {
    'next/link': link, 'next/image': { __esModule: true, default: props => React.createElement('img', props) },
    'next/navigation': { notFound: () => { throw new Error('404') } }, '@/auth': { auth: async () => actorId == null ? null : { user: { id: String(actorId) } } },
    '@/lib/prisma': { __esModule: true, default: { user: { findUnique: async () => ({ name: 'Lucy', role }) } } },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand },
    '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => ({}), getCourseWhereForProfile: () => scope },
    '@/lib/wi300/course-visibility': { ...visibility, wi300CoursePreferences: async () => new Map() },
    '@/lib/wi300/project-service': { readProjects: async () => [{ ...initial, ownerId: 8 }] },
  }).default
  for (const [actorId, role, permitted] of [[null, null, false], [9, 'STUDENT', false], [8, 'STUDENT', true], [0, 'ADMIN', true], [0, 'STUDENT', false]]) {
    const markup = render(await projectPage(actorId, role)({ params: Promise.resolve({ slug: 'wi-grow' }) }))
    assert.equal(markup.includes('Quản lý dự án này'), permitted)
    assert.ok(markup.includes('/du-an/chu-du-an/8'))
    if (permitted) assert.ok(markup.includes('/du-an/quan-ly?project=wi-grow'))
  }
  const navigation = load('lib/wi300/personal-space.ts', { './catalog': { searchText: value => value.toLowerCase() } })
  const projectTool = { id: -3, slug: 'wi-projects', name: 'Dự án Wi', url: '/du-an/quan-ly', roles: [], isActive: true }
  assert.equal(navigation.spaceNavigation('STUDENT', []).some(group => group.id === 'business'), false)
  assert.equal(navigation.spaceNavigation('guest', [projectTool]).some(group => group.id === 'business'), false)
  for (const role of ['ADMIN', 'STUDENT']) {
    const groups = navigation.spaceNavigation(role, [projectTool])
    assert.equal(groups.flatMap(group => group.items).filter(item => item.href === '/du-an/quan-ly').length, 1)
    assert.equal(groups.find(group => group.id === 'business').items[0].label, 'Dự án Wi')
  }
  console.log('WI projects: defaults/read-only, ownership, fresh roles, strict input, safe URLs, optimistic concurrency, admin controls, origin, invalidation, form save/retry, course scope, XSS and deployment isolation passed (mock DB only).')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
