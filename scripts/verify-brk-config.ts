import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Kiểm tra cấu hình BRK...\n')

  // 1. Check brk_promotion_logic
  const promoConfig = await prisma.systemConfig.findUnique({ where: { key: 'brk_promotion_logic' } })
  if (!promoConfig) {
    console.log('❌ brk_promotion_logic: CHƯA TỒN TẠI')
    console.log('   → Cần tạo: SystemConfig { key: "brk_promotion_logic", value: "B" }')
  } else if (promoConfig.value === 'B') {
    console.log('✅ brk_promotion_logic: "B" (Method B — daily eval)')
  } else if (promoConfig.value === 'A') {
    console.log('⚠️  brk_promotion_logic: "A" (Method A — real-time)')
    console.log('   → Nếu muốn Method B, chạy: switch to B')
  } else {
    console.log(`⚠️  brk_promotion_logic: "${promoConfig.value}" (giá trị không xác định)`)
  }

  // 2. Check SystemTree records
  const systemTrees = await prisma.systemTree.findMany()
  console.log(`\n📋 SystemTree: ${systemTrees.length} hệ thống`)
  for (const st of systemTrees) {
    console.log(`  - onSystem=${st.onSystem}: ${st.nameSystem} (fee=${st.fee}, courseId=${st.courseId ?? 'NULL'}, graceDays=${st.graceDays})`)
  }

  // 3. Check BrkLevelConfig for each system
  console.log('\n📊 BrkLevelConfig:')
  for (const st of systemTrees) {
    const levels = await prisma.brkLevelConfig.findMany({
      where: { systemId: st.onSystem },
      orderBy: { level: 'asc' }
    })
    if (levels.length === 0) {
      console.log(`  ❌ onSystem=${st.onSystem}: CHƯA CÓ level config`)
    } else {
      console.log(`  ✅ onSystem=${st.onSystem}: ${levels.length} levels`)
      for (const l of levels) {
        console.log(`     Level ${l.level}: ${l.pointsRequired} pts, ${l.personalFeePct}% fee, gift=${l.giftValue}`)
      }
    }
  }

  // 4. Check System stats per system
  console.log('\n👥 System members:')
  for (const st of systemTrees) {
    const stats = await prisma.system.groupBy({
      by: ['status'],
      where: { onSystem: st.onSystem },
      _count: { status: true }
    })
    const total = stats.reduce((sum, s) => sum + s._count.status, 0)
    const statusMap = Object.fromEntries(stats.map(s => [s.status, s._count.status]))
    console.log(`  onSystem=${st.onSystem}: ${total} members (${Object.entries(statusMap).map(([k, v]) => `${k}=${v}`).join(', ')})`)
  }

  // 5. Check CRON_SECRET env var
  console.log('\n🔐 Environment:')
  console.log(`  CRON_SECRET: ${process.env.CRON_SECRET ? 'SET' : '❌ CHƯA SET'}`)
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : '❌ CHƯA SET'}`)

  // 6. Check gmail rate limit penalty
  const penalty = await prisma.systemConfig.findUnique({ where: { key: 'gmail_rate_limit_until' } })
  if (penalty && penalty.value) {
    const penaltyTime = new Date(String(penalty.value)).getTime()
    const isExpired = Date.now() > penaltyTime
    console.log(`\n📧 Gmail rate limit: ${isExpired ? '✅ EXPIRED (OK)' : `⏳ ACTIVE until ${penalty.value}`}`)
  } else {
    console.log('\n📧 Gmail rate limit: ✅ Không có penalty')
  }

  // 7. Check AutoVerifyConfig
  const autoConfigs = await prisma.autoVerifyConfig.findMany()
  console.log(`\n🤖 AutoVerifyConfig: ${autoConfigs.length} configs`)
  for (const ac of autoConfigs) {
    console.log(`  - courseId=${ac.courseId}: ${ac.emailFrom} (onSystem=${ac.onSystem ?? 'NULL'}, enabled=${ac.enabled})`)
  }

  console.log('\n✅ Kiểm tra hoàn tất.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
