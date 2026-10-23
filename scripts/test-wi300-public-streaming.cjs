// Exercises actual React server streaming with deliberately unresolved data.
// No real database, credentials, or account is accessed.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const React = require('react')
const { Writable } = require('node:stream')
const { renderToPipeableStream, renderToStaticMarkup } = require('react-dom/server')
const load = require('./helpers/load-ts.cjs')
const { defaultAppearance, appearanceStyle } = load('lib/wi300/appearance.ts')
const brand = { ...load('lib/site-profile/deployment-brand.ts').getDeploymentBrand({ SITE_VARIANT: 'wi300' }), appearance: defaultAppearance }
const component = () => null
const moduleOf = defaultExport => ({ __esModule: true, default: defaultExport })
const image = moduleOf(({ priority, unoptimized, ...props }) => React.createElement('img', props))
const link = moduleOf(props => React.createElement('a', props))

async function capture(element, beforeRelease) {
  let shellReady, allReady, failed
  const first = new Promise(resolve => { shellReady = resolve })
  const finished = new Promise((resolve, reject) => { allReady = resolve; failed = reject })
  const chunks = []
  let captured = false
  const stream = renderToPipeableStream(element, {
    onShellReady() { stream.pipe(new Writable({
      write(chunk, _, next) { chunks.push(chunk.toString()); if (!captured) { captured = true; setImmediate(() => shellReady(chunks.join(''))) } next() },
      final(next) { allReady(chunks.join('')); next() },
    })) },
    onError(error) { failed(error) },
  })
  const timeout = setTimeout(() => { stream.abort(); failed(Error('Streaming timed out')) }, 5000)
  try { await beforeRelease(await first); return await finished } finally { clearTimeout(timeout) }
}

async function run() {
  let release, reads = 0
  const deferred = new Promise(resolve => { release = resolve })
  const PublicHome = load('components/wi300/Wi300PublicHome.tsx', {
    '@/lib/prisma': moduleOf({}),
    '@/lib/wi300/project-service': { readPublicProjects: () => { reads++; return deferred } },
    'next/image': image, 'next/link': link,
  }).default
  const final = await capture(React.createElement(PublicHome, { brand }), shell => {
    assert.equal(reads, 1)
    assert.ok(shell.includes('wi300-hero-title'), 'Actual hero reaches the first HTML chunk while projects are unresolved')
    assert.ok(shell.includes('Bạn đang tìm gì?'), 'Public navigation does not wait for projects')
    assert.ok(shell.includes('Đang tải thông tin dự án'))
    assert.ok(!shell.includes('resolved-project'))
    release([{ slug: 'resolved-project', name: 'Resolved project', description: '', published: true, showOnHomepage: true }])
  })
  assert.ok(final.includes('/du-an/resolved-project'), 'Real project cards arrive in a later chunk')
  assert.equal(reads, 1)
  const hidden = { ...brand, appearance: { ...defaultAppearance, home: { ...defaultAppearance.home, sections: { ...defaultAppearance.home.sections, projects: false } } } }
  renderToStaticMarkup(React.createElement(PublicHome, { brand: hidden }))
  assert.equal(reads, 1, 'A hidden project section performs no database read')
  const reordered = { ...brand, appearance: { ...defaultAppearance, home: { ...defaultAppearance.home, order: ['start', 'hero', 'discovery', 'projects'] } } }
  await capture(React.createElement(PublicHome, { brand: reordered }), shell => {
    assert.ok(shell.indexOf('wi300-start-title') < shell.indexOf('wi300-hero-title'), 'Configured section order is preserved in the first chunk')
  })

  let pathname = '/', sessionCalls = 0
  const session = { user: { id: '8', role: 'TEACHER' } }
  const Providers = component
  const layoutMocks = {
    'next/font/local': moduleOf(() => ({ variable: 'font-test' })),
    'next/script': moduleOf(component), './globals.css': {},
    'next/cache': { unstable_cache: fn => fn },
    '@/lib/prisma': moduleOf({}),
    './providers': moduleOf(Providers),
    './contexts/theme-config': { getDefaultThemeColors: () => ({}) },
    '@/components/pwa/PwaInstallProvider': moduleOf(component),
    '@/components/home/PendingSurveyHandler': moduleOf(component),
    '@/components/AffiliateTracker': moduleOf(component),
    '@/components/auth/AccountAssistantTrigger': moduleOf(component),
    '@/lib/get-session': { getSession: async () => { sessionCalls++; return session } },
    '@/app/actions/attention-highlight-actions': { getAttentionHighlightSettings: async () => ({}) },
    'next/headers': { headers: async () => new Headers({ 'x-wi300-pathname': pathname }) },
    '@/lib/website/domain-context': { domainContext: async () => null },
    '@/lib/website/presentation-server': {},
    '@/components/website/DomainShell': moduleOf(component),
    '@/lib/website/pages': {}, '@/components/website/ImportedPage': moduleOf(component),
    '@/lib/website/theme': { websiteTheme: () => ({ style: {} }), normalizeWebsitePalette: () => ({}) },
    '@/lib/site-profile/runtime': {},
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand },
    '@/components/wi300/Wi300BrandContext': { Wi300BrandProvider: component },
    '@/components/wi300/Wi300Shell': moduleOf(component), '@/lib/wi300/website-config': {},
    '@/lib/wi300/appearance': { defaultAppearance, appearanceStyle },
  }
  const Layout = load('app/layout.tsx', layoutMocks).default
  function find(element, type) {
    if (!React.isValidElement(element)) return null
    if (element.type === type) return element
    for (const child of React.Children.toArray(element.props.children)) { const result = find(child, type); if (result) return result }
    return null
  }
  for (pathname of ['/', '/khoa-hoc']) {
    const tree = await Layout({ children: 'public-content' })
    assert.equal(sessionCalls, 0, 'Public shell never starts the server session lookup')
    assert.equal(find(tree, Providers).props.session, undefined, 'SessionProvider will fetch account UI after hydration')
  }
  for (pathname of ['/my-space', '/tools/crm', '/khoa-hoc/PRIVATE', '']) {
    const previous = sessionCalls
    const tree = await Layout({ children: 'private-content' })
    assert.equal(sessionCalls, previous + 1)
    assert.equal(find(tree, Providers).props.session, session, 'Personal, management and missing-header paths keep server-provided sessions')
  }

  // The proxy must overwrite a forged pathname; it must still block non-admins.
  const { NextRequest } = require('next/server')
  const proxy = load('proxy.ts', {
    'next-auth': moduleOf(() => ({ auth: fn => request => fn({ ...request, auth: null, nextUrl: request.nextUrl, headers: request.headers }) })),
    './auth.config': { authConfig: {} },
    '@/lib/website/domains': { activeDomain: async () => { throw Error('Not a custom domain') } },
    '@/lib/website/domain-shared': { isPlatformHost: host => host === 'wi300.vn', requestHostname: value => value },
    '@/lib/prisma': moduleOf({}), '@/lib/site-profile/config': {},
  }).default
  const publicResponse = await proxy(new NextRequest('https://wi300.vn/khoa-hoc?ref=TEST', { headers: { host: 'wi300.vn', 'x-wi300-pathname': '/forged' } }), {})
  assert.equal(publicResponse.headers.get('x-middleware-request-x-wi300-pathname'), '/khoa-hoc')
  assert.ok(publicResponse.cookies.get('aff_ref'), 'Affiliate attribution is preserved')
  assert.equal((await proxy(new NextRequest('https://wi300.vn/api/admin/example', { headers: { host: 'wi300.vn' } }), {})).status, 403)

  // Normal home never starts auth; payment links still use server-verified data.
  sessionCalls = 0
  const Page = load('app/page.tsx', {
    '@/lib/get-session': layoutMocks['@/lib/get-session'],
    '@/lib/prisma': moduleOf({}),
    '@/lib/site-profile/deployment-runtime': layoutMocks['@/lib/site-profile/deployment-runtime'],
    '@/components/wi300/Wi300PublicHome': moduleOf(PublicHome),
    '@/components/wi300/Wi300Home': moduleOf(props => {
      assert.equal(props.session, session)
      assert.equal(props.loadHomeCourses, true)
      return React.createElement('p', { 'data-payment-user': props.session.user.id }, 'Verified payment')
    }),
    '@/components/layout/MainHeader': moduleOf(component),
    '@/components/home/MessageCard': moduleOf(component),
    '@/components/home/HomePageClient': moduleOf(component),
    '@/components/home/FooterSection': moduleOf(component),
    '@/app/actions/site-profile-actions': {}, '@/lib/site-profile/runtime': {},
    '@/components/landing/LandingPageClient': {},
    './actions/message-actions': {}, './actions/survey-actions': {}, './actions/roadmap-actions': {},
    '@/lib/db-fallback': {}, '@/lib/wi300/website-config': {},
  }).default
  assert.equal((await Page({ searchParams: Promise.resolve({}) })).type, PublicHome)
  assert.equal(sessionCalls, 0)
  const payment = await Page({ searchParams: Promise.resolve({ paymentCourseId: '1' }) })
  assert.equal(payment.type, React.Suspense)
  const paidHtml = await capture(payment, () => {})
  assert.ok(paidHtml.includes('data-payment-user="8"'))
  assert.equal(sessionCalls, 1)

  const root = path.resolve(__dirname, '..')
  const oldLogo = fs.statSync(path.join(root, 'public/wi300/300dns-logo.webp')).size
  assert.ok(fs.statSync(path.join(root, 'public/wi300/logo-256.webp')).size < oldLogo / 5)
  console.log('Public streaming: first-chunk hero/navigation, deferred real projects, section order/visibility, deferred public sessions, protected sessions, trusted proxy header and affiliate checks passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
