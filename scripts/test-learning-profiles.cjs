const assert = require('node:assert/strict')
const load = require('./helpers/load-ts.cjs')
const service = load('lib/learning-profile/service.ts')
const { learningProfileHref } = load('lib/learning-profile/shared.ts')
const rows = [11, 22].map((teacherId, i) => ({ id: i + 1, userId: 7, courseId: i + 101, status: 'ACTIVE', startedAt: new Date('2026-10-15'), activatedAt: null, createdAt: new Date('2026-10-01'), course: { id: i + 101, teacherId, id_khoa: 'K' + i, name_lop: 'Lớp ' + i, _count: { lessons: 1 } } }))
function matches(row, where) {
  if (where.AND) return where.AND.every(part => matches(row, part))
  return (where.userId == null || row.userId === where.userId) && (where.courseId == null || row.courseId === where.courseId) && (where.course?.teacherId == null || row.course.teacherId === where.course.teacherId) && (!where.course?.name_lop || row.course.name_lop.toLowerCase().includes(where.course.name_lop.contains.toLowerCase()))
}
let identityReads = 0, submittedAt = new Date('2026-10-15T16:58:00Z'), queries = []
const db = {
  user: { findUnique: async () => { identityReads++; return { id: 7, name: '<script>student</script>', email: null, phone: null, image: null, role: 'STUDENT' } } },
  enrollment: { findFirst: async ({ where }) => rows.find(row => matches(row, where)) || null, count: async ({ where }) => rows.filter(row => matches(row, where)).length, findMany: async q => { queries.push(q); return rows.filter(row => matches(row, q.where)).slice(q.skip, q.skip + q.take) } },
  lesson: { findMany: async q => { queries.push(q); return [{ id: 'lesson', order: 1, title: 'Ngày 1', isDailyChallenge: true }] }, count: async () => 1 },
  lessonProgress: { groupBy: async q => { queries.push(q); return [] }, findMany: async q => { queries.push(q); return [{ lessonId: 'lesson', status: 'COMPLETED', submittedAt, totalScore: 8, maxTime: 70, duration: 100, assignment: { reflection: '<script>alert(1)</script>', links: ['javascript:alert(1)', 'https://example.org/evidence'] }, scores: {} }] } },
  lessonComment: { findMany: async q => { queries.push(q); return [] } },
}
async function run() {
  const teacher = { id: 11, role: 'TEACHER' }
  let data = await service.readLearningProfile(db, teacher, 7)
  assert.deepEqual(data.courses.map(row => row.courseId), [101])
  assert.equal(data.selected.lessons[0].submissionStatus, 'Đúng hạn')
  assert.equal(data.selected.lessons[0].watchPercent, 70)
  submittedAt = new Date('2026-10-15T17:01:00Z')
  data = await service.readLearningProfile(db, teacher, 7)
  assert.equal(data.selected.lessons[0].submissionStatus, 'Nộp muộn')
  await assert.rejects(service.readLearningProfile(db, teacher, 7, { course: 102 }), error => error.status === 404)
  const before = identityReads
  await assert.rejects(service.readLearningProfile(db, { id: 99, role: 'TEACHER' }, 7), error => error.status === 404)
  await assert.rejects(service.readLearningProfile(db, { id: 8, role: 'STUDENT' }, 7), error => error.status === 404)
  assert.equal(identityReads, before, 'Deny access before reading identity')
  assert.equal((await service.readLearningProfile(db, { id: 0, role: 'ADMIN' }, 7)).totalCourses, 2)
  assert.equal((await service.readLearningProfile(db, { id: 7, role: 'STUDENT' }, 7)).totalCourses, 2)
  assert.equal((await service.readLearningProfile(db, { id: 7, role: 'TEACHER' }, 7)).totalCourses, 2)
  rows[0].course.teacherId = 22
  await assert.rejects(service.readLearningProfile(db, teacher, 7), error => error.status === 404)
  rows[0].course.teacherId = 11
  await assert.rejects(service.readLearningProfile(db, teacher, 7, { page: 0 }), error => error.status === 400)
  assert.equal(learningProfileHref(7, 101), '/ho-so-hoc-tap/7?course=101')
  assert.ok(queries.filter(q => q.take).every(q => q.take <= 101), 'Bound all list reads')
  const commentQuery = queries.find(q => q.where?.OR)
  assert.deepEqual(commentQuery.where.OR, [{ userId: 7 }, { userId: 11, parent: { userId: 7 } }])
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
  const View = load('components/learning-profile/LearningProfileView.tsx', { 'next/navigation': { useRouter: () => ({ push() {} }) }, 'next/link': { __esModule: true, default: props => React.createElement('a', props) }, 'next/image': { __esModule: true, default: props => React.createElement('img', props) } }).default
  const html = renderToStaticMarkup(React.createElement(View, { data }))
  assert.ok(!html.includes('<script>')); assert.ok(!html.includes('javascript:')); assert.ok(html.includes('https://example.org/evidence'))
  assert.ok(html.includes('Xem tất cả khóa')); assert.ok(!html.includes('<aside'))
  assert.ok(!/<details[^>]*open=""/.test(html), 'Course list and lessons start collapsed')
  for (let i = 0; i < 30; i++) rows.push({ ...rows[0], id: 100 + i, courseId: 200 + i, course: { ...rows[0].course, id: 200 + i, name_lop: 'Khóa tìm kiếm ' + i } })
  const many = await service.readLearningProfile(db, teacher, 7)
  assert.equal(many.totalCourses, 31); assert.equal(many.courses.length, 12)
  const found = await service.readLearningProfile(db, teacher, 7, { q: 'kiếm 29', course: 101 })
  assert.deepEqual(found.courses.map(row => row.courseId), [229], 'Search reaches beyond page one')
  assert.equal(found.matchedCourses, 1); assert.equal(found.totalCourses, 31)
  assert.equal(found.selected.courseId, 101, 'Search preserves currently selected course')
  const foreign = await service.readLearningProfile(db, teacher, 7, { q: 'Lớp 1', course: 101 })
  assert.equal(foreign.matchedCourses, 0, 'Search cannot reveal another teacher course')
  const next = await service.readLearningProfile(db, teacher, 7, { page: 2, course: 229 })
  assert.equal(next.courses.length, 12); assert.equal(next.selected.courseId, 229)
  const manyHtml = renderToStaticMarkup(React.createElement(View, { data: next }))
  assert.ok(manyHtml.includes('max-h-80')); assert.ok(manyHtml.includes('course=229'))
  rows.splice(2)
  // Exercise the real picker event: switching courses navigates without resetting scroll.
  const { JSDOM } = require('jsdom'), dom = new JSDOM('<div id="picker"></div>')
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(global, 'navigator')
  Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  let navigation
  const Picker = load('components/learning-profile/CoursePicker.tsx', { 'next/navigation': { useRouter: () => ({ push: (...args) => { navigation = args } }) } }).default
  const root = require('react-dom/client').createRoot(document.getElementById('picker'))
  try {
    await React.act(async () => root.render(React.createElement(Picker, { value: 101, options: [{ id: 101, name: 'Một', href: '/ho-so-hoc-tap/7?course=101' }, { id: 229, name: 'Hai', href: '/ho-so-hoc-tap/7?course=229' }] })))
    await React.act(async () => { const select = document.querySelector('select'); select.value = '229'; select.dispatchEvent(new window.Event('change', { bubbles: true })) })
    assert.deepEqual(navigation, ['/ho-so-hoc-tap/7?course=229', { scroll: false }])
  } finally {
    await React.act(async () => root.unmount()); dom.window.close(); delete global.window; delete global.document
    if (navigatorDescriptor) Object.defineProperty(global, 'navigator', navigatorDescriptor)
    else delete global.navigator
  }
  let role = 'STUDENT', session = { user: { id: '11', role: 'ADMIN' } }
  const actor = load('lib/learning-profile/server.ts', { 'server-only': {}, '@/auth': { auth: async () => session }, '@/lib/website/domain-context': { domainContext: async () => null }, '@/lib/prisma': { __esModule: true, default: { user: { findUnique: async () => ({ id: 11, role }) } } } }).learningProfileActor
  assert.equal((await actor()).role, 'STUDENT', 'Ignore stale elevated JWT role')
  role = 'INSTRUCTOR'; assert.equal((await actor()).role, 'TEACHER')
  session = null; await assert.rejects(actor(), error => error.status === 401)
  const { changeMemberRole } = load('lib/auth/change-member-role.ts')
  let assigned = 1, writes = 0
  const roleDb = { $transaction: async fn => fn(roleDb), user: { findUnique: async ({ where }) => where.id === 26 ? { id: 26, role: 'ADMIN' } : { role: 'TEACHER' }, update: async q => { writes++; assert.deepEqual(q.data, { role: 'STUDENT' }) } }, course: { count: async () => assigned } }
  await assert.rejects(changeMemberRole(roleDb, 26, 7, 'STUDENT'), /chuyển người phụ trách/)
  assert.equal(writes, 0); assigned = 0
  assert.equal((await changeMemberRole(roleDb, 26, 7, 'STUDENT')).success, true)
  assert.equal(writes, 1)
  const fs = require('node:fs'), path = require('node:path'), mocks = {}
  for (const match of fs.readFileSync(path.join(__dirname, '../app/actions/admin-actions.ts'), 'utf8').matchAll(/from ['"]([^'"]+)['"]/g)) mocks[match[1]] = {}
  let detailQuery, emailReads = 0, legacyRole = 'TEACHER'
  const legacyDb = { enrollment: db.enrollment, user: { findUnique: async q => { detailQuery = q; return { id: 7, enrollments: [{ course: { teacherId: 11 } }] } } }, emailLog: { findMany: async () => { emailReads++; return [] } } }
  const actions = load('app/actions/admin-actions.ts', { ...mocks, '@prisma/client': require('@prisma/client'), '@/lib/auth/roles': load('lib/auth/roles.ts'), '@/lib/learning-profile/service': service, '@/lib/learning-profile/server': { learningProfileActor: async () => ({ id: 11, role: legacyRole }) }, '@/lib/prisma': { __esModule: true, default: legacyDb } })
  assert.equal((await actions.getStudentDetailAction(7)).success, true)
  assert.deepEqual(detailQuery.select.enrollments.where, { course: { teacherId: 11 } })
  assert.equal((await actions.getStudentEmailLogsAction(7)).success, false)
  assert.equal(emailReads, 0)
  legacyRole = 'ADMIN'
  assert.equal((await actions.getStudentEmailLogsAction(7)).success, true)
  assert.equal(emailReads, 1)
  console.log('PASS private learning profiles: ownership, admin zero, self, role changes, course tampering, revocation, bounded reads, safe rendering and both deadline boundaries')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
