/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner follows the repository's isolated CJS test harness. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '..')
function load(file, overrides = {}) {
  overrides = { './OfferingConsultation': { __esModule:true,default:()=>null }, '@/lib/offerings/service':require('./helpers/load-ts.cjs')('lib/offerings/service.ts'), ...overrides }
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in overrides ? overrides[name] : name === './service' ? require('./helpers/load-ts.cjs')('lib/offerings/service.ts') : require(name), mod, mod.exports)
  return mod.exports
}
async function run() {
  const shared = load('lib/offerings/shared.ts')
  const secret = 'https://files.example/private-ebook.pdf'
  const details = shared.parseOfferingDetails({ kind: 'EBOOK', accessUrl: secret, instructions: 'PRIVATE INSTRUCTIONS', accessDays: 30, resources: [{ title: 'Private resource', kind: 'EBOOK', url: secret + '?resource=1' }] })
  assert.equal(shared.publicOfferingDetails(details).accessUrl, undefined)
  assert.equal(shared.publicOfferingDetails(details).instructions, undefined)
  assert.equal(shared.publicOfferingDetails(details).resources, undefined)
  assert.throws(() => shared.parseOfferingDetails({ resources: [{ title: 'Unsafe', kind: 'APP', url: 'javascript:alert(1)' }] }))
  assert.deepEqual(shared.parseOfferingDetails({ benefits: ['One', ' '] }).benefits, ['One'])
  for (const url of ['javascript:alert(1)', '//evil.example', '/\\evil.example', 'http://example.com']) assert.throws(() => shared.parseOfferingDetails({ accessUrl: url }))
  assert.throws(() => shared.parseOfferingDetails({ accessDays: -1 }))
  assert.throws(() => shared.parseOfferingDetails({ durationMin: 0 }))
  const start = new Date('2026-11-01T08:00:00Z')
  for (const status of ['PENDING', 'CANCELLED', 'REJECTED']) assert.equal(shared.offeringAccess({ status, activatedAt: start }, 30, +start), false)
  assert.equal(shared.offeringAccess({ status: 'ACTIVE', activatedAt: start }, 30, +start + 30 * 86400000 - 1), true)
  assert.equal(shared.offeringAccess({ status: 'ACTIVE', activatedAt: start }, 30, +start + 30 * 86400000), false)
  assert.equal(shared.offeringAccess({ status: 'ACTIVE', activatedAt: start }, 0, +start + 365 * 86400000), true)
  assert.equal(shared.offeringAccess({ status: 'ACTIVE' }, 30), true, 'Historic purchases without activation timestamps retain access')

  let visible = true, group = 'DIGITAL', enrollment = null, configWrites = 0, bookingOwner = 7, bookingCourse = null, used = 0
  const item = { id: 5, id_khoa: 'EBOOK-5', name_lop: 'Ebook', productGroup: 'DIGITAL', phi_coc: 100000, teacherId: 7, teacher: { name: 'Expert' } }
  const db = {
    course: { findMany: async args => { assert.equal(args.where.AND[1].productGroup, 'DIGITAL'); return [item] }, findUnique: async () => ({ ...item, productGroup: group }), findFirst: async () => visible ? { id: 5 } : null },
    enrollment: { findUnique: async () => enrollment },
    user: { findUnique: async () => ({ phone: null }) },
    systemConfig: { findUnique: async () => ({ value: details }), findMany: async () => [{ key: 'catalog:offering:5', value: details }], upsert: async () => { configWrites++ } },
    bookingSession: { findUnique: async () => ({ id: 2, expertId: bookingOwner, courseId: bookingCourse, status: 'ACTIVE' }), update: async () => {} },
    booking: { count: async () => used },
    lesson: { findMany: async () => [{ id: 'legacy', title: 'Existing lesson', content: 'PROTECTED LEGACY CONTENT', videoUrl: '(Document)https://files.example/legacy.pdf', type: 'TEXT' }] },
  }
  const server = load('lib/offerings/server.ts', {
    'server-only': {}, '@/lib/prisma': { __esModule: true, default: db }, './shared': shared,
    '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => null, getCourseWhereForProfile: () => ({ status: true }) },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => null },
    '@/lib/wi300/course-visibility': {},
    '@/lib/wi300/public-projects': { getPublicProjects: async () => [{ slug: 'project', name: 'Public project', logo: '', courseIds: [5] }] },
  })
  const catalog = await server.getOfferingCatalog('DIGITAL')
  assert.ok(!JSON.stringify(catalog).includes(secret), 'Catalog payload never serializes download URLs')
  assert.ok(!JSON.stringify(catalog).includes('PRIVATE INSTRUCTIONS'))
  assert.equal(catalog[0].projects[0].slug, 'project')
  await assert.rejects(() => server.saveOfferingDetails(db, 5, 'DIGITAL', { kind: 'COACHING' }, 7))
  assert.equal(configWrites, 0)
  bookingOwner = 8
  await assert.rejects(() => server.saveOfferingDetails(db, 5, 'SERVICE', { kind: 'COACHING', bookingCode: 'COACH' }, 7))
  assert.equal(configWrites, 0, 'Another expert cannot have their calendar attached')
  bookingOwner = 7; bookingCourse = 99
  await assert.rejects(() => server.saveOfferingDetails(db, 5, 'SERVICE', { kind: 'COACHING', bookingCode: 'COACH' }, 7))
  bookingCourse = null
  await server.saveOfferingDetails(db, 5, 'SERVICE', { kind: 'COACHING', bookingCode: 'COACH' }, 7)
  assert.equal(configWrites, 1)

  const booking = load('lib/offerings/booking.ts', { './server': { readOfferingDetails: async () => ({ bookingCode: 'COACH', sessions: 3 }) } })
  group = 'SERVICE'
  await assert.rejects(() => booking.assertServiceBooking(db, { courseId: 5, code: 'COACH' }, null))
  enrollment = { status: 'PENDING' }
  await assert.rejects(() => booking.assertServiceBooking(db, { courseId: 5, code: 'COACH' }, 0))
  enrollment = { status: 'ACTIVE' }; used = 2
  await booking.assertServiceBooking(db, { courseId: 5, code: 'COACH' }, 0)
  used = 3
  await assert.rejects(() => booking.assertServiceBooking(db, { courseId: 5, code: 'COACH' }, 0))
  await booking.assertServiceBooking(db, { courseId: null, code: 'PUBLIC' }, null)

  const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
  let detailReads = 0
  const Detail = load('components/offerings/OfferingDetail.tsx', {
    'next/link': link, 'next/navigation': { notFound: () => { throw new Error('NOT_FOUND') } },
    '@/lib/prisma': { __esModule: true, default: db },
    '@/lib/get-session': { getSession: async () => ({ user: { id: '0' } }) },
    '@/lib/website/domain-context': { requireDomainCourse: async () => {} },
    '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => null },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => null },
    '@/components/wi300/Wi300Header': { __esModule: true, default: () => null },
    '@/components/layout/MainHeader': { __esModule: true, default: () => null },
    '@/components/wi300/Wi300Footer': { __esModule: true, default: () => null },
    '@/components/home/FooterSection': { __esModule: true, default: () => null },
    '@/components/course/CourseProjectBadges': { __esModule: true, default: () => null },
    '@/lib/wi300/public-projects': { getPublicProjects: async () => [] },
    './OfferingRichText': { __esModule: true, default: ({ text }) => React.createElement('p', null, text) },
    './OfferingResources': { __esModule: true, default: ({ resources }) => React.createElement('div', null, resources.map((r, index) => React.createElement('div', { key: index }, r.title, r.url, r.body))) },
    './OfferingPurchase': { __esModule: true, default: props => React.createElement('div', { 'data-purchase': JSON.stringify(props) }) },
    './OfferingShare': { __esModule: true, default: () => null },
    '@/lib/offerings/server': { getOfferingSalesCourse: async () => db.course.findUnique({}), readOfferingDetails: async () => { detailReads++; return details }, publicCatalogWhere: async () => ({ status: true }) },
    '@/lib/offerings/shared': shared,
  }).default
  group = 'DIGITAL'; enrollment = null
  let html = renderToStaticMarkup(await Detail({ slug: 'EBOOK-5', expectedGroup: 'DIGITAL' }))
  assert.ok(!html.includes(secret) && !html.includes('PRIVATE INSTRUCTIONS'), 'Unpaid page and purchase props contain no protected data')
  assert.ok(!html.includes('PROTECTED LEGACY CONTENT'))
  assert.ok(html.includes('Private resource'), 'Unpaid visitors can read resource titles without receiving the URLs or paid body')
  assert.equal(detailReads, 1)
  const reused = renderToStaticMarkup(await Detail({ slug: 'EBOOK-5', expectedGroup: 'DIGITAL', initialDetails: details }))
  assert.equal(detailReads, 1, 'Already loaded details are reused without a second database query')
  assert.equal(reused, html, 'Reuse preserves the same public output and protected-content boundaries')
  enrollment = { status: 'PENDING' }
  html = renderToStaticMarkup(await Detail({ slug: 'EBOOK-5' }))
  assert.ok(!html.includes(secret), 'A pending payment does not grant access')
  enrollment = { status: 'ACTIVE', activatedAt: new Date() }; visible = false
  html = renderToStaticMarkup(await Detail({ slug: 'EBOOK-5' }))
  assert.ok(!html.includes(secret) && !html.includes('PRIVATE INSTRUCTIONS') && html.includes('/san-pham/EBOOK-5/su-dung'), 'Sales page links to the private workspace without protected payloads')
  assert.ok(!html.includes('PROTECTED LEGACY CONTENT'), 'Legacy content is not rendered on the sales page')
  enrollment = { status: 'ACTIVE', activatedAt: new Date('2020-01-01T00:00:00Z') }
  html = renderToStaticMarkup(await Detail({ slug: 'EBOOK-5' }))
  assert.ok(!html.includes(secret) && html.includes('hết hạn'), 'Expired access is denied on the server')
  assert.ok(!html.includes('PROTECTED LEGACY CONTENT'))
  enrollment = null
  await assert.rejects(() => Detail({ slug: 'EBOOK-5' }), /NOT_FOUND/, 'Hidden item is unavailable to unentitled visitors')
  await assert.rejects(() => Detail({ slug: 'EBOOK-5', expectedGroup: 'SERVICE' }), /NOT_FOUND/)
  console.log('Offerings: private payloads, safe links, access boundaries, hidden purchases, calendar ownership and booking quotas passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
