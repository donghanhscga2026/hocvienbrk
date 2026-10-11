const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript'), React = require('react'), { JSDOM } = require('jsdom')
const repo = path.resolve(__dirname, '..'), cache = new Map(), { act } = React
const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.invalid/tools/crm' })
global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
const { createRoot } = require('react-dom/client')
let checks = 0, requestedEnrollments = [], feedCalls = 0
const ok = (value, message) => { assert.ok(value, message); checks++ }
const snapshot = name => { if (process.env.CRM_UI_SNAPSHOT_DIR) { fs.mkdirSync(process.env.CRM_UI_SNAPSHOT_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.CRM_UI_SNAPSHOT_DIR, name + '.html'), document.getElementById('root').innerHTML) } }
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
const member = id => ({ id: id + 100, memberRole: 'TV', team: 1, group: 1, user: { id, name: 'Học viên ' + id, phone: null }, days: [{ order: 1, status: 'onTime' }], completionPercent: 100, todayOrder: 1, startDate: new Date() })
const overrides = {
  './service': { CrmError },
  'next/image': { __esModule: true, default: ({ unoptimized, ...props }) => React.createElement('img', props) },
  '@/app/actions/admin-actions': {
    getCourseMemberRosterAction: async () => ({ success: true, members: [member(3), member(4)], labels: {}, lessons: [], canViewPhone: true }),
    getMemberSubmissionHistoryAction: async id => { requestedEnrollments.push(id); return { success: true, days: [{ order: 1, lessonTitle: 'Bài thực hành', dayDate: new Date(), status: 'onTime', submittedAt: new Date(), totalScore: 9, scores: null, watchPercent: 80, assignment: { reflection: 'Bài nộp riêng của học viên ' + (id - 100), links: ['https://example.com/evidence'] }, comments: [{ id: 1, content: 'Bình luận của học viên ' + (id - 100), createdAt: new Date() }] }] } },
    getCourseActivityFeedAction: async () => { feedCalls++; return { success: true, feed: [{ type: 'comment', id: 'c1', userId: 3, userName: 'Học viên 3', userImage: null, lessonOrder: 1, lessonTitle: 'Bài thực hành', createdAt: new Date(), content: 'Tương tác mới của cả khóa', totalScore: null }] } },
  },
  './CourseStatsTab': { __esModule: true, default: () => null },
  '@/lib/course/export-roster-image': { downloadRosterAsImage() {} },
}
function load(file) {
  const absolute = path.resolve(repo, file)
  if (cache.has(absolute)) return cache.get(absolute)
  const mod = { exports: {} }, code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name in overrides) return overrides[name]
    if (name.startsWith('.') || name.startsWith('@/')) {
      const base = name.startsWith('@/') ? path.resolve(repo, name.slice(2)) : path.resolve(path.dirname(absolute), name)
      return load(path.relative(repo, fs.existsSync(base + '.tsx') ? base + '.tsx' : base + '.ts'))
    }
    return require(name)
  }, mod, mod.exports)
  cache.set(absolute, mod.exports); return mod.exports
}
async function run() {
  const { requestOrigin } = load('lib/crm/request-origin.ts'), workflow = load('lib/crm/request-workflow.ts')
  ok(requestOrigin({ source: 'Bình luận bài học', content: '', course: { name_lop: 'Khóa A', id_khoa: 'a/b' } }, 'Bài 3').pagePath === '/khoa-hoc/a%2Fb', 'Course path encoded rather than trusted raw href')
  ok(requestOrigin({ source: workflow.PARTNER_SOURCE, content: '' }).pagePath === '/doi-tac', 'Partner source points to registration page')
  ok(requestOrigin({ source: workflow.ACCOUNT_SUPPORT_SOURCE, content: 'Trang gặp lỗi: Đăng ký\nKhông đăng ký được' }).pagePath === '/register', 'Registration help source remains identifiable')
  ok(requestOrigin({ source: 'Landing page: gifts', content: '' }).pagePath === '/land/gifts', 'Landing source opens actual landing route')
  ok(requestOrigin({ source: 'javascript:alert(1)', content: '' }).pagePath === null, 'Unknown source is never interpreted as a URL')
  const { crmCourseAccess } = load('lib/crm/course-access.ts')
  const db = { course: { findFirst: async ({ where }) => where.id === 10 && (where.teacherId === undefined || where.teacherId === 1) ? { id: 10, name_lop: 'Khóa A' } : null }, enrollment: { findFirst: async ({ where }) => where.courseId === 10 && where.userId === 3 && where.status === 'ACTIVE' ? { id: 103 } : null } }
  const teacher = { id: 1, role: 'TEACHER' }
  ok((await crmCourseAccess(db, teacher, 10, 3)).id === 10, 'Owner can open enrolled student history')
  await assert.rejects(() => crmCourseAccess(db, { id: 2, role: 'TEACHER' }, 10, 3), error => error.status === 404); checks++
  await assert.rejects(() => crmCourseAccess(db, teacher, 10, 4), error => error.status === 404); checks++
  await assert.rejects(() => crmCourseAccess(db, { id: 1, role: 'STUDENT' }, 10, 3), error => error.status === 403); checks++
  ok((await crmCourseAccess(db, { id: 0, role: 'ADMIN' }, 10, 3)).id === 10, 'Admin ID zero retains access')
  const domain = load('lib/website/domain-shared.ts')
  ok(domain.domainRoute('/tools/crm/course/10', { crm: true, courses: true, affiliate: false }) === 'system', 'Course CRM link works on enabled custom domain')
  ok(domain.domainRoute('/tools/crm/course/10', { crm: true, courses: false, affiliate: false }) === 'deny', 'Custom domain cannot bypass disabled courses')
  const root = createRoot(document.getElementById('root')), Learning = load('components/crm/CrmContactList.tsx').CrmLearning
  await act(async () => root.render(React.createElement(Learning, { contact: { learning: [{ userId: 3, courseId: 10, title: 'Khóa A', slug: 'a', status: 'ACTIVE', completed: 1, total: 3 }] } })))
  ok(document.querySelector('a[href="/tools/crm/course/10?view=members&student=3"]'), 'CRM links encode exact student and course')
  const Dashboard = load('components/course/CourseDashboardModal.tsx').default
  await act(async () => root.render(React.createElement(Dashboard, { courseId: 10, courseName: 'Khóa A', initialTab: 'members', initialStudentId: 3, onClose() {} })))
  ok(requestedEnrollments.join(',') === '103', 'Deep link loads target enrollment only')
  ok(document.body.textContent.includes('Bài nộp riêng của học viên 3') && document.body.textContent.includes('Bình luận của học viên 3'), 'Student opens directly to submitted work and interactions')
  ok(!document.body.textContent.includes('Bài nộp riêng của học viên 4'), 'Other student work not accidentally selected')
  snapshot('course-student-history')
  await act(async () => root.render(React.createElement(Dashboard, { key: 'feed', courseId: 10, courseName: 'Khóa A', initialTab: 'feed', showAllActivity: true, onClose() {} })))
  ok(feedCalls === 1 && document.body.textContent.includes('Tương tác mới của cả khóa'), 'Activity shortcut opens feed without member selection')
  snapshot('course-activity')
  await act(async () => root.unmount())
  console.log(JSON.stringify({ assertions: checks, result: 'passed', scope: 'Course permissions, source paths and real React deep links; no live writes' }))
}
run().catch(error => { console.error(error); process.exitCode = 1 })
