/**
 * E2E test chống trùng LIÊN KÊNH (email + SePay) bằng fingerprint.
 * Chạy: DATABASE_URL=... DIRECT_URL=... SEPAY_WEBHOOK_API_KEY=test-key npx tsx scripts/e2e-dualchannel-test.ts
 */
process.env.SEPAY_WEBHOOK_API_KEY = 'test-key-123';

import prisma from '../lib/prisma';
import { POST } from '../app/api/webhooks/sepay/route';
import { buildTxFingerprint, normalizeTxContent } from '../lib/payment-dedup';

const API = 'http://localhost/api/webhooks/sepay';
const GOOD_AUTH = 'Apikey test-key-123';
let pass = 0, fail = 0;
function ok(name: string, cond: boolean, extra?: any) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}`, extra ?? ''); }
}
function post(payload: any) {
  return POST(new Request(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': GOOD_AUTH },
    body: JSON.stringify(payload),
  }) as any);
}

async function main() {
  // ---- Seed ----
  await prisma.processedTransaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.userBankAccount.deleteMany();
  await prisma.user.deleteMany();

  const teacher = await prisma.user.create({ data: { email: 'gv3@test.vn', name: 'GV3', role: 'TEACHER' } });
  await prisma.userBankAccount.create({
    data: { userId: teacher.id, accountHolder: 'GV3', accountNumber: '777888999', bankName: 'Sacombank' }
  });
  const student = await prisma.user.create({ data: { email: 'hv3@test.vn', name: 'HV3', phone: '0907778889', role: 'STUDENT' } });
  const course = await prisma.course.create({
    data: { id_khoa: 'DUAL01', name_lop: 'Lớp Dual', teacherId: teacher.id, phi_coc: 200000 }
  });
  const enrollment = await prisma.enrollment.create({ data: { userId: student.id, courseId: course.id, status: 'PENDING', phi_coc: 200000 } });

  // D1: fingerprint ổn định + chuẩn hóa nội dung
  const f1 = buildTxFingerprint({ content: 'SDT 778889 HV 1 COC DUAL01', amount: 200000, transferTime: new Date('2026-10-13T10:00:00+07:00') });
  const f2 = buildTxFingerprint({ content: '  sdt   778889 hv 1 coc dual01 ', amount: 200000, transferTime: new Date('2026-10-13T23:59:00+07:00') });
  const f3 = buildTxFingerprint({ content: 'SDT 778889 HV 1 COC DUAL01', amount: 200000, transferTime: new Date('2026-10-14T10:00:00+07:00') });
  ok('D1: cùng nội dung+số tiền+ngày (khác hoa/thường/khoảng trắng) → cùng fingerprint', f1 === f2, { f1, f2 });
  ok('D2: khác ngày → khác fingerprint', f1 !== f3);
  ok('D3: chuẩn hóa nội dung', normalizeTxContent('  SDT   123 ') === 'sdt 123');

  const payload = (over: any = {}) => ({
    id: 3001, gateway: 'Sacombank', transactionDate: '2026-10-13 10:00:00',
    accountNumber: '777888999', transferType: 'in', transferAmount: 200000,
    content: `SDT 778889 HV ${student.id} COC DUAL01`, ...over,
  });

  // D4: webhook lần 1 → kích hoạt
  let res = await post(payload());
  let json: any = await res.json();
  ok('D4: webhook lần 1 → matched=1', res.status === 200 && json.matched === 1, json);

  // D5: cùng giao dịch nhưng SePay gửi id KHÁC (mô phỏng kênh email đã xử lý trước / retry lạ)
  // → fingerprint trùng → bỏ qua, không tạo bản ghi mới
  const countBefore = await prisma.processedTransaction.count();
  res = await post(payload({ id: 3002 }));
  json = await res.json();
  const countAfter = await prisma.processedTransaction.count();
  ok('D5: id khác nhưng cùng nội dung+số tiền+ngày → duplicate, không tạo bản ghi mới',
    res.status === 200 && /Duplicate/i.test(json.message || '') && countAfter === countBefore, { msg: json.message, countBefore, countAfter });

  // D6: giao dịch UNMATCHED trước đó, nay có enrollment khớp → được xử lý lại (tái dùng bản ghi)
  const student2 = await prisma.user.create({ data: { email: 'hv4@test.vn', name: 'HV4', phone: '0901110002', role: 'STUDENT' } });
  const enrollment2 = await prisma.enrollment.create({ data: { userId: student2.id, courseId: course.id, status: 'PENDING', phi_coc: 200000 } });
  const content2 = `SDT 110002 HV ${student2.id} COC DUAL01`;
  const fp2 = buildTxFingerprint({ content: content2, amount: 200000, transferTime: new Date('2026-10-13 10:00:00') });
  const stale = await prisma.processedTransaction.create({
    data: { source: 'EMAIL', externalId: 'gmail:old123', fingerprint: fp2, amount: 200000, content: content2, status: 'UNMATCHED', reason: 'trước đây chưa khớp' }
  });
  res = await post({ ...payload(), id: 3003, content: content2 });
  json = await res.json();
  const reused = await prisma.processedTransaction.findUnique({ where: { id: stale.id } });
  const enr2 = await prisma.enrollment.findUnique({ where: { id: enrollment2.id } });
  const dupRows = await prisma.processedTransaction.count({ where: { fingerprint: fp2 } });
  ok('D6: UNMATCHED cũ được tái xử lý → PROCESSED, không trùng bản ghi, enrollment ACTIVE',
    json.matched === 1 && reused?.status === 'PROCESSED' && dupRows === 1 && enr2?.status === 'ACTIVE',
    { matched: json.matched, status: reused?.status, dupRows, enr: enr2?.status });

  // D7: enrollment gốc vẫn ACTIVE đúng 1 lần (không double-activate)
  const enr1 = await prisma.enrollment.findUnique({ where: { id: enrollment.id }, include: { payment: true } });
  ok('D7: enrollment không bị kích hoạt 2 lần', enr1?.status === 'ACTIVE', enr1?.status);

  console.log(`\n==== KẾT QUẢ DUAL-CHANNEL: ${pass} pass, ${fail} fail ====`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
