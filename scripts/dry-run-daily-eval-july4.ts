/**
 * DRY-RUN DAILY EVAL CHUẨN - Dùng logic thật nhưng không ghi DB
 * Đầu ra: plan_temp/dry-run-daily-eval-july4.txt
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()
const ON_SYSTEM = 4
const EVAL_TIME = new Date('2026-07-03T18:13:00.000Z')
const MBDT_BASE = 12_000_000

function mbdtToMbp(mbdt: number): number {
  return Math.round((mbdt / MBDT_BASE) * 16 * 1000) / 1000
}

interface AncestorInfo {
  userId: number
  name: string
  autoId: number
  currentLevel: number
  currentPoints: number
  depth: number
  mbpAdded: number // Từ member hiện tại
}

async function main() {
  console.log('═'.repeat(60))
  console.log('  DRY-RUN DAILY EVAL CHUẨN — 01:13 VN 04/07/2026')
  console.log('═'.repeat(60))
  console.log('  ⚠️ CHỈ MÔ PHỎNG - KHÔNG GHI VÀO DATABASE')
  console.log('═'.repeat(60) + '\n')

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: ON_SYSTEM } })
  if (!systemTree) throw new Error('System tree not found')
  const fee = Number(systemTree.fee)
  console.log(`Hệ thống #${ON_SYSTEM}: fee=${fee.toLocaleString()} VND, returnPct=${systemTree.returnPct}%\n`)

  // Level configs
  const allConfigs = await prisma.brkLevelConfig.findMany({
    where: { systemId: ON_SYSTEM },
    include: { branchReqs: true },
    orderBy: { level: 'asc' }
  })
  const configMap = new Map(allConfigs.map(c => [c.level, c]))

  // Get all closures
  const allClosures = await prisma.systemClosure.findMany({
    where: { systemId: ON_SYSTEM, depth: { gte: 1 } },
    include: { ancestor: true, descendant: true }
  })

  // Get all users in tree
  const allUserIds = new Set<number>()
  allClosures.forEach(c => { allUserIds.add(c.ancestor.userId); allUserIds.add(c.descendant.userId) })
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(allUserIds) } },
    select: { id: true, name: true }
  })
  const userNameMap = new Map(users.map(u => [u.id, u.name || 'N/A']))

  // Get due members
  const dueMembers = await prisma.system.findMany({
    where: {
      onSystem: ON_SYSTEM,
      status: 'ACTIVE',
      gracePeriodEnd: { lt: EVAL_TIME }
    }
  })

  console.log(`Members đủ điều kiện: ${dueMembers.length}\n`)

  // Track all MBP additions for each user
  const mbpContributions: Map<number, number> = new Map() // userId -> total MBP added

  // Process each member
  for (const member of dueMembers) {
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: member.userId } })
    if (!wallet) continue

    const returnRefId = `return_fee_sys_${ON_SYSTEM}_user_${member.userId}`
    const existingReturn = await prisma.brkTransaction.findFirst({
      where: { walletId: wallet.id, type: 'RETURN_FEE', refId: returnRefId }
    })
    if (!existingReturn) continue

    // Get memberMBDT
    const returnBrkdRefId = `return_brkd_sys_${ON_SYSTEM}_user_${member.userId}`
    const returnBrkdTx = await prisma.brkTransaction.findFirst({
      where: { walletId: wallet.id, refId: returnBrkdRefId }
    })
    const memberMBDT = returnBrkdTx ? Math.round(Number(returnBrkdTx.amount) / (Number(systemTree.returnPct || 21) / 100)) : 12_868_686
    const memberMBP = mbdtToMbp(memberMBDT)

    console.log(`\n────── MEMBER #${member.userId} ${userNameMap.get(member.userId)} ──────`)
    console.log(`  MBDT: ${memberMBDT.toLocaleString()} → MBP: ${memberMBP.toFixed(3)}`)

    // Get ancestors
    const ancestors = allClosures
      .filter(c => c.descendant.userId === member.userId)
      .sort((a, b) => a.depth - b.depth)

    // Calculate MBP to add for each ancestor
    for (const anc of ancestors) {
      const ancUserId = anc.ancestor.userId
      const current = mbpContributions.get(ancUserId) || 0
      mbpContributions.set(ancUserId, current + memberMBP)
    }

    // Also add member's own MBP (for level check)
    const memberCurrent = mbpContributions.get(member.userId) || 0
    mbpContributions.set(member.userId, memberCurrent + Number(member.totalPoints))

    // Calculate commissions
    let previousPct = member.level ? Number(configMap.get(member.level)?.personalFeePct || 0) : 0

    for (const anc of ancestors) {
      const ancSys = anc.ancestor
      const ancLevel = ancSys.level || 1
      const config = configMap.get(ancLevel)
      if (!config) continue

      const uplinePct = Number(config.personalFeePct)
      const earnPct = uplinePct - previousPct
      previousPct = Math.max(previousPct, uplinePct)

      const existingTimeline = await prisma.brkTimelineRecord.findFirst({
        where: {
          userId: ancSys.userId,
          onSystem: ON_SYSTEM,
          txType: 'COMMISSION',
          targetMemberId: member.userId
        }
      })

      if (!existingTimeline) {
        const commissionCash = (fee * earnPct) / 100
        const commissionBrkd = Math.round((memberMBDT * earnPct) / 100)

        console.log(`  ANCESTOR #${ancSys.userId} ${userNameMap.get(ancSys.userId)} (F${anc.depth}, L${ancLevel})`)
        console.log(`    earnPct: ${earnPct}% | Cash: ${commissionCash.toLocaleString()} | BRKD: ${commissionBrkd.toLocaleString()}`)
      }
    }
  }

  // Now check level-ups with propagated points
  console.log('\n\n' + '═'.repeat(60))
  console.log('  KẾT QUẢ LEVEL-UP SAU KHI CỘNG MBP')
  console.log('═'.repeat(60))

  const levelUps: string[] = []

  for (const [userId, newPoints] of mbpContributions) {
    const sys = await prisma.system.findUnique({
      where: { userId_onSystem: { userId, onSystem: ON_SYSTEM } }
    })
    if (!sys) continue

    let currentLevel = sys.level || 1
    let totalPoints = newPoints // đã bao gồm cả điểm cũ + MBP được cộng

    console.log(`\n  #${userId} ${userNameMap.get(userId)}:`)
    console.log(`    Current level: ${currentLevel}, Points: ${Number(sys.totalPoints).toFixed(3)}`)
    console.log(`    After MBP: ${totalPoints.toFixed(3)}`)

    while (currentLevel < 8) {
      const nextConfig = configMap.get(currentLevel + 1)
      if (!nextConfig) break
      if (totalPoints < Number(nextConfig.pointsRequired)) break

      // Check branch requirements
      if (nextConfig.branchReqs.length > 0) {
        let branchPass = true
        for (const req of nextConfig.branchReqs) {
          const f1List = allClosures.filter(c => {
            const ancestorSys = c.ancestor
            return ancestorSys.userId === userId && c.depth === 1
          })
          let branchCount = 0
          for (const f1 of f1List) {
            const f1Sys = await prisma.system.findUnique({ where: { autoId: f1.descendantId } })
            if (f1Sys && f1Sys.level >= req.branchLevel) branchCount++
          }
          if (branchCount < req.count) { branchPass = false; break }
        }
        if (!branchPass) break
      }

      const existing = await prisma.brkLevelUpRecord.findFirst({
        where: { userId, onSystem: ON_SYSTEM, toLevel: currentLevel + 1 }
      })
      if (existing) {
        console.log(`    ⚠️ Đã có level-up record cho level ${currentLevel + 1}`)
        break
      }

      currentLevel++
      levelUps.push(`#${userId} ${userNameMap.get(userId)}: ${currentLevel - 1} → ${currentLevel} (points: ${totalPoints.toFixed(3)})`)
      console.log(`    ✓ LEVEL UP: ${currentLevel - 1} → ${currentLevel}`)
    }
  }

  // Summary
  console.log('\n\n' + '═'.repeat(60))
  console.log('  TỔNG KẾT')
  console.log('═'.repeat(60))
  console.log(`  Members xử lý: ${dueMembers.length}`)
  console.log(`  Level-ups dự kiến: ${levelUps.length}`)
  for (const lu of levelUps) {
    console.log(`    ${lu}`)
  }

  // Save output
  const output = [
    '═'.repeat(60),
    '  DRY-RUN DAILY EVAL — 01:13 VN 04/07/2026',
    '═'.repeat(60),
    `Hệ thống: #${ON_SYSTEM}`,
    `Thời gian: ${EVAL_TIME.toISOString()}`,
    `Fee: ${fee} VND, Return %: ${systemTree.returnPct}%`,
    '',
    '═ SYSTEM CHANGES ═',
    `Members đủ điều kiện: ${dueMembers.length}`,
    '',
    '═ LEVEL-UP DỰ KIẾN ═',
    ...levelUps.map(l => `  ${l}`),
    '',
    '═ TỔNG KẾT ═',
    `  Level-ups: ${levelUps.length}`,
    '  ⚠️ Đây là dry-run - không thay đổi DB'
  ].join('\n')

  fs.mkdirSync('plan_temp', { recursive: true })
  fs.writeFileSync('plan_temp/dry-run-daily-eval-july4.txt', output, 'utf-8')
  console.log('\n📄 Output saved: plan_temp/dry-run-daily-eval-july4.txt')
}

main()
  .catch(e => { console.error('❌ Lỗi:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())