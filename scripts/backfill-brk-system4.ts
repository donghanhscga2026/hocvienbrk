import { PrismaClient } from '@prisma/client'
import { resolvePlacement } from '../lib/brk/placement-rules'
import { ensureBrkWallet } from '../lib/brk/wallet-service'
import { addUserToSystemClosure } from '../lib/system-closure-helpers'
import { distributeCommission } from '../lib/brk/commission-calculator'
import { checkAndPromoteLevel } from '../lib/brk/level-manager'

const BRKP_PER_ACTIVATION = 17

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Backfill BRK system #4...')

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: 4 } })
  if (!systemTree) { console.log('❌ SystemTree #4 not found'); return }
  console.log(`✅ SystemTree #4: fee=${systemTree.fee}, pointsPerDollar=${systemTree.pointsPerDollar}`)

  const fee = Number(systemTree.fee)

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: 22, status: 'ACTIVE' },
    include: {
      user: { select: { id: true, name: true, referrerId: true } },
      payment: { select: { status: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`📋 Total enrollments to process: ${enrollments.length}`)

  for (const enrollment of enrollments) {
    const userId = enrollment.userId
    const userName = enrollment.user.name || `#${userId}`

    const existing = await prisma.system.findUnique({
      where: { userId_onSystem: { userId, onSystem: 4 } }
    })
    if (existing) {
      console.log(`  ⏭ user#${userId} ${userName} — already in system, skip`)
      continue
    }

    try {
      const now = new Date()
      const graceEnd = new Date(now.getTime() + systemTree.graceDays * 24 * 60 * 60 * 1000)
      const expiresAt = new Date(now.getTime() + systemTree.durationDays * 24 * 60 * 60 * 1000)

      const refSysId = await resolvePlacement(4, enrollment.user.referrerId)
      console.log(`  🔗 user#${userId} ${userName} → refSysId=${refSysId}`)

      const system = await prisma.system.create({
        data: {
          userId,
          onSystem: 4,
          refSysId,
          status: 'ACTIVE',
          activatedAt: now,
          gracePeriodEnd: graceEnd,
          expiresAt,
          level: 1,
        }
      })

      await addUserToSystemClosure(userId, refSysId, 4)
      await ensureBrkWallet(userId)

      await prisma.system.update({
        where: { autoId: system.autoId },
        data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
      })

      await distributeCommission(userId, 4, fee, systemTree)
      await checkAndPromoteLevel(userId, 4)

      console.log(`  ✅ user#${userId} ${userName} — activated (autoId=${system.autoId}, level=1, +${BRKP_PER_ACTIVATION}pts)`)
    } catch (err: any) {
      console.error(`  ❌ user#${userId} ${userName} — error:`, err.message)
    }
  }

  const total = await prisma.system.count({ where: { onSystem: 4 } })
  const rootCount = await prisma.system.count({ where: { onSystem: 4, refSysId: 0 } })
  console.log(`\n🎉 Done! Total System records: ${total}, Root nodes: ${rootCount}`)
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
