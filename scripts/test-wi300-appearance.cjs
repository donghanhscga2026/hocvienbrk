// Chỉ dùng DB/DOM cách ly; không đọc hoặc ghi cấu hình production.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const React = require('react'), { JSDOM } = require('jsdom')
process.env.WI300_APPEARANCE_SECRET = 'unit-tests-only-not-a-production-key'
function load(file, mocks = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : name === '@/lib/wi300/website-config' ? load('lib/wi300/website-config.ts') : name === '@/lib/wi300/projects' || name === './projects' ? load('lib/wi300/projects.ts') : name === '@/lib/wi300/appearance' || name === './appearance' ? load('lib/wi300/appearance.ts') : require(name), module, module.exports)
  return module.exports
}
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
async function run() {
  const shared = load('lib/wi300/appearance.ts')
  const legacy = structuredClone(shared.defaultAppearance)
  delete legacy.pageSeo; delete legacy.seo; delete legacy.footer; delete legacy.common.name; delete legacy.common.tagline
  const upgraded = shared.appearanceSchema.parse(legacy)
  const separateDefaults = structuredClone(upgraded)
  separateDefaults.pageSeo.courses.title = 'Chỉ khóa học'
  assert.equal(separateDefaults.pageSeo.home.title, '', 'Default SEO objects must be independent before first save')
  assert.deepEqual(upgraded.home, legacy.home, 'Old page settings preserved')
  assert.deepEqual(upgraded.footer, shared.defaultFooter)
  assert.equal(upgraded.common.name, '')
  const website = load('lib/wi300/website-config.ts')
  const brandBase = load('lib/site-profile/deployment-brand.ts').getDeploymentBrand({ SITE_VARIANT: 'wi300' })
  const configured = structuredClone(upgraded)
  configured.common.name = 'Wi mới'; configured.seo.title = 'SEO mới'; configured.seo.description = 'Mô tả mới'; configured.seo.imageUrl = '/share-new.png'; configured.seo.index = false
  configured.footer.description = '<script>Untrusted text</script>'; configured.footer.contact = 'Liên hệ mới'; configured.footer.copyright = 'Bản quyền mới'
  const publicBrand = website.configuredBrand(brandBase, configured)
  assert.equal(publicBrand.name, 'Wi mới'); assert.equal(publicBrand.seoTitle, 'SEO mới')
  assert.equal(website.websiteMetadata(publicBrand).robots.index, false)
  assert.deepEqual(website.websiteMetadata(publicBrand).twitter.images, ['/share-new.png'])
  assert.equal(website.pageMetadata(publicBrand, 'courses').robots.index, false, 'Unset page SEO inherits website robots')
  configured.pageSeo.courses = { ...shared.defaultPageSeo, title: 'SEO khóa học riêng', description: 'Mô tả khóa học riêng', imageUrl: '/courses-share.png', inheritRobots: false, index: true, follow: false }
  const ownBrand = website.configuredBrand(brandBase, configured)
  assert.deepEqual(website.pageMetadata(ownBrand, 'courses').title, { absolute: 'SEO khóa học riêng' })
  assert.deepEqual(website.pageMetadata(ownBrand, 'courses').robots, { index: true, follow: false })
  assert.deepEqual(website.pageMetadata(ownBrand, 'courses').openGraph.images, ['/courses-share.png'])
  assert.equal(website.pageMetadata(ownBrand, 'projects').description, 'Mô tả mới', 'One page does not overwrite other pages')
  for (const page of website.WEBSITE_PAGES) assert.ok(upgraded.pageSeo[page.id].inheritRobots)
  for (const [route, page] of [['khoa-hoc', 'courses'], ['du-an', 'projects'], ['giang-vien', 'teachers']]) {
    const publicPage = load('app/' + route + '/page.tsx', {
      '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => ownBrand },
      '@/lib/get-session': { getSession: async () => null }, '@/lib/prisma': { __esModule: true, default: {} },
      '@/components/wi300/Wi300Home': { __esModule: true, default: () => null },
      '@/components/wi300/WiProjectDirectory': { __esModule: true, default: () => null },
      '@/lib/wi300/project-service': { readPublicProjects: async () => [] },
    })
    assert.deepEqual(await publicPage.generateMetadata(), website.pageMetadata(ownBrand, page), 'Public route uses published page SEO')
  }
  assert.equal(website.configuredBrand(brandBase, upgraded).seoTitle, brandBase.seoTitle, 'Empty fields preserve current deployment defaults')
  const Footer = load('components/wi300/Wi300Footer.tsx', { 'next/link': { __esModule: true, default: props => React.createElement('a', props) }, 'next/image': { __esModule: true, default: ({ unoptimized, ...props }) => React.createElement('img', props) }, './Wi300BrandContext': { useWi300Brand: () => publicBrand } }).default
  const footerHTML = require('react-dom/server').renderToStaticMarkup(React.createElement(Footer))
  assert.ok(footerHTML.includes('Liên hệ mới')); assert.ok(footerHTML.includes('Bản quyền mới'))
  assert.ok(!footerHTML.includes('<script>')); assert.ok(footerHTML.includes('&lt;script&gt;'))
  const badFooter = structuredClone(configured); badFooter.footer.socials = [{ label: 'Bad', url: 'javascript:alert(1)' }]
  assert.equal(shared.appearanceSchema.safeParse(badFooter).success, false)
  const service = load('lib/wi300/appearance-service.ts', { '@/lib/crm/service': { CrmError } })
  const users = new Map([[0, { role: 'ADMIN' }], [8, { role: 'TEACHER' }]])
  const rows = new Map(); let writes = 0; let queue = Promise.resolve()
  const db = { user: { findUnique: async ({ where }) => users.get(where.id) || null }, systemConfig: {
    findUnique: async ({ where }) => rows.has(where.key) ? { value: structuredClone(rows.get(where.key)) } : null,
    upsert: async ({ where, create, update }) => { writes++; rows.set(where.key, structuredClone(rows.has(where.key) ? update.value : create.value)) },
  }, $executeRaw: async (parts, key) => { assert.match(parts.join(''), /pg_advisory_xact_lock/); assert.match(key, /^wi300:appearance:v1:/) },
    $transaction: callback => { const result = queue.then(() => callback(db)); queue = result.catch(() => {}); return result },
  }
  const key = service.appearanceKey('test-profile')
  let state = await service.readAppearance(db, key)
  assert.equal(writes, 0); assert.equal(state.revision, 0)
  assert.equal(state.published.courses.teacherTotal, 20)
  const settings = structuredClone(shared.defaultAppearance); settings.home.title = 'Tiêu đề nháp'
  state = await service.saveAppearance(db, 0, { action: 'draft', revision: 0, settings }, key)
  assert.equal(state.published.home.title, shared.defaultAppearance.home.title, 'Draft does not publish')
  assert.equal(state.draft.home.title, 'Tiêu đề nháp')
  assert.ok(!JSON.stringify(rows.get(key)).includes('Tiêu đề nháp'), 'DB record never exposes draft plaintext')
  const tampered = structuredClone(rows.get(key)); tampered.tag = Buffer.alloc(16).toString('base64')
  rows.set(service.appearanceKey('tampered'), tampered)
  await assert.rejects(() => service.readAppearance(db, service.appearanceKey('tampered')), 'AEAD detects tampering and scope copying')
  await assert.rejects(() => service.saveAppearance(db, 0, { action: 'publish', revision: 0, settings }, key), error => error.status === 409)
  state = await service.saveAppearance(db, 0, { action: 'publish', revision: 1, settings }, key)
  assert.equal(state.published.home.title, 'Tiêu đề nháp')
  assert.equal(state.previous.home.title, shared.defaultAppearance.home.title)
  state = await service.saveAppearance(db, 0, { action: 'restore', revision: 2 }, key)
  assert.equal(state.draft.home.title, shared.defaultAppearance.home.title)
  assert.equal(state.published.home.title, 'Tiêu đề nháp', 'Restore stages preview and needs a separate publish')
  assert.equal((await service.readAppearance(db, service.appearanceKey('other'))).revision, 0, 'Configuration scope isolated')
  const previewKey = service.appearanceKey('test-profile', { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feat/editor' })
  const previewState = await service.readAppearance(db, previewKey)
  assert.equal(previewState.revision, 0)
  assert.equal(previewState.published.home.title, 'Tiêu đề nháp', 'Preview inherits published values, never production drafts')
  const previewSettings = structuredClone(settings); previewSettings.home.title = 'Chỉ Preview'
  await service.saveAppearance(db, 0, { action: 'publish', revision: 0, settings: previewSettings }, previewKey)
  assert.equal((await service.readAppearance(db, key)).published.home.title, 'Tiêu đề nháp', 'Preview publish does not change production')
  const before = writes
  await assert.rejects(() => service.saveAppearance(db, 8, { action: 'publish', revision: 3, settings }, key), error => error.status === 403)
  users.set(0, { role: 'TEACHER' })
  await assert.rejects(() => service.saveAppearance(db, 0, { action: 'publish', revision: 3, settings }, key), error => error.status === 403)
  users.set(0, { role: 'ADMIN' }); assert.equal(writes, before)
  for (const bad of [NaN, -1, 999]) await assert.rejects(() => service.appearanceAdmin(db, bad), error => error.status === 401)
  for (const url of ['javascript:alert(1)', '//evil.example', 'https://name:secret@example.com', '/\\evil', 'data:image/svg+xml,bad']) {
    const unsafe = structuredClone(settings); unsafe.common.logoUrl = url
    assert.equal(shared.appearanceSchema.safeParse(unsafe).success, false)
  }
  const duplicate = structuredClone(settings); duplicate.home.order = ['hero', 'hero', 'projects', 'start']
  assert.equal(shared.appearanceSchema.safeParse(duplicate).success, false)
  assert.equal(shared.appearanceSchema.safeParse({ ...settings, css: 'arbitrary' }).success, false)
  const invalid = structuredClone(settings); invalid.courses.teacherTotal = 5000
  assert.equal(shared.appearanceSchema.safeParse(invalid).success, false)

  const http = load('lib/crm/http.ts', { './service': { CrmError } })
  let brand = null, session = null; const invalidations = []
  const api = load('app/api/wi300/appearance/route.ts', {
    '@/auth': { auth: async () => session }, '@/lib/prisma': { __esModule: true, default: db },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand },
    '@/lib/wi300/appearance-service': service, '@/lib/crm/http': http, '@/lib/crm/service': { CrmError }, 'next/cache': { revalidatePath: (...args) => invalidations.push(args) },
  })
  assert.equal((await api.GET()).status, 404)
  brand = {}; assert.equal((await api.GET()).status, 401)
  session = { user: { id: '8', role: 'ADMIN' } }; assert.equal((await api.GET()).status, 403, 'JWT role is not authorization')
  session = { user: { id: '0' } }
  const response = await api.GET(); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store')
  const request = (body, origin = 'https://wi300.vn') => new Request('https://wi300.vn/api/wi300/appearance', { method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) })
  assert.equal((await api.PUT(request({ action: 'draft', revision: 0, settings }, 'https://evil.example'))).status, 403)
  assert.equal((await api.PUT(request({ action: 'draft', revision: 0, settings, key: 'other' }))).status, 400)
  assert.equal((await api.PUT(request({ action: 'draft', revision: 0, settings }))).status, 200)
  assert.ok(!invalidations.some(args => args[1] === 'layout'), 'Draft does not invalidate public layout')
  assert.equal((await api.PUT(request({ action: 'publish', revision: 1, settings }))).status, 200)
  assert.ok(invalidations.some(args => args[0] === '/' && args[1] === 'layout'))
  assert.equal((await api.PUT(request({ action: 'draft', revision: 0, settings }))).status, 409)
  const WebsitePage = load('app/tools/wi-website/page.tsx', {
    'next/link': { __esModule: true, default: props => React.createElement('a', props) },
    'next/navigation': { notFound: () => { throw new Error('404') }, redirect: () => { throw new Error('LOGIN') } },
    '@/auth': { auth: async () => session }, '@/lib/prisma': { __esModule: true, default: db },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand },
    '@/lib/wi300/appearance-service': service,
    '@/lib/site-profile/deployment-brand': { getDeploymentBrand: () => brandBase },
    '@/lib/wi300/personal-space': { spaceNavigation: () => [{ id: 'website-admin', items: [{ href: '/tools/wi-appearance', label: 'Cấu hình các trang' }] }] },
    '@/components/wi300/WiAppearanceEditor': { __esModule: true, default: () => null },
    '@/components/wi300/Wi300Home': { __esModule: true, default: async () => ({ props: {} }) },
  }).default
  const pageArgs = section => ({ searchParams: Promise.resolve(section ? { section } : {}) })
  brand = null; await assert.rejects(() => WebsitePage(pageArgs()), /404/)
  brand = {}; session = null; await assert.rejects(() => WebsitePage(pageArgs()), /LOGIN/)
  session = { user: { id: '8', role: 'ADMIN' } }; await assert.rejects(() => WebsitePage(pageArgs()), /404/, 'Fresh role blocks stale admin session')
  session = { user: { id: '0' } }
  assert.equal((await WebsitePage(pageArgs('footer'))).props.initialTab, 'footer')
  assert.equal((await WebsitePage(pageArgs('seo'))).props.mode, 'website')
  await assert.rejects(() => WebsitePage(pageArgs('unknown')), /404/)
  const cardsHTML = require('react-dom/server').renderToStaticMarkup(await WebsitePage(pageArgs()))
  assert.equal((cardsHTML.match(/<h2/g) || []).length, 3)
  assert.ok(cardsHTML.includes('<svg')); assert.ok(!cardsHTML.includes('SEO website →'))
  const Pages = load('app/tools/wi-appearance/page.tsx', {
    'next/link': { __esModule: true, default: props => React.createElement('a', props) },
    'next/navigation': { notFound: () => { throw new Error('404') }, redirect: () => { throw new Error('LOGIN') } },
    '@/auth': { auth: async () => session }, '@/lib/prisma': { __esModule: true, default: db },
    '@/lib/site-profile/deployment-runtime': { getCurrentDeploymentBrand: async () => brand },
    '@/lib/wi300/appearance-service': service, '@/lib/site-profile/deployment-brand': { getDeploymentBrand: () => brandBase },
    '@/components/wi300/WiAppearanceEditor': { __esModule: true, default: () => null },
    '@/components/wi300/Wi300Home': { __esModule: true, default: async () => ({ props: {} }) },
  }).default
  const listHTML = require('react-dom/server').renderToStaticMarkup(await Pages({ searchParams: Promise.resolve({}) }))
  assert.equal((listHTML.match(/<article/g) || []).length, 4)
  assert.ok(listHTML.includes('/tools/wi-appearance?page=teachers'))
  assert.equal((await Pages({ searchParams: Promise.resolve({ page: 'teachers' }) })).props.pageOnly, 'teachers')
  await assert.rejects(() => Pages({ searchParams: Promise.resolve({ page: 'invalid' }) }), /404/)
  session = { user: { id: '8', role: 'ADMIN' } }; await assert.rejects(() => Pages({ searchParams: Promise.resolve({}) }), /404/)
  session = { user: { id: '0' } }
  if (process.env.MANAGEMENT_UI_SNAPSHOT_DIR) { fs.mkdirSync(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, 'website-cards.html'), cardsHTML); fs.writeFileSync(path.join(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, 'pages-list.html'), listHTML) }

  const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.vn/tools/wi-appearance' })
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
  const image = { __esModule: true, default: ({ unoptimized, ...props }) => React.createElement('img', props) }
  let refreshes = 0, fail = true, lastBody
  const Editor = load('components/wi300/WiAppearanceEditor.tsx', {
    'next/image': image, 'next/navigation': { useRouter: () => ({ refresh: () => refreshes++ }) },
    './WiAppearancePreview': { __esModule: true, default: ({ settings, tab, width }) => React.createElement('div', { 'data-preview': tab, 'data-width': width }, settings.home.title) },
  }).default
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  const savedFetch = global.fetch
  global.fetch = async (_, options) => {
    lastBody = JSON.parse(options.body)
    if (fail) return { ok: false, json: async () => ({ error: 'Đã có người khác sửa. Tải lại.' }) }
    const result = await service.saveAppearance(db, 0, lastBody, service.appearanceKey('editor'))
    return { ok: true, json: async () => result }
  }
  const button = text => [...document.querySelectorAll('button')].find(item => item.textContent === text)
  try {
    const initial = await service.readAppearance(db, service.appearanceKey('editor'))
    await React.act(async () => root.render(React.createElement(Editor, { initial, previewData: {} })))
    assert.equal(document.querySelectorAll('[role="tab"]').length, 7)
    await React.act(async () => button('Trang chủ').click())
    const title = [...document.querySelectorAll('label')].find(item => item.textContent.startsWith('Tiêu đề')).querySelector('textarea')
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(title, 'Tiêu đề từ editor')
      title.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    assert.equal(document.querySelector('[data-preview]').textContent, 'Tiêu đề từ editor', 'Preview responds to unsaved edits')
    await React.act(async () => button('Lưu bản nháp').click())
    assert.match(document.querySelector('[role="alert"]').textContent, /Tải lại/)
    assert.equal(title.value, 'Tiêu đề từ editor', 'Failure preserves typed draft')
    fail = false; await React.act(async () => button('Lưu bản nháp').click())
    assert.equal(lastBody.action, 'draft'); assert.equal(refreshes, 0)
    assert.equal((await service.readAppearance(db, service.appearanceKey('editor'))).published.home.title, shared.defaultAppearance.home.title)
    await React.act(async () => button('Áp dụng lên website').click())
    assert.equal(refreshes, 1)
    assert.equal((await service.readAppearance(db, service.appearanceKey('editor'))).published.home.title, 'Tiêu đề từ editor')
    await React.act(async () => button('Khôi phục bản trước').click())
    assert.equal(document.querySelector('[data-preview]').textContent, shared.defaultAppearance.home.title)
    assert.equal((await service.readAppearance(db, service.appearanceKey('editor'))).published.home.title, 'Tiêu đề từ editor')
    await React.act(async () => button('Điện thoại').click())
    assert.equal(document.querySelector('[data-preview]').getAttribute('data-width'), '390')
    await React.act(async () => button('Giảng viên').click())
    assert.ok(document.querySelector('fieldset').textContent.includes('Lọc lĩnh vực giảng dạy'))
    assert.ok(!document.querySelector('fieldset').textContent.includes('Lọc số khóa'))
    await React.act(async () => button('SEO website').click())
    const seoInput = [...document.querySelectorAll('label')].find(item => item.textContent === 'Tiêu đề SEO mặc định').querySelector('input')
    await React.act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(seoInput, 'SEO từ editor'); seoInput.dispatchEvent(new window.Event('input', { bubbles: true })) })
    await React.act(async () => button('Footer').click())
    await React.act(async () => button('Thêm nhóm liên kết').click())
    assert.equal(document.querySelectorAll('section').length > 2, true)
    await React.act(async () => button('Áp dụng lên website').click())
    const published = (await service.readAppearance(db, service.appearanceKey('editor'))).published
    assert.equal(published.seo.title, 'SEO từ editor'); assert.equal(published.footer.groups.length, 3)
    if (process.env.MANAGEMENT_UI_SNAPSHOT_DIR) { fs.mkdirSync(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, 'website-footer.html'), document.getElementById('root').innerHTML) }
    const current = await service.readAppearance(db, service.appearanceKey('editor'))
    await React.act(async () => root.render(React.createElement(Editor, { initial: current, previewData: { brand: brandBase }, mode: 'pages', initialTab: 'courses', pageOnly: 'courses' })))
    assert.equal(document.querySelectorAll('[role="tab"]').length, 2)
    await React.act(async () => button('SEO').click())
    assert.equal(document.querySelector('[aria-label="Cài đặt trang"]').hidden, true)
    const ownTitle = [...document.querySelectorAll('label')].find(item => item.textContent === 'Tiêu đề SEO của trang').querySelector('input')
    await React.act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(ownTitle, 'SEO qua giao diện'); ownTitle.dispatchEvent(new window.Event('input', { bubbles: true })) })
    await React.act(async () => button('Lưu bản nháp').click())
    assert.equal((await service.readAppearance(db, service.appearanceKey('editor'))).published.pageSeo.courses.title, '', 'SEO draft stays private')
    await React.act(async () => button('Nội dung & giao diện').click())
    await React.act(async () => button('SEO').click())
    assert.equal(document.querySelector('[aria-label="SEO riêng của trang"] input').value, 'SEO qua giao diện', 'Switching panels retains SEO edits')
    await React.act(async () => button('Áp dụng lên website').click())
    const pagePublished = (await service.readAppearance(db, service.appearanceKey('editor'))).published
    assert.equal(pagePublished.pageSeo.courses.title, 'SEO qua giao diện')
    assert.equal(pagePublished.pageSeo.home.title, '')
    if (process.env.MANAGEMENT_UI_SNAPSHOT_DIR) fs.writeFileSync(path.join(process.env.MANAGEMENT_UI_SNAPSHOT_DIR, 'page-seo.html'), document.getElementById('root').innerHTML)
  } finally { await React.act(async () => root.unmount()); dom.window.close(); global.fetch = savedFetch }
  console.log('Wi appearance: schema/URL limits, scope, fresh admin, draft/publish/restore, stale revision, CSRF, private GET, UI preview/save/retry and device selectors passed (isolated DB/DOM).')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
