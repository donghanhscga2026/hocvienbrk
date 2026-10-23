/* Kiểm chứng các bất biến bảo mật P0:
   1) CSP bắt buộc không còn wildcard https: ở script-src; CSP Report-Only
      siết chặt (không unsafe-inline, không https:) và trỏ về /api/csp-report.
   2) proxy.ts chặn cứng các đường dẫn dò quét (dotfile, file sao lưu) bằng
      hàm isBlockedProbePath, chạy trước mọi logic định tuyến theo domain.
   3) /api/csp-report được phép trên domain riêng (domainRoute = system)
      trong khi các route /api lạ vẫn bị deny.
   4) vercel.json không còn mật khẩu phòng Zoom trong URL chuyển hướng. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }

function loadModule(relative) {
  const file = path.resolve(root, relative)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}

function parseCsp(value) {
  const map = new Map()
  for (const part of value.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const [name, ...tokens] = trimmed.split(/\s+/)
    map.set(name, tokens)
  }
  return map
}

async function run() {
  // 1) CSP trong next.config.ts
  const nextConfig = loadModule('next.config.ts').default
  const headerSets = await nextConfig.headers()
  const mainSet = headerSets.find((entry) => entry.source === '/:path*')
  ok(mainSet, 'Có bộ header cho /:path*')
  const headers = new Map(mainSet.headers.map((h) => [h.key, h.value]))
  const enforced = parseCsp(headers.get('Content-Security-Policy') || '')
  const scriptTokens = enforced.get('script-src') || []
  ok(scriptTokens.includes("'self'"), 'CSP bắt buộc: script-src có self')
  ok(!scriptTokens.includes('https:'), 'CSP bắt buộc: script-src không còn wildcard https:')
  ok(scriptTokens.includes('https://www.youtube.com'), 'CSP bắt buộc: script-src cho phép YouTube IFrame API')
  const reportOnlyRaw = headers.get('Content-Security-Policy-Report-Only')
  ok(reportOnlyRaw, 'Có header CSP Report-Only')
  const reportOnly = parseCsp(reportOnlyRaw || '')
  const roScript = reportOnly.get('script-src') || []
  ok(!roScript.includes("'unsafe-inline'"), 'CSP Report-Only: script-src không có unsafe-inline')
  ok(!roScript.includes('https:'), 'CSP Report-Only: script-src không có wildcard https:')
  ok((reportOnly.get('report-uri') || []).includes('/api/csp-report'), 'CSP Report-Only: report-uri trỏ /api/csp-report')

  // 2) Hàm chặn đường dẫn dò quét trong proxy.ts (chạy thử hàm thật)
  const proxySource = fs.readFileSync(path.join(root, 'proxy.ts'), 'utf8')
  const regionStart = proxySource.indexOf('const PROBE_FILE_EXTENSIONS')
  const fnStart = proxySource.indexOf('export function isBlockedProbePath')
  ok(regionStart >= 0 && fnStart > regionStart, 'proxy.ts có isBlockedProbePath và bảng đuôi file dò quét')
  const fnEnd = proxySource.indexOf('\n}\n', fnStart)
  ok(fnEnd > fnStart, 'Đọc được thân hàm isBlockedProbePath')
  const region = proxySource.slice(regionStart, fnEnd + 3).replace('export function', 'function')
  const regionJs = ts.transpileModule(region, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const isBlockedProbePath = new Function(`${regionJs}; return isBlockedProbePath`)()
  for (const p of ['/.env', '/.env.local', '/.git/config', '/.git', '/foo/.hidden', '/backup.sql', '/db.bak', '/site.log', '/wp-config.php.bak']) {
    ok(isBlockedProbePath(p) === true, 'Chặn đường dò quét: ' + p)
  }
  for (const p of ['/', '/khoa-hoc/ABC', '/courses/x/learn', '/.well-known/security.txt', '/.well-known/giautoandien-domain/verify', '/login', '/api/csp-report', '/du-an/du-an-1']) {
    ok(isBlockedProbePath(p) === false, 'Không chặn nhầm đường hợp lệ: ' + p)
  }
  const guardIndex = proxySource.indexOf('if(isBlockedProbePath(path))')
  const hostIndex = proxySource.indexOf('if(isPlatformHost(hostname))')
  ok(guardIndex >= 0 && hostIndex > guardIndex, 'proxy.ts: lớp chặn dò quét chạy trước phân nhánh theo domain')

  // 3) domainRoute cho /api/csp-report
  const shared = loadModule('lib/website/domain-shared.ts')
  const off = { courses: false, crm: false, affiliate: false }
  ok(shared.domainRoute('/api/csp-report', off) === 'system', 'domainRoute: /api/csp-report là system trên domain riêng')
  ok(shared.domainRoute('/api/new-module', off) === 'deny', 'domainRoute: /api lạ vẫn deny')

  // 4) vercel.json không còn mật khẩu Zoom
  const vercelRaw = fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')
  ok(!vercelRaw.includes('pwd='), 'vercel.json không chứa pwd=')
  const vercel = JSON.parse(vercelRaw)
  const zoomRedirect = (vercel.redirects || []).find((r) => (r.has || []).some((h) => h.value === 'zoom.giautoandien.io.vn'))
  ok(zoomRedirect, 'vercel.json vẫn giữ redirect cho zoom.giautoandien.io.vn')
  ok(zoomRedirect.destination === 'https://us06web.zoom.us/j/9789413193', 'Redirect Zoom trỏ phòng họp, không kèm mật khẩu')

  // 5) Route nhận báo cáo CSP tồn tại và trả 204
  const routeSource = fs.readFileSync(path.join(root, 'app/api/csp-report/route.ts'), 'utf8')
  ok(routeSource.includes('status: 204'), 'Route /api/csp-report trả 204')
  ok(routeSource.includes('MAX_BODY_CHARS'), 'Route /api/csp-report có giới hạn độ dài log')

  console.log(`test-security-p0: PASS (${checks} kiểm chứng)`)
}

run().catch((error) => { console.error('test-security-p0: FAIL'); console.error(error); process.exit(1) })
