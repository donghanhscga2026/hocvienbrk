/**
 * E2E test cho Phase 2: AutoVerifyConfig (chạy trên DB test local).
 * Chạy: DATABASE_URL=... DIRECT_URL=... npx tsx scripts/e2e-autoverify-test.ts
 */
import prisma from '../lib/prisma';
import {
  getBankSenderDefaults,
  getAutoVerifyConfigs,
  getCoursesWithoutAutoVerify,
  upsertAutoVerifyConfig,
  deleteAutoVerifyConfig,
} from '../app/actions/auto-verify-actions';

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, extra?: any) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}`, extra ?? ''); }
}

async function main() {
  // ---- Seed ----
  await prisma.autoVerifyConfig.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.userBankAccount.deleteMany();
  await prisma.user.deleteMany();

  // P1: helper mặc định theo ngân hàng
  const saco = getBankSenderDefaults('Sacombank');
  ok('P1: Sacombank → bật + đúng email người gửi', saco.enabled && saco.emailFrom === 'info@sacombank.com.vn' && saco.emailQuery.length > 0, saco);
  const vcb = getBankSenderDefaults('Vietcombank');
  ok('P2: ngân hàng chưa biết → TẮT, để trống email', !vcb.enabled && vcb.emailFrom === '' && vcb.bankName === 'Vietcombank', vcb);
  const none = getBankSenderDefaults(null);
  ok('P3: không có tên ngân hàng → TẮT', !none.enabled, none);
  const lower = getBankSenderDefaults('sacombank');
  ok('P4: không phân biệt hoa/thường', lower.enabled && lower.emailFrom === 'info@sacombank.com.vn');

  // P5: actions chặn khi không có session admin
  const r5a = await getAutoVerifyConfigs();
  ok('P5a: getAutoVerifyConfigs không session → từ chối', r5a.success === false);
  const r5b = await upsertAutoVerifyConfig({ courseId: 1, emailFrom: 'a@b.c', emailQuery: '', bankName: 'X', enabled: true });
  ok('P5b: upsertAutoVerifyConfig không session → từ chối', r5b.success === false);
  const r5c = await deleteAutoVerifyConfig(1);
  ok('P5c: deleteAutoVerifyConfig không session → từ chối', r5c.success === false);
  const r5d = await getCoursesWithoutAutoVerify();
  ok('P5d: getCoursesWithoutAutoVerify không session → từ chối', r5d.success === false);

  // P6: mô phỏng logic tự tạo config khi tạo khóa học (y hệt course-actions.ts)
  const teacher = await prisma.user.create({ data: { email: 'gv2@test.vn', name: 'GV2', role: 'TEACHER' } });
  const bankSaco = await prisma.userBankAccount.create({
    data: { userId: teacher.id, accountHolder: 'GV2', accountNumber: '111222333', bankName: 'Sacombank' }
  });
  const bankVcb = await prisma.userBankAccount.create({
    data: { userId: teacher.id, accountHolder: 'GV2', accountNumber: '444555666', bankName: 'Vietcombank' }
  });
  const course1 = await prisma.course.create({
    data: { id_khoa: 'AUTO1', name_lop: 'Lớp Auto 1', teacherId: teacher.id, teacherBankAccountId: bankSaco.id, phi_coc: 300000 }
  });
  const course2 = await prisma.course.create({
    data: { id_khoa: 'AUTO2', name_lop: 'Lớp Auto 2', teacherId: teacher.id, teacherBankAccountId: bankVcb.id, phi_coc: 300000 }
  });

  async function simulateAutoCreate(courseId: number, bankAccountId: number) {
    const bankAcc = await prisma.userBankAccount.findUnique({ where: { id: bankAccountId } });
    const defaults = getBankSenderDefaults(bankAcc?.bankName);
    await prisma.autoVerifyConfig.upsert({
      where: { courseId },
      create: { courseId, emailFrom: defaults.emailFrom, emailQuery: defaults.emailQuery, bankName: defaults.bankName, enabled: defaults.enabled },
      update: {}
    });
  }
  await simulateAutoCreate(course1.id, bankSaco.id);
  await simulateAutoCreate(course2.id, bankVcb.id);

  const cfg1 = await prisma.autoVerifyConfig.findUnique({ where: { courseId: course1.id } });
  ok('P6a: khóa Sacombank → config BẬT, đủ email', !!cfg1 && cfg1.enabled && cfg1.emailFrom === 'info@sacombank.com.vn', cfg1);
  const cfg2 = await prisma.autoVerifyConfig.findUnique({ where: { courseId: course2.id } });
  ok('P6b: khóa Vietcombank → config TẮT chờ admin điền', !!cfg2 && !cfg2.enabled && cfg2.bankName === 'Vietcombank', cfg2);

  // P7: upsert lần 2 không tạo trùng (unique theo courseId)
  await simulateAutoCreate(course1.id, bankSaco.id);
  const count1 = await prisma.autoVerifyConfig.count({ where: { courseId: course1.id } });
  ok('P7: tạo lại không trùng bản ghi', count1 === 1, count1);

  // P8: Gmail query build đúng format from: + query
  const query = `from:${cfg1!.emailFrom} ${cfg1!.emailQuery}`;
  ok('P8: query quét email đúng định dạng', query === 'from:info@sacombank.com.vn "thong bao giao dich"', query);

  console.log(`\n==== KẾT QUẢ PHASE 2: ${pass} pass, ${fail} fail ====`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
