/**
 * DRY-RUN: Giả lập Daily Eval (01:13 VN 04/07/2026)
 * Hiển thị toàn bộ dữ liệu sẽ bị ảnh hưởng mà KHÔNG ghi vào DB.
 *
 * CHẠY: npx tsx scripts/sim-daily-eval-july4.ts
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()
const ON_SYSTEM = 4
const EVAL_TIME = new Date('2026-07-03T18:13:00.000Z') // 01:13 VN 04/07
const MBDT_BASE = 12_000_000

function mbdtToMbp(mbdt: number): number {
  return Math.round((mbdt / MBDT_BASE) * 16 * 1000) / 1000
}

interface DryResult {
  member: { userId: number; name: string; level: number; totalPoints: number }
  memberMBDT: number
  memberMBP: number
  ancestorCommissions: {
    ancestorId: number; ancestorName: string; ancestorLevel: number
    earnPct: number; commissionCash: number; commissionBrkd: number; depth: number
  }[]
  twoF1Voucher: { created: boolean; reason?: string }
  levelUps: { userId: number; name: string; fromLevel: number; toLevel: number }[]
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  DRY-RUN: GIẢ LAP DAILY EVAL — 01:13 VN 04/07/2026')
  console.log('  ⚠️  KHÔNG GHI VÀO DATABASE')
  console.log('═══════════════════════════════════════════════════════════\n')

  // 1. Get system tree
  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: ON_SYSTEM } })
  if (!systemTree) { console.error('System tree not found'); process.exit(1) }
  const fee = Number(systemTree.fee)
  const returnPct = Number(systemTree.returnPct || 21)
  console.log(`Hệ thống #${ON_SYSTEM}: fee=${fee.toLocaleString()} VND, returnPct=${returnPct}%\n`)

  // 2. Get level configs
  const allConfigs = await prisma.brkLevelConfig.findMany({
    where: { systemId: ON_SYSTEM },
    include: { branchReqs: true },
    orderBy: { level: 'asc' }
  })
  const configMap = new Map(allConfigs.map(c => [c.level, c]))
  console.log('Level Configs:')
  for (const c of allConfigs) {
    console.log(`  Level ${c.level}: pts=${c.pointsRequired} personalFeePct=${c.personalFeePct} gift=${c.giftValue}`)
    for (const br of c.branchReqs) {
      console.log(`    BranchReq: level>=${br.branchLevel} x${br.count}`)
    }
  }

  // 3. Find eligible members (grace expired, has RETURN_FEE)
  const allMembers = await prisma.system.findMany({
    where: { onSystem: ON_SYSTEM, status: 'ACTIVE', gracePeriodEnd: { lt: EVAL_TIME } },
  })

  console.log(`\nEligible members: ${allMembers.length}\n`)

  // 4. Build closure map for ancestor lookups
  const allClosures = await prisma.systemClosure.findMany({
    where: { systemId: ON_SYSTEM, depth: { gte: 1 } },
    include: { ancestor: true, descendant: true }
  })

  // 5. Build user name cache
  const allUserIds = new Set<number>()
  allMembers.forEach(m => allUserIds.add(m.userId))
  allClosures.forEach(c => { allUserIds.add(c.ancestor.userId); allUserIds.add(c.descendant.userId) })

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(allUserIds) } },
    select: { id: true, name: true }
  })
  const userNameMap = new Map(users.map(u => [u.id, u.name || 'N/A']))

  const results: DryResult[] = []

  // 6. Simulate each member
  for (const member of allMembers) {
    const userId = member.userId
    const name = userNameMap.get(userId) || 'N/A'
    const returnRefId = `return_fee_sys_${ON_SYSTEM}_user_${userId}`
    const wallet = await prisma.brkWallet.findUnique({ where: { userId } })
    if (!wallet) continue

    // Check RETURN_FEE exists
    const existingReturn = await prisma.brkTransaction.findFirst({
      where: { walletId: wallet.id, type: 'RETURN_FEE', refId: returnRefId }
    })
    if (!existingReturn) continue

    // Get memberMBDT from return BRKD tx
    const returnBrkdRefId = `return_brkd_sys_${ON_SYSTEM}_user_${userId}`
    const returnBrkdTx = await prisma.brkTransaction.findFirst({
      where: { walletId: wallet.id, refId: returnBrkdRefId }
    })
    const memberMBDT = returnBrkdTx ? Math.round(Number(returnBrkdTx.amount) / (returnPct / 100)) : 12_868_686
    const memberMBP = mbdtToMbp(memberMBDT)

    // --- distributeCommission simulation ---
    const memberClosure = allClosures.find(c => c.descendant.userId === userId && c.depth >= 1)
    const ancestors = allClosures
      .filter(c => c.descendant.userId === userId && c.depth >= 1)
      .sort((a, b) => a.depth - b.depth)

    // Simulate level-up propagation: track what each ancestor's level WILL be
    const levelMap = new Map<number, number>() // userId -> simulated level
    levelMap.set(userId, member.level || 1)

    // Get current level for each ancestor
    for (const anc of ancestors) {
      const sys = anc.ancestor
      levelMap.set(sys.userId, sys.level || 1)
    }

    // Compute commission for each ancestor
    const ancestorCommissions: DryResult['ancestorCommissions'] = []
    let previousPct = allConfigs.find(c => c.level === (member.level || 1))
      ? Number(allConfigs.find(c => c.level === (member.level || 1))!.personalFeePct)
      : 0

    for (const anc of ancestors) {
      const ancestorUserId = anc.ancestor.userId
      const ancestorLevel = levelMap.get(ancestorUserId) || 1
      const config = configMap.get(ancestorLevel)
      if (!config) continue

      const uplinePct = Number(config.personalFeePct)
      const earnPct = uplinePct - previousPct
      previousPct = Math.max(previousPct, uplinePct)

      // Check if commission already exists
      const existingTimeline = await prisma.brkTimelineRecord.findFirst({
        where: {
          userId: ancestorUserId,
          onSystem: ON_SYSTEM,
          txType: 'COMMISSION',
          targetMemberId: userId
        }
      })

      if (!existingTimeline && earnPct > 0) {
        const commissionCash = (fee * earnPct) / 100
        const commissionBrkd = Math.round((memberMBDT * earnPct) / 100)
        ancestorCommissions.push({
          ancestorId: ancestorUserId,
          ancestorName: userNameMap.get(ancestorUserId) || 'N/A',
          ancestorLevel,
          earnPct,
          commissionCash,
          commissionBrkd,
          depth: anc.depth
        })
      } else if (!existingTimeline && earnPct === 0) {
        ancestorCommissions.push({
          ancestorId: ancestorUserId,
          ancestorName: userNameMap.get(ancestorUserId) || 'N/A',
          ancestorLevel,
          earnPct: 0,
          commissionCash: 0,
          commissionBrkd: 0,
          depth: anc.depth
        })
      }
    }

    // --- create2F1Voucher simulation ---
    let twoF1Voucher = { created: false, reason: '' }
    if (member.refSysId > 0) {
      const refSys = await prisma.system.findUnique({
        where: { userId_onSystem: { userId: member.refSysId, onSystem: ON_SYSTEM } }
      })
      if (refSys) {
        const f1Count = await prisma.systemClosure.count({
          where: { ancestorId: refSys.autoId, depth: 1, systemId: ON_SYSTEM }
        })
        if (f1Count >= 2) {
          const existing = await prisma.brkReferralBonus.findFirst({
            where: { userId: member.refSysId, onSystem: ON_SYSTEM, claimed: false }
          })
          if (!existing) {
            twoF1Voucher = { created: true, reason: `#${member.refSysId} có ${f1Count} F1 → voucher 386,000` }
          } else {
            twoF1Voucher = { created: false, reason: `#${member.refSysId} đã có voucher chưa claim` }
          }
        } else {
          twoF1Voucher = { created: false, reason: `#${member.refSysId} chỉ có ${f1Count} F1 (cần ≥2)` }
        }
      }
    } else {
      twoF1Voucher = { created: false, reason: 'Không có refSysId' }
    }

    // --- checkAndPromoteLevel simulation (member + ancestors) ---
    const levelUps: DryResult['levelUps'] = []

    // Simulate for each ancestor who got commission
    const toPromote = new Set<number>()
    toPromote.add(userId)
    ancestorCommissions.forEach(ac => toPromote.add(ac.ancestorId))

    for (const promoteUserId of toPromote) {
      const sys = await prisma.system.findUnique({
        where: { userId_onSystem: { userId: promoteUserId, onSystem: ON_SYSTEM } }
      })
      if (!sys) continue

      let currentLevel = levelMap.get(promoteUserId) || sys.level || 1
      let totalPoints = Number(sys.totalPoints)

      // If this is an ancestor that got commission, add the MBP
      const acForUser = ancestorCommissions.find(ac => ac.ancestorId === promoteUserId)
      if (acForUser && acForUser.earnPct > 0) {
        totalPoints += memberMBP
      }
      // If this is the member themselves, they already got MBP from grace processing
      // But actually in daily eval, distributeCommission adds MBP to ancestors, not to the member

      let promoted = false
      while (currentLevel < 8) {
        const nextConfig = configMap.get(currentLevel + 1)
        if (!nextConfig) break
        if (totalPoints < Number(nextConfig.pointsRequired)) break

        // Check branch requirements
        if (nextConfig.branchReqs.length > 0) {
          const f1List = allClosures.filter(c => {
            const ancestorSys = c.ancestor
            return ancestorSys.userId === promoteUserId && c.depth === 1
          })
          let branchPass = true
          for (const req of nextConfig.branchReqs) {
            let branchCount = 0
            for (const f1 of f1List) {
              const f1Sys = await prisma.system.findUnique({ where: { autoId: f1.descendantId } })
              if (f1Sys && f1Sys.level >= req.branchLevel) branchCount++
            }
            if (branchCount < req.count) { branchPass = false; break }
          }
          if (!branchPass) break
        }

        // Check if already recorded
        const existing = await prisma.brkLevelUpRecord.findFirst({
          where: { userId: promoteUserId, onSystem: ON_SYSTEM, toLevel: currentLevel + 1 }
        })
        if (existing) {
          currentLevel++
          continue
        }

        currentLevel++
        promoted = true
        levelUps.push({
          userId: promoteUserId,
          name: userNameMap.get(promoteUserId) || 'N/A',
          fromLevel: currentLevel - 1,
          toLevel: currentLevel
        })

        // Update levelMap for subsequent checks
        levelMap.set(promoteUserId, currentLevel)
      }
    }

    results.push({
      member: { userId, name, level: member.level || 1, totalPoints: Number(member.totalPoints) },
      memberMBDT,
      memberMBP,
      ancestorCommissions,
      twoF1Voucher,
      levelUps
    })
  }

  // 7. Print results
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  KẾT QUẢ GIẢ LAP')
  console.log('═══════════════════════════════════════════════════════════\n')

  let totalCash = 0
  let totalBrkd = 0
  let totalVouchers = 0

  for (const r of results) {
    console.log(`┌─ MEMBER #${r.member.userId} ${r.member.name} (level=${r.member.level}, pts=${r.member.totalPoints})`)
    console.log(`│  MBDT=${r.memberMBDT.toLocaleString()} MBP=${r.memberMBP.toFixed(3)}`)
    console.log(`│`)

    if (r.ancestorCommissions.length > 0) {
      console.log(`│  COMMISSION cho ancestors:`)
      for (const ac of r.ancestorCommissions) {
        if (ac.earnPct > 0) {
          console.log(`│    #${ac.ancestorId} ${ac.ancestorName} (L${ac.ancestorLevel}) F${ac.depth}: +${ac.earnPct}% = ${ac.commissionCash.toLocaleString()} VND + ${ac.commissionBrkd.toLocaleString()} BRKD`)
          totalCash += ac.commissionCash
          totalBrkd += ac.commissionBrkd
        } else {
          console.log(`│    #${ac.ancestorId} ${ac.ancestorName} (L${ac.ancestorLevel}) F${ac.depth}: +0% (tích lũy MBP only)`)
        }
      }
    } else {
      console.log(`│  COMMISSION: Không có ancestor nào`)
    }

    console.log(`│`)
    console.log(`│  2F1 VOUCHER: ${r.twoF1Voucher.created ? '✅ TẠO' : '❌ Không'} — ${r.twoF1Voucher.reason}`)
    if (r.twoF1Voucher.created) totalVouchers += 386000

    if (r.levelUps.length > 0) {
      console.log(`│`)
      console.log(`│  LEVEL UP:`)
      for (const lu of r.levelUps) {
        console.log(`│    🎖️ #${lu.userId} ${lu.name}: ${lu.fromLevel} → ${lu.toLevel}`)
      }
    }

    console.log(`└──────────────────────────────────────\n`)
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('  TỔNG KẾT DRY-RUN')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Members kiểm tra: ${results.length}`)
  console.log(`  Tổng Cash commission: ${totalCash.toLocaleString()} VND`)
  console.log(`  Tổng BRKD commission: ${totalBrkd.toLocaleString()}`)
  console.log(`  Tổng Voucher 2F1: ${totalVouchers.toLocaleString()} VND`)
  console.log(`  Tổng level ups: ${results.reduce((s, r) => s + r.levelUps.length, 0)}`)
  console.log('═══════════════════════════════════════════════════════════')
  console.log('\n⚠️  Đây là DRY-RUN — không có dữ liệu nào được ghi vào DB.')

  // Save to file
  const output = JSON.stringify(results, null, 2)
  fs.mkdirSync('plan_temp', { recursive: true })
  fs.writeFileSync('plan_temp/sim-daily-eval-july4.json', output, 'utf-8')
  console.log(`\n📄 Chi tiết đã lưu: plan_temp/sim-daily-eval-july4.json`)
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
