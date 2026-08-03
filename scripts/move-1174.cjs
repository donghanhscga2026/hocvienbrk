/**
 * MOVE-1174.CJS — Di chuyển #1174 về đúng vị trí trong đội #379 (MB TCA system #4)
 *
 * Case: #1174 (Dien thi Thu Hương) có referrer = #379, nhưng do swap trước đó
 * được đưa về dưới #974 (chỗ cũ của #1172). Theo nguyên tắc MBC TCA giai đoạn 2
 * (FORCED_4WIDE BFS theo referrer), #1174 phải nằm trong cây của #379.
 * #379 đã full 4 slot F1 → BFS từ #379 chọn F1 đầu tiên có <4 con: #1121
 * → #1174 trở thành F2 của #1121 (kề bên #1176).
 *
 * #1174 có volume / teamSize / points / hoa hồng = 0 → KHÔNG cần bù trừ
 * aggregate, KHÔNG cần đảo/trả hoa hồng. Chỉ đổi refSysId + rebuild closure.
 *
 * Usage:
 *   node scripts/move-1174.cjs            # DRY-RUN (mặc định)
 *   node scripts/move-1174.cjs --execute  # GHI DB
 *   node scripts/move-1174.cjs --admin 0  # ghi adminId vào audit log (mặc định 0)
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { parseArgs } = require('util')

const prisma = new PrismaClient()

const SYSTEM_ID = 4
const MOVE = {
  memberUserId: 1174,
  newParentUserId: 1121,
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
  console.log(`   MOVE #1174 → #1121 SYSTEM #4 (MB TCA) — MODE: ${isExecute ? '🔴 EXECUTE (GHI DB)' : '🟢 DRY-RUN (DỰ KIẾN)'}`)
  console.log('============================================================\n')

  const sysMember = await getSystem(MOVE.memberUserId)
  const sysNewParent = await getSystem(MOVE.newParentUserId)
  if (!sysMember) throw new Error(`Member #${MOVE.memberUserId} not in system #${SYSTEM_ID}`)
  if (!sysNewParent) throw new Error(`Parent #${MOVE.newParentUserId} not in system #${SYSTEM_ID}`)
  const applicationId = sysMember.applicationId ?? 1

  if (sysMember.refSysId === MOVE.newParentUserId) {
    throw new Error(`#${MOVE.memberUserId} đã nằm dưới #${MOVE.newParentUserId}. Dừng lại (idempotency guard).`)
  }

  const [users] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: [sysMember.userId, sysNewParent.userId] } },
      select: { id: true, name: true },
    }),
  ])
  const nameMap = new Map(users.map((u) => [u.id, u.name || 'N/A']))

  const oldAnc = await getAncestorUserIds(sysMember.autoId)
  const newAnc = await getAncestorUserIds(sysNewParent.autoId)

  const oldChain = [...new Set([...oldAnc.map((a) => a.userId).reverse(), sysMember.userId])]
  const newChain = [...new Set([...newAnc.map((a) => a.userId).reverse(), sysMember.userId])]

  console.log('── 1. THÀNH VIÊN & VỊ TRÍ ──')
  console.log(`  #${sysMember.userId} (${nameMap.get(sysMember.userId)}): dưới #${sysMember.refSysId} → ${isExecute ? 'dời' : 'sẽ dời'} xuống dưới #${MOVE.newParentUserId}`)
  console.log(`  #${sysMember.userId}: team=${sysMember.officialTeamSize} · pts=${sysMember.totalPoints} · MBDT=${sysMember.totalMbdtVolume} · cash=${sysMember.totalCashVolume}`)
  console.log('  → Không bù trừ: volume/team/points = 0, chưa có hoa hồng → chỉ đổi ref + closure')
  console.log()
  console.log(`  Chain cũ: ${oldChain.map((id) => '#' + id).join(' → ')}`)
  console.log(`  Chain mới: ${newChain.map((id) => '#' + id).join(' → ')}`)
  console.log()

  if (!isExecute) {
    console.log('🟢 Chế độ DRY-RUN: Không có dữ liệu nào bị thay đổi.')
    console.log('Chạy lệnh sau để thực thi:')
    console.log('  node scripts/move-1174.cjs --execute')
    return
  }

  console.log('🔴 ĐANG THỰC THI GHI VÀO DATABASE...\n')

  await rebuildClosure(MOVE.memberUserId, MOVE.newParentUserId)
  console.log(`  ✅ #${MOVE.memberUserId} → #${MOVE.newParentUserId} (rebuild closure + refSysId)`)

  const log = await prisma.brkSystemLog.create({
    data: {
      action: 'MOVE_MEMBER',
      onSystem: SYSTEM_ID,
      sourceUserId: sysMember.userId,
      oldRefSysId: sysMember.refSysId,
      newRefSysId: MOVE.newParentUserId,
      oldChain,
      newChain,
      subtree: [sysMember.userId],
      affectedCount: 0,
      reason: `Đưa #${sysMember.userId} về đúng đội #379 theo nguyên tắc MBC TCA giai đoạn 2 (BFS referrer #379 → #${MOVE.newParentUserId})`,
      adminId,
      metadata: { applicationId, volumeZero: true },
    },
  })

  console.log(`🎉 HOÀN THÀNH! Log ID: ${log.id}`)
  console.log(`   Chain mới: ${newChain.map((id) => '#' + id).join(' → ')}`)
}

main()
  .catch((err) => {
    console.error('\n❌ LỖI:', err.message || err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())