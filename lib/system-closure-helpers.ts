'use server'

import prisma from '@/lib/prisma'

// ADD 1 USER TO SYSTEM CLOSURE
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

    // 2. Insert closure for user itself (ancestor = descendant = autoId, depth = 0)
    await prisma.systemClosure.upsert({
        where: { ancestorId_descendantId_systemId: { ancestorId: autoId, descendantId: autoId, systemId } },
        update: { depth: 0 },
        create: { ancestorId: autoId, descendantId: autoId, depth: 0, systemId }
    }).catch(() => { }) // Ignore if exists

    // Delete old non-self closures before rebuilding (handles refSysId change + stale data)
    if (existing) {
        await prisma.systemClosure.deleteMany({
            where: { descendantId: autoId, depth: { gt: 0 }, systemId }
        })
    }

    // 3. If upline exists (refSysId >= 0), copy all upline closures and update depth
    if (refSysId >= 0) {
        const uplineSystem = await prisma.system.findFirst({
            where: { userId: refSysId, onSystem: systemId }
        })

        if (uplineSystem) {
            // Get ALL ancestors of upline (from root to upline)
            const ancestors = await prisma.systemClosure.findMany({
                where: {
                    systemId,
                    descendantId: uplineSystem.autoId
                },
                orderBy: { depth: 'desc' }
            })

            // Create closures for user - copy from each ancestor + 1 depth
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

// CHECK IF USER BELONGS TO SYSTEM
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

// GET SYSTEM ROOT
export async function getSystemRoot(systemId: number): Promise<number | null> {
    // Find user with refSysId = 0 in system
    const rootSystem = await prisma.system.findFirst({
        where: { onSystem: systemId, refSysId: 0 }
    })
    return rootSystem?.userId || null
}

// BUILD SYSTEM CLOSURE FROM SHEET DATA
export async function buildSystemClosuresFromData(
    data: { userId: number; refSysId: number }[],
    systemId: number
): Promise<{ systemCount: number; closureCount: number }> {
    // 1. Delete old closures for this system
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

    // 3. Create closures for each user
    let closureCount = 0
    for (const row of data) {
        const autoId = systemRecords.get(row.userId)
        if (!autoId) continue

        // Self closure
        await prisma.systemClosure.create({
            data: { ancestorId: autoId, descendantId: autoId, depth: 0, systemId }
        }).catch(() => { })
        closureCount++

        // If upline exists, copy closures from upline (all ancestors)
        if (row.refSysId > 0) {
            const uplineAutoId = systemRecords.get(row.refSysId)
            if (uplineAutoId) {
                // Get ALL ancestors of upline
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

// ENSURE ALL ANCESTORS ARE IN SYSTEM
export async function ensureAncestorsInSystem(userId: number, systemId: number): Promise<void> {
    const chain: number[] = []
    let currentId = userId
    let depth = 0

    while (currentId && depth < 50) {
        const existingSystem = await prisma.system.findFirst({
            where: { userId: currentId, onSystem: systemId }
        })
        if (existingSystem) break

        chain.push(currentId)
        const user = await prisma.user.findUnique({
            where: { id: currentId },
            select: { referrerId: true }
        })
        if (!user || !user.referrerId) break

        currentId = user.referrerId
        depth++
    }

    // Add from farthest ancestor -> nearest
    chain.reverse()
    for (const id of chain) {
        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, referrerId: true }
        })
        if (!user) continue
        await addUserToSystemClosure(user.id, user.referrerId || 0, systemId)
    }
}

// FIND NEAREST REFERRER IN SYSTEM
export async function resolveSystemReferrer(
    userId: number,
    systemId: number,
    defaultRoot: number = 922
): Promise<number> {
    let currentId = userId
    let depth = 0

    while (currentId && depth < 50) {
        const existingSystem = await prisma.system.findFirst({
            where: { userId: currentId, onSystem: systemId }
        })
        if (existingSystem && currentId !== defaultRoot) return currentId

        const user = await prisma.user.findUnique({
            where: { id: currentId },
            select: { referrerId: true }
        })
        if (!user || !user.referrerId) break

        currentId = user.referrerId
        depth++
    }

    return 0
}

/**
 * Sync user to YTB system (onSystem=3)
 */
export async function syncUserToYtbSystem(userId: number, teacherId: number): Promise<void> {
    if (teacherId !== 327) return

    try {
        const systemId = 3
        const refSysId = await resolveSystemReferrer(userId, systemId)
        await addUserToSystemClosure(userId, refSysId, systemId)
        console.log(`[Sync-YTB] Synced user #${userId} to system #3 (refSysId=${refSysId})`)
    } catch (error) {
        console.error(`[Sync-YTB] Error syncing user #${userId}:`, error)
    }
}
