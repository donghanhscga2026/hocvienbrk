// Isolated regression tests: no production database or credentials required.
const assert = require('node:assert/strict')
const load = require('./helpers/load-ts.cjs')

async function run() {
  const calls = []
  let releaseProfile
  let profileReady = Promise.resolve({ userId: 8 })
  const db = {
    course: { findMany: async () => { calls.push('courses'); return [{ id: 1 }] } },
    user: { findUnique: async () => { calls.push('phone'); return { phone: 'test' } } },
    enrollment: { findMany: async ({ select }) => { calls.push('enrollments'); return select.id ? [] : [{ courseId: 2 }] } },
  }
  const Home = load('components/wi300/Wi300Home.tsx', {
    'next/cache': { unstable_cache: fn => fn },
    '@/lib/prisma': { __esModule: true, default: db },
    '@/lib/site-profile/runtime': {
      getCurrentSiteProfile: () => { calls.push('profile'); return profileReady },
      getCourseWhereForProfile: profile => ({ teacherId: profile.userId }),
    },
    '@/lib/wi300/course-visibility': {
      wi300CoursePreferences: async () => { calls.push('preferences'); return new Map([[1, true]]) },
      wi300CourseWhere: (base, preferences, catalog, enrolled) => {
        calls.push({ base, catalog, enrolled }); return base
      },
      wi300HiddenLearning: async () => { calls.push('hidden'); return new Set() },
    },
    '@/lib/wi300/project-service': { readPublicProjects: async () => { calls.push('projects'); return [{ slug: 'public-project' }] } },
    './Wi300HomeClient': { __esModule: true, default: () => null },
  }).default
  const session = { user: { id: '8', role: 'STUDENT' } }
  const publicHome = await Home({ brand: {}, session, loadHomeCourses: false })
  assert.deepEqual(calls, ['projects'], 'Normal homepage does not query courses, preferences or private learning data')
  assert.equal(publicHome.props.loggedIn, true)
  assert.equal(publicHome.props.userId, 8)
  assert.equal(publicHome.props.projects[0].slug, 'public-project')
  calls.length = 0
  const paymentHome = await Home({ brand: {}, session, loadHomeCourses: true })
  assert.equal(paymentHome.props.courses[0].id, 1, 'Payment deep link still receives course data')
  assert.equal(paymentHome.props.userPhone, 'test')
  assert.ok(calls.includes('enrollments'))
  calls.length = 0
  profileReady = new Promise(resolve => { releaseProfile = resolve })
  const pending = Home({ brand: {}, session, view: 'space', loadHomeCourses: false })
  assert.ok(calls.includes('preferences'), 'Preferences start before the profile query finishes')
  assert.ok(calls.includes('enrollments'), 'Personal enrollment IDs start before the profile query finishes')
  releaseProfile({ userId: 8 })
  await pending
  assert.deepEqual(calls.find(call => typeof call === 'object'), { base: { teacherId: 8 }, catalog: false, enrolled: [2] }, 'Personal-space scope and verified enrollments are preserved')

  let key = 'site-a', hostname = 'wi300.vn', reads = 0
  const cache = new Map()
  const runtime = load('lib/site-profile/deployment-runtime.ts', {
    'server-only': {},
    'react': { cache: fn => fn },
    'next/headers': { headers: async () => new Headers({ host: hostname }) },
    'next/cache': { unstable_cache: fn => async (...args) => {
      const id = JSON.stringify(args)
      if (!cache.has(id)) cache.set(id, await fn(...args))
      return cache.get(id)
    } },
    '@/lib/prisma': { __esModule: true, default: {} },
    '@/lib/wi300/appearance-service': {
      appearanceKey: () => key,
      readAppearance: async (_, scope) => { reads++; return { published: { scope }, draft: { privateDraft: true } } },
    },
    './deployment-brand': { getDeploymentBrand: () => ({ name: 'Wi300' }) },
    '@/lib/website/domain-shared': { requestHostname: value => value, isPlatformHost: host => host === 'wi300.vn' },
    '@/lib/wi300/website-config': { configuredBrand: (brand, appearance) => ({ ...brand, appearance }) },
  })
  const first = await runtime.getCurrentDeploymentBrand()
  await runtime.getCurrentDeploymentBrand()
  assert.equal(reads, 1, 'Published settings are reused across requests')
  assert.deepEqual([...cache.values()], [{ scope: 'site-a' }], 'Draft settings never enter the public cache')
  key = 'site-b:preview:branch'
  const second = await runtime.getCurrentDeploymentBrand()
  assert.notDeepEqual(first.appearance, second.appearance, 'Site/preview keys do not share cached appearance')
  hostname = 'expert.example'
  assert.equal(await runtime.getCurrentDeploymentBrand(), null, 'Custom-domain routing is unchanged')
  assert.equal(reads, 2)
  console.log('Page loading: homepage query elimination, payment links, parallel reads, private scope, published-cache isolation passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
