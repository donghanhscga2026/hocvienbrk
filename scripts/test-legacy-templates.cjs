// API and UI checks use isolated records; never touch production or Storage.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const root = path.resolve(__dirname, '..'), cache = new Map()
let signedIn = true, role = 'ADMIN', domain = false, conflicts = false, deletes = 0, records = [], listOptions
const template = { id: '14a9ba9c-a216-4096-86b8-b9d8cf104a8f', name: 'Hiểu thuế', description: 'Mẫu nhập cũ', sourceType: 'zip', createdAt: new Date('2026-10-15T00:00:00Z'), updatedAt: new Date('2026-10-19T00:00:00Z') }
const db = { user: { findUnique: async () => ({ role }) }, coursePageTemplate: {
  findMany: async options => { listOptions = options; return records.filter(row => !options.where.id || row.id === options.where.id).slice(options.skip, options.skip + options.take) },
  findUnique: async ({ where }) => records.find(row => row.id === where.id),
  deleteMany: async ({ where }) => { assert.equal(where.updatedAt.toISOString(), template.updatedAt.toISOString()); if (conflicts) return { count: 0 }; deletes++; const before = records.length; records = records.filter(row => row.id !== where.id); return { count: before - records.length } },
} }
function load(rel) {
  if (cache.has(rel)) return cache.get(rel)
  const mod = { exports: {} }, code = ts.transpileModule(fs.readFileSync(path.join(root, rel), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@/auth') return { auth: async () => signedIn ? { user: { id: '0', role: 'ADMIN' } } : null }
    if (name === '@/lib/website/domain-context') return { domainContext: async () => domain }
    if (name === '@/lib/prisma') return { __esModule: true, default: db }
    if (name === '@/components/course/TemplatePreviewFrame') return { __esModule: true, default: props => require('react').createElement('iframe', { title: props.title, src: props.src, width: props.width }) }
    return require(name)
  }, mod, mod.exports)
  cache.set(rel, mod.exports); return mod.exports
}
const req = (method, body, query = '') => new Request('https://wi300.vn/api/admin/course-page-templates/legacy' + query, { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) })
async function run() {
  const api = load('app/api/admin/course-page-templates/legacy/route.ts'), input = { id: template.id, updatedAt: template.updatedAt.toISOString() }
  records = [template]
  for (const denied of ['STUDENT', 'TEACHER', 'DEVELOPER']) { role = denied; assert.equal((await api.GET(req('GET'))).status, 403); assert.equal((await api.DELETE(req('DELETE', input))).status, 403) }
  role = 'ADMIN'; signedIn = false; assert.equal((await api.GET(req('GET'))).status, 403); signedIn = true
  domain = true; assert.equal((await api.DELETE(req('DELETE', input))).status, 403); domain = false
  assert.equal((await api.GET(req('GET', null, '?page=-1'))).status, 400)
  const listing = await (await api.GET(req('GET', null, '?id=' + template.id))).json()
  assert.equal(listing.items[0].name, template.name); assert.equal(listOptions.where.id, template.id)
  assert.equal(listOptions.select.snapshot, undefined, 'Listing does not load the large template source')
  const preview = await (await api.DELETE(req('DELETE', input))).json()
  assert.equal(preview.dryRun, true); assert.deepEqual(preview.affects, { templates: 1, coursePages: 0, versions: 0, mediaFiles: 0 }); assert.equal(deletes, 0)
  assert.equal((await api.DELETE(req('DELETE', { ...input, execute: true }))).status, 400)
  assert.equal((await api.DELETE(req('DELETE', { ...input, updatedAt: '2026-10-18T00:00:00.000Z' }))).status, 409)
  conflicts = true; assert.equal((await api.DELETE(req('DELETE', { ...input, execute: true, confirm: 'DELETE_LEGACY_TEMPLATE' }))).status, 409); conflicts = false
  records.push({ ...template, id: '05423fc2-6ef7-4a24-9351-b22b5077c659', name: 'Mẫu khác' })
  assert.equal((await api.DELETE(req('DELETE', { ...input, execute: true, confirm: 'DELETE_LEGACY_TEMPLATE' }))).status, 200)
  assert.equal(deletes, 1); assert.equal(records.length, 1); assert.equal(records[0].name, 'Mẫu khác')
  assert.equal((await api.DELETE(req('DELETE', input))).status, 404)

  const React = require('react'), { createRoot } = require('react-dom/client'), { JSDOM } = require('jsdom')
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/tools/courses/templates/legacy' })
  global.window = dom.window; global.document = dom.window.document; global.self = dom.window; global.IS_REACT_ACT_ENVIRONMENT = true
  let uiDeleted = 0
  global.fetch = async (url, options) => {
    if (options.method === 'DELETE') { const body = JSON.parse(options.body); if (body.execute) { assert.equal(body.confirm, 'DELETE_LEGACY_TEMPLATE'); uiDeleted++ }; return { ok: true, json: async () => body.execute ? { success: true } : { dryRun: true, template } } }
    return { ok: true, json: async () => ({ items: uiDeleted ? [] : [template], hasMore: false }) }
  }
  const container = document.getElementById('root'), uiRoot = createRoot(container)
  const tick = fn => React.act(async () => { fn(); await new Promise(resolve => setTimeout(resolve, 10)) })
  const click = text => [...container.querySelectorAll('button')].find(button => button.textContent === text).click()
  await tick(() => uiRoot.render(React.createElement(load('components/admin/LegacyTemplateManager.tsx').default)))
  assert.ok(container.textContent.includes('Hiểu thuế'))
  await tick(() => click('Xem trước'))
  assert.ok(container.querySelector('iframe').src.endsWith('id=' + template.id), 'Preview opens the selected legacy record')
  await tick(() => click('Điện thoại')); assert.equal(container.querySelector('iframe').width, '390')
  await tick(() => click('Xóa mẫu cũ')); assert.equal(uiDeleted, 0); assert.ok(container.querySelector('[aria-label="Xác nhận xóa mẫu cũ"]'))
  await tick(() => click('Xác nhận xóa mẫu cũ')); assert.equal(uiDeleted, 1); assert.ok(container.textContent.includes('Đã xóa mẫu cũ'))
  assert.equal(container.querySelector('iframe'), null)
  await tick(() => uiRoot.unmount()); dom.window.close()
  console.log('PASS legacy templates: fresh admin role/domain guards, metadata-only listing, dry-run, confirmation, stale and concurrent changes, isolated delete, selected preview and mobile UI')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
