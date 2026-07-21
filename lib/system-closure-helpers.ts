'use server'

import prisma from '@/lib/prisma'

// ADD 1 USER TO SYSTEM CLOSURE — Idempotent, fail-hard on critical steps
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
    const applicationId = systemRecord.applicationId

    // 2. Self-closure MUST succeed — this is the gate for all downstream operations
    await prisma.systemClosure.upsert({
        where: { ancestorId_descendantId_systemId: { ancestorId: autoId, descendantId: autoId, systemId } },
        update: { depth: 0, applicationId },
        create: { ancestorId: autoId, descendantId: autoId, depth: 0, systemId, applicationId }
    })

    // 3. Delete old non-self closures before rebuilding (handles refSysId change + stale data)
    if (existing) {
        await prisma.systemClosure.deleteMany({
            where: { descendantId: autoId, depth: { gt: 0 }, systemId }
        })
    }

    // 4. If upline exists (refSysId > 0), copy all upline closures using upsert (idempotent)
    if (refSysId > 0) {
        const uplineSystem = await prisma.system.findFirst({
            where: { userId: refSysId, onSystem: systemId, applicationId: applicationId ?? null }
        })

        if (uplineSystem) {
            const ancestors = await prisma.systemClosure.findMany({
                where: {
                    systemId,
                    descendantId: uplineSystem.autoId,
                    applicationId: applicationId ?? null
                },
                orderBy: { depth: 'desc' }
            })

            for (const ancestor of ancestors) {
                // Use upsert instead of create — idempotent, no duplicate key errors
                await prisma.systemClosure.upsert({
                    where: {
                        ancestorId_descendantId_systemId: {
                            ancestorId: ancestor.ancestorId,
                            descendantId: autoId,
                            systemId
                        }
                    },
                    update: { depth: ancestor.depth + 1, applicationId },
                    create: {
                        ancestorId: ancestor.ancestorId,
                        descendantId: autoId,
                        depth: ancestor.depth + 1,
                        systemId,
                        applicationId
                    }
                })
            }
        }
    }

    // 5. Post-validation: verify self-closure exists (defensive check)
    const selfCheck = await prisma.systemClosure.findUnique({
        where: { ancestorId_descendantId_systemId: { ancestorId: autoId, descendantId: autoId, systemId } }
    })
    if (!selfCheck) {
        throw new Error(`[SystemClosure] Post-validation FAILED: self-closure missing for userId=${userId} autoId=${autoId} systemId=${systemId}`)
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

        // Self closure — upsert idempotent
        await prisma.systemClosure.upsert({
            where: { ancestorId_descendantId_systemId: { ancestorId: autoId, descendantId: autoId, systemId } },
            update: { depth: 0 },
            create: { ancestorId: autoId, descendantId: autoId, depth: 0, systemId }
        })
        closureCount++

        // If upline exists, copy closures from upline using upsert (idempotent)
        if (row.refSysId > 0) {
            const uplineAutoId = systemRecords.get(row.refSysId)
            if (uplineAutoId) {
                const ancestors = await prisma.systemClosure.findMany({
                    where: { systemId, descendantId: uplineAutoId },
                    orderBy: { depth: 'desc' }
                })

                for (const ancestor of ancestors) {
                    await prisma.systemClosure.upsert({
                        where: {
                            ancestorId_descendantId_systemId: {
                                ancestorId: ancestor.ancestorId,
                                descendantId: autoId,
                                systemId
                            }
                        },
                        update: { depth: ancestor.depth + 1 },
                        create: {
                            ancestorId: ancestor.ancestorId,
                            descendantId: autoId,
                            depth: ancestor.depth + 1,
                            systemId
                        }
                    })
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

// ═══════════════════════════════════════════════════════
// VALIDATE: Kiểm tra toàn vẹn closure data
// ═══════════════════════════════════════════════════════

export interface ClosureIssue {
    userId: number
    autoId: number
    issue: string
}

export async function validateSystemClosures(systemId: number): Promise<ClosureIssue[]> {
    const issues: ClosureIssue[] = []

    const members = await prisma.system.findMany({
        where: { onSystem: systemId },
        include: { user: { select: { id: true, name: true } } }
    })

    for (const member of members) {
        // Check 1: Self-closure exists
        const selfClosure = await prisma.systemClosure.findUnique({
            where: { ancestorId_descendantId_systemId: { ancestorId: member.autoId, descendantId: member.autoId, systemId } }
        })
        if (!selfClosure) {
            issues.push({ userId: member.userId, autoId: member.autoId, issue: 'Thiếu self-closure' })
        }

        // Check 2: Non-root members must have depth=1 link from parent
        if (member.refSysId > 0) {
            const parent = await prisma.system.findFirst({ where: { userId: member.refSysId, onSystem: systemId } })
            if (parent) {
                const parentLink = await prisma.systemClosure.findUnique({
                    where: { ancestorId_descendantId_systemId: { ancestorId: parent.autoId, descendantId: member.autoId, systemId } }
                })
                if (!parentLink) {
                    issues.push({ userId: member.userId, autoId: member.autoId, issue: `Thiếu depth-1 link từ parent #${member.refSysId} (autoId=${parent.autoId})` })
                }
            } else {
                issues.push({ userId: member.userId, autoId: member.autoId, issue: `Parent #${member.refSysId} không tồn tại trong system` })
            }
        }

        // Check 3: Total closure count should = depth from root + 1 (self)
        const closureCount = await prisma.systemClosure.count({
            where: { systemId, descendantId: member.autoId }
        })
        if (closureCount === 0) {
            issues.push({ userId: member.userId, autoId: member.autoId, issue: 'Không có closure record nào' })
        }
    }

    return issues
}

// ═══════════════════════════════════════════════════════
// REBUILD: Xóa toàn bộ closure và tạo lại từ System records
// ═══════════════════════════════════════════════════════

export async function rebuildSystemClosures(systemId: number): Promise<{ deleted: number; created: number; errors: string[] }> {
    const errors: string[] = []

    // 1. Delete ALL existing closures for this system
    const deleted = await prisma.systemClosure.deleteMany({ where: { systemId } })

    // 2. Get all members sorted by autoId (insertion order = topological)
    const members = await prisma.system.findMany({
        where: { onSystem: systemId },
        orderBy: { autoId: 'asc' }
    })

    let created = 0

    for (const member of members) {
        try {
            // Self-closure
            await prisma.systemClosure.create({
                data: { ancestorId: member.autoId, descendantId: member.autoId, depth: 0, systemId }
            })
            created++

            // Copy from parent's closures
            if (member.refSysId >= 0) {
                const parent = await prisma.system.findFirst({
                    where: { userId: member.refSysId, onSystem: systemId }
                })
                if (parent) {
                    const parentClosures = await prisma.systemClosure.findMany({
                        where: { systemId, descendantId: parent.autoId },
                        orderBy: { depth: 'desc' }
                    })
                    for (const pc of parentClosures) {
                        await prisma.systemClosure.create({
                            data: {
                                ancestorId: pc.ancestorId,
                                descendantId: member.autoId,
                                depth: pc.depth + 1,
                                systemId
                            }
                        })
                        created++
                    }
                }
            }
        } catch (err) {
            const msg = `User #${member.userId} (autoId=${member.autoId}): ${err}`
            errors.push(msg)
            console.error(`[Rebuild] FAILED:`, msg)
        }
    }

    // 3. Post-rebuild validation
    const issues = await validateSystemClosures(systemId)
    if (issues.length > 0) {
        console.warn(`[Rebuild] System #${systemId}: ${issues.length} issues remaining after rebuild:`)
        for (const issue of issues) {
            console.warn(`  #${issue.userId}: ${issue.issue}`)
        }
    }

    console.log(`[Rebuild] System #${systemId}: deleted ${deleted.count}, created ${created}, errors ${errors.length}`)
    return { deleted: deleted.count, created, errors }
}
