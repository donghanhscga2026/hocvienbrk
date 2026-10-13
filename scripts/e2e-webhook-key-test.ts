/**
 * E2E test API key webhook RIÊNG từng tài khoản ngân hàng.
 * Chạy: DATABASE_URL=... DIRECT_URL=... SEPAY_WEBHOOK_API_KEY=global-key npx tsx scripts/e2e-webhook-key-test.ts
 */
process.env.SEPAY_WEBHOOK_API_KEY = 'global-key-xyz';

import { createHash } from 'crypto';
import prisma from '../lib/prisma';
import { POST } from '../app/api/webhooks/sepay/route';
import { generateBankWebhookKey, revokeBankWebhookKey } from '../app/actions/bank-webhook-actions';

const API = 'http://localhost/api/webhooks/sepay';
let pass = 0, fail = 0;
function ok(name: string, cond: boolean, extra?: any) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}`, extra ?? ''); }
}
function post(payload: any, key?: string) {
  const headers: any = { 'content-type': 'application/json' };
  if (key) headers['authorization'] = `Apikey ${key}`;
  return POST(new Request(API, { method: 'POST', headers, body: JSON.stringify(payload) }) as any);
}

async function main() {
  await prisma.processedTransaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.userBankAccount.deleteMany();
  await prisma.user.deleteMany();

  // TK của GV A: KHÔNG có key riêng (dùng key chung)
  const teacherA = await prisma.user.create({ data: { email: 'gva@test.vn', name: 'GVA', role: 'TEACHER' } });
  await prisma.userBankAccount.create({
    data: { userId: teacherA.id, accountHolder: 'GVA', accountNumber: '111222333', bankName: 'Sacombank' }
  });
  // TK của GV B: có key riêng (hash lưu DB)
  const teacherB = await prisma.user.create({ data: { email: 'gvb@test.vn', name: 'GVB', role: 'TEACHER' } });
  const accB = await prisma.userBankAccount.create({
    data: { userId: teacherB.id, accountHolder: 'GVB', accountNumber: '444555666', bankName: 'Sacombank' }
  });
  const keyB = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
  await prisma.userBankAccount.update({
    where: { id: accB.id },
    data: {
      webhookApiKeyHash: createHash('sha256').update(keyB).digest('hex'),
      webhookApiKeyHint: keyB.slice(-4),
    }
  });

  const student = await prisma.user.create({ data: { email: 'hvk@test.vn', name: 'HVK', phone: '0905554443', role: 'STUDENT' } });
  const mkEnroll = async (code: string) => {
    const course = await prisma.course.create({
      data: { id_khoa: code, name_lop: `Lớp ${code}`, teacherId: teacherA.id, phi_coc: 100000 }
    });
    const courseB = await prisma.course.update({ where: { id: course.id }, data: { teacherId: teacherB.id } });
    return prisma.enrollment.create({ data: { userId: student.id, courseId: courseB.id, status: 'PENDING', phi_coc: 100000 } });
  };

  const base = (over: any = {}) => ({
    id: 4000 + Math.floor(Math.random() * 100000), gateway: 'Sacombank',
    transactionDate: '2026-10-13 10:00:00', transferType: 'in', transferAmount: 100000, ...over,
  });

  // K1: TK có key riêng + key đúng → 200
  const e1 = await mkEnroll('KEY01');
  let res = await post(base({ accountNumber: '444555666', content: `SDT 554443 HV ${student.id} COC KEY01` }), keyB);
  let json: any = await res.json();
  ok('K1: TK có key riêng + key đúng → matched=1', res.status === 200 && json.matched === 1, json);

  // K2: TK có key riêng + key SAI → 401
  res = await post(base({ accountNumber: '444555666', content: `SDT 554443 HV ${student.id} COC KEY02` }), 'sai-key-123');
  ok('K2: TK có key riêng + key sai → 401', res.status === 401, res.status);

  // K3: TK có key riêng + key CHUNG → 401 (key riêng ghi đè key chung)
  const e3 = await mkEnroll('KEY03');
  res = await post(base({ accountNumber: '444555666', content: `SDT 554443 HV ${student.id} COC KEY03` }), 'global-key-xyz');
  json = await res.json();
  const enr3 = await prisma.enrollment.findUnique({ where: { id: e3.id } });
  ok('K3: TK có key riêng + key chung → 401, không kích hoạt', res.status === 401 && enr3?.status === 'PENDING', { st: res.status, enr: enr3?.status });

  // K4: TK không có key riêng + key chung → 200 (fallback)
  const e4 = await mkEnroll('KEY04');
  await prisma.course.update({ where: { id: (await prisma.enrollment.findUnique({ where: { id: e4.id }, include: { course: true } }))!.course.id }, data: { teacherId: teacherA.id } });
  res = await post(base({ accountNumber: '111222333', content: `SDT 554443 HV ${student.id} COC KEY04` }), 'global-key-xyz');
  json = await res.json();
  ok('K4: TK chưa có key riêng + key chung → matched=1 (fallback)', res.status === 200 && json.matched === 1, json);

  // K5: TK lạ + key chung → 200 UNMATCHED (không 401)
  res = await post(base({ accountNumber: '999000111', content: 'chuyen tien test' }), 'global-key-xyz');
  json = await res.json();
  ok('K5: TK lạ + key chung → 200 (UNMATCHED, không 401)', res.status === 200, { st: res.status, msg: json.message });

  // K6: action tạo key chặn non-admin
  const gen = await generateBankWebhookKey(accB.id);
  ok('K6: generateBankWebhookKey không session → bị từ chối', gen.success === false, gen);

  // K7: DB chỉ lưu hash, không lưu plaintext
  const row = await prisma.userBankAccount.findUnique({ where: { id: accB.id } });
  ok('K7: lưu hash SHA-256 (64 hex), không lưu key gốc',
    row?.webhookApiKeyHash === createHash('sha256').update(keyB).digest('hex')
    && !row?.webhookApiKeyHash?.includes(keyB.slice(0, 8))
    && row?.webhookApiKeyHint === keyB.slice(-4), row?.webhookApiKeyHint);

  // K8: thu hồi key → key cũ 401, key chung lại có hiệu lực (fallback)
  await prisma.userBankAccount.update({ where: { id: accB.id }, data: { webhookApiKeyHash: null, webhookApiKeyHint: null } });
  const e8 = await mkEnroll('KEY08');
  res = await post(base({ accountNumber: '444555666', content: `SDT 554443 HV ${student.id} COC KEY08` }), keyB);
  const oldKeyRejected = res.status === 401;
  res = await post(base({ accountNumber: '444555666', content: `SDT 554443 HV ${student.id} COC KEY08` }), 'global-key-xyz');
  json = await res.json();
  ok('K8: thu hồi key → key cũ 401, key chung fallback OK', oldKeyRejected && json.matched === 1, { oldRejected: oldKeyRejected, matched: json.matched });

  // K9: thiếu header → 401
  res = await post(base({ accountNumber: '111222333', content: 'x' }));
  ok('K9: thiếu Authorization → 401', res.status === 401, res.status);

  console.log(`\n==== KẾT QUẢ WEBHOOK-KEY: ${pass} pass, ${fail} fail ====`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
