const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript'), crypto = require('node:crypto')
const root = path.resolve(__dirname, '..'), cache = new Map()
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
const summaries = async () => new Map([[3, [{ courseId: 10, title: 'Khóa trong phạm vi', completed: 2, total: 5 }]]])
function load(file) {
  const absolute = path.resolve(root, file.endsWith('.ts') ? file : file + '.ts')
  if (cache.has(absolute)) return cache.get(absolute)
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name === './service') return { CrmError }
    if (name === './learning') return { learningSummaries: summaries }
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(absolute), name)))
    return require(name)
  }, mod, mod.exports)
  cache.set(absolute, mod.exports); return mod.exports
}
const workflow = load('lib/crm/request-workflow'), requests = load('lib/crm/requests'), support = load('lib/crm/account-support')
let checks = 0
const ok = (value, message) => { assert.ok(value, message); checks++ }
const deny = async (operation, status) => { await assert.rejects(operation, error => error.status === status); checks++ }
const id = crypto.randomUUID(), teacher = { id: 1, role: 'TEACHER', name: 'Giảng viên' }, admin = { id: 0, role: 'ADMIN', name: 'Quản trị' }
let row = { id, key: 'private-key', ipHash: 'private-ip', userId: 3, contactId: null, courseId: null, ownerId: null, category: 'CONSULTATION', source: workflow.PARTNER_SOURCE, version: 1, status: 'NEW', resolution: '', publicReply: '', history: [], name: 'Người gửi' }, notifications = [], users = [{ id: 0, role: 'ADMIN' }, { id: 1, role: 'TEACHER' }, { id: 2, role: 'TEACHER' }, { id: 3, role: 'STUDENT', name: 'Người gửi', image: null }]
const matches = (where, value = row) => Object.entries(where).every(([key, field]) => key === 'OR' ? field.some(item => matches(item, value)) : key === 'AND' ? field.every(item => matches(item, value)) : key === 'course' ? value.courseId === 10 && field.teacherId === 1 : value[key] === field)
const fake = {
  crmRequest: {
    findFirst: async ({ where }) => matches(where) ? structuredClone(row) : null,
    findUnique: async ({ where }) => row?.key === where.key ? row : null,
    updateMany: async ({ where, data }) => { if (!matches(where)) return { count: 0 }; for (const [key, value] of Object.entries(data)) if (value !== undefined) row[key] = key === 'version' ? row.version + value.increment : structuredClone(value); return { count: 1 } },
    findMany: async ({ where }) => { if (where.userId != null) return [{ id, source: row.source, category: row.category, status: row.status }]; return [structuredClone(row)] },
    count: async () => 0,
    create: async ({ data }) => { row = { id: crypto.randomUUID(), userId: null, ownerId: null, contactId: null, status: 'NEW', history: [], version: 1, ...data }; return row },
  },
  user: { findUnique: async ({ where }) => users.find(user => user.id === where.id) || null },
  crmFormSubmission: { findUnique: async () => null },
  crmContact: { findMany: async () => [] },
  course: { findMany: async ({ where }) => { ok(where.status === true, 'Non-admin sees only public teaching courses'); return [] } },
  appNotification: { upsert: async ({ create }) => { if (!notifications.some(item => item.eventKey === create.eventKey)) notifications.push(create); return create } },
  $executeRaw: async () => 1,
  $transaction: async operation => { const before = structuredClone(row), beforeNotifications = structuredClone(notifications); try { return await operation(fake) } catch (error) { row = before; notifications = beforeNotifications; throw error } },
}
async function run() {
  const input = { key: crypto.randomUUID(), content: 'Tư vấn khóa học', category: 'CONSULTATION', consent: true }
  await deny(() => requests.createRequest(fake, input, null, 'test'), 401)
  ok(workflow.requestTopic(row) === 'PARTNER', 'Existing partner requests are classified without data rewrite')
  ok(workflow.requestTopic({ category: 'SUPPORT', source: workflow.ACCOUNT_SUPPORT_SOURCE }) === 'ACCOUNT', 'Account support separate from technical support')
  ok(workflow.requestTopic({ category: 'SUPPORT', source: workflow.FEEDBACK_SOURCE }) === 'FEEDBACK', 'Feedback separate from generic support')
  await deny(() => requests.updateRequest(fake, teacher, { id, version: 1, status: 'NEW', resolution: 'Không có quyền' }), 409)
  await requests.updateRequest(fake, admin, { id, version: 1, ownerId: 1, status: 'IN_PROGRESS', resolution: 'Ghi chú riêng', outcome: 'MORE_INFO' })
  ok(row.ownerId === 1 && row.version === 2 && row.userId === 3, 'Assignment uses stored user and optimistic version')
  ok(workflow.partnerOutcome(row.history) === 'MORE_INFO' && notifications.length === 0, 'Partner outcome and note do not send a public reply or grant roles')
  await deny(() => requests.updateRequest(fake, teacher, { id, version: 2, ownerId: 2 }), 403)
  await deny(() => requests.updateRequest(fake, teacher, { id, version: 2, resolution: 'Private', publicReply: 'Accidental send' }), 400)
  await deny(() => requests.updateRequest(fake, teacher, { id, version: 2, action: 'SEND_REPLY', publicReply: ' ' }), 400)
  await requests.updateRequest(fake, teacher, { id, version: 2, action: 'SEND_REPLY', publicReply: 'Vui lòng bổ sung hồ sơ.' })
  ok(row.resolution === 'Ghi chú riêng' && row.publicReply === 'Vui lòng bổ sung hồ sơ.', 'Explicit reply preserves private note')
  ok(notifications.length === 1 && notifications[0].recipientId === 3 && notifications[0].kind === 'REQUEST_UPDATED', 'Explicit reply notifies stored sender only')
  await deny(() => requests.updateRequest(fake, teacher, { id, version: 2, action: 'SEND_REPLY', publicReply: 'Retry' }), 409)
  ok(notifications.length === 1, 'Stale retry cannot notify twice')
  await requests.updateRequest(fake, teacher, { id, version: 3, action: 'REMIND' })
  ok(notifications[1].recipientId === 1 && notifications[1].kind === 'REQUEST_INCOMING', 'Reminder targets assigned owner')
  await deny(() => requests.updateRequest(fake, teacher, { id, version: 4, action: 'REMIND' }), 429)
  ok(row.version === 4, 'Cooldown failure leaves request unchanged')
  const publicThread = workflow.publicRequestThread(row.history)
  ok(publicThread.length === 1 && !JSON.stringify(publicThread).includes('Ghi chú riêng') && !('changedBy' in publicThread[0]), 'Public timeline whitelists reply fields')
  await deny(() => requests.updateRequest(fake, teacher, { id, version: 4, status: 'RESOLVED', resolution: '' }), 400)
  await requests.updateRequest(fake, teacher, { id, version: 4, status: 'RESOLVED', resolution: 'Đã xử lý' })
  ok(row.status === 'RESOLVED' && row.history.at(-1).authorName === teacher.name, 'Resolve writes actor and time')
  const list = await requests.readRequests(fake, teacher, 1)
  ok(list.requests[0].topic === 'PARTNER' && !('history' in list.requests[0]) && !('key' in list.requests[0]) && !('ipHash' in list.requests[0]), 'Staff list excludes raw private metadata')
  await deny(() => requests.requestProfile(fake, { id: 2, role: 'TEACHER', name: 'Other' }, id), 404)
  const profile = await requests.requestProfile(fake, teacher, id)
  ok(profile.profile.id === 3 && profile.profile.role === 'STUDENT' && profile.profile.learning.length === 1, 'Profile anchors stored sender to authorized request')
  row.userId = null
  await deny(() => requests.updateRequest(fake, teacher, { id, version: 5, action: 'SEND_REPLY', publicReply: 'Cannot deliver' }), 400)
  ok((await requests.requestProfile(fake, teacher, id)).profile === null, 'Guest email never matches an account automatically')
  process.env.AUTH_SECRET = 'isolated-test-only'
  const guest = { key: crypto.randomUUID(), name: 'Khách', email: 'guest@example.com', phone: '', content: 'Tôi không nhận được mã OTP để đăng ký.', page: 'register', consent: true }
  await support.createAccountSupport(fake, guest, 'isolated')
  ok(row.userId == null && row.ownerId == null && row.contactId == null && row.category === 'SUPPORT' && row.source === workflow.ACCOUNT_SUPPORT_SOURCE, 'Guest support writes no guessed account or CRM identity link')
  const guestId = row.id
  await support.createAccountSupport(fake, guest, 'isolated')
  ok(row.id === guestId, 'Guest support retry is idempotent')
  fake.crmRequest.count = async () => 3
  await deny(() => support.createAccountSupport(fake, { ...guest, key: crypto.randomUUID() }, 'isolated'), 429)
  ok(row.id === guestId, 'Rate limit prevents extra guest requests')
  console.log(JSON.stringify({ result: 'passed', assertions: checks, scope: 'Isolated mocks; no production database writes' }))
}
run().catch(error => { console.error(error); process.exitCode = 1 })
