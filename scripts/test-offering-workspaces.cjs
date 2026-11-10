/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const { JSDOM } = require('jsdom'), load = require('./helpers/load-ts.cjs')
async function run() {
  const shared = load('lib/offerings/shared.ts')
  let userId = '0', enrollment = { status: 'ACTIVE', activatedAt: new Date() }, inScope = true, reads = 0
  let details = shared.parseOfferingDetails({ kind: 'RESOURCE', accessDays: 30, accessUrl: 'https://private.example/main', instructions: 'PRIVATE GUIDE', resources: [{ title: 'Private PDF', kind: 'EBOOK', viewer: 'PDF', url: 'https://private.example/book.pdf' }] })
  const course = { id: 7, id_khoa: 'PRODUCT', name_lop: 'Product', productGroup: 'DIGITAL', teacher: { name: 'Expert' } }
  const db = { course: { findUnique: async () => course, findFirst: async () => inScope ? { id: 7 } : null }, enrollment: { findUnique: async args => { assert.equal(args.where.userId_courseId.userId, Number(userId)); return enrollment } }, lesson: {
    findMany: async args => { reads++; assert.equal(args.select.content, undefined); return [{ id: 'own-lesson', title: 'Legacy', type: 'TEXT' }] },
    findFirst: async args => { reads++; assert.equal(args.where.courseId, 7); return args.where.id === 'own-lesson' ? { title: 'Legacy', content: 'PROTECTED BODY', videoUrl: '(Doc)https://private.example/legacy.pdf|javascript:alert(1)' } : null },
  } }
  const workspace = load('lib/offerings/workspace.ts', {
    'server-only': {}, '@/lib/prisma': { __esModule: true, default: db },
    '@/lib/get-session': { getSession: async () => userId == null ? null : ({ user: { id: userId } }) },
    '@/lib/website/domain-context': { requireDomainCourse: async () => {} },
    '@/lib/site-profile/runtime': { getCurrentSiteProfile: async () => ({}), getCourseWhereForProfile: () => ({ status: true, teacherId: 2 }) },
    './server': { readOfferingDetails: async () => details, getTrialRecord: async () => null },
  })
  userId = null
  await assert.rejects(() => workspace.readWorkspaceResource('PRODUCT', 'resource:0'), error => error.status === 401)
  userId = '0'; enrollment = { status: 'PENDING' }
  await assert.rejects(() => workspace.readWorkspaceResource('PRODUCT', 'resource:0'), error => error.status === 403)
  enrollment = { status: 'ACTIVE', activatedAt: new Date('2020-01-01') }
  await assert.rejects(() => workspace.readWorkspaceResource('PRODUCT', 'lesson:own-lesson'), error => error.status === 403)
  assert.equal(reads, 0)
  enrollment = { status: 'ACTIVE', activatedAt: new Date() }; inScope = false
  await assert.rejects(() => workspace.requireOfferingWorkspace('PRODUCT'), error => error.status === 404)
  inScope = true
  assert.equal((await workspace.readWorkspaceResource('PRODUCT', 'resource:0')).url, 'https://private.example/book.pdf')
  details.resources[0].guides = [{ title: 'Private steps', kind: 'TEXT', content: 'SECRET STEPS', url: '' }]
  assert.equal((await workspace.readWorkspaceResource('PRODUCT', 'resource:0')).guides[0].content, 'SECRET STEPS')
  const originalModules = details.modules; details.modules = ['resources']
  assert.equal((await workspace.readWorkspaceResource('PRODUCT', 'resource:0')).guides, undefined, 'Disabled instructions module strips nested guides as well as legacy fields')
  details.modules = originalModules
  const summary = await workspace.workspaceResources(7, details)
  assert.ok(!JSON.stringify(summary).includes('private.example') && !JSON.stringify(summary).includes('PROTECTED BODY'))
  const legacy = await workspace.readWorkspaceResource('PRODUCT', 'lesson:own-lesson')
  assert.equal(legacy.content, 'PROTECTED BODY'); assert.equal(legacy.links.length, 1)
  await assert.rejects(() => workspace.readWorkspaceResource('PRODUCT', 'lesson:other-course'), error => error.status === 404)
  await assert.rejects(() => workspace.requireOfferingWorkspace('PRODUCT', 'SERVICE'), error => error.status === 404)
  details = { ...details, modules: [] }
  await assert.rejects(() => workspace.readWorkspaceResource('PRODUCT', 'resource:0'), error => error.status === 404)
  assert.equal(shared.resolvedWorkspace('SERVICE', shared.parseOfferingDetails({ kind: 'IMPLEMENTATION' })), 'DELIVERY')
  assert.equal(shared.resolvedWorkspace('DIGITAL', shared.parseOfferingDetails({ kind: 'APP' })), 'APP')
  let published = false, publicItem = true
  const TemplateSales = () => null
  const SalesPage = load('components/offerings/OfferingSalesPage.tsx', {
    'next/navigation': { notFound: () => { throw Error('NOT_FOUND') }, redirect: href => { throw Error('REDIRECT:' + href) } },
    '@/lib/prisma': { __esModule: true, default: { course: { findUnique: async () => course, findFirst: async () => publicItem ? { id: 7 } : null } } },
    '@/lib/website/domain-context': { requireDomainCourse: async () => {} },
    '@/app/actions/course-page-actions': { getPublishedCoursePageBySlug: async () => published ? { status: 'published' } : null },
    '@/lib/offerings/server': { getOfferingSalesCourse: async () => course, readOfferingDetails: async () => ({ salesLayout: 'TEMPLATE' }), publicCatalogWhere: async () => ({ status: true }) },
    './OfferingDetail': { __esModule: true, default: () => null },
    '@/components/course-page/CourseSalesPage': { __esModule: true, default: TemplateSales },
  }).default
  await SalesPage({ slug: 'PRODUCT', group: 'DIGITAL' })
  published = true
  const templatePage = await SalesPage({ slug: 'PRODUCT', group: 'DIGITAL' })
  assert.equal(templatePage.type, TemplateSales, 'Render published templates at the product URL instead of redirecting to courses')
  assert.equal(templatePage.props.expectedGroup, 'DIGITAL')
  publicItem = false
  await SalesPage({ slug: 'PRODUCT', group: 'DIGITAL' })
  await assert.rejects(() => SalesPage({ slug: 'PRODUCT', group: 'SERVICE' }), /NOT_FOUND/)

  class CrmError extends Error { constructor(message, status) { super(message); this.status = status } }
  let actor = { id: 0, role: 'ADMIN' }, active = true, saved = null, writes = 0
  const deliveryDb = { course: { findUnique: async () => ({ id: 7, teacherId: 3, productGroup: 'SERVICE' }) }, enrollment: { findMany: async () => [{ userId: 0, user: { name: 'Zero' } }], findUnique: async () => active ? { status: 'ACTIVE' } : null }, systemConfig: { findUnique: async () => saved ? { value: saved } : null, upsert: async args => { writes++; saved = args.update.value } }, $executeRaw: async () => {} }
  deliveryDb.$transaction = fn => fn(deliveryDb)
  const api = load('app/api/offerings/[slug]/delivery/route.ts', { '@/lib/prisma': { __esModule: true, default: deliveryDb }, '@/lib/course-page/permissions': { courseEditorActor: async () => actor }, '@/lib/offerings/workspace': { deliveryKey: workspace.deliveryKey }, '@/lib/crm/service': { CrmError } })
  const state = shared.deliveryStateSchema.parse({ phase: 'REVIEW', note: 'For customer zero', files: [{ title: 'Delivery', url: 'https://private.example/delivery' }] })
  const request = (body, origin = 'https://wi300.test') => new Request('https://wi300.test/api/offerings/PRODUCT/delivery', { method: 'PUT', headers: { origin }, body: JSON.stringify(body) })
  const params = { params: Promise.resolve({ slug: 'PRODUCT' }) }
  assert.equal((await api.PUT(request({ userId: 0, state }, 'https://evil.test'), params)).status, 403)
  actor = { id: 9, role: 'TEACHER' }
  assert.equal((await api.PUT(request({ userId: 0, state }), params)).status, 403)
  actor = { id: 3, role: 'TEACHER' }; active = false
  assert.equal((await api.PUT(request({ userId: 0, state }), params)).status, 403)
  active = true
  assert.equal((await api.PUT(request({ userId: 0, state }), params)).status, 200)
  assert.equal(writes, 1); assert.equal(saved.version, 1)
  assert.equal(saved.history.length, 1); assert.equal(saved.history[0].actorId, 3, 'Delivery history is stamped by the authenticated actor')
  assert.equal((await api.PUT(request({ userId: 0, state }), params)).status, 409)
  assert.equal(writes, 1)
  assert.equal((await api.GET(new Request('https://wi300.test/api/offerings/PRODUCT/delivery?userId=99'), params)).status, 404)
  const own = await api.GET(new Request('https://wi300.test/api/offerings/PRODUCT/delivery?userId=0'), params)
  assert.equal(own.headers.get('cache-control'), 'private, no-store')
  assert.equal((await own.json()).state.note, 'For customer zero')
  assert.equal((await api.PUT(request({ userId: 0, state: { ...state, version: 1, requirements: 'Prepare the brief', history: [{ at: '2020-01-01T00:00:00Z', phase: 'COMPLETED', actorId: 999 }] } }), params)).status, 200)
  assert.equal(saved.requirements, 'Prepare the brief')
  assert.equal(saved.history.length, 2); assert.ok(saved.history.every(event => event.actorId === 3), 'Clients cannot forge delivery history')

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.test' })
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
  const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
  const Library = load('components/offerings/OfferingLibrary.tsx', { 'next/link': link }).default
  const { embeddedSource, default: Viewer } = load('components/offerings/OfferingViewer.tsx')
  assert.equal(embeddedSource('javascript:alert(1)'), null)
  assert.equal(embeddedSource('https://'), null)
  assert.equal(embeddedSource('//evil.example'), null)
  assert.equal(embeddedSource('https://youtu.be/dQw4w9WgXcQ', 'VIDEO').src, 'https://www.youtube.com/embed/dQw4w9WgXcQ')
  assert.equal(embeddedSource('https://drive.google.com/file/d/abc_123/view').src, 'https://drive.google.com/file/d/abc_123/preview')
  assert.equal(embeddedSource('https://drive.google.com/drive/folders/abc_123?usp=sharing').src, 'https://drive.google.com/embeddedfolderview?id=abc_123#list')
  assert.equal(embeddedSource('https://drive.google.com/drive/u/0/folders/abc_123').src, 'https://drive.google.com/embeddedfolderview?id=abc_123#list')
  const drive = load('lib/offerings/drive.ts')
  assert.equal(drive.driveLinkInfo('https://drive.google.com/drive/folders/abc_123?usp=sharing').type, 'folder')
  assert.equal(drive.driveLinkInfo('https://drive.google.com/file/d/abc_123/view').type, 'file')
  assert.equal(drive.driveLinkInfo('https://example.com/file/d/abc_123/view'), null)
  const listing = drive.parseDriveFolderListing('<div><a href="https://drive.google.com/drive/folders/F1"><span>Thư mục con</span></a><a href="https://drive.google.com/file/d/V1/view?usp=drive_web">Video 1.mp4</a><a href="https://drive.google.com/file/d/V1/view">Video trùng</a><a href="https://example.com/x">Ngoài Drive</a></div>')
  assert.deepEqual(listing, [
    { id: 'F1', name: 'Thư mục con', type: 'folder' },
    { id: 'V1', name: 'Video 1.mp4', type: 'file' },
  ])
  assert.equal(embeddedSource('https://files.example/movie.mp4?token=123', 'VIDEO').video, true)
  const viewerHtml = renderToStaticMarkup(React.createElement(Viewer, { url: 'https://files.example/book.pdf', title: 'PDF' }))
  assert.ok(viewerHtml.includes('<iframe') && !viewerHtml.includes('target="_blank"') && !viewerHtml.includes('allow-popups') && !viewerHtml.includes('allow-top-navigation'))
  const youtubeHtml = renderToStaticMarkup(React.createElement(Viewer, { url: 'https://youtu.be/dQw4w9WgXcQ', title: 'YouTube', kind: 'VIDEO' }))
  assert.ok(youtubeHtml.includes('referrerPolicy="strict-origin-when-cross-origin"') && !youtubeHtml.includes('referrerPolicy="no-referrer"'), 'YouTube embeds must send their website origin to avoid player error 153')
  const originalFetch = global.fetch, calls = []
  global.fetch = async url => { calls.push(url); return { ok: true, json: async () => ({ title: url.includes('resource%3A1') ? 'Second body' : 'First body', kind: 'EBOOK', content: 'Only selected content' }) } }
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  await React.act(async () => root.render(React.createElement(Library, { slug: 'PRODUCT', resources: [{ id: 'resource:0', title: 'First', kind: 'EBOOK' }, { id: 'resource:1', title: 'Second', kind: 'TEMPLATE' }] })))
  assert.equal(calls.length, 1, 'No prefetch of the whole library')
  await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Second').click())
  assert.equal(calls.length, 2); assert.ok(document.body.textContent.includes('Second body'))
  assert.ok(!document.body.textContent.includes('First body'))
  global.fetch = async () => ({ ok: true, json: async () => ({ title: 'Video and guide', kind: 'VIDEO', content: '<a href="https://files.example/guide.pdf">Read guide</a>', links: [{ title: 'Part one', url: 'https://youtu.be/dQw4w9WgXcQ' }, { title: 'Part two', url: 'https://files.example/part2.mp4' }] }) })
  await React.act(async () => root.render(React.createElement(Library, { key: 'video', slug: 'VIDEO', resources: [{ id: 'resource:2', title: 'Video', kind: 'VIDEO' }] })))
  assert.equal(document.querySelector('iframe').src, 'https://www.youtube.com/embed/dQw4w9WgXcQ')
  await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent.includes('Part two')).click())
  assert.equal(document.querySelector('video').getAttribute('src'), 'https://files.example/part2.mp4')
  await React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Read guide').click())
  assert.equal(document.querySelector('iframe').src, 'https://files.example/guide.pdf')
  assert.equal(document.querySelectorAll('a[target="_blank"]').length, 0)
  const Content = load('components/offerings/OfferingResourceContent.tsx').default
  const mixed = { title: 'CleanImage', kind: 'APP', url: 'https://app.example/tool', openMode: 'NEW_TAB', guides: [{ title: 'Steps', kind: 'TEXT', content: 'Private text' }, { title: 'Docs', kind: 'DOCS', url: 'https://docs.google.com/document/d/abc/edit' }, { title: 'Video', kind: 'VIDEO', url: 'https://youtu.be/dQw4w9WgXcQ' }, { title: 'PDF', kind: 'PDF', url: 'https://files.example/guide.pdf' }] }
  await React.act(async () => root.render(React.createElement(Content, { resource: mixed })))
  assert.equal(document.querySelectorAll('iframe').length, 0, 'Closed guide sections do not load third-party frames')
  assert.equal(document.querySelector('a[target="_blank"]').rel, 'noopener noreferrer')
  const docsSection = [...document.querySelectorAll('details')][1]
  await React.act(async () => { docsSection.open = true; docsSection.dispatchEvent(new window.Event('toggle')) })
  assert.equal(document.querySelector('iframe').src, 'https://docs.google.com/document/d/abc/preview')
  assert.equal(document.querySelectorAll('details').length, 4, 'Mixed guides remain inside one App')
  await React.act(async () => root.unmount()); global.fetch = originalFetch; dom.window.close()

  let selectedLayout = 'LIBRARY', hasApp = true, resourceRows = []
  const Workspace = load('components/offerings/OfferingWorkspace.tsx', {
    'next/link': link, '@/lib/prisma': { __esModule: true, default: { booking: { findMany: async args => { assert.equal(args.where.userId, 0); return [] } } } },
    '@/lib/offerings/workspace': { WorkspaceError: workspace.WorkspaceError, requireOfferingWorkspace: async () => ({ course, userId: 0, details: shared.parseOfferingDetails({ workspaceLayout: selectedLayout, accessUrl: hasApp ? 'https://app.example' : '' }), profile: null }), workspaceResources: async () => resourceRows, readDelivery: async () => null },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => null }, '@/lib/wi300/public-projects': { getPublicProjects: async () => [] },
    '@/lib/booking/notify': { formatVnDateTime: value => String(value) }, '@/components/layout/MainHeader': { __esModule: true, default: () => null }, '@/components/home/FooterSection': { __esModule: true, default: () => null }, '@/components/course/CourseProjectBadges': { __esModule: true, default: () => null }, '@/components/crm/CrmRequestButton': { __esModule: true, default: () => null },
    './OfferingLibrary': { __esModule: true, default: () => React.createElement('div', null, 'Library') },
  }).default
  for (const [layout, group, expected] of [['LIBRARY', 'DIGITAL', 'Library'], ['APP', 'DIGITAL', 'Mở ứng dụng'], ['SESSIONS', 'SERVICE', 'Chưa có lịch hẹn'], ['DELIVERY', 'SERVICE', 'chưa cập nhật tiến độ riêng']]) {
    selectedLayout = layout
    assert.ok(renderToStaticMarkup(await Workspace({ slug: 'PRODUCT', group })).includes(expected))
  }
  selectedLayout = 'APP'; hasApp = false; resourceRows = [{ id: 'resource:0', title: 'Gift guide', kind: 'GUIDE' }]
  const giftHtml = renderToStaticMarkup(await Workspace({ slug: 'PRODUCT', group: 'DIGITAL' }))
  assert.ok(giftHtml.includes('Library'), 'App bundles without a main app show their usable resources in the full workspace')
  assert.ok(!giftHtml.includes('Ứng dụng của bạn') && !giftHtml.includes('Hướng dẫn ngay tại đây'), 'Missing app/instructions do not reserve empty panels')
  console.log('Offering workspaces: server entitlements, domain/group isolation, lazy selected resources, legacy content, disabled modules, delivery ownership/CSRF/conflicts/account zero and four real layouts passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
