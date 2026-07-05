import { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { resolvePlacement } from '../lib/brk/placement-rules'
import { ensureBrkWallet } from '../lib/brk/wallet-service'
import { addUserToSystemClosure } from '../lib/system-closure-helpers'
import { distributeCommission } from '../lib/brk/commission-calculator'
import { checkAndPromoteLevel } from '../lib/brk/level-manager'

const BRKP_PER_ACTIVATION = 17

const prisma = new PrismaClient()

// HoW MANY PROCESSED SO FAR (for logging)
let processedCount = 0

async function cleanup() {
  console.log('🧹 Cleaning up old data for onSystem=4...')

  const userIds = (await prisma.system.findMany({
    where: { onSystem: 4 },
    select: { userId: true }
  })).map(r => r.userId)

  if (userIds.length === 0) {
    console.log('  No existing data to clean.')
    return
  }

  // 1. Delete system_closure (systemId=4)
  const clsDel = await prisma.systemClosure.deleteMany({ where: { systemId: 4 } })
  console.log(`  Deleted ${clsDel.count} system_closure records`)

  // 2. Delete brk_level_up_record (onSystem=4)
  const lvlDel = await prisma.brkLevelUpRecord.deleteMany({ where: { onSystem: 4 } })
  console.log(`  Deleted ${lvlDel.count} brk_level_up_record records`)

  // 3. Delete brk_referral_bonus (onSystem=4)
  const refDel = await prisma.brkReferralBonus.deleteMany({ where: { onSystem: 4 } })
  console.log(`  Deleted ${refDel.count} brk_referral_bonus records`)

  // 4. Delete brk_transaction via wallets of these users
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: userIds } }
  })
  if (wallets.length > 0) {
    const txnDel = await prisma.brkTransaction.deleteMany({
      where: { walletId: { in: wallets.map(w => w.id) } }
    })
    console.log(`  Deleted ${txnDel.count} brk_transaction records`)

    // 4b. Reset wallet balances to 0 (keep wallet records, just zero out)
    await prisma.$executeRaw(
      Prisma.sql`UPDATE "brk_wallet" SET balance = 0, brkd = 0, "voucherBalance" = 0, "totalEarned" = 0, "totalWithdrawn" = 0 WHERE id IN (${Prisma.join(wallets.map(w => w.id))})`
    )
    console.log(`  Reset ${wallets.length} wallet balances to 0`)
  }

  // 5. Delete system records (onSystem=4)
  const sysDel = await prisma.system.deleteMany({ where: { onSystem: 4 } })
  console.log(`  Deleted ${sysDel.count} system records`)

  console.log('  ✅ Cleanup complete.')
}

async function backfill() {
  console.log('\n🚀 Backfilling BRK system #4 (corrected tree)...')

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: 4 } })
  if (!systemTree) { console.log('❌ SystemTree #4 not found'); return }
  const fee = Number(systemTree.fee)
  console.log(`  fee=${fee}, pointsPerDollar=${systemTree.pointsPerDollar}`)

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: 22, status: 'ACTIVE' },
    include: {
      user: { select: { id: true, name: true, referrerId: true } },
      payment: { select: { transferTime: true, verifiedAt: true } },
    },
  })

  // Sort by: transferTime (bank time) → verifiedAt (system time) → createdAt (enrollment time)
  enrollments.sort((a, b) => {
    const ta = a.payment?.transferTime || a.payment?.verifiedAt || a.createdAt
    const tb = b.payment?.transferTime || b.payment?.verifiedAt || b.createdAt
    return ta.getTime() - tb.getTime()
  })

  console.log(`  Processing ${enrollments.length} enrollments...`)
  enrollments.forEach((e, i) => {
    const t = e.payment?.transferTime || e.payment?.verifiedAt || e.createdAt
    console.log(`  [${i + 1}] uid=${e.userId} ${e.user.name || '?'} time=${t.toISOString().slice(11, 19)} (${e.payment?.transferTime ? 'transfer' : e.payment?.verifiedAt ? 'verified' : 'enrolled'})`)
  })

  for (const enrollment of enrollments) {
    const userId = enrollment.userId
    const userName = enrollment.user.name || `#${userId}`
    const activatedAt = enrollment.payment?.transferTime || enrollment.payment?.verifiedAt || enrollment.createdAt

    try {
      const graceEnd = new Date(activatedAt.getTime() + systemTree.graceDays * 24 * 60 * 60 * 1000)
      const expiresAt = new Date(activatedAt.getTime() + systemTree.durationDays * 24 * 60 * 60 * 1000)

      // Root guard: first enrollment ALWAYS becomes root
      processedCount++
      let refSysId: number
      if (processedCount === 1) {
        refSysId = 0
        console.log(`  👑 user#${userId} ${userName} → FORCED ROOT`)
      } else {
        const effectiveReferrer = enrollment.referrerId || enrollment.user.referrerId
        refSysId = await resolvePlacement(4, effectiveReferrer)
        console.log(`  🔗 user#${userId} ${userName} → refSysId=${refSysId}`)
      }

      const system = await prisma.system.create({
        data: {
          userId,
          onSystem: 4,
          refSysId,
          status: 'ACTIVE',
          activatedAt,
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
  const closureCount = await prisma.systemClosure.count({ where: { systemId: 4 } })
  console.log(`\n🎉 Done! Systems: ${total}, Roots: ${rootCount}, Closures: ${closureCount}`)
}

async function main() {
  await cleanup()
  await backfill()
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
