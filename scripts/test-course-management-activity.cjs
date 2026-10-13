// Chạy với DB giả và DOM; không kết nối hoặc sửa dữ liệu đang hoạt động.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const React = require('react'), { JSDOM } = require('jsdom')
function load(file, mocks = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : require(name), module, module.exports)
  return module.exports
}
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'AND') return value.every(item => matches(row, item))
    if (key === 'OR') return value.some(item => matches(row, item))
    const actual = row[key]
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('in' in value) return value.in.includes(actual)
      if ('not' in value) return actual !== value.not
      if ('gt' in value || 'lte' in value) return actual != null && (!value.gt || new Date(actual) > value.gt) && (!value.lte || new Date(actual) <= value.lte)
      return matches(actual || {}, value)
    }
    return actual === value
  })
}
async function run() {
  const teacher = { id: 8, role: 'TEACHER', name: 'Teacher' }, admin = { id: 0, role: 'ADMIN', name: 'Admin' }
  const courses = [{ id: 1, teacherId: 8, name_lop: 'Khóa AI' }, { id: 2, teacherId: 9, name_lop: 'Khóa khác' }]
  const lessons = [{ id: 'l1', courseId: 1, title: 'Bài AI', order: 1 }, { id: 'l2', courseId: 2, title: 'Bài khác', order: 1 }]
  const now = Date.now(), date = delta => new Date(now + delta), student = { id: 3, name: 'Học viên' }
  const comments = [
    { id: 1, userId: 3, user: student, content: 'Cảm nghĩ mới', createdAt: date(-1000), lessonId: 'l1', lesson: lessons[0], imageUrl: null },
    { id: 2, userId: 8, user: teacher, content: 'Giáo viên', createdAt: date(-1000), lessonId: 'l1', lesson: lessons[0] },
    { id: 3, userId: 3, user: student, content: 'Bình luận cũ', createdAt: date(-8 * 86400000), lessonId: 'l1', lesson: lessons[0] },
    { id: 4, userId: 3, user: student, content: 'Riêng tư khóa khác', createdAt: date(-1000), lessonId: 'l2', lesson: lessons[1] },
  ]
  const submissions = [
    { id: 1, enrollment: { userId: 3, user: student }, lessonId: 'l1', lesson: lessons[0], submittedAt: date(-1000), status: 'COMPLETED', assignment: { reflection: 'Bài nộp mới' }, totalScore: 9 },
    { id: 2, enrollment: { userId: 3, user: student }, lessonId: 'l1', lesson: lessons[0], submittedAt: date(-1000), status: 'RESET', assignment: {}, totalScore: 0 },
  ]
  const request = { id: 'request-1', ownerId: 8, courseId: 1, course: courses[0], category: 'LEARNING', status: 'NEW', createdAt: date(-1000), name: 'Học viên', content: 'Cần giải đáp' }
  const requests = [request, { ...request, id: 'resolved', status: 'RESOLVED' }, { ...request, id: 'sales', category: 'CONSULTATION' }, { ...request, id: 'other-owner', ownerId: 9 }]
  const markers = new Map(), queries = []
  const delegate = rows => ({
    groupBy: async ({ by, where }) => { queries.push(where); const counts = new Map(); rows.filter(row => matches(row, where)).forEach(row => counts.set(row[by[0]], (counts.get(row[by[0]]) || 0) + 1)); return [...counts].map(([key, count]) => ({ [by[0]]: key, _count: { _all: count } })) },
    findMany: async ({ where, take }) => rows.filter(row => matches(row, where)).slice(0, take),
  })
  let queue = Promise.resolve()
  const db = {
    course: delegate(courses), lesson: delegate(lessons), lessonComment: delegate(comments), lessonProgress: delegate(submissions), crmRequest: delegate(requests),
    user: { findUnique: async ({ where }) => where.id === 8 ? teacher : where.id === 0 ? admin : null },
    systemConfig: { findMany: async ({ where }) => [...markers].filter(([key]) => where.key.in.includes(key)).map(([key, value]) => ({ key, value })), findUnique: async ({ where }) => markers.has(where.key) ? { value: markers.get(where.key) } : null, upsert: async ({ where, create, update }) => markers.set(where.key, markers.has(where.key) ? update.value : create.value) },
    $executeRaw: async () => {},
    $transaction: callback => { const task = queue.then(() => callback(db)); queue = task.catch(() => {}); return task },
  }
  const service = load('lib/course/management-activity.ts', { '@/lib/crm/service': { CrmError }, '@/lib/crm/requests': { requestScope: actor => actor.role === 'ADMIN' ? {} : { ownerId: actor.id, OR: [{ course: { teacherId: actor.id } }, { courseId: null }] } } })
  const detail = await service.readManagementActivity(db, teacher, [1], true)
  assert.deepEqual(detail.summary.map(({ courseId, comments, submissions, requests }) => ({ courseId, comments, submissions, requests })), [{ courseId: 1, comments: 1, submissions: 1, requests: 1 }])
  assert.equal(detail.comments[0].content, 'Cảm nghĩ mới'); assert.equal(detail.submissions[0].totalScore, 9)
  assert.equal(detail.requests[0].id, 'request-1')
  await assert.rejects(() => service.readManagementActivity(db, teacher, [2], true), error => error.status === 403)
  await assert.rejects(() => service.readManagementActivity(db, { ...teacher, role: 'STUDENT' }, [1], true), error => error.status === 403)
  await assert.rejects(() => service.markManagementActivitySeen(db, teacher, { courseId: 2, through: detail.through }), error => error.status === 403)
  await assert.rejects(() => service.markManagementActivitySeen(db, teacher, { courseId: 1, through: new Date(Date.now() + 86400000).toISOString() }))
  await service.markManagementActivitySeen(db, teacher, { courseId: 1, through: detail.through })
  const seen = await service.readManagementActivity(db, teacher, [1], true)
  assert.equal(seen.summary[0].comments + seen.summary[0].submissions, 0)
  assert.equal(seen.summary[0].requests, 1, 'Marking activity seen never resolves a CRM request')
  assert.equal(submissions[0].totalScore, 9, 'Marking activity seen never changes assignment scores')
  const adminView = await service.readManagementActivity(db, admin, [1, 2])
  assert.equal(adminView.summary[1].comments, 1); assert.equal(adminView.summary[0].comments, 2, 'Seen markers are per actor')
  comments.push({ ...comments[0], id: 5, content: 'Phát sinh sau snapshot', createdAt: new Date(Date.now()) })
  const late = await service.readManagementActivity(db, teacher, [1], true)
  assert.equal(late.summary[0].comments, 1, 'New activity after the displayed snapshot stays unseen')
  await service.markManagementActivitySeen(db, teacher, { courseId: 1, through: new Date(now - 86400000).toISOString() })
  assert.equal(markers.get('course:activity-seen:v1:8:1').through, detail.through, 'Old device cannot move the seen watermark backwards')
  requests[0].status = 'RESOLVED'
  assert.equal((await service.readManagementActivity(db, teacher, [1])).summary[0].requests, 0, 'CRM resolution immediately reduces the course pending count')
  let session = { user: { id: '8' } }
  const http = load('lib/crm/http.ts', { './service': { CrmError } })
  const api = load('app/api/courses/management-activity/route.ts', { '@/auth': { auth: async () => session }, '@/lib/prisma': { default: db, __esModule: true }, '@/lib/website/domain-context': { domainContext: async () => null }, '@/lib/crm/service': { CrmError }, '@/lib/crm/http': http, '@/lib/course/management-activity': service })
  assert.equal((await api.GET(new Request('https://test.invalid/api/courses/management-activity?ids=1'))).status, 200)
  assert.equal((await api.GET(new Request('https://test.invalid/api/courses/management-activity?ids=2'))).status, 403)
  assert.equal((await api.POST(new Request('https://test.invalid/api/courses/management-activity', { method: 'POST', headers: { origin: 'https://evil.invalid', 'content-type': 'application/json' }, body: JSON.stringify({ courseId: 1, through: detail.through }) }))).status, 403)
  session = null
  assert.equal((await api.GET(new Request('https://test.invalid/api/courses/management-activity?ids=1'))).status, 401)

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.invalid/tools/courses/new?id=1' })
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
  const Panel = load('components/course/CourseManagementActivity.tsx', { 'next/link': link }).default
  const savedFetch = global.fetch
  global.fetch = async () => ({ ok: true, json: async () => JSON.parse(JSON.stringify(detail)) })
  const { createRoot } = require('react-dom/client'), root = createRoot(document.getElementById('root'))
  let studentId
  try {
    await React.act(async () => root.render(React.createElement(Panel, { courseId: 1, onOpenStudent: id => { studentId = id } })))
    assert.ok(document.body.textContent.includes('Bài nộp mới'))
    assert.equal(document.querySelector('a[href*="request="]').getAttribute('href'), '/tools/crm?view=requests&request=request-1')
    await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent.includes('Xem bài nộp của học viên')).click())
    assert.equal(studentId, 3)
    const posts = []; window.confirm = () => false
    global.fetch = async (url, options) => { if (options.method === 'POST') posts.push(JSON.parse(options.body)); return { ok: true, json: async () => JSON.parse(JSON.stringify(detail)) } }
    const mark = [...document.querySelectorAll('button')].find(button => button.textContent === 'Đánh dấu tất cả đã xem')
    await React.act(async () => mark.click()); assert.equal(posts.length, 0)
    window.confirm = () => true
    await React.act(async () => mark.click()); assert.equal(posts[0].through, detail.through)
  } finally { await React.act(async () => root.unmount()); dom.window.close(); global.fetch = savedFetch }
  console.log('PASS course management activity: permissions, scoped requests, read markers, snapshot race, API/CSRF and student drill-down')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
