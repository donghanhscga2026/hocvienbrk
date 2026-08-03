/**
 * SWAP-MEMBERS.CJS — Hoán đổi vị trí 2 thành viên trong System #4 (MB TCA)
 *
 * Case: #1172 bị đặt nhầm dưới #974 (do referrer rỗng → BFS từ root),
 * trong khi #1174 đã chiếm slot F1 thứ 4 của #379.
 * → Hoán đổi: #1172 xuống dưới #379, #1174 về chỗ cũ của #1172 (dưới #974).
 *
 * Bù trừ đầy đủ:
 *   - Đảo hoa hồng/BRKD đã trả cho ancestors cũ (#1010: 8.463,42đ + 4.121.242 BRKD)
 *   - Điều chỉnh aggregate (officialTeamSize, totalMbdtVolume, totalCashVolume, totalPoints)
 *     trên ancestors cũ (trừ) và mới (cộng)
 *   - Phân phối lại hoa hồng cho chain mới theo MB TCA system #4
 *   - Swap closure + refSysId
 *   - Re-check level + audit log
 *
 * Usage:
 *   node scripts/swap-members.cjs            # DRY-RUN (mặc định)
 *   node scripts/swap-members.cjs --execute  # GHI DB
 *   node scripts/swap-members.cjs --admin 0  # ghi adminId vào audit log (mặc định 0)
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { parseArgs } = require('util')

const prisma = new PrismaClient()

const SYSTEM_ID = 4
const MBDT_BASE = 12_000_000
const FEE = 26868

// ── Cấu hình swap ──
const SWAP = {
  // Member chính: có volume → cần bù trừ đầy đủ
  a: { userId: 1172, newParentUserId: 379 },
  // Member trao đổi: volume = 0 → chỉ đổi vị trí, không bù trừ
  b: { userId: 1174, newParentUserId: 974 },
}

function mbdtToMbp(mbdt) {
  return Math.round((mbdt / MBDT_BASE) * 16 * 1000) / 1000
}

function getLevelConfigs() {
  return prisma.brkLevelConfig.findMany({
    where: { systemId: SYSTEM_ID },
    orderBy: { level: 'asc' },
    select: { level: true, pointsRequired: true, personalFeePct: true, giftValue: true },
  })
}

function highestQualifiedLevel(configs, points) {
  let lv = 0
  for (const c of configs) {
    if (points >= Number(c.pointsRequired)) lv = c.level
  }
  return lv
}

async function getSystem(userId) {
  return prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem: SYSTEM_ID } },
  })
}

async function getAncestorUserIds(autoId) {
  const closures = await prisma.systemClosure.findMany({
    where: { descendantId: autoId, depth: { gte: 1 }, systemId: SYSTEM_ID },
    orderBy: { depth: 'asc' },
    select: { ancestorId: true, depth: true },
  })
  if (closures.length === 0) return []
  const sys = await prisma.system.findMany({
    where: { autoId: { in: closures.map((c) => c.ancestorId) }, onSystem: SYSTEM_ID },
    select: { autoId: true, userId: true, level: true },
  })
  const sysByAuto = new Map(sys.map((s) => [s.autoId, s]))
  return closures
    .map((c) => ({ userId: sysByAuto.get(c.ancestorId)?.userId, level: sysByAuto.get(c.ancestorId)?.level, depth: c.depth }))
    .filter((c) => c.userId != null)
}

async function getCommissionTxsForMember(memberUserId) {
  const ancestors = await getAncestorUserIds((await getSystem(memberUserId)).autoId)
  const ancestorIds = ancestors.map((a) => a.userId)
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: ancestorIds } },
    select: { id: true, userId: true, balance: true, brkd: true },
  })
  const results = []
  for (const w of wallets) {
    const txs = await prisma.brkTransaction.findMany({
      where: {
        walletId: w.id,
        description: { contains: `#${memberUserId}` },
        type: { in: ['COMMISSION', 'BRKD_CREDIT'] },
      },
      select: { id: true, amount: true, type: true, balanceType: true, description: true, createdAt: true },
    })
    for (const t of txs) {
      results.push({ ...t, userId: w.userId, amount: Number(t.amount), walletId: w.id })
    }
  }
  return results
}

async function creditWallet(userId, amount, balanceType, type, description, refId, applicationId, sourceMemberId) {
  const wallet = await prisma.brkWallet.findUnique({ where: { userId } })
  if (!wallet) throw new Error(`Wallet #${userId} not found`)
  const field = balanceType === 'BRKD' ? 'brkd' : balanceType === 'MBV' ? 'mbvBalance' : balanceType === 'VOUCHER' ? 'voucherBalance' : 'balance'
  const oldVal = Number(wallet[field])
  const newVal = oldVal + amount
  const updateData = { [field]: newVal }
  if (balanceType === 'CASH') updateData.totalEarned = { increment: amount }
  await prisma.brkWallet.update({ where: { userId }, data: updateData })
  await prisma.brkTransaction.create({
    data: {
      walletId: wallet.id,
      amount,
      type,
      description,
      refId,
      sourceMemberId,
      applicationId,
      balanceType,
      balanceBefore: oldVal,
      balanceAfter: newVal,
    },
  })
  return { oldVal, newVal }
}

async function debitWallet(userId, amount, balanceType, description, refId, applicationId, sourceMemberId) {
  const wallet = await prisma.brkWallet.findUnique({ where: { userId } })
  if (!wallet) throw new Error(`Wallet #${userId} not found`)
  const field = balanceType === 'BRKD' ? 'brkd' : balanceType === 'MBV' ? 'mbvBalance' : balanceType === 'VOUCHER' ? 'voucherBalance' : 'balance'
  const oldVal = Number(wallet[field])
  const actual = Math.min(amount, Math.max(0, oldVal))
  const shortfall = amount - actual
  const newVal = oldVal - actual
  const updateData = { [field]: newVal }
  if (balanceType === 'CASH' && actual > 0) updateData.totalEarned = { decrement: actual }
  if (actual > 0) {
    await prisma.brkWallet.update({ where: { userId }, data: updateData })
    await prisma.brkTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -actual,
        type: 'ADJUSTMENT',
        description,
        refId,
        sourceMemberId,
        applicationId,
        balanceType,
        balanceBefore: oldVal,
        balanceAfter: newVal,
      },
    })
  }
  return { debited: actual, shortfall }
}

async function rebuildClosure(userId, newRefSysId) {
  const sys = await getSystem(userId)
  if (!sys) throw new Error(`System #${userId} not found`)
  await prisma.systemClosure.upsert({
    where: { ancestorId_descendantId_systemId: { ancestorId: sys.autoId, descendantId: sys.autoId, systemId: SYSTEM_ID } },
    update: { depth: 0, applicationId: sys.applicationId ?? null },
    create: { ancestorId: sys.autoId, descendantId: sys.autoId, depth: 0, systemId: SYSTEM_ID, applicationId: sys.applicationId ?? null },
  })
  await prisma.systemClosure.deleteMany({
    where: { descendantId: sys.autoId, depth: { gt: 0 }, systemId: SYSTEM_ID },
  })
  await prisma.system.update({
    where: { userId_onSystem: { userId, onSystem: SYSTEM_ID } },
    data: { refSysId: newRefSysId },
  })
  if (newRefSysId > 0) {
    const parent = await getSystem(newRefSysId)
    if (parent) {
      const ancestors = await prisma.systemClosure.findMany({
        where: { systemId: SYSTEM_ID, descendantId: parent.autoId, applicationId: sys.applicationId ?? null },
        orderBy: { depth: 'desc' },
      })
      for (const a of ancestors) {
        await prisma.systemClosure.upsert({
          where: { ancestorId_descendantId_systemId: { ancestorId: a.ancestorId, descendantId: sys.autoId, systemId: SYSTEM_ID } },
          update: { depth: a.depth + 1, applicationId: sys.applicationId ?? null },
          create: { ancestorId: a.ancestorId, descendantId: sys.autoId, depth: a.depth + 1, systemId: SYSTEM_ID, applicationId: sys.applicationId ?? null },
        })
      }
    }
  }
  return sys.autoId
}

async function createTimeline(userId, data) {
  const [system, wallet] = await Promise.all([
    prisma.system.findUnique({ where: { userId_onSystem: { userId, onSystem: SYSTEM_ID } } }),
    prisma.brkWallet.findUnique({ where: { userId } }),
  ])
  return prisma.brkTimelineRecord.create({
    data: {
      userId,
      onSystem: SYSTEM_ID,
      type: data.type || 'TRANSACTION',
      time: data.time || new Date(),
      title: data.title,
      description: data.description,
      accumulatedCash: wallet ? Number(wallet.balance) : 0,
      accumulatedBrkd: wallet ? Number(wallet.brkd) : 0,
      accumulatedBrkp: system ? Number(system.totalPoints) : 0,
      accumulatedTeamSize: system ? system.officialTeamSize : 0,
      accumulatedBrkdVolume: system ? Number(system.totalMbdtVolume) : 0,
      accumulatedCashVolume: system ? Number(system.totalCashVolume) : 0,
      amountCash: data.amountCash ?? 0,
      amountBrkd: data.amountBrkd ?? 0,
      amountVoucher: 0,
      txType: data.txType,
      targetMemberId: data.targetMemberId,
      targetMemberName: data.targetMemberName,
      pathStr: data.pathStr,
      sourceMemberId: data.sourceMemberId,
      applicationId: data.applicationId ?? 1,
    },
  })
}

async function main() {
  const { values } = parseArgs({
    options: {
      execute: { type: 'boolean', default: false },
      admin: { type: 'string', default: '0' },
    },
  })
  const isExecute = values.execute === true
  const adminId = parseInt(values.admin || '0', 10) || 0

  console.log('============================================================')
  console.log(`   SWAP MEMBERS SYSTEM #4 (MB TCA) — MODE: ${isExecute ? '🔴 EXECUTE (GHI DB)' : '🟢 DRY-RUN (DỰ KIẾN)'}`)
  console.log('============================================================\n')

  const sysA = await getSystem(SWAP.a.userId)
  const sysB = await getSystem(SWAP.b.userId)
  if (!sysA) throw new Error(`Member #${SWAP.a.userId} not in system #${SYSTEM_ID}`)
  if (!sysB) throw new Error(`Member #${SWAP.b.userId} not in system #${SYSTEM_ID}`)
  if (sysA.applicationId !== sysB.applicationId) throw new Error('Application IDs differ between members — cannot swap')
  const applicationId = sysA.applicationId ?? 1

  // Ngăn chạy lại khi đã swap (idempotency guard)
  if (sysA.refSysId === SWAP.a.newParentUserId && sysB.refSysId === SWAP.b.newParentUserId) {
    throw new Error('Swap đã được thực hiện trước đó (refSysId đã trùng đích). Dừng để tránh chạy 2 lần.')
  }

  const [users, levelConfigs] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: [sysA.userId, sysB.userId, SWAP.a.newParentUserId, SWAP.b.newParentUserId] } }, select: { id: true, name: true } }),
    getLevelConfigs(),
  ])
  const nameMap = new Map(users.map((u) => [u.id, u.name || 'N/A']))

  console.log('── 1. THÀNH VIÊN & VỊ TRÍ ──')
  console.log(`  #${sysA.userId} (${nameMap.get(sysA.userId)}): dưới #${sysA.refSysId} → ${isExecute ? 'dời' : 'sẽ dời'} xuống dưới #${SWAP.a.newParentUserId}`)
  console.log(`  #${sysB.userId} (${nameMap.get(sysB.userId)}): dưới #${sysB.refSysId} → ${isExecute ? 'dời' : 'sẽ dời'} xuống dưới #${SWAP.b.newParentUserId}`)
  console.log()

  // ── Tính toán bù trừ cho member A (#1172) ──
  const ownMBDT = Number(sysA.totalMbdtVolume || 0)
  const ownMBP = mbdtToMbp(ownMBDT)
  const ownTeamSize = sysA.officialTeamSize || 0
  const ownCashVolume = Number(sysA.totalCashVolume || 0)

  const oldAncA = await getAncestorUserIds(sysA.autoId) // near → far: [974, 1010, 3773]
  const newParentASys = await getSystem(SWAP.a.newParentUserId)
  const newAncA = newParentASys ? await getAncestorUserIds(newParentASys.autoId) : [] // near → far: [1061, 3773]

  // Chain từ root → member (dedupe)
  const oldChainA = [...new Set([...oldAncA.map((a) => a.userId).reverse(), sysA.userId])]
  const newChainA = [...new Set([...newAncA.map((a) => a.userId).reverse(), SWAP.a.newParentUserId, sysA.userId])]

  const oldAncestorSet = new Set(oldAncA.map((a) => a.userId))
  const newAncestorSet = new Set([SWAP.a.newParentUserId, ...newAncA.map((a) => a.userId)])
  const oldUniqueA = [...oldAncestorSet].filter((id) => !newAncestorSet.has(id))
  const newUniqueA = [...newAncestorSet].filter((id) => !oldAncestorSet.has(id))

  console.log('── 2. BÙ TRỪ AGGREGATE (chỉ do #1172, #1174 volume=0) ──')
  console.log(`  Member #${sysA.userId}: teamSize=${ownTeamSize} · points=${ownMBP} · MBDT=${ownMBDT.toLocaleString()} · cash=${ownCashVolume.toLocaleString()}`)
  console.log(`  Chain cũ (#1172): ${oldChainA.map((id) => '#' + id).join(' → ')}`)
  console.log(`  Chain mới (#1172): ${newChainA.map((id) => '#' + id).join(' → ')}`)
  console.log(`  → Ancestors cũ cần TRỪ: ${oldUniqueA.length ? oldUniqueA.map((id) => '#' + id).join(', ') : '(không có)'}`)
  console.log(`  → Ancestors mới cần CỘNG: ${newUniqueA.length ? newUniqueA.map((id) => '#' + id).join(', ') : '(không có)'}`)
  console.log()

  // ── Hoa hồng cũ cần đảo (chỉ member A có tiền) ──
  const oldComms = await getCommissionTxsForMember(sysA.userId)
  const moneyComms = oldComms.filter((t) => t.amount !== 0)
  const oldTxByUser = new Map()
  for (const t of oldComms) {
    if (!oldTxByUser.has(t.userId)) oldTxByUser.set(t.userId, [])
    oldTxByUser.get(t.userId).push(t)
  }

  console.log('── 3. HOA HỒNG CŨ CẦN ĐẢO (cho #1172) ──')
  if (moneyComms.length === 0) {
    console.log('  Không có giao dịch tiền (amount≠0) nào cần đảo.')
  } else {
    const byUser = new Map()
    for (const t of moneyComms) {
      if (!byUser.has(t.userId)) byUser.set(t.userId, [])
      byUser.get(t.userId).push(t)
    }
    for (const [uid, txs] of byUser.entries()) {
      const cash = txs.filter((t) => t.balanceType === 'CASH').reduce((s, t) => s + t.amount, 0)
      const brkd = txs.filter((t) => t.balanceType === 'BRKD').reduce((s, t) => s + t.amount, 0)
      console.log(`  #${uid} (${nameMap.get(uid) || 'N/A'}): đảo CASH -${cash.toLocaleString()}đ · BRKD -${brkd.toLocaleString()}`)
    }
  }
  console.log()

  // ── Phân phối lại hoa hồng cho chain mới (MB TCA system #4) ──
  // Thứ tự depth asc: F1 (#379) → F2 (#1061) → F3 (#3773), theo commission-calculator
  const memberLevel = sysA.level || 1
  const memberConfig = levelConfigs.find((c) => c.level === memberLevel)
  let prevPct = memberConfig ? Number(memberConfig.personalFeePct) : 0
  const commissionOrder = [SWAP.a.newParentUserId, ...newAncA.map((a) => a.userId)]
  const newChainWithLevels = []
  for (const id of commissionOrder) {
    const sys = await getSystem(id)
    const lvl = sys ? (sys.level || 1) : 1
    const cfg = levelConfigs.find((c) => c.level === lvl)
    const pct = cfg ? Number(cfg.personalFeePct) : 0
    const earn = pct - prevPct
    prevPct = Math.max(prevPct, pct)
    newChainWithLevels.push({ id, lvl, pct, earn })
  }

  console.log('── 4. PHÂN PHỐI LẠI HOA HỒNG CHO CHAIN MỚI (#1172) ──')
  for (const n of newChainWithLevels) {
    const cashAmt = n.earn > 0 ? (FEE * n.earn) / 100 : 0
    const brkdAmt = n.earn > 0 ? Math.round((ownMBDT * n.earn) / 100) : 0
    console.log(`  #${n.id} (L${n.lvl}, ${n.pct}%): earn ${n.earn}% → CASH +${cashAmt.toLocaleString()}đ · BRKD +${brkdAmt.toLocaleString()}`)
  }
  console.log()

  // ── Level dự kiến ──
  console.log('── 5. LEVEL DỰ KIẾN SAU ĐIỀU CHỈNH ──')
  const affectedForLevel = [...new Set([...oldUniqueA, ...newUniqueA])]
  for (const uid of affectedForLevel) {
    const sys = await getSystem(uid)
    if (!sys) continue
    const oldPts = Number(sys.totalPoints)
    const newPts = oldUniqueA.includes(uid) ? oldPts - ownMBP : oldPts + ownMBP
    const oldLv = sys.level
    const newLv = highestQualifiedLevel(levelConfigs, newPts)
    const change = newLv !== oldLv ? ' ⚠️ THAY ĐỔI' : ''
    console.log(`  #${uid}: points ${oldPts} → ${Math.round(newPts * 1000) / 1000} · level ${oldLv} → ${newLv}${change}`)
  }
  console.log()

  if (!isExecute) {
    console.log('🟢 Chế độ DRY-RUN: Không có dữ liệu nào bị thay đổi.')
    console.log('Chạy lệnh sau để thực thi:')
    console.log('  node scripts/swap-members.cjs --execute')
    return
  }

  // ═══════════════ EXECUTE ═══════════════
  console.log('🔴 ĐANG THỰC THI GHI VÀO DATABASE...\n')

  const summary = {
    reversedCash: 0,
    reversedBrkd: 0,
    creditedCash: 0,
    creditedBrkd: 0,
    levelsChanged: 0,
  }

  // STEP 1: Đảo hoa hồng cũ của #1172
  for (const t of moneyComms) {
    const bt = t.balanceType
    const { debited, shortfall } = await debitWallet(
      t.userId,
      t.amount,
      bt,
      `Đảo hoa hồng từ #${sysA.userId} (SWAP_MEMBERS: ${nameMap.get(sysA.userId)} hoán đổi vị trí)`,
      `swap_reverse_${t.id}`,
      applicationId,
      sysA.userId
    )
    if (bt === 'CASH') summary.reversedCash += debited
    else summary.reversedBrkd += debited
    if (shortfall > 0) console.warn(`  ⚠️ #${t.userId}: shortfall ${shortfall.toLocaleString()} khi đảo (${bt})`)
  }

  // STEP 2: Điều chỉnh aggregate trên ancestors cũ (trừ) & mới (cộng)
  for (const uid of oldUniqueA) {
    const sys = await getSystem(uid)
    if (!sys) continue
    await prisma.system.update({
      where: { userId_onSystem: { userId: uid, onSystem: SYSTEM_ID } },
      data: {
        officialTeamSize: { decrement: ownTeamSize },
        totalPoints: { decrement: ownMBP },
        totalMbdtVolume: { decrement: ownMBDT },
        totalCashVolume: { decrement: ownCashVolume },
      },
    })
    console.log(`  ✅ #${uid}: TRỪ teamSize -${ownTeamSize}, points -${ownMBP}, MBDT -${ownMBDT.toLocaleString()}, cash -${ownCashVolume.toLocaleString()}`)
  }
  for (const uid of newUniqueA) {
    const sys = await getSystem(uid)
    if (!sys) continue
    await prisma.system.update({
      where: { userId_onSystem: { userId: uid, onSystem: SYSTEM_ID } },
      data: {
        officialTeamSize: { increment: ownTeamSize },
        totalPoints: { increment: ownMBP },
        totalMbdtVolume: { increment: ownMBDT },
        totalCashVolume: { increment: ownCashVolume },
      },
    })
    console.log(`  ✅ #${uid}: CỘNG teamSize +${ownTeamSize}, points +${ownMBP}, MBDT +${ownMBDT.toLocaleString()}, cash +${ownCashVolume.toLocaleString()}`)
  }

  // STEP 3: Swap closure + refSysId
  await rebuildClosure(SWAP.a.userId, SWAP.a.newParentUserId)
  await rebuildClosure(SWAP.b.userId, SWAP.b.newParentUserId)
  console.log(`  ✅ Swap closure: #${sysA.userId} → #${SWAP.a.newParentUserId} · #${sysB.userId} → #${SWAP.b.newParentUserId}`)

  // STEP 4: Phân phối lại hoa hồng cho chain mới
  const refBase = `swap_${sysA.userId}_app_${applicationId}`
  for (const n of newChainWithLevels) {
    if (n.earn <= 0) continue
    const cashAmt = (FEE * n.earn) / 100
    const brkdAmt = Math.round((ownMBDT * n.earn) / 100)
    const desc = `Hoa hồng (${n.earn}%) từ thành viên mới #${sysA.userId} - ${nameMap.get(sysA.userId)} (SWAP_MEMBERS)`
    if (cashAmt > 0) {
      const r = await creditWallet(n.id, cashAmt, 'CASH', 'COMMISSION', desc, `${refBase}_cash_${n.id}`, applicationId, sysA.userId)
      summary.creditedCash += cashAmt
      console.log(`  ✅ #${n.id}: CASH +${cashAmt.toLocaleString()}đ`)
    }
    if (brkdAmt > 0) {
      await creditWallet(n.id, brkdAmt, 'BRKD', 'BRKD_CREDIT', desc, `${refBase}_brkd_${n.id}`, applicationId, sysA.userId)
      summary.creditedBrkd += brkdAmt
      console.log(`  ✅ #${n.id}: BRKD +${brkdAmt.toLocaleString()}`)
    }
  }

  // STEP 5: Timeline records cho chain mới (đảm bảo idempotency cho cron sau này)
  for (const n of newChainWithLevels) {
    const sys = await getSystem(n.id)
    if (!sys) continue
    const isBlocked = n.earn <= 0
    await createTimeline(n.id, {
      type: 'TRANSACTION',
      title: isBlocked ? 'Tăng trưởng tích lũy' : 'Thu nhập gia tăng',
      description: isBlocked
        ? `Cộng +${ownMBP.toFixed(3)} điểm MBP & Doanh số +${ownMBDT.toLocaleString()} MBDT từ #${sysA.userId} ${nameMap.get(sysA.userId)} (SWAP_MEMBERS)`
        : `Hoa hồng (${n.earn}%) từ thành viên mới #${sysA.userId} - ${nameMap.get(sysA.userId)} (SWAP_MEMBERS)`,
      amountCash: isBlocked ? 0 : (FEE * n.earn) / 100,
      amountBrkd: isBlocked ? 0 : Math.round((ownMBDT * n.earn) / 100),
      txType: isBlocked ? 'OFFICIAL_CONTRIBUTION' : 'COMMISSION',
      targetMemberId: sysA.userId,
      targetMemberName: nameMap.get(sysA.userId),
      sourceMemberId: sysA.userId,
      applicationId,
    })
  }

  // STEP 6: Re-check level
  for (const uid of affectedForLevel) {
    const sys = await getSystem(uid)
    if (!sys) continue
    const currentPts = Number(sys.totalPoints)
    const currentLv = sys.level
    const highest = highestQualifiedLevel(levelConfigs, currentPts)
    if (highest < currentLv) {
      await prisma.system.update({ where: { autoId: sys.autoId }, data: { level: Math.max(1, highest) } })
      await prisma.brkLevelUpRecord.deleteMany({
        where: { userId: uid, onSystem: SYSTEM_ID, toLevel: { gt: highest } },
      })
      summary.levelsChanged++
      console.log(`  ⚠️ #${uid}: hạ level ${currentLv} → ${Math.max(1, highest)}`)
    } else if (highest > currentLv) {
      await prisma.system.update({ where: { autoId: sys.autoId }, data: { level: highest } })
      summary.levelsChanged++
      console.log(`  ✅ #${uid}: lên level ${currentLv} → ${highest}`)
    }
  }

  // STEP 7: Audit log
  const log = await prisma.brkSystemLog.create({
    data: {
      action: 'SWAP_MEMBERS',
      onSystem: SYSTEM_ID,
      sourceUserId: sysA.userId,
      oldRefSysId: sysA.refSysId,
      newRefSysId: SWAP.a.newParentUserId,
      oldChain: oldChainA,
      newChain: newChainA,
      subtree: [sysA.userId, sysB.userId],
      affectedCount: oldUniqueA.length + newUniqueA.length,
      reason: `Hoán đổi vị trí #${sysA.userId} ↔ #${sysB.userId} (MB TCA system #4)`,
      adminId,
      metadata: {
        memberB: { userId: sysB.userId, oldRefSysId: sysB.refSysId, newRefSysId: SWAP.b.newParentUserId },
        ownMBDT,
        ownMBP,
        reversedCash: summary.reversedCash,
        reversedBrkd: summary.reversedBrkd,
        creditedCash: summary.creditedCash,
        creditedBrkd: summary.creditedBrkd,
        levelsChanged: summary.levelsChanged,
      },
    },
  })

  console.log(`\n🎉 HOÀN THÀNH! Log ID: ${log.id}`)
  console.log(`   Đã đảo: CASH -${summary.reversedCash.toLocaleString()}đ · BRKD -${summary.reversedBrkd.toLocaleString()}`)
  console.log(`   Đã trả: CASH +${summary.creditedCash.toLocaleString()}đ · BRKD +${summary.creditedBrkd.toLocaleString()}`)
  console.log(`   Level thay đổi: ${summary.levelsChanged}`)
}

main()
  .catch((err) => {
    console.error('\n❌ LỖI:', err.message || err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
