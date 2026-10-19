// Route tests with isolated database/storage doubles; never changes live data.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const bcrypt = require('bcryptjs')
const root = path.resolve(__dirname, '..'), cache = new Map()
let role = 'ADMIN', customDomain = false, duplicate = false, usageRows = [], usageError = false
let created, uploads = [], removals = [], transactionCalls = 0, metadata = new Map(), listOptions
const storage = {
  getPublicUrl: p => ({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/uploads/' + p } }),
  list: async (folder, options) => {
    listOptions = options
    return { data: Array.from({ length: 61 }, (_, i) => ({ id: i === 0 ? null : String(i), name: i === 0 ? 'legacy-folder' : `file${i}.png`, metadata: { size: 500, mimetype: 'image/png' } })), error: null }
  },
  upload: async (...args) => { uploads.push(args); return { error: null } },
  remove: async values => { removals.push(...values); return { error: null } },
}
const db = {
  $executeRaw: async () => 0,
  $queryRaw: async () => { if (usageError) throw Error('DB unavailable'); return usageRows },
  $transaction: async fn => { transactionCalls++; return fn(db) },
  user: { findFirst: async () => duplicate ? { id: 1 } : null, findMany: async () => [] },
  userClosure: { create: async () => ({}) },
  systemConfig: {
    findMany: async () => [], findUnique: async ({ where }) => metadata.has(where.key) ? { value: metadata.get(where.key) } : null,
    create: async ({ data }) => { metadata.set(data.key, data.value) },
    upsert: async ({ where, create, update }) => { metadata.set(where.key, metadata.has(where.key) ? update.value : create.value) },
    deleteMany: async () => ({}),
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
    return require(name)
  }, mod.exports, mod)
  return mod.exports
}
const req = (method, body, suffix = '') => new Request('https://wi300.vn/api/admin/media' + suffix, { method, ...(method === 'GET' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) })
async function run() {
  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-test-secret'
  const accounts = load('app/api/admin/users/route'), media = load('app/api/admin/media/route'), helper = load('lib/admin-media')
  for (const deniedRole of [null, 'STUDENT', 'TEACHER', 'DEVELOPER']) {
    role = deniedRole
    assert.equal((await accounts.POST(req('POST', {}))).status, 403)
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
  assert.equal((await media.PATCH(req('PATCH', { path: 'avatars/x.png', name: 'Ảnh của tôi', description: 'Mô tả' }))).status, 200)
  assert.equal(metadata.get(helper.mediaKey('avatars/x.png')).name, 'Ảnh của tôi')
  const preview = await media.DELETE(req('DELETE', { path: 'avatars/x.png' }))
  assert.equal((await preview.json()).dryRun, true); assert.equal(removals.length, 0)
  assert.equal((await media.DELETE(req('DELETE', { path: 'avatars/x.png', execute: true }))).status, 400)
  usageRows = [{ id: '42' }]
  assert.equal((await media.DELETE(req('DELETE', { path: 'avatars/x.png', execute: true, confirm: 'DELETE' }))).status, 409)
  usageRows = []; usageError = true
  assert.equal((await media.DELETE(req('DELETE', { path: 'avatars/x.png', execute: true, confirm: 'DELETE' }))).status, 409)
  usageError = false
  assert.equal(removals.length, 0)
  assert.equal((await media.DELETE(req('DELETE', { path: 'avatars/x.png', execute: true, confirm: 'DELETE' }))).status, 200)
  assert.deepEqual(removals, ['avatars/x.png'])
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
  let accountCreated = 0, uiDeletes = 0, submitted
  global.fetch = async (url, options) => {
    if (url === '/api/admin/users') { submitted = JSON.parse(options.body); return { ok: true, json: async () => ({ user: { id: 3801, email: submitted.email }, message: 'Đã tạo.' }) } }
    if (options?.method === 'DELETE') {
      const body = JSON.parse(options.body)
      if (body.execute) uiDeletes++
      return { ok: true, json: async () => body.execute ? { success: true } : { dryRun: true, references: [], unchecked: [], note: 'Test' } }
    }
    return { ok: true, json: async () => ({ items: [{ path: 'old.pdf', filename: 'old.pdf', url: 'https://test.supabase.co/old.pdf', mime: 'application/pdf', size: 10, folder: false }], hasMore: false }) }
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
  await tick(() => container.querySelector('input[type="checkbox"]').click())
  await tick(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Kiểm tra & xóa đã chọn').click())
  assert.equal(uiDeletes, 0, 'Preview must not delete a file')
  assert.ok(container.querySelector('[aria-label="Xác nhận xóa media"]'))
  await tick(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Xác nhận xóa file đủ điều kiện').click())
  assert.equal(uiDeletes, 1)
  await tick(() => uiRoot.unmount()); dom.window.close(); global.FormData = originalFormData
  console.log('Passed: Client account creation and media selection/preview/explicit deletion confirmation.')
  console.log('Passed: Admin-only access, domain isolation, account validation/hash/duplicates, legacy media pagination, metadata, upload limits/type inspection, deletion preview/guards/failure/confirmation, server-only storage key.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
