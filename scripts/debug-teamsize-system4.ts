/**
 * GIẢ LAP SAU KHI SỬA — verify teamSize đúng
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ON_SYSTEM = 4

interface SimRecord {
  id: number; userId: number; type: string; txType: string | null
  title: string; teamSize: number; targetMemberId: number | null
}

let nextId = 1
const simRecords: SimRecord[] = []

function getLastRec(userId: number): SimRecord | null {
  const userRecs = simRecords.filter(r => r.userId === userId)
  return userRecs.length > 0 ? userRecs[userRecs.length - 1] : null
}

// --- LOGIC SAU FIX ---
function simCreateRecord(
  userId: number, type: string, title: string,
  txType: string | null = null, targetMemberId: number | null = null,
): SimRecord {
  const lastRec = getLastRec(userId)

  let computedTeamSize: number
  if (lastRec) {
    if (type === 'ACTIVATION' || txType === 'ADJUSTMENT') {
      computedTeamSize = lastRec.teamSize + 1
    } else {
      computedTeamSize = lastRec.teamSize
    }
  } else {
    computedTeamSize = 1
  }

  const rec: SimRecord = { id: nextId++, userId, type, txType, title, teamSize: computedTeamSize, targetMemberId }
  simRecords.push(rec)
  return rec
}

// KHÔNG CÓ mutation block nữa

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  GIẢ LẬP SAU KHI SỬA — verify teamSize')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const systems = await prisma.system.findMany({
    where: { onSystem: ON_SYSTEM },
    include: { user: { select: { id: true, name: true } } },
  })

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: 22, status: 'ACTIVE' },
    select: { userId: true, updatedAt: true, createdAt: true },
  })
  const enrollMap = new Map<number, Date>()
  for (const e of enrollments) enrollMap.set(e.userId, e.updatedAt || e.createdAt)

  systems.sort((a, b) => {
    const ta = enrollMap.get(a.userId) || a.activatedAt || a.createdAt
    const tb = enrollMap.get(b.userId) || b.activatedAt || b.createdAt
    return ta.getTime() - tb.getTime()
  })

  const members: { order: number; userId: number; name: string; autoId: number; ancestorUserIds: number[] }[] = []

  for (let i = 0; i < systems.length; i++) {
    const sys = systems[i]
    const closures = await prisma.systemClosure.findMany({
      where: { descendantId: sys.autoId, systemId: ON_SYSTEM, depth: { gte: 1 } },
    })
    const ancestorAutoIds = closures.map(c => c.ancestorId)
    const ancestorSystems = await prisma.system.findMany({
      where: { autoId: { in: ancestorAutoIds }, onSystem: ON_SYSTEM },
      select: { userId: true },
    })
    members.push({
      order: i + 1, userId: sys.userId, name: sys.user.name || `#${sys.userId}`,
      autoId: sys.autoId, ancestorUserIds: ancestorSystems.map(s => s.userId),
    })
  }

  console.log(`Tổng: ${members.length} thành viên\n`)

  // ─── GIẢ LẬP ───
  const simHistory: { order: number; userId: number; name: string; actRec: SimRecord; adjRecs: SimRecord[] }[] = []

  for (const m of members) {
    const actRec = simCreateRecord(m.userId, 'ACTIVATION', 'Đã kích hoạt hệ thống')

    const adjRecs: SimRecord[] = []
    for (const ancUserId of m.ancestorUserIds) {
      adjRecs.push(simCreateRecord(ancUserId, 'TRANSACTION', 'Tăng trưởng thành viên', 'ADJUSTMENT', m.userId))
    }
    simHistory.push({ order: m.order, userId: m.userId, name: m.name, actRec, adjRecs })
  }

  // ─── Lấy data thực: records "Tăng trưởng thành viên" cho #3773 ───
  const realAdjForRoot = await prisma.brkTimelineRecord.findMany({
    where: { onSystem: ON_SYSTEM, txType: 'ADJUSTMENT', userId: 3773 },
    orderBy: { id: 'asc' },
    select: { accumulatedTeamSize: true, targetMemberId: true },
  })

  const simAdjForRoot = simRecords.filter(r => r.userId === 3773 && r.txType === 'ADJUSTMENT')

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  "TĂNG TRƯỞNG THÀNH VIÊN" CỦA #3773 (ROOT)')
  console.log('  Sim (sửa) vs DB (thực)')
  console.log('═══════════════════════════════════════════════════════════════\n')

  console.log('  ┌──────┬────────────┬───────────┬───────────┬────────┐')
  console.log('  │ #    │ target     │ SimTeamSz │ DBTeamSz  │ Match? │')
  console.log('  ├──────┼────────────┼───────────┼───────────┼────────┤')

  for (let i = 0; i < Math.max(simAdjForRoot.length, realAdjForRoot.length); i++) {
    const sim = simAdjForRoot[i]
    const real = realAdjForRoot[i]
    const simTs = sim?.teamSize ?? 'N/A'
    const realTs = real?.accumulatedTeamSize ?? 'N/A'
    const target = sim?.targetMemberId ?? real?.targetMemberId ?? '?'
    const match = sim && real ? (sim.teamSize === Number(real.accumulatedTeamSize) ? '✅' : '❌') : '??'
    console.log(`  │ ${String(i + 1).padStart(4)} │ #${String(target).padStart(8)} │ ${String(simTs).padStart(9)} │ ${String(realTs).padStart(9)} │ ${match.padStart(6)} │`)
  }
  console.log('  └──────┴────────────┴───────────┴───────────┴────────┘')

  // ─── LỊCH SỬ TEAM SIZE #3773 ───
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  LỊCH SỬ TEAM SIZE #3773 (GIẢ LẬP SAU SỬA)')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const allRecs3773 = simRecords.filter(r => r.userId === 3773)
  for (const r of allRecs3773) {
    const target = r.targetMemberId ? `→ target=#${r.targetMemberId}` : '(ACTIVATION)'
    console.log(`  id=${String(r.id).padStart(3)} teamSize=${String(r.teamSize).padStart(3)} ${target}`)
  }

  // ─── ACTIVATION records: verify không bị mutate ───
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  ACTIVATION RECORDS — verify teamSize = 1 (không bị mutate)')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const actRecs = simRecords.filter(r => r.type === 'ACTIVATION')
  for (const r of actRecs) {
    const m = members.find(x => x.userId === r.userId)
    const ok = r.teamSize === 1 ? '✅' : '❌'
    console.log(`  ${ok} userId=${r.userId} (${m?.name || '?'}): teamSize=${r.teamSize}`)
  }

  // ─── SO SÁNH ĐÚNG/SAI ───
  const wrong = simAdjForRoot.filter((sim, i) => realAdjForRoot[i] && sim.teamSize !== Number(realAdjForRoot[i].accumulatedTeamSize))
  console.log(`\n  Kết quả: ${simAdjForRoot.length - wrong.length}/${simAdjForRoot.length} records match DB`)

  console.log('\n✅ READ-ONLY simulation')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) }).finally(() => prisma.$disconnect())
