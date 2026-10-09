/* Kiểm tra tên miền hệ thống riêng bằng bộ định tuyến thật, không gọi hoặc ghi database. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const { NextRequest } = require('next/server')
const root = path.resolve(__dirname, '..')
const originalHosts = process.env.PLATFORM_HOSTS
let domainReads = 0
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks++ }

// Nạp TypeScript thật; cô lập đăng nhập và database để kiểm tra ranh giới định tuyến.
function load(relative, overrides = {}) {
  const module = { exports: {} }
  const source = fs.readFileSync(path.join(root, relative), 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'exports', 'module', js)(name => {
    if (name in overrides) return overrides[name]
    return require(name)
  }, module.exports, module)
  return module.exports
}

async function run() {
  delete process.env.PLATFORM_HOSTS
  const shared = load('lib/website/domain-shared.ts')
  ok(shared.isPlatformHost('giautoandien.io.vn'), 'Original platform remains available')
  ok(shared.isPlatformHost('preview.vercel.app'), 'Vercel preview remains available')
  ok(!shared.isPlatformHost('www.wi300.vn'), 'New domain requires explicit project configuration')
  process.env.PLATFORM_HOSTS = ' wi300.vn, WWW.WI300.VN. '
  for (const host of ['wi300.vn', 'www.wi300.vn']) {
    ok(shared.isPlatformHost(host), 'Configured platform: ' + host)
    assert.throws(() => shared.normalizeHostname(host))
    checks++
  }
  for (const host of ['other.wi300.vn', 'wi300.vn.evil.vn', 'brk.io.vn']) {
    ok(!shared.isPlatformHost(host), 'No implicit platform grant: ' + host)
  }
  const proxy = load('proxy.ts', {
    'next-auth': { default: () => ({ auth: handler => handler }) },
    './auth.config': { authConfig: {} },
    '@/lib/website/domain-shared': shared,
    '@/lib/website/domains': { activeDomain: async () => { domainReads++; return null } },
    '@/lib/prisma': { default: {} },
    '@/lib/site-profile/config': { courseBelongsToProfile: () => false },
    '@/lib/website/applications': { applicationKeys: [] },
  }).default
  const request = (host, route, role) => {
    const req = new NextRequest('https://' + host + route, { headers: { host } })
    if (role) req.auth = { user: { role } }
    return req
  }
  for (const route of ['/', '/login', '/my-space', '/khoa-hoc', '/tools/crm']) {
    const response = await proxy(request('www.wi300.vn', route), {})
    ok(response.headers.get('x-middleware-next') === '1', 'Full platform route: ' + route)
    ok(!response.headers.has('x-middleware-rewrite'), 'No profile-site rewrite: ' + route)
  }
  ok(domainReads === 0, 'Configured platform does not need a custom-domain database record')
  ok((await proxy(request('www.wi300.vn', '/admin'), {})).status === 403, 'Anonymous admin access stays blocked')
  ok((await proxy(request('www.wi300.vn', '/api/admin/backup', 'STUDENT'), {})).status === 403, 'Student admin API stays blocked')
  ok((await proxy(request('www.wi300.vn', '/admin', 'ADMIN'), {})).headers.get('x-middleware-next') === '1', 'Existing admin role still works')
  ok((await proxy(request('brk.io.vn', '/'), {})).status === 503, 'Unverified customer domain stays blocked')
  const handlers = { GET: async () => new Response('platform-auth'), POST: async () => new Response('platform-auth') }
  const auth = load('app/api/auth/[...nextauth]/route.ts', {
    '@/auth': { handlers, authOptions: {} },
    '@auth/core': { Auth: () => { throw Error('Unexpected tenant auth') } },
    '@/lib/website/domain-shared': shared,
    '@/lib/website/domains': { activeDomain: async () => null },
  })
  ok(await (await auth.GET(request('www.wi300.vn', '/api/auth/session'))).text() === 'platform-auth', 'WI300 uses normal platform login handler')
  ok((await auth.GET(request('brk.io.vn', '/api/auth/session'))).status === 403, 'Unverified host cannot use platform auth')
  process.env.PLATFORM_HOSTS = 'https://wi300.vn,*.wi300.vn,wi300.vn/path,wi300.vn:443'
  ok(!shared.isPlatformHost('wi300.vn'), 'Reject malformed configuration and wildcard grants')
  console.log(`Platform hosts: ${checks} checks passed (no database or network).`)
}
run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => {
  if (originalHosts === undefined) delete process.env.PLATFORM_HOSTS
  else process.env.PLATFORM_HOSTS = originalHosts
})
