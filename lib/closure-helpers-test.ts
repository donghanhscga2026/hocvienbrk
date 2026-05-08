/**
 * Closure Table Helper Functions - TEST VERSION
 * ==========================================
 * Purpose: Cac ham ho tro thao tac voi bang Test (UserClosureTest)
 * 
 * Su dung: import { addUserToClosureTest } from '@/lib/closure-helpers-test'
 */

import prisma from './prisma'

/**
 * Them closure rows khi tao userTest moi
 * 
 * Logic:
 * 1. Tao row self: {userId, userId, 0}
 * 2. Lay tat ca ancestors cua referrer
 * 3. Tao rows: moi ancestor + depth+1 -> user
 */
export async function addUserToClosureTest(userId: number, referrerId: number | null): Promise<void> {
    const rows: { ancestorId: number; descendantId: number; depth: number }[] = []
    
    rows.push({
        ancestorId: userId,
        descendantId: userId,
        depth: 0
    })
    
    if (referrerId != null && referrerId !== 0) {
        const ancestorClosures = await prisma.userClosureTest.findMany({
            where: { descendantId: referrerId },
            select: { ancestorId: true, depth: true }
        })
        
        for (const closure of ancestorClosures) {
            rows.push({
                ancestorId: closure.ancestorId,
                descendantId: userId,
                depth: closure.depth + 1
            })
        }
    }
    
    if (rows.length > 0) {
        await prisma.userClosureTest.createMany({
            data: rows
        })
    }
}

/**
 * Lay tat ca descendants cua mot userTest
 */
export async function getDescendantsTest(
    userId: number, 
    options?: { maxDepth?: number }
) {
    const whereClause: any = {
        ancestorId: userId,
        depth: { gt: 0 }
    }
    
    if (options?.maxDepth !== undefined) {
        whereClause.depth = { ...whereClause.depth, lte: options.maxDepth }
    }
    
    return await prisma.userClosureTest.findMany({
        where: whereClause,
        include: { descendant: true },
        orderBy: { depth: 'asc' }
    })
}