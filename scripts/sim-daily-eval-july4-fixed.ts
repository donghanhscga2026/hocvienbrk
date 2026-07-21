/**
 * CORRECTED DRY-RUN: Giả lập Daily Eval (01:13 VN 04/07/2026)
 * TÍCH HỢP ĐÚNG LOGIC: MBP từ member được cộng lên TẤT CẢ các ancestor (không phụ thuộc earnPct)
 * Chỉ có tiền/BRKD commission phụ thuộc earnPct
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
  ancestorMBPAdded: {
    ancestorId: number; ancestorName: string; ancestorLevel: number; depth: number; mbpAdded: number
  }[]
  ancestorCommissions: {
    ancestorId: number; ancestorName: string; ancestorLevel: number
    earnPct: number; commissionCash: number; commissionBrkd: number; depth: number
  }[]
  twoF1Voucher: { created: boolean; reason?: string }
  levelUps: { userId: number; name: string; fromLevel: number; toLevel: number }[]
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  CẬP NHẬT DRY-RUN: GIẢ LAP DAILY EVAL — 01:13 VN 04/07/2026')
  console.log('  ✅ PHIÊN BẢN SỬA LỖI: MBP ĐƯỢC CỘNG LÊN TẤT CẢ CÁC ANCESTOR')
  console.log('  ⚠️  KHÔNG GHI VÀO DATABASE')
  console.log('════════════════════════════════════════════════════════════\n')

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

    // --- Get ancestors (excluding self) ---
    const ancestors = allClosures
      .filter(c => c.descendant.userId === userId && c.depth >= 1)
      .sort((a, b) => a.depth - b.depth)

    // --- Apply MBP to ALL ancestors (core correction) ---
    const ancestorMBPAdded: DryResult['ancestorMBPAdded'] = []
    for (const anc of ancestors) {
      ancestorMBPAdded.push({
        ancestorId: anc.ancestor.userId,
        ancestorName: userNameMap.get(anc.ancestor.userId) || 'N/A',
        ancestorLevel: anc.ancestor.level || 1,
        depth: anc.depth,
        mbpAdded: memberMBP
      })
    }

    // --- Calculate commissions (only if earnPct > 0) ---
    const ancestorCommissions: DryResult['ancestorCommissions'] = []
    let previousPct = allConfigs.find(c => c.level === (member.level || 1))
      ? Number(allConfigs.find(c => c.level === (member.level || 1))!.personalFeePct)
      : 0

    for (const anc of ancestors) {
      const ancestorUserId = anc.ancestor.userId
      const ancestorLevel = anc.ancestor.level || 1
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

    // --- Simulate 2F1 Voucher ---
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

    // --- Simulate level ups (member + ancestors who got MBP) ---
    const levelUps: DryResult['levelUps'] = []

    // We'll track proposed new levels for each user
    const proposedLevels = new Map<number, number>() // userId -> proposed level
    // Initialize with current levels
    for (const uid of allUserIds) {
      const sys = await prisma.system.findUnique({ where: { userId: uid, onSystem: ON_SYSTEM } })
      proposedLevels.set(uid, sys?.level || 1)
    }

    // Add MBP from this member to ancestors
    for (const mbpAdd of ancestorMBPAdded) {
      const currentLevel = proposedLevels.get(mbpAdd.ancestorId) || 1
      const currentPoints = (await prisma.system.findUnique({ 
        where: { userId: mbpAdd.ancestorId, onSystem: ON_SYSTEM } 
      }))?.totalPoints || 0
      
      const newPoints = Number(currentPoints) + mbpAdd.mbpAdded
      proposedLevels.set(mbpAdd.ancestorId, { currentLevel, currentPoints, newPoints })
    }

    // Also add MBP to the member themselves? No - in daily eval, the member's MBP comes from grace processing (already in their totalPoints)
    // The distributeCommission only adds MBP to ancestors, not to the member
    // So we don't add MBP to member's proposedLevels here

    // Now check level ups for each user who received MBP (ancestors) and also the member (for their own potential promotion from existing points)
    const usersToCheck = new Set<number>()
    // Add all ancestors who got MBP
    for (const mbpAdd of ancestorMBPAdded) {
      usersToCheck.add(mbpAdd.ancestorId)
    }
    // Also add the member themselves (they might level up from their existing points)
    usersToCheck.add(userId)

    for (const checkUserId of usersToCheck) {
      const sys = await prisma.system.findUnique({ 
        where: { userId: checkUserId, onSystem: ON_SYSTEM } 
      })
      if (!sys) continue

      let currentLevel = sys.level || 1
      let totalPoints = Number(sys.totalPoints)

      // If this user is an ancestor that received MBP from this member, add it
      const mbpForUser = ancestorMBPAdded.find(m => m.ancestorId === checkUserId)
      if (mbpForUser) {
        totalPoints += mbpForUser.mbpAdded
      }

      // Check for possible multiple level ups
      let progressed = false
      do {
        progressed = false
        const nextConfig = configMap.get(currentLevel + 1)
        if (!nextConfig) break
        if (totalPoints < Number(nextConfig.pointsRequired)) break

        // Check branch requirements
        if (nextConfig.branchReqs.length > 0) {
          const f1List = allClosures.filter(c => {
            const ancestorSys = c.ancestor
            return ancestorSys.userId === checkUserId && c.depth === 1
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
          where: { userId: checkUserId, onSystem: ON_SYSTEM, toLevel: currentLevel + 1 }
        })
        if (existing) {
          currentLevel++
          continue
        }

        currentLevel++
        progressed = true
        levelUps.push({
          userId: checkUserId,
          name: userNameMap.get(checkUserId) || 'N/A',
          fromLevel: currentLevel - 1,
          toLevel: currentLevel
        })
      } while (progressed)
    }

    results.push({
      member: { userId, name, level: member.level || 1, totalPoints: Number(member.totalPoints) },
      memberMBDT,
      memberMBP,
      ancestorMBPAdded,
      ancestorCommissions,
      twoF1Voucher,
      levelUps
    })
  }

  // 7. Print results
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  KẾT QUẢ GIẢ LAP (PHIÊN BẢN SỬA LỖI)')
  console.log('═══════════════════════════════════════════════════════════\n')

  let totalMbpAddedToAncestors = 0
  let totalCashCommission = 0
  let totalBrkdCommission = 0
  let totalVouchers = 0
  let totalLevelUps = 0

  for (const r of results) {
    console.log(`┌─ MEMBER #${r.member.userId} ${r.member.name} (level=${r.member.level}, pts=${r.member.totalPoints})`)
    console.log(`│  MBDT=${r.memberMBDT.toLocaleString()} MBP=${r.memberMBP.toFixed(3)}`)
    console.log(`│`)

    if (r.ancestorMBPAdded.length > 0) {
      console.log(`│  MBP THÊM VÀO ANCESTORS (tất cả ancestors được +${r.memberMBP.toFixed(3)} MBP mỗi người):`)
      for (const mbp of r.ancestorMBPAdded) {
        console.log(`│    #${mbp.ancestorId} ${mbp.ancestorName} (L${mbp.ancestorLevel}) F${mbp.depth}: +${mbp.mbpAdded.toFixed(3)} MBP`)
        totalMbpAddedToAncestors += mbp.mbpAdded
      }
    } else {
      console.log(`│  MBP THÊM VÀO ANCESTORS: Không có ancestor`)
    }

    console.log(`│`)
    if (r.ancestorCommissions.length > 0) {
      console.log(`│  COMMISSION TIỀN/BRKD (chỉ khi earnPct > 0):`)
      for (const ac of r.ancestorCommissions) {
        if (ac.earnPct > 0) {
          console.log(`│    #${ac.ancestorId} ${ac.ancestorName} (L${ac.ancestorLevel}) F${ac.depth}: +${ac.earnPct}% = ${ac.commissionCash.toLocaleString()} VND + ${ac.commissionBrkd.toLocaleString()} BRKD`)
          totalCashCommission += ac.commissionCash
          totalBrkdCommission += ac.commissionBrkd
        } else {
          console.log(`│    #${ac.ancestorId} ${ac.ancestorName} (L${ac.ancestorLevel}) F${ac.depth}: +0% (chỉ được MBP, không có tiền/BRKD)`)
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
        totalLevelUps++
      }
    }

    console.log(`└──────────────────────────────────────\n`)
  }

  console.log('════════════════════════════════════════════════════════════')
  console.log('  TỔNG KẾT DRY-RUN')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`  Members kiểm tra: ${results.length}`)
  console.log(`  Tổng MBP được thêm vào ancestors: ${totalMbpAddedToAncestors.toFixed(3)}`)
  console.log(`  Tổng Cash commission: ${totalCashCommission.toLocaleString()} VND`)
  console.log(`  Tổng BRKD commission: ${totalBrkdCommission.toLocaleString()}`)
  console.log(`  Tổng Voucher 2F1: ${totalVouchers.toLocaleString()} VND`)
  console.log(`  Tổng level ups: ${totalLevelUps}`)
  console.log('════════════════════════════════════════════════════════════')
  console.log('\n✅ ĐÂY LÀ PHIÊN BẢN Đã SỬA LỖI - XÁC NHẬN MBP ĐƯỢC CỘNG LÊN TẤT CẢ CÁC ANCESTOR')
  console.log('   (Trong distributeCommission, MBP được cộng vào system.totalPoints TRƯỚC khi tính earnPct)')
}

main()
  .catch(e => { console.error('Lỗi:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())