'use server'

import prisma from "@/lib/prisma"

export interface UplineNode {
    userId: number
    level: number
}

/**
 * Trace danh sách upline cực nhanh từ Closure Table
 * Tối ưu: Không JOIN bảng User, chỉ lấy ancestorId trực tiếp
 */
export async function traceUpline(userId: number, maxLevels: number): Promise<UplineNode[]> {
    const ancestors = await prisma.userClosure.findMany({
        where: {
            descendantId: userId,
            depth: { gt: 0, lte: maxLevels }
        },
        select: {
            ancestorId: true,
            depth: true
        },
        orderBy: {
            depth: 'asc'
        }
    })

    return ancestors.map(a => ({
        userId: a.ancestorId,
        level: a.depth
    }))
}
