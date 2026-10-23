// Run the real route SQL in isolated PostgreSQL; never connects to production.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')
const root = path.resolve(__dirname, '..'), cache = new Map(), pg = new PGlite()
let role = 'ADMIN', signedIn = true, domain = false, race = false, protectRace = false
const ids = Array.from({ length: 5 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`)
const pageId = '05423fc2-6ef7-4a24-9351-b22b5077c659'
const db = { user: { findUnique: async () => ({ role }) }, $queryRaw: async query => {
  if (race && query.text.startsWith('DELETE')) { race = false; await pg.query('DELETE FROM course_page_versions WHERE id=$1', [query.values[0]]) }
  if (protectRace && query.text.startsWith('DELETE')) { protectRace = false; await pg.query('DELETE FROM course_page_versions WHERE id=$1', [ids[2]]) }
  return (await pg.query(query.text, query.values)).rows
}, coursePageVersion: { findUnique: async ({ where }) => (await pg.query('SELECT snapshot FROM course_page_versions WHERE id=$1', [where.id])).rows[0] } }
function load(rel) {
  if (cache.has(rel)) return cache.get(rel)
  const mod = { exports: {} }, code = ts.transpileModule(fs.readFileSync(path.join(root, rel), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@/auth') return { auth: async () => signedIn ? { user: { id: '0', role: 'ADMIN' } } : null }
    if (name === '@/lib/website/domain-context') return { domainContext: async () => domain }
    if (name === '@/lib/prisma') return { __esModule: true, default: db }
    if (name === '@/lib/course-page/permissions') return { courseEditorActor: async () => { if (!signedIn) throw Error('Unauthorized'); return { id: 0, role } } }
    if (name === '@/lib/course-page/template-library' || name === '@/lib/course-page/template-source') return {}
    if (name === '@/lib/course-page/templates') return { COURSE_TEMPLATE_LIBRARY: [] }
    if (name === 'next/navigation') return { notFound: () => { throw Error('NOT_FOUND') } }
    if (name === '@/components/course/TemplateRenderedPreview') return { __esModule: true, default: () => null }
    if (name === '@/components/course/TemplatePreviewFrame') return { __esModule: true, default: props => require('react').createElement('iframe', { title: props.title, src: props.src, width: props.width }) }
    return require(name)
  }, mod, mod.exports)
  cache.set(rel, mod.exports); return mod.exports
}
const req = (method, body, query = '') => new Request('https://wi300.vn/api/admin/course-page-templates/history' + query, { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) })
async function run() {
  await pg.exec('CREATE TABLE course_pages (id text PRIMARY KEY,name text,status text,use_template boolean); CREATE TABLE course_page_versions (id text PRIMARY KEY,course_page_id text,version_number int,snapshot jsonb,created_at timestamp DEFAULT now())')
  await pg.query('INSERT INTO course_pages VALUES ($1,$2,$3,true)', [pageId, 'Trang tài chính', 'published'])
  for (let i = 0; i < ids.length; i++) await pg.query('INSERT INTO course_page_versions (id,course_page_id,version_number,snapshot) VALUES ($1,$2,$3,$4)', [ids[i], pageId, i + 1, JSON.stringify({ kind: [0,2].includes(i) ? 'published' : 'manual', name: 'Trang tài chính', sections: [{ sectionType: 'rich_content', enabled: true, content: { text: 'Version ' + i } }] })])
  const api = load('app/api/admin/course-page-templates/history/route.ts'), input = { id: ids[0] }, execute = { ...input, execute: true, confirm: 'DELETE_COURSE_HISTORY' }
  for (const denied of ['STUDENT', 'TEACHER', 'DEVELOPER']) { role = denied; assert.equal((await api.GET(req('GET'))).status,403); assert.equal((await api.DELETE(req('DELETE', execute))).status,403) }
  role = 'ADMIN'; signedIn = false; assert.equal((await api.GET(req('GET'))).status,403); signedIn = true
  domain = true; assert.equal((await api.DELETE(req('DELETE', execute))).status,403); domain = false
  for (const query of ['?page=-1','?id=invalid','?page=0.1']) assert.equal((await api.GET(req('GET',null,query))).status,400)
  const items = (await (await api.GET(req('GET'))).json()).items
  assert.equal(items.length,5); assert.equal(items.find(x => x.id === ids[0]).protected,false)
  assert.equal(items.find(x => x.id === ids[2]).live,true, 'Latest published remains live even with newer manual checkpoints')
  assert.equal(items.find(x => x.id === ids[2]).protected,true)
  assert.equal(items.find(x => x.id === ids[4]).protected,true, 'Newest checkpoint preserved so version numbers are not reused')
  assert.equal(items.find(x => x.id === ids[3]).protected,false)
  assert.equal(items[0].snapshot,undefined, 'Listing does not serialize large source snapshots')
  assert.equal((await (await api.GET(req('GET',null,'?q=không có'))).json()).items.length,0)
  assert.equal((await (await api.GET(req('GET',null,'?id=' + ids[0]))).json()).items.length,1)
  const before = await pg.query('SELECT count(*)::int AS n FROM course_page_versions')
  const dry = await (await api.DELETE(req('DELETE',input))).json()
  assert.equal(dry.dryRun,true); assert.equal(dry.version.id,ids[0]); assert.deepEqual(dry.affects,{ versions:1,coursePages:0,mediaFiles:0 })
  assert.deepEqual(await pg.query('SELECT count(*)::int AS n FROM course_page_versions'),before)
  assert.equal((await api.DELETE(req('DELETE',{ ...input,execute:true }))).status,400)
  for (const id of [ids[2],ids[4]]) assert.equal((await api.DELETE(req('DELETE',{ ...execute,id }))).status,409)
  await pg.exec("UPDATE course_pages SET status='draft',use_template=false")
  assert.equal((await api.DELETE(req('DELETE',{ ...execute,id:ids[2] }))).status,409, 'Disabled latest publication remains protected')
  const disabled = (await (await api.GET(req('GET',null,'?id=' + ids[2]))).json()).items[0]
  assert.equal(disabled.live,false); assert.equal(disabled.protected,true)
  const savedPublication = (await pg.query('SELECT snapshot FROM course_page_versions WHERE id=$1',[ids[2]])).rows[0].snapshot
  protectRace = true
  assert.equal((await api.DELETE(req('DELETE',execute))).status,409, 'Atomic DELETE rechecks protection after the metadata read')
  assert.equal((await pg.query('SELECT id FROM course_page_versions WHERE id=$1',[ids[0]])).rows.length,1)
  await pg.query('INSERT INTO course_page_versions (id,course_page_id,version_number,snapshot) VALUES ($1,$2,3,$3)',[ids[2],pageId,JSON.stringify(savedPublication)])
  const pageBefore = (await pg.query('SELECT * FROM course_pages')).rows
  assert.equal((await api.DELETE(req('DELETE',execute))).status,200)
  assert.equal((await pg.query('SELECT count(*)::int AS n FROM course_page_versions')).rows[0].n,4)
  assert.deepEqual((await pg.query('SELECT * FROM course_pages')).rows,pageBefore)
  assert.equal((await api.DELETE(req('DELETE',input))).status,404)
  race = true; assert.equal((await api.DELETE(req('DELETE',{ ...execute,id:ids[1] }))).status,409, 'Concurrent deletion is reported, not falsely succeeded')

  const previewPage = load('app/tools/courses/templates/preview/page.tsx').default
  role = 'TEACHER'; await assert.rejects(() => previewPage({ searchParams: Promise.resolve({ version:ids[2] }) }),/NOT_FOUND/)
  role = 'ADMIN'; domain = true; await assert.rejects(() => previewPage({ searchParams: Promise.resolve({ version:ids[2] }) }),/NOT_FOUND/); domain = false
  const rendered = await previewPage({ searchParams: Promise.resolve({ version:ids[2],token:'ignored' }) })
  assert.equal(rendered.props.page.sections[0].type,'rich_content'); assert.equal(rendered.props.exportable,false)
  await assert.rejects(() => previewPage({ searchParams: Promise.resolve({ version:ids[0] }) }),/NOT_FOUND/)

  const React = require('react'), { createRoot } = require('react-dom/client'), { JSDOM } = require('jsdom')
  const dom = new JSDOM('<div id="root"></div>', { url:'https://wi300.vn/tools/courses/templates/history' })
  global.window = dom.window; global.document = dom.window.document; global.self = dom.window; global.IS_REACT_ACT_ENVIRONMENT = true
  let uiDeleted = 0, dryCalls = 0
  const old = items.find(x => x.id === ids[0]), live = items.find(x => x.id === ids[2])
  global.fetch = async (url,options) => {
    if (options.method === 'DELETE') { const body = JSON.parse(options.body); assert.equal(body.id,old.id); if (body.execute) { assert.equal(dryCalls,1); assert.equal(body.confirm,'DELETE_COURSE_HISTORY'); uiDeleted++ } else dryCalls++; return { ok:true,json:async () => body.execute ? { success:true } : { dryRun:true,version:old } } }
    return { ok:true,json:async () => ({ items:uiDeleted ? [live] : [old,live],hasMore:false }) }
  }
  const container = document.getElementById('root'), uiRoot = createRoot(container)
  const tick = fn => React.act(async () => { fn(); await new Promise(resolve => setTimeout(resolve,10)) })
  const click = text => [...container.querySelectorAll('button')].find(button => button.textContent === text).click()
  await tick(() => uiRoot.render(React.createElement(load('components/admin/CourseHistoryManager.tsx').default)))
  assert.equal(container.querySelectorAll('article')[1].querySelectorAll('button')[1].disabled,true)
  assert.ok(container.textContent.includes('Đang phục vụ trang công khai'))
  await tick(() => click('Xem trước')); assert.ok(container.querySelector('iframe').src.endsWith('version=' + old.id))
  await tick(() => click('Điện thoại')); assert.equal(container.querySelector('iframe').width,'390')
  await tick(() => click('Xóa lịch sử')); assert.equal(uiDeleted,0); assert.ok(container.querySelector('[aria-label="Xác nhận xóa lịch sử"]'))
  await tick(() => click('Xác nhận xóa lịch sử')); assert.equal(uiDeleted,1); assert.ok(container.textContent.includes('Đã xóa lịch sử')); assert.equal(container.querySelector('iframe'),null)
  await tick(() => uiRoot.unmount()); dom.window.close()
  console.log('PASS course history: real PostgreSQL listing/protection/deletion, admin/domain guards, dry-run, confirmation, concurrent deletion, preview access and mobile UI')
}
run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => pg.close())
