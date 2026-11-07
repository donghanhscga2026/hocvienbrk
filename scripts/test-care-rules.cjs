/* Kiểm chứng Care Engine GĐ1 — "Cần chăm hôm nay":
   1) decideCareSignals: đủ/thiếu điều kiện biên của từng luật R1–R6.
   2) Điểm rủi ro: điểm gốc đúng theo thiết kế, cộng dồn theo độ trễ, trần 99,
      nhiều tín hiệu xếp điểm cao trước.
   3) computeDailyStreak: chuỗi liên tiếp ngay trước hôm nay, đứt là dừng.
   4) Khóa chống trùng careEventKey / careSkipKey + hàm giờ Việt Nam.
   5) Mẫu nhắc: điền biến đúng, đủ mẫu cho 6 luật.
   6) Kiểm tra nguồn: runner chỉ tự gửi R1/R2/R3/R6 + trần 1/ngày; cron có
      CRON_SECRET + cơ chế execute; workflow có lịch 07:15 VN; CRM có tab care. */
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

const rules = loadModule('lib/care/rules.ts')
const templates = loadModule('lib/care/templates.ts')

const baseFacts = (overrides = {}) => ({
  enrollmentStatus: 'ACTIVE',
  hoursSinceActivation: null,
  enrolledDaysAgo: 0,
  progressCount: 0,
  isDailyCourse: false,
  vnHour: 12,
  submittedToday: false,
  dailyStreak: 0,
  daysSinceLastActivity: null,
  pendingPaymentHours: null,
  hoursSinceLastPaymentReminder: null,
  openRequestHours: null,
  hasBaselineA: true,
  ...overrides,
})
const ids = (facts) => rules.decideCareSignals(facts).map((s) => s.ruleId)
const scoreOf = (facts, ruleId) => rules.decideCareSignals(facts).find((s) => s.ruleId === ruleId)?.score

// --- R1: chưa bắt đầu học sau kích hoạt ≥48h ---
ok(ids(baseFacts({ hoursSinceActivation: 48 })).includes('R1'), 'R1: đúng 48h → khớp')
ok(!ids(baseFacts({ hoursSinceActivation: 47.9 })).includes('R1'), 'R1: 47.9h → chưa khớp')
ok(!ids(baseFacts({ hoursSinceActivation: 96, progressCount: 1 })).includes('R1'), 'R1: đã có tiến độ → không khớp')
ok(!ids(baseFacts({ hoursSinceActivation: 96, enrollmentStatus: 'PENDING' })).includes('R1'), 'R1: chưa kích hoạt → không khớp')
ok(scoreOf(baseFacts({ hoursSinceActivation: 48 }), 'R1') === 66, 'R1: điểm gốc 66')
ok(scoreOf(baseFacts({ hoursSinceActivation: 48 + 24 * 30 }), 'R1') === 76, 'R1: trễ 30 ngày → +10 (trần cộng dồn)')

// --- R2: giữ chuỗi bài ngày ---
const r2 = { isDailyCourse: true, dailyStreak: 3, submittedToday: false, vnHour: 20 }
ok(ids(baseFacts(r2)).includes('R2'), 'R2: chuỗi 3 + chưa nộp + 20h → khớp')
ok(!ids(baseFacts({ ...r2, vnHour: 19 })).includes('R2'), 'R2: 19h → chưa khớp (chưa tới giờ nhắc)')
ok(!ids(baseFacts({ ...r2, dailyStreak: 2 })).includes('R2'), 'R2: chuỗi 2 → không khớp')
ok(!ids(baseFacts({ ...r2, submittedToday: true })).includes('R2'), 'R2: đã nộp hôm nay → không khớp')
ok(!ids(baseFacts({ ...r2, isDailyCourse: false })).includes('R2'), 'R2: khóa không theo ngày → không khớp')
ok(scoreOf(baseFacts(r2), 'R2') === 88, 'R2: điểm gốc 88')
ok(scoreOf(baseFacts({ ...r2, dailyStreak: 8 }), 'R2') === 93, 'R2: chuỗi 8 → 88 + 5')

// --- R3: im lặng ≥7 ngày, còn hoạt động trong 30 ngày ---
ok(ids(baseFacts({ progressCount: 5, daysSinceLastActivity: 7 })).includes('R3'), 'R3: im lặng đúng 7 ngày → khớp')
ok(!ids(baseFacts({ progressCount: 5, daysSinceLastActivity: 6 })).includes('R3'), 'R3: 6 ngày → chưa khớp')
ok(!ids(baseFacts({ progressCount: 5, daysSinceLastActivity: 31 })).includes('R3'), 'R3: 31 ngày (ngoài cửa sổ 30) → không khớp')
ok(!ids(baseFacts({ progressCount: 0, daysSinceLastActivity: 10, hoursSinceActivation: 10 })).includes('R3'), 'R3: chưa học gì → không khớp (đó là R1)')
ok(scoreOf(baseFacts({ progressCount: 5, daysSinceLastActivity: 7 }), 'R3') === 74, 'R3: điểm gốc 74')

// --- R4: thanh toán PENDING ≥24h, chưa nhắc trong 72h ---
ok(ids(baseFacts({ pendingPaymentHours: 24 })).includes('R4'), 'R4: chờ đúng 24h → khớp')
ok(!ids(baseFacts({ pendingPaymentHours: 23.9 })).includes('R4'), 'R4: 23.9h → chưa khớp')
ok(!ids(baseFacts({ pendingPaymentHours: 30, hoursSinceLastPaymentReminder: 71.9 })).includes('R4'), 'R4: mới nhắc 71.9h trước → không nhắc lại')
ok(ids(baseFacts({ pendingPaymentHours: 30, hoursSinceLastPaymentReminder: 72 })).includes('R4'), 'R4: nhắc 72h trước → được nhắc tiếp')
ok(scoreOf(baseFacts({ pendingPaymentHours: 24 }), 'R4') === 82, 'R4: điểm gốc 82')

// --- R5: yêu cầu CRM mở ≥24h ---
ok(ids(baseFacts({ openRequestHours: 24 })).includes('R5'), 'R5: mở đúng 24h → khớp')
ok(!ids(baseFacts({ openRequestHours: 23.9 })).includes('R5'), 'R5: 23.9h → chưa khớp')
ok(scoreOf(baseFacts({ openRequestHours: 24 }), 'R5') === 95, 'R5: điểm gốc 95')
ok(scoreOf(baseFacts({ openRequestHours: 24 + 12 * 10 }), 'R5') === 99, 'R5: điểm không vượt trần 99')

// --- R6: chưa ghi Điểm A ---
ok(ids(baseFacts({ hasBaselineA: false, enrolledDaysAgo: 3 })).includes('R6'), 'R6: ghi danh 3 ngày chưa ghi Điểm A → khớp')
ok(!ids(baseFacts({ hasBaselineA: false, enrolledDaysAgo: 2 })).includes('R6'), 'R6: mới 2 ngày → chưa khớp')
ok(!ids(baseFacts({ hasBaselineA: true, enrolledDaysAgo: 30 })).includes('R6'), 'R6: đã ghi Điểm A → không khớp')
ok(scoreOf(baseFacts({ hasBaselineA: false, enrolledDaysAgo: 3 }), 'R6') === 40, 'R6: điểm gốc 40')

// --- Nhiều tín hiệu: xếp điểm cao trước ---
{
  const many = rules.decideCareSignals(baseFacts({
    hoursSinceActivation: 100, openRequestHours: 30, pendingPaymentHours: 30, hasBaselineA: false, enrolledDaysAgo: 10,
  }))
  ok(many[0].ruleId === 'R5' && many[0].score > many[many.length - 1].score, 'nhiều tín hiệu: R5 (95) đứng đầu, điểm giảm dần')
  ok(many.some((s) => s.ruleId === 'R1') && many.some((s) => s.ruleId === 'R4'), 'nhiều tín hiệu: R1 + R4 cùng có mặt')
}

// --- computeDailyStreak ---
ok(rules.computeDailyStreak([1, 2, 3], 4) === 3, 'streak: nộp đủ 3 ngày trước → 3')
ok(rules.computeDailyStreak([1, 3], 4) === 1, 'streak: đứt ở ngày 2 → chỉ tính ngày 3 → 1')
ok(rules.computeDailyStreak([], 4) === 0, 'streak: chưa nộp gì → 0')
ok(rules.computeDailyStreak([3], 4) === 1, 'streak: chỉ hôm qua → 1')
ok(rules.computeDailyStreak([1, 2, 3, 4], 4) === 3, 'streak: hôm nay (Ngày 4) không tính vào chuỗi hôm qua')

// --- Khóa + giờ Việt Nam ---
ok(rules.careEventKey('R2', 123, 45, '2026-11-07') === 'care:R2:123:45:2026-11-07', 'eventKey: đúng định dạng care:R2:user:course:ngày')
ok(rules.careSkipKey(123, 45, 'R2', '2026-11-07') === 'care-skip:123:45:R2:2026-11-07', 'skipKey: đúng định dạng')
ok(rules.vnDateString(new Date('2026-11-07T17:30:00Z')) === '2026-11-08', 'giờ VN: 17:30 UTC = 00:30 ngày hôm sau giờ VN')
ok(rules.vnHour(new Date('2026-11-07T13:00:00Z')) === 20, 'giờ VN: 13:00 UTC = 20:00 VN (mốc nhắc R2)')
ok(rules.vnDayStartUtc('2026-11-08').toISOString() === '2026-11-07T17:00:00.000Z', 'đầu ngày VN = 17:00 UTC hôm trước')

// --- Mẫu nhắc ---
for (const id of ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']) {
  const text = templates.careReminderText(id, { name: 'Hồng Nhung', course: 'Zalo Mastery K02', days: 5, streak: 12, lesson: 'Ngày 14', amount: '499.000đ', hours: 31 })
  ok(text.length > 30 && text.includes('Zalo Mastery K02'), `mẫu ${id}: có nội dung + điền tên khóa`)
  ok(!/\{(name|course|days|streak|lesson|amount|hours)\}/.test(templates.careReminderText(id, { name: 'A', course: 'B', days: 1, streak: 1, lesson: 'L', amount: '1đ', hours: 1 })), `mẫu ${id}: không sót biến khi đủ dữ kiện`)
}
ok(templates.formatMoneyVnd(499000) === '499.000đ', 'formatMoneyVnd: 499.000đ')

// --- Kiểm tra nguồn: runner / cron / workflow / giao diện ---
const runner = fs.readFileSync(path.join(root, 'lib/care/runner.ts'), 'utf8')
ok(runner.includes('CARE_AUTO_RULES'), 'runner: chỉ tự gửi theo danh sách luật tự động')
ok(JSON.stringify(rules.CARE_AUTO_RULES) === JSON.stringify(['R1', 'R2', 'R3', 'R6']), 'luật tự động: đúng R1/R2/R3/R6 (không có R4/R5)')
ok(runner.includes('countCareToday'), 'runner: kiểm tra trần 1 nhắc/ngày trước khi gửi')
ok(runner.includes('dryRun'), 'runner: có chế độ dry-run')
const cron = fs.readFileSync(path.join(root, 'app/api/cron/care-reminders/route.ts'), 'utf8')
ok(cron.includes('CRON_SECRET') && cron.includes("=== '1'"), 'cron: xác thực CRON_SECRET + chạy thật khi execute=1')
const workflow = fs.readFileSync(path.join(root, '.github/workflows/cron-jobs.yml'), 'utf8')
ok(workflow.includes("'15 0 * * *'") && workflow.includes('/api/cron/care-reminders?execute=1'), 'workflow: lịch 15 0 UTC (07:15 VN) + gọi care-reminders kèm execute=1')
const queue = fs.readFileSync(path.join(root, 'lib/care/queue.ts'), 'utf8')
ok(queue.includes("action: 'CARE_SKIP'") && queue.includes("startsWith: 'care:'"), 'queue: giải trạng thái bỏ qua (CARE_SKIP) + đã nhắc hôm nay (eventKey care:)')
const workspace = fs.readFileSync(path.join(root, 'components/crm/CrmWorkspace.tsx'), 'utf8')
ok(workspace.includes('CrmCareToday') && workspace.includes("'care'") && workspace.includes('Cần chăm hôm nay'), 'CRM: đã nối tab Cần chăm hôm nay (?view=care)')
const remindRoute = fs.readFileSync(path.join(root, 'app/api/crm/care-today/remind/route.ts'), 'utf8')
ok(remindRoute.includes('buildCareQueue') && remindRoute.includes('countCareToday'), 'API gửi nhắc: tính lại tín hiệu ở server + tôn trọng trần 1/ngày')

console.log(`test-care-rules: ${checks} kiểm chứng PASS`)
