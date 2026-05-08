/**
 * Closure Table Helper Functions
 * =============================
 * Purpose: Cac ham ho tro thao tac voi closure table
 * 
 * Su dung: import { addUserToClosure, getDescendants, getGenealogyStats } from '@/lib/closure-helpers'
 */

import prisma from './prisma'

/**
 * Them closure rows khi tao user moi
 * 
 * Logic:
 * 1. Tao row self: {userId, userId, 0}
 * 2. Lay tat ca ancestors cua referrer
 * 3. Tao rows: moi ancestor + depth+1 -> user
 */
export async function addUserToClosure(userId: number, referrerId: number | null): Promise<void> {
    const rows: { ancestorId: number; descendantId: number; depth: number }[] = []
    
    rows.push({
        ancestorId: userId,
        descendantId: userId,
        depth: 0
    })
    
    if (referrerId !== null && referrerId !== 0) {
        const ancestorClosures = await prisma.userClosure.findMany({
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
        await prisma.userClosure.createMany({
            data: rows
        })
    }
}

/**
 * Xoa closure rows khi xoa user
 */
export async function removeUserFromClosure(userId: number): Promise<void> {
    await prisma.userClosure.deleteMany({
        where: {
            OR: [
                { descendantId: userId },
                { ancestorId: userId }
            ]
        }
    })
}

/**
 * Lay tat ca descendants cua mot user
 */
export async function getDescendants(
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
    
    return await prisma.userClosure.findMany({
        where: whereClause,
        include: { descendant: true },
        orderBy: { depth: 'asc' }
    })
}

/**
 * Lay so luong F1, F2, F3 cua mot user
 */
export async function getGenealogyStats(userId: number): Promise<{
    totalDescendants: number
    f1Count: number
    f2Count: number
    f3Count: number
    f4PlusCount: number
}> {
    const descendants = await prisma.userClosure.findMany({
        where: {
            ancestorId: userId,
            depth: { gt: 0 }
        },
        select: { depth: true }
    })
    
    const stats = {
        totalDescendants: descendants.length,
        f1Count: 0,
        f2Count: 0,
        f3Count: 0,
        f4PlusCount: 0
    }
    
    for (const d of descendants) {
        if (d.depth === 1) stats.f1Count++
        else if (d.depth === 2) stats.f2Count++
        else if (d.depth === 3) stats.f3Count++
        else stats.f4PlusCount++
    }
    
    return stats
}

/**
 * Lay chi tiet F1 cung voi thong tin co F2, F3 hay khong
 * Dung de phan loai Group A/B/C
 */
export async function getF1Details(userId: number) {
    const f1s = await prisma.user.findMany({
        where: { referrerId: userId },
        select: { id: true, name: true }
    })
    
    const results = []
    
    for (const f1 of f1s) {
        const descendants = await prisma.userClosure.findMany({
            where: {
                ancestorId: f1.id,
                depth: { gt: 0, lte: 2 }
            },
            include: { descendant: true }
        })
        
        const hasF2 = descendants.some(d => d.depth === 1)
        const hasF3 = descendants.some(d => d.depth === 2)
        
        let group: 'A' | 'B' | 'C' = 'A'
        if (hasF2 && hasF3) group = 'C'
        else if (hasF2) group = 'B'
        
        results.push({
            id: f1.id,
            name: f1.name,
            totalSubCount: descendants.length + 1,
            hasF2,
            hasF3,
            group,
            f1: descendants
                .filter((d: any) => d.depth === 1)
                .map((d: any) => ({ id: d.descendant.id, name: d.descendant.name }))
        })
    }
    
    return results
}

/**
 * Dem so luong F1 theo nhom
 */
export async function getF1GroupCounts(userId: number): Promise<{
    groupA: number
    groupB: number
    groupC: number
}> {
    const f1Details = await getF1Details(userId)
    
    return {
        groupA: f1Details.filter((f: any) => f.group === 'A').length,
        groupB: f1Details.filter((f: any) => f.group === 'B').length,
        groupC: f1Details.filter((f: any) => f.group === 'C').length
    }
}
