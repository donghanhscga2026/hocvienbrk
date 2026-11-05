// Public sales rendering with isolated session/catalog fixtures.
const assert = require('node:assert/strict'), React = require('react')
const load = require('./helpers/load-ts.cjs')
async function run() {
  let group = 'DIGITAL', allowed = true, extras = 0, layout = 'TEMPLATE'
  const View = () => null, Detail = () => null
  const course = () => ({ id: 9, id_khoa: 'GIFTS', name_lop: 'Gifts', productGroup: group, phi_coc: 100000 })
  const mocks = {
    react: { ...React, cache: fn => fn },
    'next/navigation': { notFound: () => { throw Error('NOT_FOUND') }, redirect: href => { throw Error('REDIRECT:' + href) } },
    '@/lib/prisma': { __esModule: true, default: { course: { findUnique: async () => course(), findFirst: async () => null }, user: { findUnique: async () => null }, enrollment: { findFirst: async () => ({ status: 'ACTIVE' }) } } },
    '@/lib/get-session': { getSession: async () => ({ user: { id: '0' } }) },
    '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => ({}), canProfileAccessCourse: async () => allowed },
    '@/lib/website/domain-context': { requireDomainCourse: async () => {} },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => ({ name: 'Wi300' }) },
    '@/app/actions/course-page-actions': { getPublishedCoursePageBySlug: async () => ({ useTemplate: true, theme: { importedLayout: true }, sections: [] }) },
    '@/lib/offerings/server': { readOfferingDetails: async () => ({ salesLayout: layout, kind: 'OTHER', resources: [], modules: [] }) },
    '@/lib/course-page/public-extras': { getCoursePublicExtras: async () => { extras++; return { lessons: [], testimonials: [], activeStudentCount: 0, totalHours: 0 } } },
    '@/lib/wi300/public-projects': { getPublicProjects: async () => [] },
    '@/components/landing/LandingPageClient': { CourseLandingClient: () => null },
    '@/components/course-page/CoursePageView': { __esModule: true, default: View },
    '@/components/offerings/OfferingDetail': { __esModule: true, default: Detail },
    '@/components/course/NotificationLessonEntry': { __esModule: true, default: () => null },
    '@/components/course/CourseProjectBadges': { __esModule: true, default: () => null },
    '@/components/wi300/Wi300Header': { __esModule: true, default: () => null },
  }
  const core = load('components/course-page/CourseSalesPage.tsx', mocks).default
  const legacy = load('app/khoa-hoc/[id]/page.tsx', mocks).default
  const props = { params: Promise.resolve({ id: 'GIFTS' }), searchParams: Promise.resolve({ ref: '7', notificationLesson: 'x', tags: ['a', 'b'] }) }
  for (const [value, path] of [['DIGITAL', '/san-pham/GIFTS'], ['SERVICE', '/dich-vu/GIFTS']]) {
    group = value
    await assert.rejects(() => legacy(props), error => error.message === 'REDIRECT:' + path + '?ref=7&notificationLesson=x&tags=a&tags=b')
    const tree = await core({ ...props, expectedGroup: group })
    const view = React.Children.toArray(tree.props.children).find(child => child.type === View)
    assert(view, 'Canonical product/service page renders the existing template')
    assert.equal(view.props.course.productGroup, group); assert.equal(view.props.wi300Breadcrumb.props.group, group)
    assert.equal(view.props.userId, 0)
  }
  group = 'COURSE'; assert(React.Children.toArray((await legacy(props)).props.children).some(child => child.type === View), 'Courses keep their original route')
  group = 'DIGITAL'; const before = extras; allowed = false
  await assert.rejects(() => core(props), /NOT_FOUND/); assert.equal(extras, before, 'Scope denial occurs before reading public extras')
  allowed = true; await assert.rejects(() => core({ ...props, expectedGroup: 'SERVICE' }), /NOT_FOUND/)
  layout = 'DEFAULT'; assert.equal((await core({ ...props, expectedGroup: 'DIGITAL' })).type, Detail, 'Default product layout remains available')
  const Breadcrumb = load('components/wi300/Wi300Breadcrumb.tsx', { 'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) } }).default
  for (const [group, href, label] of [['DIGITAL', '/san-pham', 'Sản phẩm số'], ['SERVICE', '/dich-vu', 'Dịch vụ'], ['COURSE', '/khoa-hoc', 'Khóa học']]) {
    const html = require('react-dom/server').renderToStaticMarkup(React.createElement(Breadcrumb, { title: 'Item', group }))
    assert(html.includes('href="' + href + '"')); assert(html.includes(label))
  }
  console.log('Offering routes: canonical template render, legacy redirects with referral/query retention, correct breadcrumb/group, scope denial, account zero and course/default-layout preservation passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
