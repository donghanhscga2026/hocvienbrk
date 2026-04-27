
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportToCSV() {
  const systemId = 1; // TCA
  const dir = path.join(process.cwd(), 'plan_temp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  console.log('Đang trích xuất dữ liệu thô...');

  // 1. Xuất Bảng Membership (Thành viên)
  const membership = await prisma.system.findMany({ where: { onSystem: systemId } });
  const memCsv = [
    'autoId,userId,refSysId,onSystem',
    ...membership.map(m => `${m.autoId},${m.userId},${m.refSysId},${m.onSystem}`)
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'tca_1_membership.csv'), '\ufeff' + memCsv, 'utf-8');

  // 2. Xuất Bảng Relationships (Quan hệ thứ bậc)
  const relationships = await prisma.systemClosure.findMany({ where: { systemId } });
  const relCsv = [
    'ancestorId,descendantId,depth,systemId',
    ...relationships.map(r => `${r.ancestorId},${r.descendantId},${r.depth},${r.systemId}`)
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'tca_2_relationships.csv'), '\ufeff' + relCsv, 'utf-8');

  // 3. Xuất Bảng Business Data (Dữ liệu kinh doanh)
  const userIds = membership.map(m => m.userId);
  const business = await (prisma as any).tCAMember.findMany({
    where: { OR: [{ userId: { in: userIds } }, { tcaId: { in: userIds } }] }
  });
  const busCsv = [
    'userId,level,personalScore,totalScore,groupName,name,chuc_danh',
    ...business.map((b: any) => `${b.userId},${b.level || 0},${Number(b.personalScore || 0)},${Number(b.totalScore || 0)},"${b.groupName || ''}","${b.name || ''}","${b.chuc_danh || ''}"`)
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'tca_3_business_data.csv'), '\ufeff' + busCsv, 'utf-8');

  console.log('\n--- XUẤT FILE THÀNH CÔNG ---');
  console.log('Bạn có thể mở các file sau bằng Excel:');
  console.log('1. plan_temp/tca_1_membership.csv (Danh sách thành viên & Người bảo trợ)');
  console.log('2. plan_temp/tca_2_relationships.csv (Toàn bộ quan hệ Ông-Cháu-Chắt)');
  console.log('3. plan_temp/tca_3_business_data.csv (Cấp bậc & Điểm số thực tế)');
}

exportToCSV()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
