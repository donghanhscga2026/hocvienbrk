const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
function load(file, overrides = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in overrides ? overrides[name] : require(name), module, module.exports)
  return module.exports
}
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
async function run() {
  // Mocks only: never load app Prisma or connect to a deployed database.
  process.env.AUTH_SECRET = 'partner-tests-only'
  const validation = load('lib/crm/validation.ts', { './shared': { CRM_STAGES: ['NEW'] } })
  const service = load('lib/wi300/partner-requests.ts', { '@/lib/crm/validation': validation, '@/lib/crm/service': { CrmError } })
  const rows = []
  let exists = true, historyQuery
  const matches = (row, where) => Object.entries(where).every(([key, value]) => key === 'createdAt' ? row.createdAt >= value.gte : row[key] === value)
  const tx = {
    $executeRaw: async () => 1,
    user: { findUnique: async () => exists ? { name: 'Lucy', email: 'lucy@example.com' } : null },
    crmRequest: {
      findUnique: async ({ where }) => rows.find(row => row.key === where.key),
      count: async ({ where }) => rows.filter(row => matches(row, where)).length,
      create: async ({ data }) => { rows.push({ ...data, id: randomUUID(), status: 'NEW', publicReply: '', resolution: 'Private admin note', createdAt: new Date() }); return rows.at(-1) },
      findMany: async query => { historyQuery = query; return rows.filter(row => matches(row, query.where)).slice(query.skip, query.skip + query.take).map(row => Object.fromEntries(Object.keys(query.select).map(key => [key, row[key]]))) },
    },
  }
  const db = { ...tx, $transaction: async callback => callback(tx) }
  const input = { key: randomUUID(), kind: 'TEACHER', phone: '0901234567', organization: '', expertise: 'Tài chính cá nhân', proposal: 'Mở khóa học về quản lý tài chính', portfolio: '', consent: true }
  for (const invalid of [{ ...input, userId: 9 }, { ...input, role: 'ADMIN' }, { ...input, consent: false }, { ...input, kind: 'BUSINESS' }, { ...input, kind: 'ADMIN' }, { ...input, portfolio: 'javascript:alert(1)' }, { ...input, portfolio: 'http://example.com' }, { ...input, portfolio: 'https://example.com/' + 'a'.repeat(500) }]) assert.equal(service.partnerInput.safeParse(invalid).success, false)
  await assert.rejects(() => service.createPartnerRequest(db, { ...input, phone: 'abc' }, 0, 'local'))
  await service.createPartnerRequest(db, input, 0, 'local')
  await service.createPartnerRequest(db, input, 0, 'local')
  assert.equal(rows.length, 1, 'Retry does not duplicate request')
  assert.equal(rows[0].userId, 0, 'Account zero is valid')
  assert.equal(rows[0].ownerId, null)
  assert.equal(rows[0].phone, '+84901234567')
  assert.equal(rows[0].category, 'CONSULTATION')
  assert.equal(rows[0].source, service.PARTNER_SOURCE)
  assert.match(rows[0].content, /Đăng ký: Giảng viên/)
  assert.equal(tx.user.update, undefined, 'No role grant path')
  await service.createPartnerRequest(db, { ...input, kind: 'BOTH', organization: 'Wi.Tech' }, 8, 'other')
  const own = await service.readPartnerRequests(db, 0, 1)
  assert.equal(own.total, 1)
  assert.equal(own.requests.length, 1, 'Other account requests are excluded')
  assert.deepEqual(historyQuery.where, { userId: 0, source: service.PARTNER_SOURCE })
  for (const privateField of ['resolution', 'history', 'email', 'phone', 'key', 'ipHash']) assert.equal(privateField in own.requests[0], false)
  await service.createPartnerRequest(db, { ...input, key: randomUUID() }, 0, 'local')
  await service.createPartnerRequest(db, { ...input, key: randomUUID() }, 0, 'local')
  await assert.rejects(() => service.createPartnerRequest(db, { ...input, key: randomUUID() }, 0, 'local'), error => error.status === 429)
  exists = false
  await assert.rejects(() => service.createPartnerRequest(db, input, 22, 'local'), error => error.status === 401)
  exists = true
  let brand = null, session = { user: { id: '0' } }
  const http = load('lib/crm/http.ts', { './service': { CrmError } })
  const api = load('app/api/wi300/partner-requests/route.ts', { '@/auth': { auth: async () => session }, '@/lib/prisma': { __esModule: true, default: db }, '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand }, '@/lib/crm/http': http, '@/lib/crm/service': { CrmError }, '@/lib/wi300/partner-requests': service })
  const get = () => api.GET(new Request('https://wi300.vn/api/wi300/partner-requests?userId=8'))
  assert.equal((await get()).status, 404, 'Unavailable on old deployment')
  brand = { name: 'WI300' }; session = null
  assert.equal((await get()).status, 401)
  session = { user: { id: '0' } }
  const response = await get()
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control'), /no-store/)
  assert.equal((await response.json()).total, 3, 'Caller cannot override account identity')
  assert.equal((await api.GET(new Request('https://wi300.vn/api/wi300/partner-requests?page=-1'))).status, 400)
  const forged = new Request('https://wi300.vn/api/wi300/partner-requests', { method: 'POST', headers: { Origin: 'https://evil.example.com', 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  assert.equal((await api.POST(forged)).status, 403)

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/doi-tac' })
  global.window = dom.window; global.document = dom.window.document; global.FormData = dom.window.FormData; global.IS_REACT_ACT_ENVIRONMENT = true
  let sent, posts = 0, fail = true
  const savedFetch = global.fetch
  global.fetch = async (url, options) => {
    if (options?.method === 'POST') { sent = JSON.parse(options.body); posts++; return { ok: !fail, json: async () => fail ? { error: 'Thử lại' } : { received: true } } }
    return { ok: true, json: async () => ({ requests: [{ id: 'r1', content: 'Đăng ký: Giảng viên\nNội dung mẫu', status: 'IN_PROGRESS', publicReply: 'Hẹn trao đổi trực tiếp.', createdAt: '2026-10-09T12:00:00Z' }], total: 1 }) }
  }
  const Form = load('components/wi300/Wi300PartnerForm.tsx').default
  const root = createRoot(document.getElementById('root'))
  try {
    await React.act(async () => root.render(React.createElement(Form, { name: 'Lucy', phone: '0901234567' })))
    assert.match(document.body.textContent, /Đang trao đổi/)
    assert.match(document.body.textContent, /Hẹn trao đổi trực tiếp/)
    assert.equal(document.querySelector('[name="phone"]').value, '0901234567')
    const select = document.querySelector('select')
    await React.act(async () => { select.value = 'BUSINESS'; select.dispatchEvent(new window.Event('change', { bubbles: true })) })
    assert.equal(document.querySelector('[name="organization"]').required, true)
    for (const [name, value] of Object.entries({ organization: 'Wi.Tech', expertise: 'Phát triển website', proposal: 'Giới thiệu giải pháp website doanh nghiệp' })) document.querySelector(`[name="${name}"]`).value = value
    document.querySelector('[name="consent"]').checked = true
    const submit = () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    await React.act(async () => submit())
    const firstKey = sent.key
    assert.match(document.querySelector('[role="alert"]').textContent, /Thử lại/)
    fail = false
    await React.act(async () => submit())
    assert.equal(posts, 2)
    assert.equal(sent.key, firstKey, 'Retry retains idempotency key')
    assert.equal(sent.kind, 'BUSINESS')
    assert.equal(sent.consent, true)
    assert.match(document.querySelector('[role="status"]').textContent, /chưa tự cấp quyền/)
    assert.equal(document.querySelector('select').value, 'TEACHER')
  } finally { await React.act(async () => root.unmount()); global.fetch = savedFetch; dom.window.close() }
  console.log('WI300 partners: strict input, verified identity, ownership, private history, idempotency, rate limit, old-site isolation, origin, form retry and manual-review copy passed (mock DB only).')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
