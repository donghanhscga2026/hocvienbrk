'use server'

import prisma from '@/lib/prisma'

// THEM 1 USER VAO SYSTEM CLOSURE
export async function addUserToSystemClosure(
    userId: number,
    refSysId: number,
    systemId: number
): Promise<void> {
    // 1. Find existing or create new System record
    const existing = await prisma.system.findFirst({
        where: { userId, onSystem: systemId }
    })
    
    let systemRecord
    if (existing) {
        systemRecord = await prisma.system.update({
            where: { autoId: existing.autoId },
            data: { refSysId }
        })
    } else {
        systemRecord = await prisma.system.create({
            data: { 
                userId, 
                onSystem: systemId, 
                refSysId
            }
        })
    }

    const { autoId } = systemRecord

    // 2. Chen closure cho chinh user do (ancestor = descendant = autoId, depth = 0)
    await prisma.systemClosure.upsert({
        where: { ancestorId_descendantId_systemId: { ancestorId: autoId, descendantId: autoId, systemId } },
        update: { depth: 0 },
        create: { ancestorId: autoId, descendantId: autoId, depth: 0, systemId }
    }).catch(() => { }) // Ignore if exists

    // 3. Neu co upline (refSysId > 0), copy tat ca closure cua upline va cap nhat depth
    if (refSysId > 0) {
        const uplineSystem = await prisma.system.findFirst({
            where: { userId: refSysId, onSystem: systemId }
        })

        if (uplineSystem) {
            // Lấy TẤT CẢ ancestors của upline (từ root đến upline)
            const ancestors = await prisma.systemClosure.findMany({
                where: {
                    systemId,
                    descendantId: uplineSystem.autoId
                },
                orderBy: { depth: 'desc' }
            })

            // Tạo closure cho user - copy từ mỗi ancestor + 1 depth
            for (const ancestor of ancestors) {
                await prisma.systemClosure.create({
                    data: {
                        ancestorId: ancestor.ancestorId,
                        descendantId: autoId,
                        depth: ancestor.depth + 1,
                        systemId
                    }
                }).catch(() => { }) // Ignore duplicates
            }
        }
    }
}

// KIEM TRA USER CO THUOC HE THONG KHONG
export async function checkUserInSystem(
    userId: number,
    systemId: number
): Promise<{ inSystem: boolean; systemRecord: any }> {
    const systemRecord = await prisma.system.findFirst({
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

// LAY ROOT CUA HE THONG
export async function getSystemRoot(systemId: number): Promise<number | null> {
    // Tim user co refSysId = 0 trong he thong
    const rootSystem = await prisma.system.findFirst({
        where: { onSystem: systemId, refSysId: 0 }
    })
    return rootSystem?.userId || null
}

// TAO SYSTEM CLOSURE TU SHEET DATA
export async function buildSystemClosuresFromData(
    data: { userId: number; refSysId: number }[],
    systemId: number
): Promise<{ systemCount: number; closureCount: number }> {
    // 1. Xoa closure cu cua system nay
    await prisma.systemClosure.deleteMany({ where: { systemId } })

    // 2. Create/Update System records
    const systemRecords: Map<number, number> = new Map() // userId -> autoId
    
    for (const row of data) {
        const existing = await prisma.system.findFirst({ where: { userId: row.userId, onSystem: systemId } })
        let record
        if (existing) {
            record = await prisma.system.update({
                where: { autoId: existing.autoId },
                data: { refSysId: row.refSysId }
            })
        } else {
            record = await prisma.system.create({
                data: { userId: row.userId, onSystem: systemId, refSysId: row.refSysId }
            })
        }
        systemRecords.set(row.userId, record.autoId)
    }

    // 3. Tao closure cho tung user
    let closureCount = 0
    for (const row of data) {
        const autoId = systemRecords.get(row.userId)
        if (!autoId) continue

        // Closure cho chinh minh
        await prisma.systemClosure.create({
            data: { ancestorId: autoId, descendantId: autoId, depth: 0, systemId }
        }).catch(() => { })
        closureCount++

        // Neu co upline, copy closures tu upline (tất cả ancestors)
        if (row.refSysId > 0) {
            const uplineAutoId = systemRecords.get(row.refSysId)
            if (uplineAutoId) {
                // Lấy TẤT CẢ ancestors của upline (từ root đến upline)
                const ancestors = await prisma.systemClosure.findMany({
                    where: { systemId, descendantId: uplineAutoId },
                    orderBy: { depth: 'desc' }
                })

                for (const ancestor of ancestors) {
                    await prisma.systemClosure.create({
                        data: {
                            ancestorId: ancestor.ancestorId,
                            descendantId: autoId,
                            depth: ancestor.depth + 1,
                            systemId
                        }
                    }).catch(() => { })
                    closureCount++
                }
            }
        }
    }

    return { systemCount: systemRecords.size, closureCount }
}
