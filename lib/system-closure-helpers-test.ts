'use server'

import prisma from '@/lib/prisma'

// THEM 1 USER VAO SYSTEM CLOSURE TEST (bang Test)
export async function addUserToSystemClosureTest(
    userId: number,
    refSysId: number,
    systemId: number
): Promise<void> {
    // 1. Find existing or create new SystemTest record
    const existing = await prisma.systemTest.findFirst({
        where: { userId, onSystem: systemId }
    })
    
    let systemRecord
    if (existing) {
        systemRecord = await prisma.systemTest.update({
            where: { autoId: existing.autoId },
            data: { refSysId }
        })
    } else {
        systemRecord = await prisma.systemTest.create({
            data: { 
                userId, 
                onSystem: systemId, 
                refSysId
            }
        })
    }

    const { autoId } = systemRecord

    // 2. Chen closure cho chinh user do (ancestor = descendant = autoId, depth = 0)
    await prisma.systemClosureTest.upsert({
        where: { ancestorId_descendantId_systemId: { ancestorId: autoId, descendantId: autoId, systemId } },
        update: { depth: 0 },
        create: { ancestorId: autoId, descendantId: autoId, depth: 0, systemId }
    }).catch(() => { })

    // 3. Neu co upline (refSysId > 0), copy tat ca closure cua upline va cap nhat depth
    if (refSysId > 0) {
        const uplineSystem = await prisma.systemTest.findFirst({
            where: { userId: refSysId, onSystem: systemId }
        })

        if (uplineSystem) {
            const uplineClosures = await prisma.systemClosureTest.findMany({
                where: {
                    ancestorId: uplineSystem.autoId,
                    systemId
                }
            })

            for (const closure of uplineClosures) {
                await prisma.systemClosureTest.create({
                    data: {
                        ancestorId: closure.ancestorId,
                        descendantId: autoId,
                        depth: closure.depth + 1,
                        systemId
                    }
                }).catch(() => { })
            }
        }
    }
}

/**
 * KIEM TRA USER CO THUOC HE THONG TEST KHONG
 */
export async function checkUserInSystemTest(
    userId: number,
    systemId: number
): Promise<{ inSystem: boolean; systemRecord: any }> {
    const systemRecord = await prisma.systemTest.findFirst({
        where: { userId, onSystem: systemId }
    })

    if (!systemRecord) {
        return { inSystem: false, systemRecord: null }
    }

    return {
        inSystem: true,
        systemRecord
    }
}