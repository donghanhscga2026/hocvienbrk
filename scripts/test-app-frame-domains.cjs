// Isolated API, proxy and browser fixtures. No live database writes or network requests.
const assert = require('node:assert/strict'), React = require('react'), { JSDOM } = require('jsdom')
const load = require('./helpers/load-ts.cjs')
async function run() {
  const shared = load('lib/wi300/app-frame-domains.ts')
  assert.equal(shared.appFrameOrigin('https://APP.Example.com/tool?id=1'), 'https://app.example.com')
  assert.equal(shared.appFrameOrigin('app.example.com'), 'https://app.example.com')
  for (const value of ['http://app.example.com', 'https://*.example.com', 'https://x.example.com;script-src *', 'https://user:pass@app.example.com', 'https://127.0.0.1', 'localhost', 'https://app.internal', 'https://app.example.com:444', '//evil.example.com', 'https://good.example.com\\evil']) assert.throws(() => shared.appFrameOrigin(value), value)
  assert.notEqual(shared.appFrameKey({}), shared.appFrameKey({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feature' }))
  assert.notEqual(shared.appFrameKey({ SITE_PROFILE_KEY: 'one' }), shared.appFrameKey({ SITE_PROFILE_KEY: 'two' }))
  const policy = "default-src 'self'; script-src 'self'; frame-src 'self'; frame-ancestors 'self'"
  assert.equal(shared.extendFramePolicy(policy, ['https://app.example.com']), "default-src 'self'; script-src 'self'; frame-src 'self' https://app.example.com; frame-ancestors 'self'")
  for (const path of ['/api/admin/app-frame-domains', '/_next/static/a.js', '/sw.js', '/image.png']) assert.equal(shared.isAppFrameDocument(path), false)
  class CrmError extends Error { constructor(message, status) { super(message); this.status = status } }
  const originalEnv = { variant: process.env.SITE_VARIANT, vercel: process.env.VERCEL_ENV, ref: process.env.VERCEL_GIT_COMMIT_REF, profile: process.env.SITE_PROFILE_KEY }
  process.env.SITE_VARIANT = 'wi300'; delete process.env.VERCEL_ENV; delete process.env.SITE_PROFILE_KEY
  let actor = { id: 0, role: 'ADMIN' }, writes = 0, reads = 0, unavailable = false
  const records = new Map()
  const db = { systemConfig: { findUnique: async ({ where }) => { reads++; if (unavailable) throw Error('offline'); return records.has(where.key) ? { value: records.get(where.key) } : null }, upsert: async ({ where, update }) => { writes++; records.set(where.key, update.value) } }, $executeRaw: async () => {} }
  db.$transaction = async fn => fn(db)
  const mocks = { '@/lib/prisma': { __esModule: true, default: db }, '@/lib/course-page/permissions': { courseEditorActor: async () => { if (!actor) throw new CrmError('Sign in', 401); return actor } }, '@/lib/crm/service': { CrmError } }
  const api = load('app/api/admin/app-frame-domains/route.ts', mocks)
  const request = (body, origin = 'https://wi300.test') => new Request('https://wi300.test/api/admin/app-frame-domains', { method: 'PUT', headers: { origin }, body: JSON.stringify(body) })
  try {
    actor = null; assert.equal((await api.GET()).status, 401)
    actor = { id: 2, role: 'TEACHER' }; assert.equal((await api.PUT(request({ revision: 0, origins: [] }))).status, 403)
    actor = { id: 0, role: 'ADMIN' }
    assert.equal((await api.PUT(request({ revision: 0, origins: [] }, 'https://evil.example'))).status, 403)
    assert.equal((await api.PUT(request({ revision: 0, origins: ['https://*.example.com'] }))).status, 400)
    assert.equal(writes, 0)
    let response = await api.PUT(request({ revision: 0, origins: ['app.example.com', 'https://app.example.com/path', ...shared.builtInAppOrigins] }))
    assert.equal(response.status, 200)
    let saved = await response.json(); assert.deepEqual(saved.origins, ['https://app.example.com']); assert.equal(saved.revision, 1)
    assert.equal((await api.PUT(request({ revision: 0, origins: [] }))).status, 409); assert.equal(writes, 1)
    response = await api.GET(); assert.equal(response.headers.get('cache-control'), 'private, no-store')
    process.env.VERCEL_ENV = 'preview'; process.env.VERCEL_GIT_COMMIT_REF = 'isolated'
    const preview = await (await api.GET()).json(); assert.deepEqual(preview.origins, saved.origins); assert.equal(preview.revision, 0)
    await api.PUT(request({ revision: 0, origins: ['preview.example.com'] }))
    assert.deepEqual(records.get(shared.appFrameKey({})).origins, ['https://app.example.com'], 'Preview writes never change live policy')
    delete process.env.VERCEL_ENV

    // Runtime policies use the stored exact origins without rebuilding next.config.
    const runtime = load('lib/wi300/app-frame-response.ts', mocks)
    const previousNow = Date.now; let now = previousNow(); Date.now = () => now
    try {
      let res = await runtime.appFrameResponse(new Response('ok'), '/tools/courses/new')
      for (const key of ['Content-Security-Policy', 'Content-Security-Policy-Report-Only']) assert.ok(res.headers.get(key).split(';').find(p => p.trim().startsWith('frame-src ')).includes('https://app.example.com'))
      assert.ok(res.headers.get('Content-Security-Policy').includes("frame-ancestors 'self'"))
      const lastReads = reads
      await runtime.appFrameResponse(new Response('ok'), '/san-pham/APP/su-dung'); assert.equal(reads, lastReads, 'Cache avoids a database lookup on every navigation')
      records.set(shared.appFrameKey(), { revision: 2, origins: [] }); now += 31_000
      res = await runtime.appFrameResponse(new Response('ok'), '/san-pham/APP/su-dung'); assert.ok(!res.headers.get('Content-Security-Policy').includes('https://app.example.com'), 'Removed domains stop being allowed after bounded cache expiry')
      unavailable = true; now += 31_000
      res = await runtime.appFrameResponse(new Response('ok'), '/san-pham/APP/su-dung'); assert.ok(!res.headers.get('Content-Security-Policy').includes('https://app.example.com')); unavailable = false
      res = await runtime.appFrameResponse(new Response('ok'), '/'); assert.equal(res.headers.get('cache-control'), null, 'Public page caching remains unchanged')
      const beforeSkip = reads
      await runtime.appFrameResponse(new Response('ok'), '/api/admin/app-frame-domains'); assert.equal(reads, beforeSkip)
      process.env.SITE_VARIANT = 'legacy'; res = await runtime.appFrameResponse(new Response('ok'), '/tools/courses/new'); assert.equal(res.headers.get('Content-Security-Policy'), null); assert.equal(reads, beforeSkip)
      assert.equal((await api.GET()).status, 404)
    } finally { Date.now = previousNow }
    process.env.SITE_VARIANT = 'wi300'
    // Actual proxy returns runtime headers and retains existing affiliate/route headers.
    const { NextRequest } = require('next/server')
    const proxy = load('proxy.ts', { ...mocks, 'next-auth': { __esModule: true, default: () => ({ auth: fn => fn }) }, './auth.config': { authConfig: {} }, '@/lib/website/domains': {}, '@/lib/website/domain-shared': { requestHostname: x => x, isPlatformHost: () => true }, '@/lib/site-profile/config': {}, '@/lib/site-profile/deployment-brand': {}, '@/lib/wi300/appearance-service': {} }).default
    records.set(shared.appFrameKey(), { revision: 3, origins: ['https://fresh.example.com'] })
    const proxied = await proxy(new NextRequest('https://wi300.test/tools/products?ref=TEST', { headers: { host: 'wi300.test' } }), {})
    assert.ok(proxied.headers.get('Content-Security-Policy').includes('https://fresh.example.com'))
    assert.ok(proxied.cookies.get('aff_ref')); assert.equal(proxied.headers.get('x-middleware-request-x-wi300-pathname'), '/tools/products')

    const dom = new JSDOM('<div id="root"></div>', { url: 'https://wi300.test/tools/settings/app-frame-domains' })
    global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
    Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
    const originalFetch = global.fetch; let failSave = true, payload
    global.fetch = async (url, init) => { if (!init?.method) return { ok: true, json: async () => ({ revision: 1, origins: [], builtIn: shared.builtInAppOrigins }) }; payload = JSON.parse(init.body); return { ok: !failSave, json: async () => failSave ? { error: 'Save conflict fixture' } : { ...payload, revision: 2, builtIn: shared.builtInAppOrigins } } }
    const Component = load('components/admin/settings/AppFrameDomains.tsx', { 'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }, '@/components/layout/MainHeader': { __esModule: true, default: () => null } }).default
    const root = require('react-dom/client').createRoot(document.getElementById('root'))
    try {
      await React.act(async () => root.render(React.createElement(Component)))
      await React.act(async () => { const input = document.querySelector('input'); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'https://new.example.com/tool'); input.dispatchEvent(new window.Event('input', { bubbles: true })) })
      const click = async text => React.act(async () => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text).click())
      await click('+ Thêm tên miền'); assert.ok(document.body.textContent.includes('https://new.example.com'))
      await click('Lưu danh sách'); assert.deepEqual(payload.origins, ['https://new.example.com']); assert.ok(document.querySelector('[role="alert"]').textContent.includes('conflict')); assert.ok(document.querySelector('[aria-label="Gỡ https://new.example.com"]'), 'Failed saves retain draft')
      failSave = false; await click('Lưu danh sách'); assert.ok(document.querySelector('[role="status"]').textContent.includes('Đã lưu'))
    } finally { await React.act(async () => root.unmount()); global.fetch = originalFetch; dom.window.close() }
  } finally {
    for (const [name, value] of Object.entries({ SITE_VARIANT: originalEnv.variant, VERCEL_ENV: originalEnv.vercel, VERCEL_GIT_COMMIT_REF: originalEnv.ref, SITE_PROFILE_KEY: originalEnv.profile })) { if (value == null) delete process.env[name]; else process.env[name] = value }
  }
  console.log('App frame domains: admin/CSRF/version guards, origin validation, preview isolation, runtime CSP updates/removal/fallback, cache bounds, proxy routing and retained UI drafts passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
