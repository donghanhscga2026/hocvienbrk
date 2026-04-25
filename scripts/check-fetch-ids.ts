import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkFetchIds() {
  const systemId = 1
  const targetIds = [327, 873, 885, 872, 886]
  
  console.log(`=== SIMULATING buildStandardTree FOR SYSTEM ${systemId} ===`)

  // 1. Tìm Root của hệ thống
  const rootSys = await prisma.system.findFirst({
    where: { onSystem: systemId, refSysId: 0 }
  })
  if (!rootSys) {
    console.log('Root not found!'); return
  }
  const rootId = rootSys.userId
  const rootAutoId = rootSys.autoId
  console.log(`Root User ID: #${rootId} (autoId: ${rootAutoId})`)

  // 2. Lấy F1s
  const f1Data = await prisma.system.findMany({
    where: { refSysId: rootId, onSystem: systemId, userId: { not: rootId } }
  })
  const f1AutoIds = f1Data.map(f => f.autoId)
  console.log(`F1 AutoIDs count: ${f1AutoIds.length}`)

  // 3. Lấy F2s từ Closures
  const allDescOfF1s = await prisma.systemClosure.findMany({
    where: { systemId, ancestorId: { in: f1AutoIds }, depth: { gte: 1 } },
    select: { descendantId: true }
  })
  const f2AutoIds = [...new Set(allDescOfF1s.map((c: any) => c.descendantId))]
  console.log(`F2 AutoIDs count: ${f2AutoIds.length}`)

  // 4. Query allClosures (Đây là bước quan trọng nhất)
  const allClosures = await prisma.systemClosure.findMany({
    where: {
      systemId,
      OR: [
        { ancestorId: { in: [rootAutoId, ...f1AutoIds, ...f2AutoIds] } },
        { descendantId: { in: f1AutoIds } }
      ],
      depth: { gte: 0 }
    },
    include: { descendant: { include: { user: { select: { id: true } } } } }
  })

  // 5. Tổng hợp allUserIds
  const allUserIds = new Set<number>([rootId])
  for (const c of allClosures) {
    const desc = (c.descendant as any).user
    if (desc?.id) allUserIds.add(desc.id)
  }

  console.log(`\nTổng số UserID thu thập được để lấy Level: ${allUserIds.size}`)
  
  console.log('\nKIỂM TRA CÁC ID MỤC TIÊU:')
  targetIds.forEach(id => {
    const isIncluded = allUserIds.has(id)
    console.log(`- ID #${id}: ${isIncluded ? '✅ CÓ TRONG DANH SÁCH' : '❌ BỊ BỎ SÓT'}`)
  })

  await prisma.$disconnect()
}

checkFetchIds()
