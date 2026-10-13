// Tương tác trên các component thật với dữ liệu / API giả, không ghi DB thật.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const React = require('react'), { JSDOM } = require('jsdom')
const repo = path.resolve(__dirname, '..'), cache = new Map()
const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.invalid/tools/courses/new?id=1' })
global.window = dom.window; global.document = dom.window.document; global.FormData = dom.window.FormData; global.IS_REACT_ACT_ENVIRONMENT = true
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
const course = { id: 1, id_khoa: 'AI', name_lop: 'Khóa thực hành AI', name_khoa: 'AI', type: 'NORMAL', status: true, pin: 0, teacherId: 8, categoryId: 1, category: 'Công nghệ', courseCategory: { name: 'Công nghệ' }, phi_coc: 1000000, mo_ta_ngan: 'Mô tả ngắn', mo_ta_dai: 'Mô tả dài', link_anh_bia: '', lessons: [{ id: 'l1', title: 'Bài thực hành', order: 1 }], _count: { lessons: 1, enrollments: 12 }, teacher: { name: 'Hương Lucy' } }
const templates = [{ id: 'external-html', name: 'Mẫu HTML bên ngoài', description: 'Giữ nguồn HTML' }]
const applied = []
const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
const stub = name => ({ __esModule: true, default: props => React.createElement('div', { 'data-panel': name }, name + (props.courseId || '')) })
let params = new URLSearchParams('id=1')
const mocks = {
  'next/link': link,
  'next/navigation': { useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }), useSearchParams: () => params },
  '@/components/layout/MainHeader': { __esModule: true, default: props => React.createElement('header', { className: 'bg-white p-4 text-xl font-bold' }, props.title) },
  '@/components/wi300/WiCourseProjects': stub('Dự án'),
  '@/components/course/CourseManagementActivity': stub('Hoạt động'),
  '@/components/course/CourseRosterWorkspace': stub('Học viên'),
  '@/components/course/CourseActivityFeedTab': stub('Nhật ký'),
  '@/components/course/CourseDashboardModal': stub('Dashboard'),
  '@/components/course/AdminMemberRosterTab': stub('Roster'),
  '@/components/admin/courses/ImportLessonsModal': { ImportLessonsModal: () => null },
  '@/components/admin/courses/LessonEditModal': { LessonEditModal: () => null },
  '@/components/admin/courses/AddLessonModal': { AddLessonModal: () => null },
  '@/components/admin/courses/LessonAnnouncementModal': { LessonAnnouncementModal: () => null },
  '@/app/actions/course-actions': { getTeachersAction: async () => ({ success: true, teachers: [{ id: 8, name: 'Hương Lucy' }] }) },
  '@/app/actions/admin-actions': { getAdminCoursesAction: async () => ({ success: true, courses: Array.from({ length: 12 }, (_, index) => ({ ...course, id: index + 1, name_lop: course.name_lop + ' ' + (index + 1) })), isAdmin: true, userId: 8 }) },
  '@/app/actions/course-page-actions': { getCoursePages: async () => [{ id: 'page-1', slug: 'AI', useTemplate: true, status: 'draft' }], applyCoursePageTemplate: async (...args) => { applied.push(args); return { success: true } } },
  '@/app/actions/course-page-template-actions': { getStoredCoursePageTemplateOptions: async () => ({ success: true, templates }), applyStoredCoursePageTemplate: async (...args) => { applied.push(args); return { success: true } } },
  '@/lib/course-page/templates': { COURSE_TEMPLATE_LIBRARY: [{ key: 'test', name: 'Mẫu hệ thống', description: 'Mẫu có sẵn' }] },
}
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : name.startsWith('@/') ? load(name.slice(2) + '.tsx') : require(name), module, module.exports)
  cache.set(file, module.exports); return module.exports
}
const savedFetch = global.fetch
global.fetch = async url => ({ ok: true, json: async () => url === '/api/auth/session' ? { user: { id: 8, role: 'ADMIN' } } : url.startsWith('/api/courses/management-activity') ? { summary: Array.from({ length: 12 }, (_, i) => ({ courseId: i + 1, requests: 2, submissions: 3, comments: 1 })) } : url.startsWith('/api/courses/categories') ? { categories: [{ id: 1, name: 'Công nghệ', color: '#167a42', icon: 'BookOpen', _count: { courses: 12 } }] } : url.startsWith('/api/courses/1') ? course : url.includes('/bank-accounts') ? { accounts: [] } : url.includes('projects') ? { projects: [] } : { vouchers: [] } })
const { createRoot } = require('react-dom/client'), root = createRoot(document.getElementById('root'))
const click = async text => React.act(async () => { const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === text); assert.ok(button, 'Missing button: ' + text); button.click() })
function snapshot(name) { if (process.env.MANAGEMENT_UI_SNAPSHOT_DIR) { fs.mkdirSync(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, name + '.html'), document.getElementById('root').innerHTML) } }
async function run() {
  try {
    const List = load('app/tools/courses/page.tsx').default
    await React.act(async () => root.render(React.createElement(List)))
    assert.equal(document.querySelectorAll('article').length, 10, 'Course list paginates')
    assert.equal(document.querySelectorAll('a[href="/tools/courses/templates"]').length, 0, 'Template library is removed from the course list header')
    assert.ok(document.querySelector('a[href$="tab=activity"]')); snapshot('course-list')
    await click('Sau'); assert.equal(document.querySelectorAll('article').length, 2)
    await click('Danh mục'); assert.ok(document.body.textContent.includes('Công nghệ'), 'Category management stays available')
    const Editor = load('app/tools/courses/new/page.tsx').default
    await React.act(async () => root.render(React.createElement(Editor)))
    assert.ok(document.querySelector('input[value="Khóa thực hành AI"]'))
    const shortDescription = [...document.querySelectorAll('textarea')].find(item => item.value === 'Mô tả ngắn')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    await React.act(async () => { setter.call(shortDescription, 'Nội dung đang sửa chưa lưu'); shortDescription.dispatchEvent(new window.Event('input', { bubbles: true })) })
    await click('Bài giảng'); assert.ok(document.body.textContent.includes('Thông báo học viên'))
    await click('Thông tin'); assert.equal([...document.querySelectorAll('textarea')].find(item => item === shortDescription).value, 'Nội dung đang sửa chưa lưu', 'Switching tabs preserves form edits')
    await click('Thanh toán & kích hoạt'); assert.ok([...document.querySelectorAll('input')].some(item => item.value === '1000000')); snapshot('course-settings')
    await click('Email & Zalo'); assert.ok(document.body.textContent.includes('Nội dung email kích hoạt'))
    await click('Thành viên'); assert.ok(document.querySelector('[data-panel="Học viên"]'))
    await click('Thống kê'); assert.ok(document.querySelector('[data-panel="Học viên"]'))
    await click('Nhật ký'); assert.ok(document.querySelector('[data-panel="Nhật ký"]'))
    await click('Trang bán khóa học'); snapshot('course-sales')
    await click('Chọn mẫu'); assert.ok(document.querySelector('dialog[open]'))
    await click('Nhập mẫu ngoài'); assert.equal(document.querySelector('iframe').getAttribute('src'), '/tools/courses/templates')
    await click('Mẫu của tôi'); window.confirm = () => false
    await click('Áp dụng cho khóa này'); assert.equal(applied.length, 0, 'Template replacement requires confirmation')
    window.confirm = () => true
    await click('Áp dụng cho khóa này'); assert.deepEqual(applied[0], ['external-html', 'AI', 'Khóa thực hành AI'], 'External template applies only to the selected course')
    console.log('PASS management UI: course pagination, category tab, retained edits, teaching tools, members/stats/log and HTML/ZIP picker context')
  } finally { await React.act(async () => root.unmount()); dom.window.close(); global.fetch = savedFetch }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
