/**
 * DRY-RUN DAILY EVAL - CHẠY LOGIC THẬT NHƯNG CHỈ IN RA KẾT QUẢ
 * KHÔNG GHI VÀO DATABASE
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()
const ON_SYSTEM = 4
const EVAL_TIME = new Date('2026-07-03T18:13:00.000Z') // 01:13 VN 04/07

async function getMemberMBDT(member: any, systemTree: any): Promise<number> {
  const returnPct = Number(systemTree.returnPct || 21)
  const wallet = await prisma.brkWallet.findUnique({ where: { userId: member.userId } })
  if (!wallet) return 12_868_686

  const returnBrkdRefId = `return_brkd_sys_${ON_SYSTEM}_user_${member.userId}`
  const returnBrkdTx = await prisma.brkTransaction.findFirst({
    where: { walletId: wallet.id, refId: returnBrkdRefId }
  })
  return returnBrkdTx ? Math.round(Number(returnBrkdTx.amount) / (returnPct / 100)) : 12_868_686
}

async function main() {
  console.log('═'.repeat(60))
  console.log('  DRY-RUN DAILY EVAL — 01:13 VN 04/07/2026')
  console.log('═'.repeat(60))
  console.log('  ⚠️ CHỈ MÔ PHỎNG - KHÔNG GHI VÀO DATABASE')
  console.log('═'.repeat(60) + '\n')

  // Lấy system tree
  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: ON_SYSTEM } })
  if (!systemTree) throw new Error('System tree not found')
  const fee = Number(systemTree.fee)
  console.log(`Hệ thống #${ON_SYSTEM}: fee=${fee.toLocaleString()} VND, returnPct=${systemTree.returnPct}%\n`)

  // Lấy level configs
  const allConfigs = await prisma.brkLevelConfig.findMany({
    where: { systemId: ON_SYSTEM },
    include: { branchReqs: true },
    orderBy: { level: 'asc' }
  })
  const configMap = new Map(allConfigs.map(c => [c.level, c]))

  // Lấy due members
  const dueMembers = await prisma.system.findMany({
    where: {
      onSystem: ON_SYSTEM,
      status: 'ACTIVE',
      gracePeriodEnd: { lt: EVAL_TIME }
    }
  })

  console.log(`Members đủ điều kiện: ${dueMembers.length}\n`)

  // Cache user names
  const allUserIds = new Set<number>()
  dueMembers.forEach(m => allUserIds.add(m.userId))

  // Get closures for ancestor lookups
  const allClosures = await prisma.systemClosure.findMany({
    where: { systemId: ON_SYSTEM, depth: { gte: 1 } },
    include: { ancestor: true, descendant: true }
  })

  // Add ancestor userIds
  allClosures.forEach(c => allUserIds.add(c.ancestor.userId))

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(allUserIds) } },
    select: { id: true, name: true }
  })
  const userNameMap = new Map(users.map(u => [u.id, u.name || 'N/A']))

  // Track proposed changes
  const changes: string[] = []

  for (const member of dueMembers) {
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: member.userId } })
    if (!wallet) continue

    // Check RETURN_FEE exists
    const returnRefId = `return_fee_sys_${ON_SYSTEM}_user_${member.userId}`
    const existingReturn = await prisma.brkTransaction.findFirst({
      where: { walletId: wallet.id, type: 'RETURN_FEE', refId: returnRefId }
    })
    if (!existingReturn) continue

    const memberMBDT = await getMemberMBDT(member, systemTree)
    const memberMBP = Math.round((memberMBDT / 12000000) * 16 * 1000) / 1000

    changes.push(`\n───────── MEMBER #${member.userId} ${userNameMap.get(member.userId) || '?'} ─────────`)
    changes.push(`  Level: ${member.level}, Points: ${member.totalPoints}`)
    changes.push(`  MBDT: ${memberMBDT.toLocaleString()}, MBP: ${memberMBP.toFixed(3)}`)

    // Find ancestors
    const ancestors = allClosures
      .filter(c => c.descendant.userId === member.userId)
      .sort((a, b) => a.depth - b.depth)

    // Calculate promotions
    let previousPct = member.level ? Number(configMap.get(member.level)?.personalFeePct || 0) : 0

    for (const anc of ancestors) {
      const ancSys = anc.ancestor
      const ancLevel = ancSys.level || 1
      const config = configMap.get(ancLevel)
      if (!config) continue

      const uplinePct = Number(config.personalFeePct)
      const earnPct = uplinePct - previousPct
      previousPct = Math.max(previousPct, uplinePct)

      // Check if timeline already exists
      const existingTimeline = await prisma.brkTimelineRecord.findFirst({
        where: {
          userId: ancSys.userId,
          onSystem: ON_SYSTEM,
          txType: 'COMMISSION',
          targetMemberId: member.userId
        }
      })

      const mbpAdded = memberMBP
      const commissionCash = (fee * earnPct) / 100
      const commissionBrkd = Math.round((memberMBDT * earnPct) / 100)

      changes.push(`\n  🔄 ANCESTOR #${ancSys.userId} ${userNameMap.get(ancSys.userId) || '?'} (F${anc.depth}, Level ${ancLevel})`)
      changes.push(`     MBP +${mbpAdded.toFixed(3)} → Points mới: ${Number(ancSys.totalPoints) + mbpAdded}`)
      if (earnPct > 0) {
        changes.push(`     Commission: +${earnPct}% = ${commissionCash.toLocaleString()} VND + ${commissionBrkd.toLocaleString()} BRKD`)
      } else {
        changes.push(`     Commission: 0% (chỉ được MBP)`)
      }
    }

    // Check 2F1 voucher
    if (member.refSysId > 0) {
      const f1Count = await prisma.systemClosure.count({
        where: { ancestorId: member.autoId, depth: 1, systemId: ON_SYSTEM }
      })
      const existingVoucher = await prisma.brkReferralBonus.findFirst({
        where: { userId: member.refSysId, onSystem: ON_SYSTEM, claimed: false }
      })
      if (f1Count >= 2 && !existingVoucher) {
        changes.push(`\n  🎁 2F1 VOUCHER TẠO Cho parent #${member.refSysId} (${f1Count} F1)`)
      }
    }
  }

  // Save to file
  const output = changes.join('\n')
  fs.mkdirSync('plan_temp', { recursive: true })
  fs.writeFileSync('plan_temp/dry-run-daily-eval-output.txt', output, 'utf-8')
  
  console.log(output)
  console.log('\n📄 Output saved: plan_temp/dry-run-daily-eval-output.txt')
}

main()
  .catch(e => { console.error('❌ Lỗi:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())