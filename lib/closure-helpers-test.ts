import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Thêm User vào bảng UserClosureTest (Staging)
 * Duy trì phả hệ giới thiệu (referrerId)
 */
export async function addUserToClosureTest(userId: number, referrerId: number | null) {
  try {
    // 1. Bản thân mình (depth 0)
    await prisma.userClosureTest.upsert({
      where: {
        ancestorId_descendantId: { ancestorId: userId, descendantId: userId }
      },
      update: { depth: 0 },
      create: { ancestorId: userId, descendantId: userId, depth: 0 }
    })

    if (!referrerId && referrerId !== 0) return

    // 2. Lấy tất cả tổ tiên của referrer để nối vào mình
    const ancestors = await prisma.userClosureTest.findMany({
      where: { descendantId: referrerId }
    })

    for (const relation of ancestors) {
      await prisma.userClosureTest.upsert({
        where: {
          ancestorId_descendantId: { ancestorId: relation.ancestorId, descendantId: userId }
        },
        update: { depth: relation.depth + 1 },
        create: { ancestorId: relation.ancestorId, descendantId: userId, depth: relation.depth + 1 }
      })
    }
    console.log(`[Staging] Created user_closure_test for User ${userId}`)
  } catch (error) {
    console.error(`[Staging] addUserToClosureTest Error:`, error)
  }
}
