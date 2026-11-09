const assert = require('node:assert/strict')
const React = require('react')
const { JSDOM } = require('jsdom')
const load = require('./helpers/load-ts.cjs')
async function run() {
  let request = 0, courseReads = 0, detailReads = 0, scopeReads = 0
  const db = {
    course: { findUnique: async () => { courseReads++; return { id: 1, name_lop: 'Request ' + request } } },
    systemConfig: { findUnique: async () => { detailReads++; return { value: { kind: 'APP' } } } },
  }
  const catalogData = load('lib/offerings/server.ts', {
    'server-only': {},
    react: { ...React, cache: fn => { let epoch = -1, values; return (...args) => { if (epoch !== request) { epoch = request; values = new Map() } const key = JSON.stringify(args); if (!values.has(key)) values.set(key, fn(...args)); return values.get(key) } } },
    '@/lib/prisma': { __esModule: true, default: db },
    '@/lib/wi300/public-projects': { getPublicProjects: async () => [] },
    '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => { scopeReads++; return null }, getCourseWhereForProfile: () => ({ status: true }) },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => null },
    '@/lib/wi300/course-visibility': {},
  })
  const firstCourse = await Promise.all(Array.from({ length: 3 }, () => catalogData.getOfferingSalesCourse('APP')))
  assert.equal(courseReads, 1, 'Metadata, layout selection and detail reuse one course query per request')
  assert.equal(firstCourse[0], firstCourse[2])
  await Promise.all([catalogData.readOfferingDetails(1), catalogData.readOfferingDetails(1)])
  assert.equal(detailReads, 1)
  await Promise.all([catalogData.publicCatalogWhere(), catalogData.publicCatalogWhere()])
  assert.equal(scopeReads, 1)
  request++
  assert.equal((await catalogData.getOfferingSalesCourse('APP')).name_lop, 'Request 1', 'A new request reads fresh data')
  assert.equal(courseReads, 2)
  await catalogData.readOfferingDetails(1, db); await catalogData.readOfferingDetails(1, db)
  assert.equal(detailReads, 3, 'Explicit database and transaction reads remain fresh during edits')
  let showList = true, projectCalls = 0, catalogCalls = 0, releaseProjects
  const projectWait = new Promise(resolve => { releaseProjects = resolve })
  const CatalogPage = load('components/wi300/WiOfferingCatalog.tsx', {
    'next/link': { __esModule: true, default: () => null },
    'next/navigation': { notFound: () => { throw Error('404') } },
    '@/lib/wi300/public-projects': { getPublicProjects: () => { projectCalls++; return projectWait } },
    '@/lib/offerings/server': { getOfferingCatalog: async () => { catalogCalls++; return [] } },
    '@/components/offerings/OfferingCatalog': { __esModule: true, default: () => null },
    '@/lib/site-profile/presentation': { getPresentationBrand: async () => ({ name: 'Wi300' }) },
    '@/lib/wi300/managed-page-runtime': { systemPageHidden: () => false, systemPageContent: () => ({ showList }) },
    './WiContentPage': { __esModule: true, default: () => null },
  }).default
  const pendingCatalog = require('./helpers/render-async.cjs')(await CatalogPage({ kind: 'PRODUCT' }))
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(projectCalls, 1)
  assert.equal(catalogCalls, 1, 'Catalog starts before project data resolves; independent reads run in parallel')
  releaseProjects([])
  await pendingCatalog
  showList = false
  await CatalogPage({ kind: 'SERVICE' })
  assert.equal(projectCalls, 1); assert.equal(catalogCalls, 1, 'Hidden catalog performs no project or product reads')
  const { courseLoadingPlan } = load('lib/course-page/loading-plan.ts')
  const zip = { useTemplate: true, theme: { importedLayout: true }, sections: [{ enabled: true, variant: 'zip-source-v1' }] }
  assert.deepEqual(courseLoadingPlan(zip, true), { lessons: false, statistics: false, testimonials: false })
  assert.equal(courseLoadingPlan(zip, true, 'lesson-1').lessons, true)
  for (const page of [null, { ...zip, useTemplate: false }, { ...zip, sections: [] }, { ...zip, sections: [...zip.sections, { enabled: true, variant: 'curriculum' }] }])
    assert.equal(courseLoadingPlan(page, true).statistics, true)
  assert.equal(courseLoadingPlan(zip, false).statistics, true, 'Other deployments keep all current data')
  const calls = {}
  const count = (name, value) => async args => { (calls[name] ||= []).push(args); return value }
  let publishedPage = zip, brand = { name: 'WI300' }, allowed = true, projects = []
  const course = { id: 17, id_khoa: 'ZIP', name_lop: 'Course', productGroup: 'COURSE', phi_coc: 100, teacherBankAccount: { bankName: 'TCB', accountNumber: 'test', accountHolder: 'Test' } }
  const enrollment = { status: 'PENDING', userId: 31, courseId: 17 }
  const View = () => null, Landing = () => null, Notification = () => null, Header = () => null
  const children = page => React.Children.toArray(page.props.children)
  const viewOf = page => children(page).find(child => child.type === View)
  const reset = () => Object.keys(calls).forEach(key => delete calls[key])
  const publicationMocks = { getPublishedCoursePageBySlug: async () => { (calls.published ||= []).push({}); return publishedPage } }
  const mocks = {
    '@/lib/offerings/server': { readOfferingDetails: async () => ({ salesLayout: 'TEMPLATE' }) },
    '@/components/offerings/OfferingDetail': { __esModule: true, default: () => null },
    '@/lib/wi300/project-service': { readPublicProjects: async () => projects },
    'next/cache': { unstable_cache: fn => fn },
    react: { ...React, cache: fn => fn },
    '@/lib/get-session': { getSession: async () => ({ user: { id: '31' } }) },
    '@/lib/prisma': { __esModule: true, default: {
      systemConfig: { findUnique: async () => null },
      course: { findUnique: count('course', course), findMany: async () => [], count: async () => 1 }, user: { findUnique: count('user', { phone: 'test' }) },
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
    '@/components/wi300/Wi300Header': { __esModule: true, default: Header },
    '@/components/wi300/Wi300Breadcrumb': { __esModule: true, default: () => null },
    '@/lib/course-page/loading-plan': { courseLoadingPlan }
  }
  const render = load('app/khoa-hoc/[id]/page.tsx', mocks).default
  let result = await render({ params: Promise.resolve({ id: 'ZIP' }) })
  for (const name of ['lessons', 'duration', 'students', 'reflections', 'comments']) assert.equal(calls[name], undefined, name + ' not queried for ZIP-only landing')
  assert.equal(calls.published.length, 1)
  assert.deepEqual(calls.enrollment[0].where, { userId: 31, courseId: 17 })
  assert.equal(viewOf(result).props.enrollment, enrollment, 'Enrollment is still private per request')
  assert.deepEqual(viewOf(result).props.course.teacherBankAccount, course.teacherBankAccount)
  assert.equal(children(result).filter(child => child.type === Header).length, 1, 'Custom HTML detail restores one WI300 header even without project labels')
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
  reset(); publishedPage = zip
  projects = [{ slug: 'wi-finance', name: 'Wi.Finance', logo: '', courseIds: [17] }]
  result = await render({ params: Promise.resolve({ id: 'ZIP' }) })
  let view = viewOf(result)
  assert.equal(children(result).filter(child => child.type === Header).length, 1)
  assert.equal(view.props.projectLabels, undefined, 'Custom HTML must not receive a separate project strip')
  assert.equal(view.props.wi300Breadcrumb.props.projectLabels.props.projects[0].slug, 'wi-finance', 'Project labels share the existing breadcrumb')
  publishedPage = { ...zip, theme: { importedLayout: false } }
  result = await render({ params: Promise.resolve({ id: 'ZIP' }) })
  view = viewOf(result)
  assert.equal(children(result).filter(child => child.type === Header).length, 0, 'Native templates keep ownership of their own navigation')
  assert.ok(view.props.projectLabels)
  assert.equal(view.props.wi300Breadcrumb.props.projectLabels, undefined)
  reset(); publishedPage = zip; brand = null
  result = await render({ params: Promise.resolve({ id: 'ZIP' }) })
  assert.equal(children(result).filter(child => child.type === Header).length, 0, 'Other deployments do not receive a WI300 header')
  assert.equal(viewOf(result).props.projectLabels, undefined)
  assert.equal(calls.duration.length, 1)
  reset(); allowed = false
  await assert.rejects(() => render({ params: Promise.resolve({ id: 'ZIP' }) }), /Not found/)
  assert.equal(calls.enrollment, undefined, 'Out-of-scope course cannot load personal enrollment')

  let selection
  const home = load('components/wi300/Wi300Home.tsx', {
    '@/lib/wi300/project-service': { readPublicProjects: async () => [] },
    '@/lib/wi300/course-visibility': load('lib/wi300/course-visibility.ts'),
    '@/lib/wi300/personal-space': { canTeach: role => ['ADMIN', 'TEACHER'].includes(role) },
    'next/cache': { unstable_cache: fn => fn },
    './Wi300HomeClient': { __esModule: true, default: () => null },
    '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => ({}), getCourseWhereForProfile: () => ({ status: true, id: { in: [17] } }) },
    '@/lib/prisma': { __esModule: true, default: { systemConfig: { findUnique: async () => ({ value: true }), findMany: async () => [{ key: 'wi300:course-visibility:17', value: true }] }, course: { findMany: async args => { selection = args; return [] } }, enrollment: { findMany: async args => args.select.courseId && !args.select.id ? [{ courseId: 18 }] : [] }, user: { findUnique: async () => null } } }
  }).default
  await home({ brand: { name: 'WI300' }, session: null })
  assert.deepEqual(selection.where, { AND: [{ id: { in: [17] } }, { id: { in: [17] } }] })
  for (const field of ['mo_ta_dai', 'file_email', 'noidung_email', 'memberLabels']) assert.equal(selection.select[field], undefined)
  for (const field of ['id', 'id_khoa', 'phi_coc', 'teacherBankAccount', 'voucherConfig', 'allowMbvDeduction', 'createdAt']) assert.ok(selection.select[field])

  const space = await home({ brand: { name: 'WI300' }, session: { user: { id: '0', role: 'STUDENT' } }, view: 'space' })
  assert.equal(space.props.accountError, false)
  assert.deepEqual(selection.where.AND[1], { id: { in: [17, 18] } }, 'Actual personal-space loader admits enrolled courses even when hidden, including account zero')

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/' })
  Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
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
