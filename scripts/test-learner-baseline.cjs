/* Kiểm chứng Điểm A → Điểm B (GĐ1 — kế hoạch nâng cấp từ WIPA OS):
   1) computeGrowth: delta và % đúng, gồm ca Điểm A = 0 (pct null khi
      B > 0; 0 khi cả hai bằng 0) và ca giảm (delta âm).
   2) validateMetrics: chặn số âm, số thập phân, giá trị vượt trần hợp lý
      (ca 999.999.998 của WIPA), chấp nhận số hợp lệ và chuỗi số.
   3) Schema: có model LearnerBaseline + enum BaselineKind + unique
      (userId, courseId, kind); migration tương ứng tồn tại.
   4) Action saveMyBaseline: bắt buộc đăng nhập, kiểm tra enrollment
      ACTIVE, recordedAt do server ấn định (không nhận ngày từ client).
   5) Service getCourseGrowth có phân trang; trang quản trị giới hạn
      ADMIN/TEACHER và teacher bị khóa theo teacherId. */
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

const growth = loadModule('lib/baseline/growth.ts')

// --- 1) computeGrowth ---
{
  const g = growth.computeGrowth(
    { followers: 100, views: 1000, customers: 10, revenue: 2000000 },
    { followers: 250, views: 500, customers: 10, revenue: 5000000 },
  )
  ok(g.followers.delta === 150 && Math.abs(g.followers.pct - 150) < 1e-9, 'growth: followers +150 (+150%)')
  ok(g.views.delta === -500 && Math.abs(g.views.pct + 50) < 1e-9, 'growth: views -500 (-50%)')
  ok(g.customers.delta === 0 && g.customers.pct === 0, 'growth: customers đứng yên')
  ok(g.revenue.delta === 3000000, 'growth: revenue delta đúng')
}
{
  const g = growth.computeGrowth(
    { followers: 0, views: 0, customers: 0, revenue: 0 },
    { followers: 10, views: 0, customers: 0, revenue: 0 },
  )
  ok(g.followers.pct === null, 'growth: A=0, B>0 → pct null (không chia 0)')
  ok(g.views.pct === 0, 'growth: A=0, B=0 → pct 0')
}

// --- 2) validateMetrics ---
ok(growth.validateMetrics({ followers: 100, revenue: 5000000 }).length === 0, 'validate: số hợp lệ qua')
ok(growth.validateMetrics({ followers: '250' }).length === 0, 'validate: chuỗi số qua')
ok(growth.validateMetrics({ followers: -1 }).length >= 1, 'validate: chặn số âm')
ok(growth.validateMetrics({ views: 12.5 }).length >= 1, 'validate: chặn số thập phân')
ok(growth.validateMetrics({ revenue: 999999999999 }).length === 0, 'validate: doanh thu ở trần vẫn qua')
ok(growth.validateMetrics({ followers: 9999999999 }).length >= 1, 'validate: chặn followers vượt trần')
ok(growth.validateMetrics({ revenue: 'abc' }).length >= 1, 'validate: chặn không phải số')
{
  const n = growth.normalizeMetrics({ followers: '250', views: undefined, customers: null, revenue: 100.9 })
  ok(n.followers === 250 && n.views === 0 && n.customers === 0 && n.revenue === 100, 'normalize: ép kiểu + làm tròn xuống số nguyên')
}

// --- 3) Schema + migration ---
const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8')
ok(/model LearnerBaseline \{/.test(schema), 'schema: có model LearnerBaseline')
ok(/enum BaselineKind \{\s*\n\s*A\s*\n\s*B\s*\n\}/.test(schema), 'schema: enum BaselineKind A/B')
ok(schema.includes('@@unique([userId, courseId, kind])'), 'schema: unique (userId, courseId, kind)')
ok(fs.existsSync(path.join(root, 'prisma/migrations/20261023223000_add_learner_baseline/migration.sql')), 'migration: tồn tại')
{
  const sql = fs.readFileSync(path.join(root, 'prisma/migrations/20261023223000_add_learner_baseline/migration.sql'), 'utf8')
  ok(sql.includes('CREATE TABLE "LearnerBaseline"'), 'migration: tạo bảng LearnerBaseline')
}

// --- 4) Action ---
const action = fs.readFileSync(path.join(root, 'app/actions/baseline-actions.ts'), 'utf8')
ok(action.includes("status: 'ACTIVE'"), 'action: kiểm tra enrollment ACTIVE')
ok(action.includes('recordedAt: new Date()'), 'action: recordedAt do server ấn định')
ok(!/recordedAt:\s*input/.test(action), 'action: không nhận recordedAt từ client')
ok(action.includes('validateMetrics'), 'action: có validateMetrics')

// --- 5) Service + trang quản trị ---
const service = fs.readFileSync(path.join(root, 'lib/baseline/service.ts'), 'utf8')
ok(service.includes('skip:') && service.includes('take:'), 'service: getCourseGrowth có phân trang skip/take')
const adminPage = fs.readFileSync(path.join(root, 'app/tools/diem-a-b/page.tsx'), 'utf8')
ok(adminPage.includes("role !== 'ADMIN' && role !== 'TEACHER'"), 'trang quản trị: chỉ ADMIN/TEACHER')
ok(adminPage.includes('teacherId: userId'), 'trang quản trị: teacher chỉ thấy khóa của mình')

console.log(`test-learner-baseline: ${checks} kiểm chứng PASS`)
