/* Kiểm chứng wiring vận hành tự động:
   1) vercel.json đăng ký đủ 5 cron của chương trình nâng cấp, lịch
      hằng ngày hợp lệ, không trùng giờ nhau.
   2) Cả 5 route đều nhận cả GET (Vercel Cron) và POST (lập lịch ngoài)
      qua một handler chung và đều kiểm tra CRON_SECRET.
   3) Luật nhắc Điểm A/B: mốc 3 ngày cho A, 14 ngày cho B, đã có thì
      không nhắc; eventKey chứa tháng chống trùng. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }

const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'))
const cronPaths = (vercel.crons ?? []).map((c) => c.path)
for (const p of ['/api/cron/sales-ledger', '/api/cron/social-sync', '/api/cron/race-sync', '/api/cron/badge-awards', '/api/cron/baseline-reminders']) {
  ok(cronPaths.includes(p), `vercel.json: đã đăng ký ${p}`)
}
{
  const schedules = vercel.crons.map((c) => c.schedule)
  ok(new Set(schedules).size === schedules.length, 'vercel.json: các lịch không trùng nhau')
  ok(schedules.every((s) => /^\d{1,2} \d{1,2} \* \* \*$/.test(s)), 'vercel.json: lịch dạng hằng ngày hợp lệ')
}

for (const name of ['sales-ledger', 'social-sync', 'race-sync', 'badge-awards', 'baseline-reminders']) {
  const route = fs.readFileSync(path.join(root, `app/api/cron/${name}/route.ts`), 'utf8')
  ok(route.includes('export const GET = handleCron') && route.includes('export const POST = handleCron'), `route ${name}: nhận cả GET và POST`)
  ok(route.includes('CRON_SECRET'), `route ${name}: kiểm tra CRON_SECRET`)
}

function loadModule(relative) {
  const file = path.resolve(root, relative)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}
const reminders = loadModule('lib/baseline/reminders.ts')
{
  const base = { enrollmentId: 1, enrolledDaysAgo: 2, hasA: false, aRecordedDaysAgo: null, hasB: false }
  ok(reminders.decideReminders(base).length === 0, 'nhắc A: ghi danh 2 ngày chưa nhắc')
  ok(reminders.decideReminders({ ...base, enrolledDaysAgo: 3 }).join() === 'A', 'nhắc A: đủ 3 ngày → nhắc A')
  ok(reminders.decideReminders({ ...base, hasA: true, aRecordedDaysAgo: 13 }).length === 0, 'nhắc B: A mới 13 ngày chưa nhắc')
  ok(reminders.decideReminders({ ...base, hasA: true, aRecordedDaysAgo: 14 }).join() === 'B', 'nhắc B: A đủ 14 ngày → nhắc B')
  ok(reminders.decideReminders({ ...base, hasA: true, aRecordedDaysAgo: 30, hasB: true }).length === 0, 'nhắc: đã có B thì thôi')
  const key = reminders.reminderEventKey(7, 'A', new Date('2026-10-24T00:00:00Z'))
  ok(key === 'baseline-reminder:7:A:2026-10', 'eventKey: chứa tháng chống trùng')
}

console.log(`test-cron-wiring: ${checks} kiểm chứng PASS`)
