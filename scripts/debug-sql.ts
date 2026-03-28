import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function debugSql() {
  const rootId = 0;
  // Lấy F1 của root 0
  const f1s = await prisma.user.findMany({
    where: { referrerId: rootId },
    select: { id: true, name: true }
  });
  const f1Ids = f1s.map(f => f.id);
  console.log("F1 IDs of Root 0:", f1Ids);

  if (f1Ids.length === 0) return;

  // Chạy câu lệnh SQL thô đang dùng trong code
  const statsData: any[] = await prisma.$queryRawUnsafe(`
    WITH RECURSIVE sub_tree AS (
        SELECT id, "referrerId" as start_f1_id, 1 as level FROM "User" WHERE "referrerId" IN (${f1Ids.join(',')})
        UNION ALL
        SELECT u.id, st.start_f1_id, st.level + 1 FROM "User" u JOIN sub_tree st ON u."referrerId" = st.id
        WHERE st.level < 50
    )
    SELECT start_f1_id as child_id, COUNT(*)::int as ts, MAX(level)::int as depth FROM sub_tree GROUP BY start_f1_id
  `);

  console.log("\n--- KẾT QUẢ SQL RAW ---");
  console.table(statsData);

  // Kiểm tra riêng cho 150 và 129
  const check150 = statsData.find(d => Number(d.child_id) === 150);
  const check129 = statsData.find(d => Number(d.child_id) === 129);
  
  console.log("\nKiểm tra ID 150:", check150);
  console.log("Kiểm tra ID 129:", check129);
}

debugSql().finally(() => prisma.$disconnect());
