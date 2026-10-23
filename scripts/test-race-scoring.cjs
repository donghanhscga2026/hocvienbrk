/* Kiểm chứng Cuộc đua tăng tốc (GĐ2B):
   1) pointsFor: floor theo bậc, áp trần, số âm → 0.
   2) resolveMetricConfig: mặc định đủ 6 chỉ số; ghi đè hợp lệ được tôn
      trọng; ghi đè rác (per <= 0) bị bỏ qua.
   3) sumPositiveDeltas: chỉ cộng bước tăng, bỏ bước giảm.
   4) Schema + migration; points-sync upsert theo khóa duy nhất kỳ
      TOTAL và đo doanh thu từ sổ cái; action tạo đua kiểm tra ngày;
      cron có CRON_SECRET. */
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

const scoring = loadModule('lib/race/scoring.ts')

{
  const rule = { per: 1000000, points: 1, cap: 100 }
  ok(scoring.pointsFor(2500000, rule) === 2, 'points: 2,5tr → 2 điểm (floor)')
  ok(scoring.pointsFor(999999, rule) === 0, 'points: dưới 1 bậc → 0')
  ok(scoring.pointsFor(500000000, rule) === 100, 'points: áp trần 100')
  ok(scoring.pointsFor(-5, rule) === 0, 'points: số âm → 0')
  ok(scoring.pointsFor(10, { per: 1, points: 5, cap: null }) === 50, 'points: cap null = không trần')
}

{
  const cfg = scoring.resolveMetricConfig(null)
  ok(Object.keys(cfg).length === 6 && cfg.REVENUE.per === 1000000, 'config: mặc định đủ 6 chỉ số')
  const custom = scoring.resolveMetricConfig({ VIDEOS: { per: 1, points: 10, cap: 40 }, REVENUE: { per: -3 } })
  ok(custom.VIDEOS.points === 10 && custom.VIDEOS.cap === 40, 'config: ghi đè hợp lệ được áp dụng')
  ok(custom.REVENUE.per === 1000000, 'config: per âm bị bỏ qua, giữ mặc định')
}

{
  ok(scoring.sumPositiveDeltas([100, 150, 120, 200]) === 130, 'delta: 50 + 80 = 130, bỏ bước giảm')
  ok(scoring.sumPositiveDeltas([100]) === 0 && scoring.sumPositiveDeltas([]) === 0, 'delta: chuỗi ngắn → 0')
}

const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8')
ok(/model Race \{/.test(schema) && /model MetricEvent \{/.test(schema) && /model RaceEnrollment \{/.test(schema) && /model RaceLeave \{/.test(schema), 'schema: đủ 4 model cuộc đua')
ok(schema.includes('@@unique([raceId, userId, metricKey, periodKey])'), 'schema: MetricEvent duy nhất theo kỳ')
ok(fs.existsSync(path.join(root, 'prisma/migrations/20261024003000_add_race/migration.sql')), 'migration: tồn tại')
const sync = fs.readFileSync(path.join(root, 'lib/race/points-sync.ts'), 'utf8')
ok(sync.includes('memberSalesLedger') && sync.includes("periodKey: 'TOTAL'"), 'sync: doanh thu từ sổ cái + upsert kỳ TOTAL')
const actions = fs.readFileSync(path.join(root, 'app/actions/race-actions.ts'), 'utf8')
ok(actions.includes('endsAt <= startsAt'), 'action: chặn ngày kết thúc <= bắt đầu')
ok(actions.includes('raceId_userId'), 'action: xin nghỉ kiểm tra đã ghi danh')
const cron = fs.readFileSync(path.join(root, 'app/api/cron/race-sync/route.ts'), 'utf8')
ok(cron.includes('CRON_SECRET'), 'cron: có khóa CRON_SECRET')

console.log(`test-race-scoring: ${checks} kiểm chứng PASS`)
