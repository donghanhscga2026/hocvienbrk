import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Thêm User vào bảng SystemClosureTest (Staging)
 * Duy trì phả hệ hệ thống TCA (refSysId)
 */
export async function addUserToSystemClosureTest(userId: number, refSysId: number, systemId: number) {
  try {
    // 1. Đảm bảo bản ghi trong SystemTest tồn tại
    const system = await prisma.systemTest.upsert({
      where: { userId_onSystem: { userId, onSystem: systemId } },
      update: { refSysId },
      create: { userId, onSystem: systemId, refSysId }
    })

    const autoId = system.autoId

    // 2. Bản thân mình (depth 0)
    await prisma.systemClosureTest.upsert({
      where: {
        ancestorId_descendantId_systemId: { ancestorId: autoId, descendantId: autoId, systemId }
      },
      update: { depth: 0 },
      create: { ancestorId: autoId, descendantId: autoId, systemId, depth: 0 }
    })

    if (refSysId === 0) return

    // 3. Tìm bản ghi cha trong SystemTest
    const parentSystem = await prisma.systemTest.findFirst({
      where: { userId: refSysId, onSystem: systemId }
    })

    if (parentSystem) {
      const parentAutoId = parentSystem.autoId
      const ancestors = await prisma.systemClosureTest.findMany({
        where: { descendantId: parentAutoId, systemId }
      })

      for (const relation of ancestors) {
        await prisma.systemClosureTest.upsert({
          where: {
            ancestorId_descendantId_systemId: { ancestorId: relation.ancestorId, descendantId: autoId, systemId }
          },
          update: { depth: relation.depth + 1 },
          create: { ancestorId: relation.ancestorId, descendantId: autoId, systemId, depth: relation.depth + 1 }
        })
      }
    }
    console.log(`[Staging] Created system_closure_test for User ${userId} under parent ${refSysId}`)
  } catch (error) {
    console.error(`[Staging] addUserToSystemClosureTest Error:`, error)
  }
}
