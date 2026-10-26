// Kiểm tra render và ranh giới streaming, không kết nối database thật.
const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { JSDOM } = require('jsdom')
const load = require('./helpers/load-ts.cjs')
const { defaultAppearance } = load('lib/wi300/appearance.ts')
const mocks = {
  'next/link': { __esModule: true, default: props => React.createElement('a', props) },
  'next/image': { __esModule: true, default: ({ unoptimized, ...props }) => React.createElement('img', props) },
}
const { default: Hero, WiCourseCatalogSkeleton: Skeleton } = load('components/wi300/WiCourseHero.tsx', mocks)
const settings = { ...defaultAppearance.courses, title: 'Tri thức <script>alert(1)</script>', heroImageUrl: 'https://example.com/hero.webp' }
for (const variant of ['minimal', 'illustrated', 'bold']) {
  const html = renderToStaticMarkup(React.createElement(Hero, { settings: { ...settings, heroVariant: variant } }))
  const doc = new JSDOM(html).window.document
  assert.equal(doc.querySelector('section').dataset.courseHero, variant)
  assert.equal(doc.querySelectorAll('h1').length, 1)
  assert.equal(doc.querySelector('script'), null, 'Text is escaped')
  assert.equal(doc.querySelector('a').getAttribute('href'), '/khoa-hoc#khoa-hoc')
  assert.equal(doc.querySelectorAll('img').length, variant === 'illustrated' ? 1 : 0, 'Only template 2 requests an image')
}
const vector = renderToStaticMarkup(React.createElement(Hero, { settings: defaultAppearance.courses }))
assert.ok(vector.includes('<svg'))
assert.ok(!vector.includes('<img'), 'Default illustration has no image request')
assert.equal(renderToStaticMarkup(React.createElement(Hero, { settings: { ...settings, showHero: false } })), '')
assert.ok(renderToStaticMarkup(React.createElement(Skeleton, { settings })).includes('aria-busy="true"'))

async function run() {
  let sessionCalls = 0
  const Page = load('app/khoa-hoc/page.tsx', {
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => ({ appearance: defaultAppearance }) },
    '@/lib/site-profile/presentation': { getPagePresentation: async () => 'wi300', getPresentationBrand: async () => ({ appearance: defaultAppearance }) },
    '@/lib/get-session': { getSession: () => { sessionCalls++; return new Promise(() => {}) } },
    '@/components/wi300/Wi300Home': { __esModule: true, default: () => null },
  }).default
  const page = await Page()
  assert.equal(sessionCalls, 0, 'Page returns the hero without waiting for session or course queries')
  const children = React.Children.toArray(page.props.children)
  assert.equal(children[0].props.settings.heroVariant, 'illustrated')
  assert.equal(children[1].type, React.Suspense)
  assert.equal(children[1].props.fallback.props.settings.showHero, true)
  console.log('Course hero: legacy defaults, three renders, image scope, escaped text, toggle, skeleton and streaming boundary passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
