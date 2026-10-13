/**
 * E2E test cho Phase 1: SePay webhook auth + dedup + unmatched (chạy trên DB test local).
 * Chạy: DATABASE_URL=... DIRECT_URL=... SEPAY_WEBHOOK_API_KEY=test-key npx tsx scripts/e2e-payment-test.ts
 */
process.env.SEPAY_WEBHOOK_API_KEY = 'test-key-123';

import prisma from '../lib/prisma';
import { POST } from '../app/api/webhooks/sepay/route';

const API = 'http://localhost/api/webhooks/sepay';
let pass = 0, fail = 0;
function ok(name: string, cond: boolean, extra?: any) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}`, extra ?? ''); }
}
function post(payload: any, authHeader?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (authHeader !== undefined) headers['authorization'] = authHeader;
  return POST(new Request(API, { method: 'POST', headers, body: JSON.stringify(payload) }) as any);
}

async function main() {
  // ---- Seed ----
  await prisma.processedTransaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.userBankAccount.deleteMany();
  await prisma.user.deleteMany();

  const teacher = await prisma.user.create({ data: { email: 'gv@test.vn', name: 'GV Test', role: 'TEACHER' } });
  const bank = await prisma.userBankAccount.create({
    data: { userId: teacher.id, accountHolder: 'GV TEST', accountNumber: '8889990001', bankName: 'Sacombank' }
  });
  const student = await prisma.user.create({ data: { email: 'hv@test.vn', name: 'HV Test', phone: '0901112223', role: 'STUDENT' } });
  const course = await prisma.course.create({
    data: { id_khoa: 'TEST01', name_lop: 'Lớp Test', teacherId: teacher.id, teacherBankAccountId: bank.id, phi_coc: 500000 }
  });
  const enrollment = await prisma.enrollment.create({ data: { userId: student.id, courseId: course.id, status: 'PENDING', phi_coc: 500000 } });
  const student2 = await prisma.user.create({ data: { email: 'hv2@test.vn', name: 'HV2', phone: '0904445556', role: 'STUDENT' } });
  const enrollment2 = await prisma.enrollment.create({ data: { userId: student2.id, courseId: course.id, status: 'PENDING', phi_coc: 500000 } });

  const basePayload = (over: any = {}) => ({
    id: 1001, gateway: 'Sacombank', transactionDate: '2026-10-13 10:00:00',
    accountNumber: '8889990001', transferType: 'in', transferAmount: 500000,
    content: `SDT 112223 HV ${student.id} COC TEST01`, ...over,
  });
  const GOOD_AUTH = 'Apikey test-key-123';

  // T1: không có auth header → 401
  let res = await post(basePayload());
  ok('T1: thiếu auth → 401', res.status === 401);

  // T2: sai key → 401
  res = await post(basePayload(), 'Apikey wrong-key');
  ok('T2: sai key → 401', res.status === 401);

  // T3: payload hợp lệ → kích hoạt
  res = await post(basePayload(), GOOD_AUTH);
  let json: any = await res.json();
  ok('T3: webhook hợp lệ → 200 + matched=1', res.status === 200 && json.success && json.matched === 1, json);
  const enr = await prisma.enrollment.findUnique({ where: { id: enrollment.id } });
  ok('T3: enrollment → ACTIVE', enr?.status === 'ACTIVE');
  const tx = await prisma.processedTransaction.findUnique({ where: { externalId: 'sepay:1001' } });
  ok('T3: ProcessedTransaction = PROCESSED + enrollmentId', tx?.status === 'PROCESSED' && tx?.enrollmentId === enrollment.id, tx?.status);

  // T4: gửi lại cùng id (SePay retry) → duplicate, không kích hoạt lần 2
  res = await post(basePayload(), GOOD_AUTH);
  json = await res.json();
  const txCount = await prisma.processedTransaction.count({ where: { externalId: 'sepay:1001' } });
  ok('T4: retry cùng id → 200 duplicate, chỉ 1 bản ghi', res.status === 200 && /Duplicate/i.test(json.message || '') && txCount === 1, json);

  // T5: nội dung không có định danh → UNMATCHED
  res = await post(basePayload({ id: 1002, content: 'chuyen tien cam on' }), GOOD_AUTH);
  json = await res.json();
  const tx5 = await prisma.processedTransaction.findUnique({ where: { externalId: 'sepay:1002' } });
  ok('T5: thiếu định danh → UNMATCHED', res.status === 200 && tx5?.status === 'UNMATCHED', tx5?.status);

  // T6: sai số tài khoản → UNMATCHED
  res = await post(basePayload({ id: 1003, accountNumber: '0000000000' }), GOOD_AUTH);
  const tx6 = await prisma.processedTransaction.findUnique({ where: { externalId: 'sepay:1003' } });
  ok('T6: sai accountNumber → UNMATCHED', tx6?.status === 'UNMATCHED', tx6?.status);

  // T7: số tiền thiếu → UNMATCHED (không kích hoạt nhầm)
  res = await post(basePayload({ id: 1004, transferAmount: 100000, content: `SDT 445556 HV ${student2.id} COC TEST01` }), GOOD_AUTH);
  const tx7 = await prisma.processedTransaction.findUnique({ where: { externalId: 'sepay:1004' } });
  const enr2 = await prisma.enrollment.findUnique({ where: { id: enrollment2.id } });
  ok('T7: thiếu tiền → UNMATCHED, enrollment vẫn PENDING', tx7?.status === 'UNMATCHED' && enr2?.status === 'PENDING', { tx: tx7?.status, enr: enr2?.status });

  // T8: transferType = out → bỏ qua, không ghi DB
  res = await post(basePayload({ id: 1005, transferType: 'out' }), GOOD_AUTH);
  const tx8 = await prisma.processedTransaction.findUnique({ where: { externalId: 'sepay:1005' } });
  ok('T8: transferType out → ignored, không ghi DB', res.status === 200 && !tx8);

  // T9: actions cần auth — không session → từ chối
  const { getUnmatchedTransactions, assignUnmatchedTransactionAction, dismissUnmatchedTransactionAction } = await import('../app/actions/payment-actions');
  const r9 = await getUnmatchedTransactions();
  ok('T9a: getUnmatchedTransactions không session → từ chối', r9.success === false, r9);
  const r9b = await assignUnmatchedTransactionAction(1, 1);
  ok('T9b: assignUnmatched không session → từ chối', r9b.success === false);
  const r9c = await dismissUnmatchedTransactionAction(1);
  ok('T9c: dismissUnmatched không session → từ chối', r9c.success === false);
  const { updatePaymentProof, createPaymentForEnrollment } = await import('../app/actions/payment-actions');
  const r9d = await updatePaymentProof(enrollment.id, 'http://x/y.png');
  ok('T9d: updatePaymentProof không session → từ chối', r9d.success === false, r9d);
  const r9e = await createPaymentForEnrollment(enrollment.id, 500000);
  ok('T9e: createPaymentForEnrollment không session → từ chối', r9e.success === false, r9e);

  // T10: danh sách unmatched có 3 bản ghi (T5, T6, T7)
  const unmatched = await prisma.processedTransaction.findMany({ where: { status: 'UNMATCHED' } });
  ok('T10: có đúng 3 giao dịch UNMATCHED để admin đối soát', unmatched.length === 3, unmatched.length);

  console.log(`\n==== KẾT QUẢ: ${pass} pass, ${fail} fail ====`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
