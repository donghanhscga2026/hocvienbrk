/* Kiểm chứng Care Engine GĐ4 — kênh Zalo qua Care Bridge:
   1) HMAC: ký rồi xác thực khớp; sai secret / sửa body / thiếu header /
      timestamp quá 5 phút (cả quá khứ lẫn tương lai) đều bị từ chối
      đúng lý do; trong cửa sổ thì qua.
   2) Idempotency: khóa ổn định theo luật/học viên/khóa/ngày, lần thử
      lại có hậu tố attempt, luật trống → 'manual', khóa trống → 0.
   3) Chuyển trạng thái lệnh: đủ các cạnh hợp lệ của vòng đời, trạng
      thái cuối (SENT/FAILED/CANCELLED) không chuyển đi đâu được.
   4) decideClaim: tắt khẩn cấp → giữ toàn bộ; chạm trần ngày → giữ;
      gần trần → allowed bị cắt theo phần còn lại; bình thường → limit.
   5) isBridgeOnline: nhịp tim mới → trực tuyến; cũ / trống / sai dạng
      → ngoại tuyến.
   6) Kiểm tra nguồn: schema có 2 model + enum + khóa unique; migration
      tồn tại; 4 route bridge đều qua authorizeBridgeRequest (503 khi
      chưa đặt secret); CRM có tab Kênh Zalo + nút Gửi qua Zalo. */
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

const bridge = loadModule('lib/care/bridge.ts')
const {
  careBridgeSignature, verifyCareBridgeSignature, buildZaloIdempotencyKey,
  canTransitionCommand, decideClaim, isBridgeOnline,
  CARE_BRIDGE_DAILY_LIMIT,
} = bridge

/* 1) HMAC */
const secret = 'test-secret-gd4'
const nowMs = 1_730_000_000_000
const body = JSON.stringify({ limit: 5 })
const tsOk = String(nowMs)
const sigOk = careBridgeSignature(secret, tsOk, body)
ok(verifyCareBridgeSignature({ secret, timestamp: tsOk, signature: sigOk, rawBody: body, nowMs }).ok === true, 'HMAC đúng phải qua')
ok(verifyCareBridgeSignature({ secret: 'sai-secret', timestamp: tsOk, signature: sigOk, rawBody: body, nowMs }).reason === 'mismatch', 'sai secret → mismatch')
ok(verifyCareBridgeSignature({ secret, timestamp: tsOk, signature: sigOk, rawBody: body + ' ', nowMs }).reason === 'mismatch', 'body bị sửa → mismatch')
ok(verifyCareBridgeSignature({ secret, timestamp: null, signature: sigOk, rawBody: body, nowMs }).reason === 'missing', 'thiếu timestamp → missing')
ok(verifyCareBridgeSignature({ secret, timestamp: tsOk, signature: null, rawBody: body, nowMs }).reason === 'missing', 'thiếu chữ ký → missing')
ok(verifyCareBridgeSignature({ secret, timestamp: 'abc', signature: sigOk, rawBody: body, nowMs }).reason === 'missing', 'timestamp không phải số → missing')
const tsOld = String(nowMs - 6 * 60 * 1000)
ok(verifyCareBridgeSignature({ secret, timestamp: tsOld, signature: careBridgeSignature(secret, tsOld, body), rawBody: body, nowMs }).reason === 'expired', 'timestamp quá 5 phút trong quá khứ → expired')
const tsFuture = String(nowMs + 6 * 60 * 1000)
ok(verifyCareBridgeSignature({ secret, timestamp: tsFuture, signature: careBridgeSignature(secret, tsFuture, body), rawBody: body, nowMs }).reason === 'expired', 'timestamp quá 5 phút trong tương lai → expired')
const tsEdge = String(nowMs - 4 * 60 * 1000)
ok(verifyCareBridgeSignature({ secret, timestamp: tsEdge, signature: careBridgeSignature(secret, tsEdge, body), rawBody: body, nowMs }).ok === true, 'timestamp trong cửa sổ 5 phút phải qua')
ok(verifyCareBridgeSignature({ secret, timestamp: tsOk, signature: sigOk.slice(0, 10), rawBody: body, nowMs }).reason === 'mismatch', 'chữ ký bị cắt ngắn → mismatch (không vỡ timingSafeEqual)')

/* 2) Idempotency */
const key1 = buildZaloIdempotencyKey({ ruleId: 'R2', userId: 42, courseId: 38, vnDate: '2026-11-07' })
ok(key1 === 'care-zalo:R2:42:38:2026-11-07', 'khóa idempotency đúng định dạng')
ok(buildZaloIdempotencyKey({ ruleId: 'R2', userId: 42, courseId: 38, vnDate: '2026-11-07' }) === key1, 'khóa idempotency ổn định khi gọi lại')
ok(buildZaloIdempotencyKey({ ruleId: 'R2', userId: 42, courseId: 38, vnDate: '2026-11-07', attempt: 2 }) === key1 + ':try2', 'lần thử lại có hậu tố :try2')
ok(buildZaloIdempotencyKey({ ruleId: 'R2', userId: 42, courseId: 38, vnDate: '2026-11-07', attempt: 1 }) === key1, 'attempt=1 không thêm hậu tố')
ok(buildZaloIdempotencyKey({ ruleId: null, userId: 7, courseId: null, vnDate: '2026-11-07' }) === 'care-zalo:manual:7:0:2026-11-07', 'luật trống → manual, khóa trống → 0')
ok(buildZaloIdempotencyKey({ ruleId: 'R1', userId: 42, courseId: 38, vnDate: '2026-11-08' }) !== key1, 'khác ngày → khác khóa')

/* 3) Chuyển trạng thái */
const valid = [
  ['QUEUED', 'IN_FLIGHT'], ['QUEUED', 'HELD'], ['QUEUED', 'CANCELLED'],
  ['HELD', 'QUEUED'], ['HELD', 'CANCELLED'],
  ['IN_FLIGHT', 'SENT'], ['IN_FLIGHT', 'FAILED'], ['IN_FLIGHT', 'QUEUED'], ['IN_FLIGHT', 'CANCELLED'],
]
for (const [from, to] of valid) ok(canTransitionCommand(from, to) === true, `chuyển ${from} → ${to} phải hợp lệ`)
const invalid = [
  ['QUEUED', 'SENT'], ['QUEUED', 'FAILED'], ['QUEUED', 'QUEUED'],
  ['HELD', 'IN_FLIGHT'], ['HELD', 'SENT'],
  ['SENT', 'QUEUED'], ['SENT', 'CANCELLED'], ['FAILED', 'QUEUED'], ['FAILED', 'SENT'], ['CANCELLED', 'QUEUED'],
  ['IN_FLIGHT', 'HELD'], ['IN_FLIGHT', 'IN_FLIGHT'],
]
for (const [from, to] of invalid) ok(canTransitionCommand(from, to) === false, `chuyển ${from} → ${to} phải bị chặn`)

/* 4) decideClaim */
let d = decideClaim({ killSwitch: true, sentOrInFlightToday: 0, requestedLimit: 10 })
ok(d.held === true && d.reason === 'kill-switch' && d.allowed === 0, 'tắt khẩn cấp → giữ toàn bộ')
d = decideClaim({ killSwitch: false, sentOrInFlightToday: CARE_BRIDGE_DAILY_LIMIT, requestedLimit: 10 })
ok(d.held === true && d.reason === 'daily-cap' && d.allowed === 0, 'chạm trần ngày → giữ')
d = decideClaim({ killSwitch: false, sentOrInFlightToday: CARE_BRIDGE_DAILY_LIMIT - 3, requestedLimit: 10 })
ok(d.held === false && d.allowed === 3, 'gần trần → allowed cắt theo phần còn lại')
d = decideClaim({ killSwitch: false, sentOrInFlightToday: 5, requestedLimit: 10 })
ok(d.held === false && d.reason === null && d.allowed === 10, 'bình thường → lấy đúng limit yêu cầu')
d = decideClaim({ killSwitch: false, sentOrInFlightToday: 0, requestedLimit: 0 })
ok(d.allowed === 1, 'limit yêu cầu 0 → tối thiểu 1')
d = decideClaim({ killSwitch: false, sentOrInFlightToday: 40, requestedLimit: 10, dailyLimit: 50 })
ok(d.allowed === 10, 'trần ngày tùy chỉnh 50, đã 40 → còn 10')
d = decideClaim({ killSwitch: false, sentOrInFlightToday: 49, requestedLimit: 10, dailyLimit: 50 })
ok(d.allowed === 1, 'trần ngày tùy chỉnh 50, đã 49 → còn 1')

/* 5) isBridgeOnline */
const now = new Date(nowMs)
ok(isBridgeOnline(new Date(nowMs - 60_000), now) === true, 'nhịp tim 1 phút trước → trực tuyến')
ok(isBridgeOnline(new Date(nowMs - 10 * 60_000), now) === false, 'nhịp tim 10 phút trước → ngoại tuyến')
ok(isBridgeOnline(null, now) === false, 'chưa có nhịp tim → ngoại tuyến')
ok(isBridgeOnline('không-phải-ngày', now) === false, 'nhịp tim sai dạng → ngoại tuyến')
ok(isBridgeOnline(new Date(nowMs - 60_000).toISOString(), now) === true, 'nhịp tim dạng ISO string vẫn đọc được')

/* 6) Kiểm tra nguồn */
const read = (relative) => fs.readFileSync(path.resolve(root, relative), 'utf8')
const schema = read('prisma/schema.prisma')
ok(schema.includes('model ZaloCareCommand') && schema.includes('model ZaloCareInbound'), 'schema có 2 model Zalo GĐ4')
ok(schema.includes('ZaloCareCommandStatus') && schema.includes('idempotencyKey String') && schema.includes('@unique'), 'schema có enum trạng thái + idempotencyKey unique')
ok(schema.includes('zaloMsgId    String   @unique') || schema.includes('zaloMsgId') && schema.includes('@unique'), 'schema có zaloMsgId unique')
const migrationDir = path.resolve(root, 'prisma/migrations')
const gd4Migration = fs.readdirSync(migrationDir).find((name) => name.includes('care_gd4_zalo_bridge'))
ok(Boolean(gd4Migration), 'có thư mục migration GĐ4')
if (gd4Migration) {
  const sql = read('prisma/migrations/' + gd4Migration + '/migration.sql')
  ok(sql.includes('CREATE TABLE "ZaloCareCommand"') && sql.includes('CREATE TABLE "ZaloCareInbound"'), 'migration tạo đủ 2 bảng')
  ok(sql.includes('GRANT ALL PRIVILEGES ON TABLE public."ZaloCareCommand"'), 'migration có GRANT theo AGENTS.md mục G')
}
for (const route of ['commands/claim', 'commands/report', 'inbound', 'heartbeat']) {
  const source = read('app/api/care-bridge/' + route + '/route.ts')
  ok(source.includes('authorizeBridgeRequest'), `route bridge ${route} đi qua xác thực HMAC`)
}
ok(read('lib/care/bridge-http.ts').includes('CARE_BRIDGE_SECRET') && read('lib/care/bridge-http.ts').includes('503'), 'chưa đặt CARE_BRIDGE_SECRET → 503 mềm')
ok(read('lib/care/bridge-store.ts').includes('SystemConfig') || read('lib/care/bridge-store.ts').includes('systemConfig'), 'trạng thái bridge lưu trong SystemConfig sẵn có')
ok(read('components/crm/CrmWorkspace.tsx').includes("tab === 'zalo'") && read('components/crm/CrmWorkspace.tsx').includes('Kênh Zalo'), 'CRM có tab Kênh Zalo')
ok(read('components/crm/CrmCareToday.tsx').includes('/api/crm/care-zalo/enqueue'), 'hàng đợi cần chăm có nút Gửi qua Zalo')
const importsZca = (source) => /from\s+['"]zca-js['"]/.test(source) || /require\(\s*['"]zca-js['"]\s*\)/.test(source)
ok(!importsZca(read('lib/care/bridge.ts')) && !importsZca(read('lib/care/bridge-store.ts')) && !importsZca(read('lib/care/bridge-http.ts')), 'phía website tuyệt đối không import zca-js')

console.log(`test-care-bridge: ${checks}/${checks} kiểm chứng PASS`)
