const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
function load(file, mocks = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true
  } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : require(name), module, module.exports)
  return module.exports
}
async function run() {
  const { courseLoadingPlan } = load('lib/course-page/loading-plan.ts')
  const zip = { useTemplate: true, theme: { importedLayout: true }, sections: [{ enabled: true, variant: 'zip-source-v1' }] }
  assert.deepEqual(courseLoadingPlan(zip, true), { lessons: false, statistics: false, testimonials: false })
  assert.equal(courseLoadingPlan(zip, true, 'lesson-1').lessons, true)
  for (const page of [null, { ...zip, useTemplate: false }, { ...zip, sections: [] }, { ...zip, sections: [...zip.sections, { enabled: true, variant: 'curriculum' }] }])
    assert.equal(courseLoadingPlan(page, true).statistics, true)
  assert.equal(courseLoadingPlan(zip, false).statistics, true, 'Other deployments keep all current data')
  const calls = {}
  const count = (name, value) => async args => { (calls[name] ||= []).push(args); return value }
  let publishedPage = zip, brand = { name: 'WI300' }, allowed = true
  const course = { id: 17, id_khoa: 'ZIP', name_lop: 'Course', phi_coc: 100, teacherBankAccount: { bankName: 'TCB', accountNumber: 'test', accountHolder: 'Test' } }
  const enrollment = { status: 'PENDING', userId: 31, courseId: 17 }
  const View = () => null, Landing = () => null, Notification = () => null
  const reset = () => Object.keys(calls).forEach(key => delete calls[key])
  const publicationMocks = { getPublishedCoursePageBySlug: async () => { (calls.published ||= []).push({}); return publishedPage } }
  const mocks = {
    react: { ...React, cache: fn => fn },
    '@/lib/get-session': { getSession: async () => ({ user: { id: '31' } }) },
    '@/lib/prisma': { __esModule: true, default: {
      course: { findUnique: count('course', course) }, user: { findUnique: count('user', { phone: 'test' }) },
      enrollment: { findFirst: count('enrollment', enrollment), count: count('students', 4) },
      lesson: { findMany: count('lessons', [{ id: 'lesson-1', title: 'One', order: 1 }]) },
      lessonProgress: { groupBy: count('duration', [{ _max: { maxTime: 7200 } }]), findMany: count('reflections', []) },
      lessonComment: { findMany: count('comments', []) }
    } },
    'next/navigation': { notFound: () => { throw Error('Not found') } },
    '@/components/landing/LandingPageClient': { CourseLandingClient: Landing },
    '@/app/actions/course-page-actions': publicationMocks,
    '@/components/course-page/CoursePageView': { __esModule: true, default: View },
    '@/components/course/NotificationLessonEntry': { __esModule: true, default: Notification },
    '@/lib/website/domain-context': { requireDomainCourse: async () => {} },
    '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => ({ id: 1 }), canProfileAccessCourse: async () => allowed },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand },
    '@/components/wi300/Wi300Header': { __esModule: true, default: () => null },
    '@/components/wi300/Wi300Breadcrumb': { __esModule: true, default: () => null },
    '@/lib/course-page/loading-plan': { courseLoadingPlan }
  }
  const render = load('app/khoa-hoc/[id]/page.tsx', mocks).default
  let result = await render({ params: Promise.resolve({ id: 'ZIP' }) })
  for (const name of ['lessons', 'duration', 'students', 'reflections', 'comments']) assert.equal(calls[name], undefined, name + ' not queried for ZIP-only landing')
  assert.equal(calls.published.length, 1)
  assert.deepEqual(calls.enrollment[0].where, { userId: 31, courseId: 17 })
  assert.equal(result.props.children[1].props.enrollment, enrollment, 'Enrollment is still private per request')
  assert.deepEqual(result.props.children[1].props.course.teacherBankAccount, course.teacherBankAccount)
  reset()
  result = await render({ params: Promise.resolve({ id: 'ZIP' }), searchParams: Promise.resolve({ notificationLesson: 'lesson-1' }) })
  assert.equal(calls.lessons.length, 1); assert.equal(result.props.children[0].type, Notification)
  reset()
  result = await render({ params: Promise.resolve({ id: 'ZIP' }), searchParams: Promise.resolve({ notificationLesson: 'other-course' }) })
  assert.equal(result.props.children[0], null, 'Foreign lesson is never opened')
  reset(); publishedPage = null
  result = await render({ params: Promise.resolve({ id: 'ZIP' }) })
  for (const name of ['lessons', 'duration', 'students', 'reflections', 'comments']) assert.equal(calls[name].length, 1)
  assert.equal(result.props.children[3].type, Landing)
  assert.equal(result.props.children[3].props.totalHours, 2)
  reset(); publishedPage = zip; brand = null
  await render({ params: Promise.resolve({ id: 'ZIP' }) })
  assert.equal(calls.duration.length, 1)
  reset(); allowed = false
  await assert.rejects(() => render({ params: Promise.resolve({ id: 'ZIP' }) }), /Not found/)
  assert.equal(calls.enrollment, undefined, 'Out-of-scope course cannot load personal enrollment')

  let selection
  const home = load('components/wi300/Wi300Home.tsx', {
    '@/lib/wi300/personal-space': { canTeach: role => ['ADMIN', 'TEACHER'].includes(role) },
    'next/cache': { unstable_cache: fn => fn },
    './Wi300HomeClient': { __esModule: true, default: () => null },
    '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => ({}), getCourseWhereForProfile: () => ({ status: true, id: { in: [17] } }) },
    '@/lib/prisma': { __esModule: true, default: { course: { findMany: async args => { selection = args; return [] } } } }
  }).default
  await home({ brand: { name: 'WI300' }, session: null })
  assert.deepEqual(selection.where, { status: true, id: { in: [17] } })
  for (const field of ['mo_ta_dai', 'file_email', 'noidung_email', 'memberLabels']) assert.equal(selection.select[field], undefined)
  for (const field of ['id', 'id_khoa', 'phi_coc', 'teacherBankAccount', 'voucherConfig', 'allowMbvDeduction', 'createdAt']) assert.ok(selection.select[field])

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/' })
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  const modalRenders = []
  const Card = load('components/course/CourseCard.tsx', {
    'next/dynamic': { __esModule: true, default: loader => props => {
      const name = String(loader).includes('RegistrationFlowModal') ? 'registration' : 'other'
      modalRenders.push(name)
      return React.createElement('div', { 'data-modal': name }, React.createElement('button', { onClick: props.onClose }, 'Close'))
    } },
    'next/image': { __esModule: true, default: ({ priority, unoptimized, fill, ...props }) => React.createElement('img', props) },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    'next/navigation': { useRouter: () => ({ refresh: () => {} }) },
    '@/app/actions/course-actions': { enrollInCourseAction: async () => { throw Error('No enrollment write in rendering test') }, getBrkMbvBalanceAction: async () => 0, toggleHiddenFromGifts: async () => {} },
    '@/lib/affiliate/get-client-ref': { getClientRef: () => null },
    '@/lib/image-validation': { isValidImageUrl: () => false }
  }).default
  const { createRoot } = require('react-dom/client')
  const { act } = React
  const root = createRoot(document.getElementById('root'))
  await act(async () => root.render(React.createElement(Card, { course: { ...course, feeType: 'MIEN_PHI', _count: { lessons: 1, enrollments: 0 } }, isLoggedIn: true, userId: 31, enrollment: null })))
  assert.deepEqual(modalRenders, [], 'Closed modals are not rendered or loaded by initial cards')
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent.includes('Kích hoạt ngay')).click())
  assert.ok(document.querySelector('[data-modal="registration"]'), 'Paid course still opens registration')
  await act(async () => document.querySelector('[data-modal] button').click())
  assert.equal(document.querySelector('[data-modal]'), null)
  await act(async () => root.unmount())
  dom.window.close()
  console.log('Performance: ZIP skips five unused queries; normal templates, scope, payment fields, notification checks and on-demand modals preserved.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
