import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== KIỂM TRA HIERARCHY TCA #861 → #862 → #863 → #876 → #877 ===\n')

  // Danh sách userIds cần kiểm tra
  const userIds = [861, 862, 863, 876, 877]

  // Lấy TCA members
  console.log('--- TCAMember Table ---')
  for (const uid of userIds) {
    const tca = await prisma.tCAMember.findFirst({ where: { userId: uid } })
    console.log(`User #${uid}: TCA ID = ${tca?.tcaId}, Name = ${tca?.name || 'N/A'}, parentTcaId = ${tca?.parentTcaId || 'null'}`)
  }

  console.log('\n--- System Table (onSystem=1) ---')
  for (const uid of userIds) {
    const sys = await prisma.system.findFirst({ where: { userId: uid, onSystem: 1 } })
    console.log(`User #${uid}: autoId = ${sys?.autoId || 'N/A'}, refSysId = ${sys?.refSysId || 'N/A'}`)
  }

  console.log('\n--- SystemClosure Table (systemId=1) ---')
  // Lấy autoId của các user
  const sysMap = new Map<number, number>() // userId -> autoId
  for (const uid of userIds) {
    const sys = await prisma.system.findFirst({ where: { userId: uid, onSystem: 1 } })
    if (sys) sysMap.set(uid, sys.autoId)
  }

  // Kiểm tra closures cho mỗi user (xem họ có những ancestor nào)
  for (const uid of userIds) {
    const autoId = sysMap.get(uid)
    if (!autoId) {
      console.log(`User #${uid}: NO SYSTEM RECORD`)
      continue
    }

    const closures = await prisma.systemClosure.findMany({
      where: { descendantId: autoId, systemId: 1 },
      orderBy: { depth: 'asc' }
    })

    console.log(`\nUser #${uid} (autoId=${autoId}) - ancestors:`)
    for (const c of closures) {
      const ancSys = await prisma.system.findUnique({ where: { autoId: c.ancestorId } })
      const ancTCA = ancSys ? await prisma.tCAMember.findFirst({ where: { userId: ancSys.userId } }) : null
      console.log(`  depth=${c.depth}: ancestor autoId=${c.ancestorId}, userId=${ancSys?.userId || '?'}, TCA=${ancTCA?.tcaId || '?'}, name=${ancTCA?.name || '?'}`)
    }
  }

  // Kiểm tra ngược: xem #863 có những descendants nào (depth=1 là F1 trực tiếp)
  console.log('\n\n=== KIỂM TRA F1 CỦA #863 ===')
  const sys863 = await prisma.system.findFirst({ where: { userId: 863, onSystem: 1 } })
  if (sys863) {
    console.log(`#863 có autoId = ${sys863.autoId}`)

    // Lấy F1 trực tiếp (depth = 1)
    const f1s = await prisma.systemClosure.findMany({
      where: { ancestorId: sys863.autoId, depth: 1, systemId: 1 }
    })

    console.log(`\n#863 có ${f1s.length} F1 trực tiếp:`)
    for (const f1 of f1s) {
      const f1Sys = await prisma.system.findUnique({ where: { autoId: f1.descendantId } })
      const f1TCA = f1Sys ? await prisma.tCAMember.findFirst({ where: { userId: f1Sys.userId } }) : null
      console.log(`  - F1: autoId=${f1.descendantId}, userId=${f1Sys?.userId}, TCA=${f1TCA?.tcaId}, name=${f1TCA?.name}`)
    }

    // Kiểm tra xem #876 có trong F1 không
    const sys876 = await prisma.system.findFirst({ where: { userId: 876, onSystem: 1 } })
    if (sys876) {
      const isF1 = f1s.find(f => f.descendantId === sys876.autoId)
      console.log(`\n#876 (autoId=${sys876.autoId}) có phải F1 của #863? ${isF1 ? 'YES ✓' : 'NO ✗'}`)
    }
  }

  // Kiểm tra F1 của #876
  console.log('\n\n=== KIỂM TRA F1 CỦA #876 ===')
  const sys876 = await prisma.system.findFirst({ where: { userId: 876, onSystem: 1 } })
  if (sys876) {
    console.log(`#876 có autoId = ${sys876.autoId}`)

    const f1s = await prisma.systemClosure.findMany({
      where: { ancestorId: sys876.autoId, depth: 1, systemId: 1 }
    })

    console.log(`\n#876 có ${f1s.length} F1 trực tiếp:`)
    for (const f1 of f1s) {
      const f1Sys = await prisma.system.findUnique({ where: { autoId: f1.descendantId } })
      const f1TCA = f1Sys ? await prisma.tCAMember.findFirst({ where: { userId: f1Sys.userId } }) : null
      console.log(`  - F1: autoId=${f1.descendantId}, userId=${f1Sys?.userId}, TCA=${f1TCA?.tcaId}, name=${f1TCA?.name}`)
    }

    // Kiểm tra xem #877 có trong F1 không
    const sys877 = await prisma.system.findFirst({ where: { userId: 877, onSystem: 1 } })
    if (sys877) {
      const isF1 = f1s.find(f => f.descendantId === sys877.autoId)
      console.log(`\n#877 (autoId=${sys877.autoId}) có phải F1 của #876? ${isF1 ? 'YES ✓' : 'NO ✗'}`)
    }
  }

  console.log('\n=== KẾT THÚC ===')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())