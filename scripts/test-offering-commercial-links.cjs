// Isolated regression coverage: no live database, payments or notifications.
const assert = require('node:assert/strict')
const React = require('react')
const { JSDOM } = require('jsdom')
const load = require('./helpers/load-ts.cjs')
const shared = load('lib/offerings/shared.ts')
const service = load('lib/offerings/service.ts')
const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
async function run() {
  let details = shared.parseOfferingDetails({ kind: 'OTHER', service: { saleMode: 'QUOTE', model: 'PROJECT', revisions: 5, warranty: '30 days', questions: [
    { id: 'need', label: 'Saved need', type: 'TEXT', required: true },
    { id: 'size', label: 'Saved size', type: 'SELECT', options: ['Small', 'Large'] },
    { id: 'docs', label: 'Saved docs', type: 'LINK' },
  ] } })
  assert.equal(service.effectiveService(shared.emptyOfferingDetails).saleMode, 'PACKAGE', 'Legacy services retain package mode')
  const facts = JSON.stringify(shared.offeringFacts('SERVICE', shared.publicOfferingDetails(details)))
  assert(facts.includes('Liên hệ báo giá')); assert(!facts.includes('phút/buổi')); assert(!facts.includes('30 ngày'))
  assert.equal(shared.publicOfferingDetails(details).service.questions.length, 3, 'Quote form definitions are public')
  class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
  let visible = true, userId = '0', writes = [], scopeCalls = 0
  const db = { course: { findFirst: async ({ where }) => { assert.deepEqual(where.AND[0], { status: true }); return visible ? { id: 7 } : null } } }
  const api = load('app/api/offerings/[slug]/consult/route.ts', {
    'server-only': {},
    '@/lib/prisma': { __esModule: true, default: db }, '@/auth': { auth: async () => ({ user: { id: userId } }) },
    '@/lib/crm/service': { CrmError },
    '@/lib/crm/requests': { createRequest: async (database, input, actor) => { if (actor == null) throw new CrmError('Login', 401); writes.push({ input, actor }); return { success: true } } },
    '@/lib/website/domain-context': { requireDomainModule: async () => { scopeCalls++ }, requireDomainCourse: async slug => assert.equal(slug, 'WEB') },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => null },
    '@/lib/offerings/server': { publicCatalogWhere: async () => ({ status: true }), readOfferingDetails: async () => details },
  })
  const key = '00000000-0000-4000-8000-000000000001'
  function request(answers, overrides = {}, origin = 'https://test.invalid') {
    return new Request('https://test.invalid/api/offerings/WEB/consult', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ key, consent: true, answers, ...overrides }) })
  }
  const submit = req => api.POST(req, { params: Promise.resolve({ slug: 'WEB' }) })
  assert.equal((await submit(request({}))).status, 400)
  assert.equal((await submit(request({ need: 'Web', size: 'Invalid' }))).status, 400)
  assert.equal((await submit(request({ need: 'Web', docs: 'javascript:alert(1)' }))).status, 400)
  assert.equal((await submit(request({ need: 'Web' }, {}, 'https://evil.invalid'))).status, 403)
  assert.equal(writes.length, 0)
  const result = await submit(request({ need: 'Web', size: 'Small', docs: 'https://docs.example/file', injected: 'Ignore me' }))
  assert.equal(result.status, 201); assert.equal(result.headers.get('cache-control'), 'private, no-store')
  assert.equal(writes[0].actor, 0); assert.equal(writes[0].input.courseId, 7); assert.equal(writes[0].input.category, 'CONSULTATION')
  assert(writes[0].input.content.includes('Saved need\nWeb')); assert(!writes[0].input.content.includes('Ignore me'))
  visible = false; assert.equal((await submit(request({ need: 'Web' }))).status, 404); visible = true
  userId = undefined; assert.equal((await submit(request({ need: 'Web' }))).status, 401); userId = '0'
  details = { ...details, service: { ...details.service, saleMode: 'PACKAGE' } }
  assert.equal((await submit(request({ need: 'Web' }))).status, 400); assert.equal(writes.length, 1); assert(scopeCalls > 0)

  // Publishing a sales template enables it while preserving existing offering data.
  let denied = false, group = 'DIGITAL', configWrites = [], pageWrites = 0
  const invalidations = []
  const stored = { id: 'p', slug: 'WEB', name: 'Web', sections: [], useTemplate: false, seo: {}, theme: {}, navigation: {}, checkoutConfig: {} }
  const publishDb = {
    coursePage: { findUnique: async () => stored, update: async () => { pageWrites++; return stored } },
    coursePageVersion: { findFirst: async () => null, create: async () => ({ versionNumber: 1 }) },
    course: { findUnique: async () => ({ id: 7, productGroup: group }) },
    systemConfig: { upsert: async input => configWrites.push(input) },
  }
  publishDb.$transaction = callback => callback(publishDb)
  const actions = load('app/actions/course-page-actions.ts', {
    '@/lib/prisma': { __esModule: true, default: publishDb }, 'next/cache': { revalidatePath: path => invalidations.push(path) },
    '@/lib/course-page/permissions': { coursePageActionAccess: async () => denied ? { success: false } : null },
    '@/lib/api-auth': {}, '@/lib/course-page/templates': {},
    '@/lib/offerings/server': { offeringDetailsKey: id => 'catalog:offering:' + id, readOfferingDetails: async (id, tx) => { assert.equal(tx, publishDb); return details } },
  })
  for (group of ['DIGITAL', 'SERVICE']) assert.equal((await actions.publishCoursePage('p')).success, true)
  assert.equal(configWrites.length, 2); assert.equal(configWrites[0].update.value.salesLayout, 'TEMPLATE')
  assert.deepEqual(configWrites[0].update.value.resources, details.resources)
  assert(invalidations.includes('/san-pham/WEB')); assert(invalidations.includes('/dich-vu/WEB'))
  group = 'COURSE'; await actions.publishCoursePage('p'); assert.equal(configWrites.length, 2)
  denied = true; const previous = pageWrites; await actions.publishCoursePage('p'); assert.equal(pageWrites, previous)

  const Cards = load('components/wi300/ProjectLinkedContent.tsx', { 'next/link': link }).default
  const html = require('react-dom/server').renderToStaticMarkup(React.createElement(Cards, { items: [
    { id: 1, id_khoa: 'APP', name_lop: 'App', productGroup: 'DIGITAL', phi_coc: 123000 },
    { id: 2, id_khoa: 'WEB', name_lop: 'Web', productGroup: 'SERVICE', phi_coc: 0, quote: true },
  ] }))
  assert(html.includes('/san-pham/APP')); assert(html.includes('/dich-vu/WEB')); assert(html.includes('123.000đ')); assert(html.includes('Liên hệ báo giá')); assert(!html.includes('Miễn phí'))
  const sectionNames = ['GiftTemplate', 'Hero', 'Quote', 'PainPoints', 'Benefits', 'Outcomes', 'Instructor', 'Commitment', 'Bonuses', 'ValueStack', 'Roadmap', 'Pricing', 'ClosingMessage', 'Curriculum', 'Testimonials', 'RichContent', 'WiGrowArtwork', 'Imported', 'ZipSource']
  const sectionMocks = Object.fromEntries(sectionNames.map(name => ['./sections/' + name + 'Section', { __esModule: true, default: () => React.createElement('div', null, 'Authored price 999999') }]))
  const Sections = load('components/course-page/SectionRenderer.tsx', sectionMocks).default
  const pricing = { id: 'price', sectionKey: 'price', sectionType: 'pricing', enabled: true, sortOrder: 0, visibility: 'all', content: {} }
  for (const [productGroup, saleMode, expected] of [['DIGITAL', 'QUOTE', '123.000đ'], ['SERVICE', 'PACKAGE', '123.000đ'], ['SERVICE', 'QUOTE', 'Liên hệ báo giá']]) {
    const rendered = require('react-dom/server').renderToStaticMarkup(React.createElement(Sections, { sections: [pricing], isEnrolled: false, course: { productGroup, phi_coc: 123000, offeringDetails: { service: { saleMode } } } }))
    assert(rendered.includes(expected)); assert(!rendered.includes('999999'), 'Native template pricing uses the saved commercial price')
  }

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.invalid' })
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  try {
    const Fields = load('components/offerings/OfferingServiceFields.tsx').default
    let value = details
    function render() { root.render(React.createElement(Fields, { value, onChange: next => { value = next; render() } }, React.createElement('input', { 'data-session': true }))) }
    await React.act(async () => render())
    await React.act(async () => document.querySelector('input[value="QUOTE"]').click())
    assert(!document.querySelector('[aria-label="Cách cung cấp dịch vụ"]')); assert(!document.querySelector('[data-session]'))
    assert(document.body.textContent.includes('CRM')); assert.equal(value.service.revisions, 5)
    await React.act(async () => document.querySelector('input[value="PACKAGE"]').click())
    assert(document.querySelector('[aria-label="Cách cung cấp dịch vụ"]')); assert.equal(value.service.revisions, 5)
    const Form = load('components/offerings/OfferingConsultation.tsx', { 'next/link': link }).default
    let fail = true, payloads = []
    global.fetch = async (url, init) => { payloads.push(JSON.parse(init.body)); return { ok: !fail, json: async () => fail ? { error: 'Retry me' } : { success: true } } }
    await React.act(async () => root.render(React.createElement(Form, { slug: 'WEB', signedIn: true, questions: [] })))
    await React.act(async () => document.querySelector('button').click())
    await React.act(async () => {
      const node = document.querySelector('textarea')
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(node, 'Need a website')
      node.dispatchEvent(new window.Event('input', { bubbles: true }))
      document.querySelector('input[type="checkbox"]').click()
    })
    async function send() { await React.act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))) }
    await send(); assert(document.body.textContent.includes('Retry me')); assert.equal(document.querySelector('textarea').value, 'Need a website')
    fail = false; await send(); assert.equal(payloads[0].key, payloads[1].key); assert.equal(payloads[1].content, 'Need a website'); assert(document.querySelector('a[href="/my-requests"]'))
  } finally { await React.act(async () => root.unmount()); dom.window.close() }
  console.log('Offering commercial links: quote privacy/validation/CRM, scoped publication, project routes/prices, mode retention and consultation retry passed (isolated fixtures).')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
