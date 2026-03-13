
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFlowAndUser() {
  console.log('🔍 ĐANG KIỂM TRA HỆ THỐNG...');

  // 1. Kiểm tra bài khảo sát đang Active
  const activeSurvey = await prisma.survey.findFirst({ where: { isActive: true } });
  if (!activeSurvey) {
    console.log('⚠️ CẢNH BÁO: Không có bài khảo sát nào đang Active!');
  } else {
    console.log(`✅ Bài khảo sát đang chạy: "${activeSurvey.name}"`);
    const flow = activeSurvey.flow;
    console.log(`📊 Sơ đồ có: ${flow.nodes?.length} nodes, ${flow.edges?.length} edges`);
    
    // Kiểm tra xem có Node khóa học nào không
    const courseNodes = flow.nodes?.filter(n => n.type === 'courseNode');
    console.log(`🎓 Số lượng khóa học có trong sơ đồ: ${courseNodes?.length}`);
  }

  // 2. Kiểm tra User gần nhất làm khảo sát
  const lastUser = await prisma.user.findFirst({
    where: { NOT: { customPath: null } },
    orderBy: { updatedAt: 'desc' },
    select: { name: true, customPath: true, goal: true, surveyResults: true }
  });

  if (lastUser) {
    console.log('👤 NGƯỜI DÙNG MỚI NHẤT CÓ LỘ TRÌNH:');
    console.log(`- Tên: ${lastUser.name}`);
    console.log(`- Lộ trình (ID): ${JSON.stringify(lastUser.customPath)}`);
    console.log(`- Mục tiêu: ${lastUser.goal}`);
  } else {
    console.log('❌ Chưa có User nào lưu được lộ trình trong Database.');
  }
}

checkFlowAndUser()
  .finally(() => prisma.$disconnect());
