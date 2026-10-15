// Tương tác trên các component thật với dữ liệu / API giả, không ghi DB thật.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const React = require('react'), { JSDOM } = require('jsdom')
const repo = path.resolve(__dirname, '..'), cache = new Map()
const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.invalid/tools/courses/new?id=1' })
global.window = dom.window; global.document = dom.window.document; global.FormData = dom.window.FormData; global.IS_REACT_ACT_ENVIRONMENT = true
Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
const course = { id: 1, id_khoa: 'AI', name_lop: 'Khóa thực hành AI', name_khoa: 'AI', type: 'NORMAL', status: true, pin: 0, teacherId: 8, categoryId: 1, category: 'Công nghệ', courseCategory: { name: 'Công nghệ' }, phi_coc: 1000000, mo_ta_ngan: 'Mô tả ngắn', mo_ta_dai: 'Mô tả dài', link_anh_bia: '/wi300/businesses/wi-tech.png', lessons: [{ id: 'l1', title: 'Bài thực hành', order: 1 }], _count: { lessons: 1, enrollments: 12 }, teacher: { name: 'Hương Lucy' } }
const templates = [{ id: 'external-html', name: 'Mẫu HTML bên ngoài', description: 'Giữ nguồn HTML' }]
const applied = []
const bulkUpdates = []
let bulkFail = false
global.confirm = () => true; global.alert = () => {}
let courseLoad = async () => ({ success: true, courses: Array.from({ length: 12 }, (_, index) => ({ ...course, id: index + 1, name_lop: course.name_lop + ' ' + (index + 1) })), isAdmin: true, userId: 8 })
const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
const stub = name => ({ __esModule: true, default: props => React.createElement('div', { 'data-panel': name }, name + (props.courseId || '')) })
let params = new URLSearchParams('id=1')
const mocks = {
  '@/lib/auth/roles': require('./helpers/load-ts.cjs')('lib/auth/roles.ts'),
  'next/link': link,
  'next/navigation': { useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }), useSearchParams: () => params },
  '@/components/layout/MainHeader': { __esModule: true, default: props => React.createElement('header', { className: 'bg-white p-4 text-xl font-bold' }, props.title) },
  '@/components/course/CourseManagementActivity': stub('Hoạt động'),
  '@/components/course/CourseRosterWorkspace': stub('Học viên'),
  '@/app/tools/courses/pages/[id]/EditCoursePageForm': stub('Trình chỉnh nội dung'),
  './CourseTemplateWorkspace': stub('Trình chỉnh code'),
  '@/components/course/CourseActivityFeedTab': stub('Nhật ký'),
  '@/components/course/CourseDashboardModal': stub('Dashboard'),
  '@/components/course/AdminMemberRosterTab': stub('Roster'),
  '@/components/admin/courses/ImportLessonsModal': { ImportLessonsModal: () => null },
  '@/components/admin/courses/LessonEditModal': { LessonEditModal: () => null },
  '@/components/admin/courses/AddLessonModal': { AddLessonModal: () => null },
  '@/components/admin/courses/LessonAnnouncementModal': { LessonAnnouncementModal: () => null },
  '@/app/actions/course-actions': { getTeachersAction: async () => ({ success: true, teachers: [{ id: 8, name: 'Hương Lucy' }] }) },
  '@/app/actions/admin-actions': { getAdminCoursesAction: (...args) => courseLoad(...args), bulkUpdateCoursesOptionsAction: async (ids, options) => { bulkUpdates.push({ ids, options }); return { success: !bulkFail, error: 'Fixture failure' } } },
  '@/app/actions/course-page-actions': { getCoursePages: async () => [{ id: 'page-1', slug: 'AI', useTemplate: true, status: 'draft' }], getCoursePage: async () => ({ id: 'page-1', slug: 'AI', useTemplate: true, status: 'draft', name: 'AI', sections: [] }), applyCoursePageTemplate: async (...args) => { applied.push(args); return { success: true } } },
  '@/app/actions/course-page-template-actions': { getStoredCoursePageTemplateOptions: async () => ({ success: true, templates }), applyStoredCoursePageTemplate: async (...args) => { applied.push(args); return { success: true } } },
  '@/lib/course-page/templates': { COURSE_TEMPLATE_LIBRARY: [{ key: 'test', name: 'Mẫu hệ thống', description: 'Mẫu có sẵn' }] },
}
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : name.startsWith('@/') ? load(name.slice(2) + '.tsx') : name.startsWith('./') ? load(path.posix.join(path.posix.dirname(file), name + '.tsx')) : require(name), module, module.exports)
  cache.set(file, module.exports); return module.exports
}
const savedFetch = global.fetch
global.fetch = async url => ({ ok: true, json: async () => url === '/api/auth/session' ? { user: { id: 8, role: 'ADMIN' } } : url.startsWith('/api/courses/management-activity') ? { summary: Array.from({ length: 12 }, (_, i) => ({ courseId: i + 1, requests: 2, submissions: 3, comments: 1 })) } : url.startsWith('/api/courses/categories') ? { categories: [{ id: 1, name: 'Công nghệ', color: '#167a42', icon: 'BookOpen', _count: { courses: 12 } }] } : url.startsWith('/api/courses/1') ? course : url.includes('/bank-accounts') ? { accounts: [] } : url.includes('project-content') ? { projects: [{ slug: 'wi-tech', name: 'Wi.Tech', revision: 0, selected: true }, { slug: 'wi-grow', name: 'Wi.Grow', revision: 0, selected: false }] } : url.includes('projects') ? { projects: [{ slug: 'wi-tech', name: 'Wi.Tech', courseIds: [1, 2, 3, 4] }] } : { vouchers: [] } })
const { createRoot } = require('react-dom/client'), root = createRoot(document.getElementById('root'))
const click = async text => React.act(async () => { const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === text || item.getAttribute('aria-label') === text); assert.ok(button, 'Missing button: ' + text); button.click() })
function snapshot(name) { if (process.env.MANAGEMENT_UI_SNAPSHOT_DIR) { fs.mkdirSync(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, name + '.html'), document.getElementById('root').innerHTML) } }
async function run() {
  try {
    const List = load('app/tools/courses/page.tsx').default
    await React.act(async () => root.render(React.createElement(List)))
    assert.equal(document.querySelectorAll('article').length, 10, 'Course list paginates')
    assert.equal(document.querySelectorAll('a[href="/tools/courses/templates"]').length, 0, 'Template library is removed from the course list header')
    assert.ok(document.querySelector('a[href$="tab=activity"]')); snapshot('course-list')
    await React.act(async () => document.querySelector('[aria-label="Chọn tất cả khóa học"]').click())
    assert.ok(document.body.textContent.includes('Đã chọn 12 khóa học')); assert.equal(document.querySelector('[aria-label="Bỏ chọn khóa học đã chọn"]').checked, true)
    assert.ok(document.querySelector('[aria-label="Ẩn hoặc hiện khóa đã chọn"]'))
    assert.ok(document.querySelector('[aria-label="Danh mục khóa đã chọn"]'))
    assert.ok(document.querySelector('[aria-label="Học phí khóa đã chọn"] optgroup[label="Có phí"]'))
    await React.act(async () => document.querySelector('[aria-label="Bỏ chọn khóa học đã chọn"]').click())
    assert.equal(document.querySelector('[aria-label="Chọn tất cả khóa học"]').checked, false); assert.ok(!document.body.textContent.includes('Đã chọn 12 khóa học'), 'Select-all can clear selection at the same location')
    const rowCheck = () => document.querySelector('article input[type="checkbox"]')
    await React.act(async () => rowCheck().click())
    assert.ok(document.body.textContent.includes('Đã chọn 1 khóa học'))
    await React.act(async () => document.querySelector('[aria-label="Bỏ chọn khóa học đã chọn"]').click())
    assert.ok(!document.body.textContent.includes('Đã chọn 1 khóa học'), 'Clicking the selected bar clears a partial selection too')
    await React.act(async () => rowCheck().click())
    async function choose(label, value) { await React.act(async () => { const node = document.querySelector('[aria-label="' + label + '"]'); node.value = value; node.dispatchEvent(new window.Event('change', { bubbles: true })) }) }
    await choose('Ẩn hoặc hiện khóa đã chọn', 'hide'); await choose('Danh mục khóa đã chọn', '1'); await choose('Học phí khóa đã chọn', 'PHI_CAM_KET')
    bulkFail = true; await click('Áp dụng')
    assert.ok(document.body.textContent.includes('Đã chọn 1 khóa học'), 'Failed updates preserve selection for retry')
    bulkFail = false; await click('Áp dụng')
    assert.deepEqual(bulkUpdates.at(-1), { ids: [1], options: { status: false, categoryId: 1, feeType: 'PHI_CAM_KET' } })
    assert.ok(!document.body.textContent.includes('Đã chọn 1 khóa học'))
    await click('Thẻ'); assert.equal(document.querySelectorAll('article').length, 10); snapshot('course-cards'); await click('Danh sách')
    await click('Xuất học viên các khóa đang lọc'); assert.ok(document.querySelector('dialog[open]')); assert.equal(document.querySelector('dialog input[value="students"]').checked, true); assert.ok(document.querySelector('option[value="GOOGLE"]')); snapshot('course-export'); await click('Đóng lựa chọn xuất')
    await click('Sau'); assert.equal(document.querySelectorAll('article').length, 2)
    assert.ok(document.body.textContent.includes('Lượt học viên đã kích hoạt'), 'Totals describe the ACTIVE enrollment count')
    const teacherSelect = document.querySelector('[aria-label="Lọc giảng viên"]')
    async function teacher(value) {
      await React.act(async () => {
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(teacherSelect, value)
        teacherSelect.dispatchEvent(new window.Event('change', { bubbles: true }))
      })
    }
    const pendingLoads = []
    courseLoad = options => new Promise(resolve => pendingLoads.push({ options, resolve }))
    await teacher('ALL'); await teacher('SELF')
    assert.equal(pendingLoads.length, 2)
    await React.act(async () => pendingLoads[1].resolve({ success: true, courses: [{ ...course, name_lop: 'Newest selection' }], isAdmin: true, userId: 8 }))
    await React.act(async () => pendingLoads[0].resolve({ success: true, courses: [{ ...course, name_lop: 'Stale selection' }], isAdmin: true, userId: 8 }))
    assert.ok(document.body.textContent.includes('Newest selection'))
    assert.ok(!document.body.textContent.includes('Stale selection'), 'Late replies cannot replace the latest teacher scope')
    courseLoad = async () => { throw new Error('Network failure') }
    await teacher('ALL')
    assert.ok(document.querySelector('[role="alert"]').textContent.includes('Không tải được khóa học'))
    assert.equal(document.querySelectorAll('article').length, 0, 'Failed scope cannot export the previous courses')
    courseLoad = async () => ({ success: true, courses: [course], isAdmin: true, userId: 8 })
    await click('Tải lại khóa học')
    assert.equal(document.querySelectorAll('article').length, 1)
    assert.equal(document.querySelector('[role="alert"]'), null, 'Retry recovers without a stuck spinner')
    await click('Danh mục'); assert.ok(document.body.textContent.includes('Công nghệ'), 'Category management stays available')
    courseLoad = async () => ({ success: true, courses: Array.from({ length: 12 }, (_, index) => ({ ...course, id: index + 1 })), isAdmin: true, userId: 8 })
    window.sessionStorage.setItem('wi300-course-list:8', JSON.stringify({ search: '', status: 'ALL', category: 'ALL', project: 'ALL', teacher: 'SELF', page: 2, display: 'cards' }))
    await click('Khóa học')
    assert.equal(document.querySelectorAll('article').length, 2, 'Returning to the list restores page two')
    assert.equal([...document.querySelectorAll('button')].find(node => node.textContent === 'Thẻ').getAttribute('aria-pressed'), 'true', 'Returning restores the display mode')
    assert.ok(document.body.textContent.includes('Trang 2/2'))
    const Editor = load('app/tools/courses/new/page.tsx').default
    await React.act(async () => root.render(React.createElement(Editor)))
    assert.ok(document.querySelector('input[value="Khóa thực hành AI"]')); snapshot('course-basic')
    assert.equal(document.querySelector('[data-info-group="description"]').hidden, true, 'Basic information excludes description/image fields')
    await click('Mô tả & hình ảnh')
    const shortDescription = [...document.querySelectorAll('textarea')].find(item => item.value === 'Mô tả ngắn')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    await React.act(async () => { setter.call(shortDescription, 'Nội dung đang sửa chưa lưu'); shortDescription.dispatchEvent(new window.Event('input', { bubbles: true })) })
    snapshot('course-info')
    await click('Bài giảng'); snapshot('course-lessons'); assert.ok(document.body.textContent.includes('Thông báo học viên'))
    await click('Thông tin'); assert.equal([...document.querySelectorAll('textarea')].find(item => item === shortDescription).value, 'Nội dung đang sửa chưa lưu', 'Switching tabs preserves form edits')
    await click('Thanh toán & kích hoạt'); assert.ok([...document.querySelectorAll('input')].some(item => item.value === '1000000')); snapshot('course-settings')
    await click('Email & Zalo'); assert.ok(document.body.textContent.includes('Nội dung email kích hoạt'))
    await click('Học viên'); assert.ok(document.querySelector('[data-panel="Học viên"]'))
    await click('Thống kê'); assert.ok(document.querySelector('[data-panel="Học viên"]'))
    await click('Nhật ký'); assert.ok(document.querySelector('[data-panel="Nhật ký"]'))
    await click('Trang bán khóa học'); snapshot('course-sales')
    assert.ok(document.querySelector('[data-panel="Trình chỉnh nội dung"]'), 'Sales editor is rendered inside the course tab');
    await click('Sửa code'); assert.ok(document.querySelector('[data-panel="Trình chỉnh code"]'));
    assert.ok(document.querySelector('iframe[src*="preview?page=page-1"]'), 'Information sidebar shows actual saved page preview');
    assert.ok(!document.querySelector('iframe[src="/tools/courses/templates"]'), 'No nested management page')
    console.log('PASS management UI: course pagination, stale response rejection, load error/retry, factual totals, category tab, exclusive descriptions, retained edits, teaching tools and dedicated template context')
  } finally { await React.act(async () => root.unmount()); dom.window.close(); global.fetch = savedFetch }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
