const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript'), crypto = require('node:crypto')
const root = path.resolve(__dirname, '..'), cache = new Map()
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
function load(file, overrides = {}) {
  const absolute = path.resolve(root, file.endsWith('.ts') ? file : file + '.ts')
  if (cache.has(absolute)) return cache.get(absolute)
  const mod = { exports: {} }; cache.set(absolute, mod.exports)
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in overrides ? overrides[name] : name === './service' ? { CrmError } : name === './learning' ? { learningSummaries: async () => new Map() } : name.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(absolute), name))) : require(name), mod, mod.exports)
  cache.set(absolute, mod.exports); return mod.exports
}
const bulk = load('lib/crm/request-bulk'), admin = { id: 0, role: 'ADMIN', name: 'Admin' }, teacher = { id: 1, role: 'TEACHER', name: 'Teacher' }
const make = (extra = {}) => ({ id: crypto.randomUUID(), version: 1, courseId: null, ownerId: 1, status: 'NEW', resolution: '', publicReply: '', content: 'Question', history: [], ...extra })
let rows = [make(), make({ courseId: 10 }), make({ ownerId: 2 })], writes = 0, notifications = 0, queries = []
const matches = (row, where) => Object.entries(where).every(([key, value]) => key === 'AND' ? value.every(w => matches(row, w)) : key === 'OR' ? value.some(w => matches(row, w)) : key === 'course' ? row.courseId === 10 && value.teacherId === 1 : row[key] === value)
const db = {
  crmRequest: {
    findFirst: async ({ where }) => structuredClone(rows.find(row => matches(row, where)) || null),
    findMany: async args => { queries.push(args); return rows.filter(row => matches(row, args.where)).slice(0, args.take).map(({ id, version }) => ({ id, version })) },
    updateMany: async ({ where, data }) => { const row = rows.find(row => matches(row, where)); if (!row) return { count: 0 }; writes++; for (const [key, value] of Object.entries(data)) if (value !== undefined) row[key] = key === 'version' ? row.version + value.increment : value; return { count: 1 } },
  },
  user: { findUnique: async ({ where }) => ({ role: where.id === 3 ? 'STUDENT' : 'TEACHER' }) },
  crmFormSubmission: { findUnique: async ({ where }) => rows.find(row => row.id === where.requestId)?.page ? { id: 'page' } : null },
  crmContact: { findFirst: async () => null },
  appNotification: { upsert: async () => { notifications++ } },
  $transaction: async fn => fn(db),
}
async function run() {
  const selected = await bulk.selectRequests(db, teacher, {})
  assert.equal(selected.items.length, 2); assert.equal(queries[0].take, 201)
  let result = await bulk.updateRequestsBulk(db, teacher, { action: 'PROCESS', items: rows.map(({ id, version }) => ({ id, version })) })
  assert.equal(result.updated, 2); assert.equal(result.failed, 1); assert.equal(rows[2].status, 'NEW'); assert.equal(rows[0].history[0].changedBy, 1)
  result = await bulk.updateRequestsBulk(db, teacher, { action: 'PROCESS', items: selected.items })
  assert.equal(result.updated, 0); assert.equal(result.failed, 2, 'Stale versions cannot overwrite')
  const before = writes
  await assert.rejects(() => bulk.updateRequestsBulk(db, teacher, { action: 'ASSIGN', items: [{ id: rows[0].id, version: 2 }], ownerId: 0 }), e => e.status === 403)
  await assert.rejects(() => bulk.updateRequestsBulk(db, admin, { action: 'RESOLVE', items: [{ id: rows[0].id, version: 2 }], resolution: ' ' }))
  await assert.rejects(() => bulk.updateRequestsBulk(db, admin, { action: 'PROCESS', items: [selected.items[0], selected.items[0]] }))
  assert.equal(writes, before)
  rows[2].page = true
  result = await bulk.updateRequestsBulk(db, admin, { action: 'ASSIGN', items: rows.map(({ id, version }) => ({ id, version })), ownerId: 0 })
  assert.equal(result.updated, 1); assert.equal(result.failed, 2); assert.equal(rows[0].ownerId, 0); assert.equal(rows[1].ownerId, 1); assert.equal(rows[2].ownerId, 2)
  result = await bulk.updateRequestsBulk(db, admin, { action: 'RESOLVE', items: [{ id: rows[0].id, version: rows[0].version }], resolution: 'Handled internally' })
  assert.equal(result.updated, 1); assert.equal(rows[0].status, 'RESOLVED'); assert.equal(rows[0].publicReply, ''); assert.equal(notifications, 0)
  await assert.rejects(() => bulk.selectRequests(db, admin, { contactId: 42 }), e => e.status === 404)
  rows = Array.from({ length: 201 }, () => make())
  await assert.rejects(() => bulk.selectRequests(db, admin, {}), e => e.status === 413)
  await assert.rejects(() => bulk.selectRequests(db, { id: 3, role: 'STUDENT' }, {}), e => e.status === 403)
  const http = load('lib/crm/http'), workflow = load('lib/crm/request-workflow'), shared = load('lib/crm/shared'), xlsx = load('lib/crm/xlsx')
  let denied = false
  const exportRow = { ...make(), name: 'Member', email: 'member@example.com', phone: '+8490', category: 'SUPPORT', source: 'Member request', createdAt: new Date(), content: '=formula', ipHash: 'PRIVATE HASH' }
  const routeDb = { ...db, crmRequest: { ...db.crmRequest, findMany: async args => { assert.ok(args.where.AND); assert.ok(!args.select.ipHash && !args.select.key && !args.select.history); return [exportRow] } }, user: { findMany: async () => [{ id: 1, name: 'Teacher' }] } }
  const api = load('app/api/crm/requests/bulk/route', {
    '@/lib/prisma': { __esModule: true, default: routeDb }, '@/lib/crm/auth': { getCrmActor: async () => { if (denied) throw new CrmError('Forbidden', 403); return admin } }, '@/lib/crm/http': http, '@/lib/crm/request-bulk': bulk, '@/lib/crm/xlsx': xlsx, '@/lib/crm/shared': shared, '@/lib/crm/request-workflow': workflow, '@/lib/crm/service': { CrmError },
  })
  const post = (body, origin = 'https://test.invalid') => api.POST(new Request('https://test.invalid/api/crm/requests/bulk', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }))
  assert.equal((await post({ action: 'EXPORT' }, 'https://evil.invalid')).status, 403)
  assert.equal((await post({ action: 'EXPORT', userId: 3 })).status, 400)
  const response = await post({ action: 'EXPORT', ids: [exportRow.id] })
  assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /no-store/)
  const bytes = Buffer.from(await response.arrayBuffer()); assert.ok(bytes.includes(Buffer.from('t="inlineStr"'))); assert.ok(!bytes.includes(Buffer.from('PRIVATE HASH'))); assert.ok(bytes.includes(Buffer.from('=formula')))
  denied = true; assert.equal((await post({ action: 'EXPORT' })).status, 403)
  console.log('Bulk requests passed: scoped selection, versions, partial failure, admin zero, source ownership, completion validation, bounded batches and no public reply (isolated fixtures).')
}
run().catch(e => { console.error(e); process.exitCode = 1 })
