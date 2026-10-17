/* Execute real public loaders and ProfileHome with an isolated database. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const load = require('./helpers/load-ts.cjs')
const config = load('lib/site-profile/config.ts')
const visibility = load('lib/wi300/course-visibility.ts')
let brand = { variant: 'wi300' }, session = null, props, fail = false, queries = 0, writes = 0
const cache = new Map(), preferences = new Map([[1, true], [2, false], [3, true], [5, false], [6, false], [7, false]])
const courses = Array.from({ length: 7 }, (_, index) => ({
  id: index + 1, id_khoa: 'COURSE-' + (index + 1), teacherId: index === 4 ? 9 : 8,
  status: index !== 2, categoryId: index % 2 + 1, name_lop: 'Course ' + (index + 1),
  pin: 0, courseCategory: { name: 'Category', order: 0 }, teacher: { name: 'Teacher' },
  createdAt: new Date('2026-10-01'), _count: { enrollments: 1, lessons: 4 },
}))
const records = [
  { userId: 12, courseId: 2, status: 'ACTIVE' },
  { userId: 12, courseId: 5, status: 'ACTIVE' },
  { userId: 12, courseId: 6, status: 'ACTIVE', hiddenFromGifts: true },
  { userId: 12, courseId: 7, status: 'PENDING' },
  { userId: 13, courseId: 4, status: 'ACTIVE' },
  { userId: 0, courseId: 2, status: 'ACTIVE' },
].map((row, index) => ({ id: index + 1, hiddenFromGifts: false, startedAt: null, payment: null,
  course: { _count: { lessons: 4 } }, _count: { lessonProgress: 1 }, ...row }))
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true
    if (key === 'AND') return (Array.isArray(value) ? value : [value]).every(part => matches(row, part))
    if (key === 'OR') return value.some(part => matches(row, part))
    if (value && typeof value === 'object') return !value.in || value.in.includes(row[key])
    return row[key] === value
  })
}
const db = {
  course: { findMany: async ({ where }) => { queries++; if (fail) throw Error('isolated outage'); return courses.filter(row => matches(row, where)) } },
  enrollment: { findMany: async ({ where }) => records.filter(row => row.userId === where.userId) },
  user: { findUnique: async ({ where }) => ({ id: where.id, name: 'Viewer', roadmap: null }) },
  systemConfig: {
    findUnique: async () => ({ value: true }),
    findMany: async () => [...preferences].map(([id, value]) => ({ key: visibility.WI300_COURSE_PREFIX + id, value })),
    upsert: async () => { writes++; throw Error('Unexpected database write') },
  },
}
const branding = { getCurrentDeploymentBrand: async () => brand }
const moduleFile = 'app/actions/site-profile-actions.ts'
const unused = {}
for (const match of fs.readFileSync(path.join(__dirname, '..', moduleFile), 'utf8').matchAll(/from ['"]([^'"]+)['"]/g)) unused[match[1]] = {}
const actions = load(moduleFile, {
  ...unused,
  '@/lib/prisma': { __esModule: true, default: db },
  '@/lib/site-profile/runtime': config,
  '@/lib/site-profile/deployment-runtime': branding,
  '@/lib/wi300/course-visibility': visibility,
  '@/lib/db-fallback': { FALLBACK_COURSES: [{ id: 999 }] },
  'next/cache': { unstable_cache: fn => async (...args) => {
    const key = JSON.stringify(args)
    if (!cache.has(key)) cache.set(key, await fn(...args))
    return cache.get(key)
  } },
})
const profile = { userId: 8, slug: 'teacher', members: [], siteConfig: { courseScope: { mode: 'teacher', teacherIds: [8] } } }
const ids = rows => rows.map(row => row.id).sort((a, b) => a - b)
const empty = { __esModule: true, default: () => null }
const ProfileHome = load('components/website/ProfileHome.tsx', {
  '@/lib/prisma': { __esModule: true, default: db },
  '@/lib/get-session': { getSession: async () => session },
  '@/lib/site-profile/deployment-runtime': branding,
  '@/app/actions/site-profile-actions': { ...actions, getSurveyForProfile: async () => null, getPostsForProfile: async () => [] },
  '@/app/actions/message-actions': { getHeroMessageForProfile: async () => null },
  '@/app/actions/roadmap-actions': { getRoadmapPoints: async () => [] },
  '@/app/actions/survey-actions': { resetSurveyAction: async () => ({}) },
  '@/components/website/ImportedPage': { __esModule: true, default: async () => null },
  '@/components/layout/MainHeader': empty, '@/components/home/MessageCard': empty,
  '@/components/home/FooterSection': empty, '@/components/home/SetHomeSlug': empty,
  '@/components/home/HomePageClient': { __esModule: true, default: value => { props = value; return null } },
}).default
async function render(viewer, selectedProfile = profile) {
  session = viewer === null ? null : { user: { id: String(viewer) } }
  renderToStaticMarkup(await ProfileHome({ profile: selectedProfile }))
  return props
}
async function run() {
  assert.deepEqual(ids(await actions.getCoursesForProfile(profile)), [1, 3], 'WI300 uses its independent visibility, including courses hidden on the original site')
  for (const [scope, expected] of [
    [{ mode: 'ids', courseIds: [2, 3, 4] }, [3]],
    [{ mode: 'teacher', teacherIds: [9] }, []],
    [{ mode: 'category', categoryIds: [2] }, []],
    [{ mode: 'profile' }, [1, 3]],
  ]) assert.deepEqual(ids(await actions.getCoursesForProfile({ ...profile, siteConfig: { courseScope: scope } })), expected, 'Page source scope survives visibility filtering: ' + scope.mode)
  assert.deepEqual(await actions.getCoursesForProfile({ ...profile, siteConfig: { modules: { courses: false } } }), [])
  const before = queries
  await actions.getCoursesForProfile({ ...profile, viewCount: 999, updatedAt: new Date() })
  assert.equal(queries, before, 'Volatile profile fields do not fragment the resolved-scope cache')
  preferences.set(2, true)
  assert.deepEqual(ids(await actions.getCoursesForProfile(profile)), [1, 2, 3], 'Changing visibility cannot reuse a cache containing the previous catalog')
  preferences.set(2, false)
  let view = await render(null)
  assert.deepEqual(ids(view.courses), [1, 3]); assert.deepEqual(view.myActiveCourses, [])
  view = await render(12)
  assert.deepEqual(ids(view.courses), [1, 3], 'Hidden enrolled courses never enter public recommendations')
  assert.deepEqual(ids(view.myActiveCourses), [2], 'Only own active enrollment within this Page survives catalog hiding')
  assert.deepEqual(ids(view.groupedOtherCourses.flatMap(group => group.courses)), [1, 3])
  records[0].status = 'COMPLETED'
  view = await render(12)
  assert.deepEqual(ids(view.myCompletedCourses), [2]); assert.deepEqual(view.myActiveCourses, [])
  records[0].status = 'ACTIVE'
  view = await render(14)
  assert.deepEqual(view.myActiveCourses, [], 'Another learner cannot inherit hidden enrollments')
  view = await render(0)
  assert.deepEqual(ids(view.myActiveCourses), [2], 'Account zero retains its own learning')
  view = await render(12, { ...profile, siteConfig: { courseScope: { mode: 'ids', courseIds: [1, 3] } } })
  assert.deepEqual(view.myActiveCourses, [], 'Enrollment never widens the Page selected-course scope')
  const templates = load('lib/website/page-template-server.ts', { 'server-only': {}, '@/lib/prisma': { __esModule: true, default: db }, '@/lib/site-profile/deployment-runtime': branding })
  assert.deepEqual(ids(await templates.pageCourses(profile)), [1, 3], 'Imported Page catalog also excludes hidden and unconfigured courses')
  brand = null
  assert.deepEqual(ids(await actions.getCoursesForProfile(profile)), [1, 2, 4, 6, 7], 'Giautoandien keeps its existing Course.status behavior')
  assert.deepEqual(ids(await templates.pageCourses(profile)), [1, 2, 4, 6, 7])
  cache.clear(); fail = true; brand = { variant: 'wi300' }
  const originalError = console.error
  try {
    console.error = () => {}
    assert.deepEqual(await actions.getCoursesForProfile(profile), [], 'WI300 fails closed instead of showing unrelated fallback courses')
    brand = null
    assert.deepEqual(ids(await actions.getCoursesForProfile(profile)), [999], 'Original-site fallback behavior is preserved')
  } finally { console.error = originalError }
  assert.equal(writes, 0)
  console.log('PASS Site Profile visibility: independent WI300 catalog, Page scopes, cache isolation, own active/completed learning, hidden/pending/other enrollments, imported Pages and original-site behavior (isolated DB).')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
