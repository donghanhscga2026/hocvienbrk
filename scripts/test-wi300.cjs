/* Kiểm tra cách ly thương hiệu, phạm vi khóa học và trạng thái lỗi; không ghi DB. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
function load(file, overrides = {}) {
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  new Function('require', 'exports', 'module', source)(name => name in overrides ? overrides[name] : require(name), module.exports, module)
  return module.exports
}
const saved = { variant: process.env.SITE_VARIANT, hosts: process.env.PLATFORM_HOSTS }
async function run() {
  const config = load('lib/site-profile/deployment-brand.ts')
  assert.equal(config.getDeploymentBrand({}), null)
  assert.equal(config.getDeploymentBrand({ SITE_VARIANT: 'unknown' }), null)
  assert.equal(config.getDeploymentBrand({ SITE_VARIANT: ' Wi300 ' }).name, 'WI300')
  assert.equal(config.getDeploymentBrand({ SITE_VARIANT: 'wi300', WI300_NAME: 'Tên riêng' }).name, 'Tên riêng')
  process.env.SITE_VARIANT = 'wi300'
  process.env.PLATFORM_HOSTS = 'wi300.vn,www.wi300.vn'
  let hostname = 'www.wi300.vn'
  const shared = load('lib/website/domain-shared.ts')
  const runtime = load('lib/site-profile/deployment-runtime.ts', {
    'server-only': {}, 'react': { cache: fn => fn },
    'next/headers': { headers: async () => ({ get: () => hostname }) },
    './deployment-brand': config, '@/lib/website/domain-shared': shared,
  })
  for (const host of ['wi300.vn', 'www.wi300.vn', 'preview.vercel.app', 'localhost:3008']) {
    hostname = host
    assert.equal((await runtime.getCurrentDeploymentBrand()).variant, 'wi300')
  }
  for (const host of ['brk.io.vn', 'wi300.vn.evil.vn']) {
    hostname = host
    assert.equal(await runtime.getCurrentDeploymentBrand(), null, 'Không đổi thương hiệu domain chuyên gia')
  }
  hostname = 'www.wi300.vn'
  delete process.env.SITE_VARIANT
  assert.equal(await runtime.getCurrentDeploymentBrand(), null, 'Web cũ không tự bật WI300')
  process.env.SITE_VARIANT = 'wi300'
  const manifest = load('app/manifest.ts', { '@/lib/site-profile/deployment-runtime': runtime }).default
  assert.equal((await manifest()).short_name, 'WI300')
  delete process.env.SITE_VARIANT
  assert.equal((await manifest()).short_name, 'MFC')

  const catalog = load('lib/wi300/catalog.ts')
  const personal = load('lib/wi300/personal-space.ts', { './catalog': catalog })
  const courses = [
    { id: 1, name_lop: 'Ứng dụng AI', phi_coc: 0, createdAt: '2026-01-01T00:00:00Z', teacher: { name: 'Hương Lucy' }, category: 'Công nghệ' },
    { id: 2, name_lop: 'Thiết kế website', phi_coc: 200, createdAt: '2026-03-01T00:00:00Z', teacher: { name: 'An' }, category: 'Công nghệ' },
    { id: 3, name_lop: 'Kinh doanh', phi_coc: 500, createdAt: '2026-02-01T00:00:00Z', teacher: { name: 'Bình' }, category: 'Kinh doanh' },
  ]
  assert.deepEqual(catalog.filterCourses(courses, 'huong', '', 'all').map(c => c.id), [1])
  assert.deepEqual(catalog.filterCourses(courses, 'ung dung', 'Công nghệ', 'free').map(c => c.id), [1])
  assert.deepEqual(catalog.filterCourses(courses, '', 'Công nghệ', 'paid').map(c => c.id), [2])
  assert.equal(catalog.filterCourses(courses, 'khong co', '', 'all').length, 0)
  assert.deepEqual(catalog.sortCourses(courses, 'newest').map(c => c.id), [2, 3, 1])
  assert.deepEqual(catalog.sortCourses(courses, 'price-asc').map(c => c.id), [1, 2, 3])
  assert.deepEqual(catalog.sortCourses(courses, 'price-desc').map(c => c.id), [3, 2, 1])
  assert.deepEqual(courses.map(c => c.id), [1, 2, 3], 'Sắp xếp không đổi nguồn cache')

  const scope = load('lib/site-profile/config.ts')
  let fail = false, profile = { siteConfig: { courseScope: { mode: 'ids', courseIds: [2] } } }
  let courseWhere, enrollmentWhere, teachingQueries = []
  const home = load('components/wi300/Wi300Home.tsx', {
    '@/lib/wi300/personal-space': personal,
    'next/cache': { unstable_cache: fn => fn },
    './Wi300HomeClient': { default: () => null },
    '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => profile, getCourseWhereForProfile: scope.getCourseWhereForProfile },
    '@/lib/prisma': { __esModule: true, default: {
      course: { findMany: async args => {
        if ('teacherId' in args.where) {
          teachingQueries.push(args)
          return [{ id: 9, id_khoa: 'PRIVATE', name_lop: 'Khóa đã ẩn của tôi', status: false, _count: { lessons: 4, enrollments: 2 } }]
        }
        courseWhere = args.where; if (fail) throw Error('Simulated database failure'); return [{ ...courses[1] }]
      } },
      user: { findUnique: async () => ({ phone: 'test' }) },
      enrollment: { findMany: async args => { enrollmentWhere = args.where; return [{ id: 7, courseId: 2, status: 'ACTIVE', startedAt: null, hiddenFromGifts: false, payment: null, updatedAt: new Date(), lessonProgress: [], _count: { lessonProgress: 3 }, course: { _count: { lessons: 10 } } }] } },
    } },
  }).default
  const brand = config.getDeploymentBrand({ SITE_VARIANT: 'wi300' })
  let result = await home({ brand, session: { user: { id: '42' } } })
  assert.deepEqual(courseWhere, { status: true, id: { in: [2] } })
  assert.deepEqual(enrollmentWhere, { userId: 42, courseId: { in: [2] } })
  assert.equal(result.props.enrollments[0].completedCount, 3)
  assert.equal(result.props.enrollments[0].payment, undefined)
  assert.equal(result.props.catalogError, false)
  for (const role of ['STUDENT', 'AFFILIATE', 'DEVELOPER']) {
    result = await home({ brand, session: { user: { id: '42', role } }, view: 'space' })
    assert.deepEqual(result.props.teachingCourses, [])
  }
  assert.equal(teachingQueries.length, 0, 'Vai trò không được dạy không đọc dữ liệu giảng dạy')
  for (const role of ['TEACHER', 'ADMIN']) {
    result = await home({ brand, session: { user: { id: '42', role } }, view: 'space' })
    assert.equal(result.props.teachingCourses[0].status, false, 'Khóa đã ẩn vẫn có trong khu giảng dạy riêng')
    assert.deepEqual(teachingQueries.at(-1).where, { teacherId: 42 }, 'ADMIN cũng chỉ đọc SELF')
    assert.deepEqual(result.props.courses.map(course => course.id), [2], 'Không trộn khóa riêng vào danh mục công khai')
    assert.equal(teachingQueries.at(-1).select.teacher, undefined, 'Không gửi hồ sơ riêng của giáo viên')
    assert.equal(teachingQueries.at(-1).select.teacherBankAccount, undefined)
  }
  const beforePublic = teachingQueries.length
  await home({ brand, session: { user: { id: '42', role: 'TEACHER' } }, view: 'discover' })
  assert.equal(teachingQueries.length, beforePublic, 'Trang khám phá không đọc khóa giảng dạy riêng')
  const originalError = console.error
  try {
    console.error = () => {}
    fail = true
    result = await home({ brand, session: null })
  } finally { console.error = originalError }
  assert.equal(result.props.catalogError, true)
  assert.deepEqual(result.props.courses, [], 'Không đưa khóa giả vào khi DB lỗi')

  // Kiểm tra thao tác thật trên component trang chủ bằng DOM, không cần backend.
  const { JSDOM } = require('jsdom')
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://www.wi300.vn/' })
  global.window = dom.window
  global.document = dom.window.document
  global.IS_REACT_ACT_ENVIRONMENT = true
  const React = require('react')
  const { createRoot } = require('react-dom/client')
  const { act } = React
  const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
  const TeacherStrip = load('components/wi300/Wi300Teachers.tsx', {
    'next/link': link,
    'next/image': { __esModule: true, default: ({ unoptimized, ...props }) => React.createElement('img', props) },
    './Wi300Businesses.module.css': { __esModule: true, default: { viewport: 'viewport', track: 'track', group: 'group', copy: 'copy', paused: 'paused' } },
  })
  const HomeClient = load('components/wi300/Wi300HomeClient.tsx', {
    'next/link': link,
    'next/image': { __esModule: true, default: ({ priority, unoptimized, ...props }) => React.createElement('img', props) },
    'next/dynamic': { __esModule: true, default: () => () => null },
    'next/navigation': { useSearchParams: () => new URLSearchParams() },
    '@/components/course/CourseCard': { __esModule: true, default: ({ course, showSharing, shareSiteName }) => React.createElement('article', { 'data-course': course.id, 'data-sharing': String(showSharing), 'data-share-site': shareSiteName }, course.name_lop) },
    '@/app/actions/course-actions': { checkEnrollmentStatusAction: async () => ({ status: 'PENDING' }) },
    '@/lib/wi300/catalog': catalog,
    './Wi300Businesses': load('components/wi300/Wi300Businesses.tsx', { './Wi300Businesses.module.css': { __esModule: true, default: { viewport: 'viewport', track: 'track', group: 'group', copy: 'copy', paused: 'paused' } } }),
    './Wi300PersonalSpace': { __esModule: true, default: () => null },
    './Wi300Teachers': TeacherStrip,
  }).default
  const renderer = createRoot(document.getElementById('root'))
  const props = { brand, courses, enrollments: [], userId: null, userPhone: null, loggedIn: false, catalogError: false, accountError: false }
  await act(async () => renderer.render(React.createElement(HomeClient, props)))
  assert.match(document.querySelector('h1').textContent, /Kết nối con người/)
  assert.match(document.querySelector('#wi300-partner-title').textContent, /Trở thành đối tác WI300/)
  assert.ok(document.querySelector('[aria-labelledby="wi300-partner-title"] a[href="/register"]'))
  assert.equal(document.querySelectorAll('[data-course]').length, 3)
  assert.ok([...document.querySelectorAll('[data-course]')].every(card => card.dataset.sharing === 'true' && card.dataset.shareSite === 'WI300'))
  assert.ok(document.querySelector('a[href="/#doanh-nghiep-tieu-bieu"]'))
  assert.equal(document.querySelectorAll('#doanh-nghiep-tieu-bieu ul[aria-label] li').length, 6)
  assert.match(document.querySelector('#doanh-nghiep-tieu-bieu ul[aria-label]').textContent, /WiCan/)
  const sort = document.getElementById('wi300-sort')
  await act(async () => { sort.value = 'newest'; sort.dispatchEvent(new window.Event('change', { bubbles: true })) })
  assert.deepEqual([...document.querySelectorAll('[data-course]')].map(e => Number(e.dataset.course)), [2, 3, 1])
  await act(async () => { sort.value = 'price-desc'; sort.dispatchEvent(new window.Event('change', { bubbles: true })) })
  assert.deepEqual([...document.querySelectorAll('[data-course]')].map(e => Number(e.dataset.course)), [3, 2, 1])
  const categoryButton = Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Công nghệ')
  await act(async () => categoryButton.click())
  assert.equal(document.querySelectorAll('[data-course]').length, 2)
  const select = document.querySelector('#wi300-fee')
  await act(async () => { select.value = 'free'; select.dispatchEvent(new window.Event('change', { bubbles: true })) })
  assert.equal(document.querySelectorAll('[data-course]').length, 1)
  assert.equal(document.querySelector('[data-course]').textContent, 'Ứng dụng AI')
  await act(async () => renderer.render(React.createElement(HomeClient, { ...props, loggedIn: true, userId: 42, enrollments: [{ courseId: 1, status: 'ACTIVE', completedCount: 3, totalLessons: 10 }] })))
  assert.equal(document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'), '30')
  assert.ok(document.querySelector('[aria-labelledby="wi300-partner-title"] a[href="/account-settings"]'))
  assert.match(document.querySelector('#khoa-hoc-cua-toi a[href*="/learn"]').getAttribute('href'), /\/learn$/)
  await act(async () => renderer.render(React.createElement(HomeClient, { ...props, view: 'discover', courses: courses.map((course, i) => ({ ...course, teacherId: i + 1 })) })))
  assert.equal(document.querySelectorAll('#giang-vien ul[aria-label] li').length, 3)
  assert.ok(document.querySelector('#giang-vien a[href="/khoa-hoc?q=H%C6%B0%C6%A1ng%20Lucy"]'))
  assert.equal(document.querySelectorAll('[data-course]').length, 3, 'Khám phá hiển thị khóa trực tiếp')
  assert.deepEqual([...document.querySelectorAll('[aria-label="Nội dung khám phá"] a')].map(a => a.textContent), ['Khóa học', 'Sản phẩm', 'Dịch vụ'])
  for (const link of document.querySelectorAll('[aria-label="Nội dung khám phá"] a')) assert.ok(document.querySelector(link.getAttribute('href')), 'Các nút có khu vực đích thật')
  assert.ok(document.querySelector('img[src="/wi300/ecosystem-banner.webp"]'))
  const manyTeachers = Array.from({ length: 8 }, (_, i) => ({ ...courses[0], id: i + 1, teacherId: i + 1, teacher: { name: i === 7 ? 'Cương Leo' : `Giảng viên ${i}` }, pin: i === 4 ? 1 : null }))
  await act(async () => renderer.render(React.createElement(HomeClient, { ...props, view: 'discover', courses: manyTeachers })))
  assert.equal(document.querySelectorAll('#giang-vien ul[aria-label] li').length, 6)
  assert.equal(document.querySelectorAll('#giang-vien ul[aria-hidden="true"] li').length, 6)
  assert.ok([...document.querySelectorAll('#giang-vien ul[aria-hidden="true"] a')].every(a => a.tabIndex === -1))
  await act(async () => document.querySelector('#giang-vien button').click())
  assert.ok(document.querySelector('#giang-vien .paused'))
  assert.equal(document.querySelector('#giang-vien button').getAttribute('aria-pressed'), 'true')
  assert.match(document.querySelector('#giang-vien li').textContent, /Cương Leo/)
  assert.match(document.querySelectorAll('#giang-vien li')[1].textContent, /Giảng viên 4/)
  await act(async () => renderer.render(React.createElement(HomeClient, { ...props, view: 'discover', courses: [{ ...manyTeachers[7], teacher: { name: 'Cương Leo', image: '/teacher.png' } }] })))
  assert.equal(document.querySelector('#giang-vien ul[aria-hidden]'), null, 'Một người không lặp chạy')
  assert.equal(document.querySelector('#giang-vien button'), null)
  assert.ok(document.querySelector('#giang-vien img[src="/teacher.png"]'))
  await act(async () => renderer.unmount())
  dom.window.close()
  console.log('WI300: brand isolation, original manifest, course scope, Vietnamese filters, personal progress and database failure checks passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => {
  for (const [key, value] of [['SITE_VARIANT', saved.variant], ['PLATFORM_HOSTS', saved.hosts]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value
  }
})
