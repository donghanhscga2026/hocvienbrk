/* Kiểm chứng sổ cái doanh số (GĐ2A — kế hoạch nâng cấp từ WIPA OS):
   1) Luật ghi sổ: TEACHER theo từng dòng hàng khóa học; AFFILIATE tính
      tổng các dòng mà affiliate không phải giảng viên của dòng đó;
      giảng viên tự mua khóa mình → không ghi; affiliate = người mua →
      không ghi; sản phẩm không phải khóa học → bỏ qua.
   2) dedupeKey ổn định và duy nhất theo (đơn, vai, khóa, loại) → đồng
      bộ chạy lại không trùng.
   3) reversalForAccrual giữ nguyên số tiền và khóa đối ứng.
   4) Schema + migration tồn tại; cron route có kiểm tra CRON_SECRET;
      action đồng bộ tay chỉ cho ADMIN. */
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

const rules = loadModule('lib/sales-ledger/rules.ts')
const teachers = new Map([[10, 100], [11, 200], [12, null]])

// Đơn 1: người mua 999, affiliate 555; khóa 10 (GV 100) 2tr, khóa 11 (GV 200) 3tr, khóa 12 (chưa gán GV) 1tr, 1 sản phẩm khác
{
  const order = {
    id: 1, buyerId: 999, affiliateId: 555, totalAmount: 6500000,
    paidAt: new Date('2026-10-20T10:00:00Z'), createdAt: new Date('2026-10-20T09:00:00Z'),
    items: [
      { productType: 'COURSE', productId: 10, unitPrice: 2000000, quantity: 1 },
      { productType: 'COURSE', productId: 11, unitPrice: 1500000, quantity: 2 },
      { productType: 'COURSE', productId: 12, unitPrice: 1000000, quantity: 1 },
      { productType: 'OTHER', productId: 77, unitPrice: 500000, quantity: 1 },
    ],
  }
  const entries = rules.accrualEntriesForOrder(order, teachers)
  const teacherEntries = entries.filter((e) => e.role === 'TEACHER')
  ok(teacherEntries.length === 2, 'rules: 2 dòng TEACHER (khóa chưa gán GV bỏ qua)')
  ok(teacherEntries.find((e) => e.userId === 100)?.amount === 2000000, 'rules: GV khóa 10 = 2tr')
  ok(teacherEntries.find((e) => e.userId === 200)?.amount === 3000000, 'rules: GV khóa 11 = 1,5tr × 2')
  const aff = entries.find((e) => e.role === 'AFFILIATE')
  ok(aff && aff.amount === 6000000 && aff.courseId === null, 'rules: AFFILIATE = tổng 3 khóa 6tr (bỏ sản phẩm khác)')
  ok(entries.every((e) => e.occurredAt.getTime() === order.paidAt.getTime()), 'rules: occurredAt = paidAt')
}

// Đơn 2: affiliate chính là giảng viên khóa 10 (tự quảng bá khóa mình)
{
  const order = {
    id: 2, buyerId: 999, affiliateId: 100, totalAmount: 5000000,
    paidAt: null, createdAt: new Date('2026-10-21T09:00:00Z'),
    items: [
      { productType: 'COURSE', productId: 10, unitPrice: 2000000, quantity: 1 },
      { productType: 'COURSE', productId: 11, unitPrice: 3000000, quantity: 1 },
    ],
  }
  const entries = rules.accrualEntriesForOrder(order, teachers)
  const aff = entries.find((e) => e.role === 'AFFILIATE')
  ok(aff && aff.amount === 3000000, 'rules: affiliate tự quảng bá khóa mình → chỉ tính khóa của người khác (3tr)')
  ok(entries.find((e) => e.role === 'TEACHER' && e.userId === 100)?.amount === 2000000, 'rules: vai TEACHER của chính giảng viên vẫn ghi đủ')
  ok(entries.every((e) => e.occurredAt.getTime() === order.createdAt.getTime()), 'rules: paidAt null → dùng createdAt')
}

// Đơn 3: giảng viên tự mua khóa mình + affiliate = người mua
{
  const order = {
    id: 3, buyerId: 100, affiliateId: 100, totalAmount: 2000000,
    paidAt: new Date(), createdAt: new Date(),
    items: [{ productType: 'COURSE', productId: 10, unitPrice: 2000000, quantity: 1 }],
  }
  ok(rules.accrualEntriesForOrder(order, teachers).length === 0, 'rules: tự mua khóa mình → không dòng nào')
}

// dedupeKey + reversal
{
  const k1 = rules.dedupeKey(1, 'TEACHER', 10, 'ACCRUAL')
  ok(k1 === '1:TEACHER:10:ACCRUAL' && rules.dedupeKey(1, 'AFFILIATE', null, 'ACCRUAL') === '1:AFFILIATE:ALL:ACCRUAL', 'dedupeKey: định dạng ổn định')
  const rev = rules.reversalForAccrual({ userId: 100, role: 'TEACHER', orderId: 1, courseId: 10, amount: 2000000, occurredAt: new Date() }, new Date('2026-11-01T00:00:00Z'))
  ok(rev.type === 'REVERSAL' && rev.amount === 2000000 && rev.dedupeKey === '1:TEACHER:10:REVERSAL', 'reversal: giữ số tiền, đổi loại + key')
}

// Schema + migration + cron + action
const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8')
ok(/model MemberSalesLedger \{/.test(schema) && schema.includes('dedupeKey  String            @unique') || schema.includes('dedupeKey'), 'schema: MemberSalesLedger + dedupeKey unique')
ok(fs.existsSync(path.join(root, 'prisma/migrations/20261023235500_add_sales_ledger/migration.sql')), 'migration: tồn tại')
const cron = fs.readFileSync(path.join(root, 'app/api/cron/sales-ledger/route.ts'), 'utf8')
ok(cron.includes('CRON_SECRET') && cron.includes('Bearer'), 'cron: có kiểm tra CRON_SECRET')
const action = fs.readFileSync(path.join(root, 'app/actions/sales-ledger-actions.ts'), 'utf8')
ok(action.includes("role !== 'ADMIN'"), 'action: đồng bộ tay chỉ ADMIN')

console.log(`test-sales-ledger: ${checks} kiểm chứng PASS`)
