const assert = require('node:assert/strict')
const fs = require('node:fs')
const load = require('./helpers/load-ts.cjs')
const { convert } = require('./unify-teacher-roles.cjs')
const roleHelpers = load('lib/auth/roles.ts')
const { normalizeRole, canCreateProfile, isHighestAdmin } = roleHelpers
let actor = { id: 26, role: 'ADMIN' }, writes = 0, created, profile = null, domain = null
const db = {
  $transaction: async fn => fn(db),
  course: { count: async () => 0 },
  user: { findUnique: async ({ where }) => where.id === actor.id ? actor : { id: where.id, role: 'STUDENT' }, update: async args => { writes++; return args.data } },
  siteProfile: {
    findUnique: async ({ where }) => where.userId != null ? profile : null,
    create: async ({ data }) => { writes++; created = data; return { id: 9, ...data } },
  },
  landingPage: { findUnique: async () => null },
}
const auth = { auth: async () => actor ? { user: { id: String(actor.id), role: normalizeRole(actor.role) } } : null }
function isolated(file) {
  // Stub unused dependencies; exercise the real exported server actions.
  const mocks = {}
  for (const match of fs.readFileSync(require('node:path').join(__dirname, '..', file), 'utf8').matchAll(/from ['"]([^'"]+)['"]/g)) mocks[match[1]] = {}
  return load(file, { ...mocks, '@/auth': auth, '@/lib/prisma': { __esModule: true, default: db }, '@/lib/auth/roles': roleHelpers,
    '@/lib/auth/change-member-role': load('lib/auth/change-member-role.ts'),
    '@prisma/client': require('@prisma/client'), 'next/cache': { unstable_cache: fn => fn, revalidatePath() {}, revalidateTag() {} },
    '@/lib/website/domain-context': { domainContext: async () => domain },
  })
}
async function run() {
  for (const id of [0, 26, 3773]) {
    assert.equal(isHighestAdmin(String(id), 'ADMIN'), true)
    assert.equal(isHighestAdmin(id, 'STUDENT'), false)
  }
  assert.equal(isHighestAdmin(99, 'ADMIN'), false)
  assert.equal(normalizeRole('INSTRUCTOR'), 'TEACHER')
  assert.equal(canCreateProfile('STUDENT'), false)
  const members = isolated('app/actions/admin-actions.ts')
  for (const id of [0, 26, 3773]) {
    actor = { id, role: 'ADMIN' }
    assert.equal((await members.updateUserRoleAction(888, 'INSTRUCTOR')).role, 'TEACHER')
  }
  let before = writes
  actor = { id: 99, role: 'ADMIN' }; assert.ok((await members.updateUserRoleAction(888, 'TEACHER')).error)
  actor = { id: 26, role: 'STUDENT' }; assert.ok((await members.updateUserRoleAction(888, 'ADMIN')).error)
  assert.equal(writes, before)
  const profiles = isolated('app/actions/site-profile-actions.ts')
  for (const role of ['TEACHER', 'INSTRUCTOR']) {
    actor = { id: 71, role }; assert.equal((await profiles.createSiteProfile(null, 'my-profile')).success, true)
    assert.equal(created.userId, 71); assert.equal(created.isActive, false)
    before = writes; assert.ok((await profiles.createSiteProfile(72, 'stolen')).error); assert.equal(writes, before)
  }
  profile = { id: 9 }; assert.ok((await profiles.createSiteProfile(null, 'second')).error); profile = null
  actor = { id: 71, role: 'STUDENT' }; before = writes; assert.ok((await profiles.createSiteProfile(null, 'student')).error); assert.equal(writes, before)
  actor = { id: 26, role: 'ADMIN' }; assert.equal((await profiles.createSiteProfile(72, 'assigned')).success, true); assert.equal(created.userId, 72)
  domain = {}; before = writes; assert.ok((await profiles.createSiteProfile(26, 'custom-host')).error); assert.equal(writes, before); domain = null
  const permissions = load('lib/course/permissions.ts', { '@/auth': auth, '@/lib/website/domain-context': { domainContext: async () => null } })
  actor = { id: 71, role: 'INSTRUCTOR' }; const ctx = await permissions.getCourseAuthContext(); assert.equal(ctx.isTeacher, true)
  assert.equal(permissions.canManageCourse(ctx, 71), true); assert.equal(permissions.canManageCourse(ctx, 72), false)
  assert.equal(permissions.canManageCourse({ userId: 71, isTeacher: false, isAdmin: false }, 71), false)
  const nav = load('lib/wi300/personal-space.ts')
  const tools = [{ id: 1, slug: 'pages', name: 'Page', url: '/tools/pages', roles: [], isActive: true }]
  assert.ok(!nav.spaceNavigation('STUDENT', tools).some(group => group.items.some(item => item.href === '/tools/pages')))
  assert.ok(nav.spaceNavigation('TEACHER', tools).some(group => group.items.some(item => item.href === '/tools/pages')))
  assert.equal(nav.canUseTool('INSTRUCTOR', ['TEACHER']), true)
  const { authConfig } = load('auth.config.ts')
  const token = await authConfig.callbacks.jwt({ token: { sub: '71', role: 'STUDENT' }, trigger: 'update', session: { role: 'ADMIN' } })
  assert.equal(token.role, 'STUDENT', 'Client session updates cannot change roles')
  const session = await authConfig.callbacks.session({ session: { user: {} }, token: { sub: '71', role: 'INSTRUCTOR' } })
  assert.equal(session.user.role, 'TEACHER')
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
  let uiRole = 'STUDENT'
  const pages = load('app/tools/pages/page.tsx', {
    'next-auth/react': { useSession: () => ({ data: { user: { id: '71', role: uiRole } }, status: 'authenticated' }) },
    'next/navigation': { useSearchParams: () => new URLSearchParams('tab=my-site'), useRouter: () => ({ replace() {} }) },
    '@/components/layout/MainHeader': { __esModule: true, default: () => null },
    './MySiteTab': { __esModule: true, default: () => React.createElement('a', { href: '/tools/site-profiles/new' }, 'Create own profile') },
    './LandingsTab': { __esModule: true, default: () => null }, './SiteProfilesTab': { __esModule: true, default: () => null },
  }).default
  assert.match(renderToStaticMarkup(React.createElement(pages)), /Chỉ giảng viên và admin/)
  uiRole = 'TEACHER'
  let markup = renderToStaticMarkup(React.createElement(pages)); assert.ok(markup.includes('/tools/site-profiles/new')); assert.ok(!markup.includes('Landing Page'))
  uiRole = 'ADMIN'; markup = renderToStaticMarkup(React.createElement(pages)); assert.ok(markup.includes('Landing Page'))
  // Exercise API output with the actual handler, including old persisted tool roles.
  let apiRole = 'INSTRUCTOR'
  const api = load('app/api/tools/route.ts', {
    '@/auth': { auth: async () => ({ user: { id: '71', role: apiRole } }) },
    '@/lib/prisma': { __esModule: true, default: { tool: { findMany: async () => [
      { id: 1, slug: 'pages', url: '/tools/pages', roles: ['STUDENT'], isActive: true },
      { id: 2, slug: 'courses', url: '/tools/courses', roles: ['TEACHER'], isActive: true },
    ] } } },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => null }, '@/lib/wi300/project-service': {},
  })
  let result = await (await api.GET()).json(); assert.deepEqual(result.tools.find(tool => tool.slug === 'pages').roles, ['ADMIN', 'TEACHER'])
  assert.ok(!result.tools.some(tool => tool.roles.includes('INSTRUCTOR')))
  apiRole = 'STUDENT'; result = await (await api.GET()).json(); assert.ok(!result.tools.some(tool => tool.slug === 'pages'))
  // A dry-run must never issue writes, including the requested admin-26 promotion.
  let migrationWrites = 0
  const migrationDb = {
    user: { findMany: async () => [{ id: 71, role: 'INSTRUCTOR' }], findUnique: async () => ({ id: 26, role: 'STUDENT' }) },
    userTest: { findMany: async () => [] }, tool: { findMany: async () => [{ id: 1, roles: ['TEACHER', 'INSTRUCTOR'] }] }, assistantGuide: { findMany: async () => [] },
    $transaction: async fn => { migrationWrites++; return fn(migrationDb) },
  }
  const report = await convert(migrationDb); assert.equal(migrationWrites, 0); assert.equal(report.before.admin26.next, 'ADMIN'); assert.deepEqual(report.before.tools[0].next, ['TEACHER'])
  await assert.rejects(convert(migrationDb, { execute: true, expectedDigest: 'outdated' }), /Plan changed/)
  console.log('PASS canonical teaching roles, highest-admin-only assignment, self-owned profiles, ownership, student denial, menu parity and dry-run safety')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
