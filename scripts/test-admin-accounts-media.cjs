// Route tests with isolated database/storage doubles; never changes live data.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const bcrypt = require('bcryptjs')
const { Prisma } = require('@prisma/client')
const root = path.resolve(__dirname, '..'), cache = new Map()
let role = 'ADMIN', customDomain = false, duplicate = false, usageRows = [], usageError = false
let created, uploads = [], removals = [], transactionCalls = 0, metadata = new Map(), listOptions
let usageQueries = 0, missingSources = false, deniedSources = false, emptyRemoval = false, missingFile = false
const storage = {
  info: async p => missingFile ? { data: null, error: new Error('Not found') } : { data: { id: p, name: p, size: 500, contentType: 'application/pdf', createdAt: '2026-10-19T00:00:00.000Z' }, error: null },
  getPublicUrl: p => ({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/uploads/' + p } }),
  list: async (folder, options) => {
    listOptions = options
    return { data: Array.from({ length: 61 }, (_, i) => ({ id: i === 0 ? null : String(i), name: i === 0 ? 'legacy-folder' : `file${i}.png`, metadata: { size: 500, mimetype: 'image/png' } })), error: null }
  },
  upload: async (...args) => { uploads.push(args); return { error: null } },
  remove: async values => { removals.push(...values); return { data: emptyRemoval ? [] : values.map(name => ({ name })), error: null } },
}
const db = {
  $executeRaw: async () => 0,
  $queryRaw: async query => {
    usageQueries++
    if (usageError) throw Error('DB unavailable')
    if ((missingSources || deniedSources) && /FROM public\."(?:course_pages|course_sections|course_page_versions|course_page_templates)"/.test(query.sql)) throw new Prisma.PrismaClientKnownRequestError('Source unavailable', { code: 'P2010', clientVersion: '5.22.0', meta: { code: deniedSources ? '42501' : '42P01' } })
    return usageRows
  },
  $transaction: async fn => { transactionCalls++; return fn(db) },
  user: { findFirst: async () => duplicate ? { id: 1 } : null, findMany: async () => [] },
  userClosure: { create: async () => ({}) },
  systemConfig: {
    findMany: async ({ where }) => [...metadata].filter(([key]) => where.key.in ? where.key.in.includes(key) : key.startsWith(where.key.startsWith)).map(([key,value]) => ({ key,value })), findUnique: async ({ where }) => metadata.has(where.key) ? { value: metadata.get(where.key) } : null,
    create: async ({ data }) => { metadata.set(data.key, data.value) },
    upsert: async ({ where, create, update }) => { metadata.set(where.key, metadata.has(where.key) ? update.value : create.value) },
    deleteMany: async ({ where }) => { for (const key of metadata.keys()) if (typeof where.key === 'string' ? key === where.key : where.key.in.includes(key)) metadata.delete(key); return {} },
  },
}
function load(rel) {
  const file = path.resolve(root, rel.endsWith('.ts') || rel.endsWith('.tsx') ? rel : rel + '.ts')
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }; cache.set(file, mod)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'exports', 'module', code)(name => {
    if (name === 'server-only') return {}
    if (name === '@/auth') return { auth: async () => role ? { user: { id: '0', role, name: 'Admin' } } : null }
    if (name === '@/lib/website/domain-context') return { domainContext: async () => customDomain }
    if (name === '@/lib/prisma') return { __esModule: true, default: db }
    if (name === '@/lib/activity-logger') return { logActivity: async () => {} }
    if (name === '@/lib/id-helper') return { createUserWithAvailableIdInTransaction: async (tx, data) => { assert.equal(tx, db); created = data; return { ...data, id: 3800 } } }
    if (name === '@supabase/supabase-js') return { createClient: (url, key) => { assert.equal(key, 'server-test-secret'); return { storage: { from: bucket => { assert.equal(bucket, 'uploads'); return storage } } } } }
    if (name.startsWith('@/')) return load(name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }, mod.exports, mod)
  return mod.exports
}
const req = (method, body, suffix = '') => new Request('https://wi300.vn/api/admin/media' + suffix, { method, ...(method === 'GET' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) })
async function run() {
  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-test-secret'
  const accounts = load('app/api/admin/users/route'), media = load('app/api/admin/media/route'), batch = load('app/api/admin/media/batch/route'), helper = load('lib/admin-media'), trashHelper = load('lib/media-trash')
  for (const deniedRole of [null, 'STUDENT', 'TEACHER', 'DEVELOPER']) {
    role = deniedRole
    assert.equal((await accounts.POST(req('POST', {}))).status, 403)
    assert.equal((await batch.POST(req('POST', { paths: ['x.png'] }))).status, 403)
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) assert.equal((await media[method](req(method, {}))).status, 403)
  }
  role = 'ADMIN'; customDomain = true
  assert.equal((await accounts.POST(req('POST', {}))).status, 403)
  assert.equal((await media.GET(req('GET'))).status, 403)
  customDomain = false
  const account = { name: 'Nguyễn Hương', email: 'LUCY@example.com', phone: '0912345678', password: 'long-passphrase-123', role: 'TEACHER' }
  assert.equal((await accounts.POST(req('POST', { ...account, role: 'ADMIN' }))).status, 400)
  assert.equal((await accounts.POST(req('POST', { ...account, password: 'short' }))).status, 400)
  assert.equal((await accounts.POST(req('POST', { ...account, password: 'ệ'.repeat(30) }))).status, 400)
  duplicate = true
  assert.equal((await accounts.POST(req('POST', account))).status, 409)
  assert.equal(created, undefined)
  duplicate = false
  const createdResponse = await accounts.POST(req('POST', account))
  assert.equal(createdResponse.status, 201)
  const result = await createdResponse.json()
  assert.equal(result.user.password, undefined)
  assert.equal(created.email, 'lucy@example.com'); assert.equal(created.phone, '+84912345678')
  assert.equal(created.role, 'TEACHER'); assert.equal(await bcrypt.compare(account.password, created.password), true)
  assert.equal(created.emailVerified, undefined, 'Admin creation must not falsely verify email')
  for (const unsafe of ['../x', '/etc/passwd', 'foo/../x', 'foo\\bar', 'a//b', 'x\u0000y']) assert.equal(helper.mediaPath.safeParse(unsafe).success, false)
  assert.equal((await media.GET(req('GET', null, '?page=-1'))).status, 400)
  const listing = await (await media.GET(req('GET', null, '?path=avatars&page=1'))).json()
  assert.equal(listing.items.length, 60); assert.equal(listing.hasMore, true); assert.equal(listing.items[0].folder, true)
  assert.equal(listOptions.offset, 60); assert.equal(listOptions.limit, 61)
  const originalFetch = global.fetch
  try {
    let previewFetches = 0
    global.fetch = async (url, options) => {
      previewFetches++; assert.equal(url.origin, 'https://test.supabase.co'); assert.equal(options.redirect, 'error')
      return new Response('<html><body><h1>Tài chính</h1><script>alert(1)</script></body></html>')
    }
    assert.equal((await media.GET(req('GET', null, '?path=file.zip&preview=1'))).status, 400)
    assert.equal(previewFetches, 0)
    const htmlPreview = await media.GET(req('GET', null, '?path=course-template-sources/finance.html&preview=1'))
    assert.equal(htmlPreview.headers.get('Content-Type'), 'text/html; charset=utf-8')
    assert.ok(htmlPreview.headers.get('Content-Security-Policy').includes("script-src 'none'"))
    assert.ok(htmlPreview.headers.get('Content-Security-Policy').startsWith('sandbox;'))
    assert.ok((await htmlPreview.text()).includes('<h1>Tài chính</h1>'))
    global.fetch = async () => new Response(new Uint8Array(8 * 1024 * 1024 + 1))
    assert.equal((await media.GET(req('GET', null, '?path=finance.html&preview=1'))).status, 413)
  } finally { global.fetch = originalFetch }
  assert.equal((await media.PATCH(req('PATCH', { path: 'avatars/x.png', name: 'Ảnh của tôi', description: 'Mô tả' }))).status, 200)
  assert.equal(metadata.get(helper.mediaKey('avatars/x.png')).name, 'Ảnh của tôi')
  const preview = await media.DELETE(req('DELETE', { path: 'avatars/x.png' }))
  assert.equal((await preview.json()).dryRun, true); assert.equal(removals.length, 0)
  assert.equal((await media.DELETE(req('DELETE', { path: 'avatars/x.png', execute: true }))).status, 400)
  usageRows = [{ path: 'avatars/x.png', id: '42' }]
  assert.equal((await media.DELETE(req('DELETE', { path: 'avatars/x.png', execute: true, confirm: 'DELETE' }))).status, 409)
  usageRows = []; usageError = true
  assert.equal((await media.DELETE(req('DELETE', { path: 'avatars/x.png', execute: true, confirm: 'DELETE' }))).status, 409)
  usageError = false
  assert.equal(removals.length, 0)
  assert.equal((await media.DELETE(req('DELETE', { path: 'avatars/x.png', execute: true, confirm: 'DELETE' }))).status, 200)
  assert.deepEqual(removals, [], 'Legacy delete must preserve file bytes in trash')
  assert.ok(metadata.has(trashHelper.trashKey('avatars/x.png')))
  const paths = Array.from({ length: 20 }, (_, i) => `media/file${i}.png`)
  const beforeQueries = usageQueries, beforeRemovals = removals.length
  missingSources = true
  const batchPreview = await (await batch.POST(req('POST', { paths }))).json()
  assert.equal(batchPreview.dryRun, true); assert.equal(batchPreview.items.length, 20)
  assert.equal(usageQueries - beforeQueries, 13, 'Twenty files must use one scan per source, not 260 scans')
  assert.equal(removals.length, beforeRemovals, 'Preview must never mutate Storage')
  assert.deepEqual(batchPreview.items[0].missingTables, ['CoursePage', 'CourseSection', 'CoursePageVersion', 'CoursePageTemplate'])
  assert.deepEqual(batchPreview.items[0].unchecked, [], 'Absent optional tables contain no references')
  assert.equal((await batch.POST(req('POST', { paths, execute: true }))).status, 400)
  deniedSources = true
  const blocked = await (await batch.POST(req('POST', { paths, execute: true, confirm: 'DELETE' }))).json()
  assert.equal(blocked.deleted.length, 0); assert.equal(blocked.blocked.length, 20)
  assert.equal(removals.length, beforeRemovals, 'Permission errors must still block all affected deletions')
  deniedSources = false
  usageRows = [{ path: paths[0], id: '42' }]
  const mixed = await (await batch.POST(req('POST', { paths, execute: true, confirm: 'DELETE' }))).json()
  assert.equal(mixed.deleted.length, 19); assert.equal(mixed.blocked.length, 1)
  assert.ok(!mixed.deleted.includes(paths[0]), 'References are rechecked before executing')
  usageRows = []; missingSources = false; emptyRemoval = true
  const empty = await (await batch.POST(req('POST', { paths: [paths[1]], action: 'purge', execute: true, confirm: 'DELETE' }))).json()
  assert.deepEqual(empty.deleted, []); assert.equal(empty.failed.length, 1, 'Empty Storage results must not report success')
  emptyRemoval = false
  assert.ok(metadata.has(trashHelper.trashKey(paths[1])), 'Unconfirmed deletion retains the trash record')
  const restored = await (await batch.POST(req('POST', { paths: [paths[2]], action: 'restore', execute: true, confirm: 'RESTORE' }))).json()
  assert.deepEqual(restored.processed, [paths[2]])
  assert.equal(metadata.has(trashHelper.trashKey(paths[2])), false)
  const purged = await (await batch.POST(req('POST', { paths: [paths[1]], action: 'purge', execute: true, confirm: 'DELETE' }))).json()
  assert.deepEqual(purged.processed, [paths[1]]); assert.equal(metadata.has(trashHelper.trashKey(paths[1])), false)
  const activePurge = await (await batch.POST(req('POST', { paths: ['active.png'], action: 'purge', execute: true, confirm: 'DELETE' }))).json()
  assert.equal(activePurge.processed.length, 0, 'Only items already in trash can be purged')
  assert.equal((await batch.POST(req('POST', { paths: [paths[3]], action: 'restore', execute: true, confirm: 'DELETE' }))).status, 400)
  const trashListing = await (await media.GET(req('GET', null, '?trash=1'))).json()
  assert.ok(trashListing.items.some(item => item.path === paths[3]))
  const activeListing = await (await media.GET(req('GET', null, '?path=media'))).json()
  assert.ok(!activeListing.items.some(item => item.path === paths[3]), 'Trashed files are hidden from the active listing')
  assert.ok(activeListing.items.some(item => item.path === paths[2]), 'Restoring returns the original path to the active listing')
  missingFile = true
  const missingRestore = await (await batch.POST(req('POST', { paths: [paths[4]], action: 'restore', execute: true, confirm: 'RESTORE' }))).json()
  assert.equal(missingRestore.processed.length, 0); assert.equal(missingRestore.failed.length, 1)
  assert.ok(metadata.has(trashHelper.trashKey(paths[4])), 'Missing bytes must not be falsely reported restored')
  missingFile = false
  assert.equal((await batch.POST(req('POST', { paths: [...paths, 'overflow.png'] }))).status, 400)
  // Execute the real generated SQL against isolated PostgreSQL, including the legacy schema.
  const { PGlite } = require('@electric-sql/pglite'), pg = new PGlite()
  const originalTransaction = db.$transaction
  try {
    for (const table of ['Course', 'Lesson', 'Post', 'SiteProfile', 'LandingPage', 'LessonComment', 'Payment']) await pg.exec(`CREATE TABLE "${table}" (id int, body text)`)
    await pg.exec('CREATE TABLE "User" (id int, image text); CREATE TABLE "SystemConfig" (key text, value jsonb)')
    await pg.query('INSERT INTO "Course" VALUES (1,$1)', [paths[0]])
    await pg.query('INSERT INTO "User" VALUES (0,$1)', [paths[1]])
    await pg.query('INSERT INTO "SystemConfig" VALUES ($1,$2)', ['admin-media:metadata', JSON.stringify({ url: paths[2] })])
    await pg.query('INSERT INTO "SystemConfig" VALUES ($1,$2)', ['website-config', JSON.stringify({ url: paths[3] })])
    db.$transaction = fn => pg.transaction(tx => fn({
      $executeRaw: q => tx.query(q.text, q.values),
      $queryRaw: async q => {
        try { return (await tx.query(q.text, q.values)).rows }
        catch (error) { throw new Prisma.PrismaClientKnownRequestError(error.message, { code: 'P2010', clientVersion: '5.22.0', meta: { code: error.code } }) }
      },
    }))
    const sqlResults = await helper.mediaUsageBatch(paths.map(path => ({ path, url: storage.getPublicUrl(path).data.publicUrl })))
    assert.equal(sqlResults[0].references[0].type, 'Course')
    assert.equal(sqlResults[1].references[0].type, 'Ảnh đại diện')
    assert.deepEqual(sqlResults[2].references, [], 'Management metadata is not a content reference')
    assert.equal(sqlResults[3].references[0].type, 'SystemConfig')
    assert.deepEqual(sqlResults[0].unchecked, [])
    assert.equal(sqlResults[0].missingTables.length, 4)
    // Prisma maps these models to snake_case tables on the actual database.
    await pg.exec('CREATE TABLE course_pages (id text, name text, body text); CREATE TABLE course_sections (id text, course_page_id text, section_key text, body text); ALTER TABLE "Course" ADD COLUMN name_lop text; ALTER TABLE "Post" ADD COLUMN title text')
    await pg.query('UPDATE "Course" SET name_lop=$1', ['Tài chính căn bản'])
    await pg.query('INSERT INTO "Post" VALUES (8,$1,$2)', [paths[0], 'Quản lý dòng tiền'])
    await pg.query('INSERT INTO course_pages VALUES ($1,$2,$3)', ['page-1', 'Trang tài chính', paths[4]])
    await pg.query('INSERT INTO course_sections VALUES ($1,$2,$3,$4)', ['section-1', 'page-1', 'hero', paths[5]])
    const mapped = await helper.mediaUsageBatch(paths.map(path => ({ path, url: storage.getPublicUrl(path).data.publicUrl })))
    assert.equal(mapped[0].references.find(ref => ref.type === 'Course').title, 'Tài chính căn bản')
    assert.equal(mapped[0].references.find(ref => ref.type === 'Post').href, '/tools/posts?edit=8')
    assert.equal(mapped[4].references[0].title, 'Trang tài chính')
    assert.equal(mapped[4].references[0].href, '/tools/courses/pages/page-1')
    assert.equal(mapped[5].references[0].href, '/tools/courses/pages/page-1')
    assert.deepEqual(mapped[4].missingTables, ['CoursePageVersion', 'CoursePageTemplate'])
    assert.deepEqual(mapped[4].unchecked, [])
  } finally { db.$transaction = originalTransaction; await pg.close() }
  const upload = async file => { const form = new FormData(); form.set('file', file); return media.POST(new Request('https://wi300.vn/api/admin/media', { method: 'POST', body: form })) }
  assert.equal((await upload(new File(['<script>alert(1)</script>'], 'x.html', { type: 'text/html' }))).status, 400)
  assert.equal((await upload(new File(['fake pdf'], 'x.pdf', { type: 'application/pdf' }))).status, 400)
  assert.equal((await upload(new File([Buffer.alloc(4 * 1024 * 1024 + 1)], 'big.txt', { type: 'text/plain' }))).status, 400)
  assert.equal((await upload(new File(['%PDF-1.7\n'], 'test.pdf', { type: 'application/pdf' }))).status, 201)
  const png = await require('sharp')({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer()
  assert.equal((await upload(new File([png], 'photo.png', { type: 'image/png' }))).status, 201)
  assert.equal(uploads.length, 2); assert.equal(uploads[1][2].contentType, 'image/webp'); assert.equal(uploads[1][2].upsert, false)
  assert.ok(uploads[1][0].startsWith('media/'))
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  assert.throws(() => helper.mediaStorage(), /Cần cấu hình/)
  assert.ok(transactionCalls >= 2)
  // Exercise the actual client forms and deletion confirmation in a DOM.
  const React = require('react'), { createRoot } = require('react-dom/client'), { JSDOM } = require('jsdom')
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/tools/media' })
  global.window = dom.window; global.self = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  const originalFormData = global.FormData
  global.FormData = dom.window.FormData
  let accountCreated = 0, uiDeletes = 0, submitted, failBatch = false, uiTrashed = false
  global.fetch = async (url, options) => {
    if (url === '/api/admin/users') { submitted = JSON.parse(options.body); return { ok: true, json: async () => ({ user: { id: 3801, email: submitted.email }, message: 'Đã tạo.' }) } }
    if (url === '/api/admin/media/batch') {
      if (failBatch) throw new DOMException('Slow request', 'TimeoutError')
      const body = JSON.parse(options.body)
      if (body.execute) { uiDeletes++; uiTrashed = body.action === 'trash' }
      return { ok: true, json: async () => body.execute ? { processed: body.paths, deleted: body.paths, blocked: [], failed: [] } : { dryRun: true, items: body.paths.map(path => ({ path, references: [], unchecked: [], missingTables: [], note: 'Test' })) } }
    }
    const inTrash = String(url).includes('trash=1')
    if (String(url).includes('usage=1')) return { ok: true, json: async () => ({ references: [{ type: 'Post', id: '8', title: 'Quản lý dòng tiền', href: '/tools/posts?edit=8' }], unchecked: [], note: 'Test' }) }
    return { ok: true, json: async () => ({ items: inTrash === uiTrashed ? [{ path: 'old.pdf', filename: 'old.pdf', url: 'https://test.supabase.co/old.pdf', mime: 'application/pdf', size: 10, folder: false, createdAt: '2026-10-19T00:00:00Z', ...(inTrash ? { trashedAt: '2026-10-19T00:00:00Z' } : {}) }] : [], hasMore: false }) }
  }
  const container = document.getElementById('root'), uiRoot = createRoot(container)
  const tick = async action => React.act(async () => { action(); await new Promise(resolve => setTimeout(resolve, 10)) })
  await tick(() => uiRoot.render(React.createElement(load('components/admin/students/CreateAccountForm.tsx').default, { onCreated: () => accountCreated++ })))
  await tick(() => container.querySelector('button').click())
  for (const [name, value] of Object.entries(account)) container.querySelector(`[name="${name}"]`).value = value
  await tick(() => container.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(accountCreated, 1); assert.equal(submitted.role, 'TEACHER'); assert.ok(container.textContent.includes('3801'))
  await tick(() => uiRoot.render(React.createElement(load('components/admin/MediaManager.tsx').default)))
  assert.ok(container.textContent.includes('old.pdf'))
  assert.ok(container.textContent.includes('Tải lên: 07:00:00'), 'Upload time is visible on the card in Vietnam time')
  await tick(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Xem trước / Nơi sử dụng').click())
  assert.equal(container.querySelector('iframe').getAttribute('sandbox'), '', 'Preview cannot execute uploaded scripts')
  assert.equal(container.querySelector('[aria-label="Nơi sử dụng"] a').getAttribute('href'), '/tools/posts?edit=8')
  assert.ok(container.textContent.includes('Quản lý dòng tiền'))
  await tick(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Đóng').click())
  await tick(() => container.querySelector('input[type="checkbox"]').click())
  await tick(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Chuyển vào thùng rác').click())
  assert.equal(uiDeletes, 0, 'Preview must not delete a file')
  assert.ok(container.querySelector('[aria-label="Xác nhận xóa media"]'))
  await tick(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Xác nhận chuyển vào thùng rác').click())
  assert.equal(uiDeletes, 1)
  assert.ok(container.textContent.includes('Đã chuyển vào thùng rác 1/1'))
  await tick(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Thùng rác').click())
  await tick(() => container.querySelector('input[type="checkbox"]').click())
  await tick(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Khôi phục đã chọn').click())
  await tick(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Xác nhận khôi phục').click())
  assert.ok(container.textContent.includes('Đã khôi phục 1/1'))
  await tick(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Đang sử dụng').click())
  failBatch = true
  await tick(() => container.querySelector('input[type="checkbox"]').click())
  await tick(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Chuyển vào thùng rác').click())
  assert.ok(container.textContent.includes('Đã hết thời gian chờ'))
  assert.equal([...container.querySelectorAll('button')].find(button => button.textContent === 'Chuyển vào thùng rác').disabled, false, 'Timeout releases the busy state')
  await tick(() => uiRoot.unmount()); dom.window.close(); global.FormData = originalFormData
  console.log('Passed: Client account creation, trash preview/confirmation, trash tab, restore UI, and timeout recovery.')
  console.log('Passed: Legacy delete preserves bytes; active/trash listings, same-path restore, missing bytes, explicit purge only from trash, references, partial Storage responses and concurrent-operation lock.')
  console.log('Passed: Admin-only access, domain isolation, account validation/hash/duplicates, legacy media pagination, metadata, upload limits/type inspection, deletion preview/guards/failure/confirmation, server-only storage key.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
