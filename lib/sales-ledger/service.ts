import prisma from '@/lib/prisma'

/**
 * Đọc sổ cái doanh số — một nguồn sự thật cho trang quản trị, hồ sơ thành
 * viên và (về sau) tính điểm doanh thu của Cuộc đua. Số ròng một dòng =
 * ACCRUAL − REVERSAL.
 */

export interface MemberSalesSummary {
    userId: number
    userName: string | null
    email: string
    teacherGmv: number
    affiliateGmv: number
    totalGmv: number
    entryCount: number
}

export async function getSalesSummaryByMember(from: Date, to: Date, limit = 200): Promise<MemberSalesSummary[]> {
    const entries = await prisma.memberSalesLedger.findMany({
        where: { occurredAt: { gte: from, lt: to } },
        select: { userId: true, role: true, type: true, amount: true, user: { select: { name: true, email: true } } },
    })
    const map = new Map<number, MemberSalesSummary>()
    for (const e of entries) {
        const row = map.get(e.userId) ?? {
            userId: e.userId, userName: e.user.name, email: e.user.email,
            teacherGmv: 0, affiliateGmv: 0, totalGmv: 0, entryCount: 0,
        }
        const signed = e.type === 'ACCRUAL' ? e.amount : -e.amount
        if (e.role === 'TEACHER') row.teacherGmv += signed
        else row.affiliateGmv += signed
        row.totalGmv += signed
        row.entryCount += 1
        map.set(e.userId, row)
    }
    return [...map.values()].sort((a, b) => b.totalGmv - a.totalGmv).slice(0, limit)
}

export interface MemberSalesEntry {
    id: number
    role: string
    type: string
    orderId: number
    courseId: number | null
    amount: number
    occurredAt: Date
}

export async function getMemberEntries(userId: number, page = 1, pageSize = 50): Promise<{ rows: MemberSalesEntry[]; total: number; totalPages: number }> {
    const safePage = Math.max(1, Math.trunc(page) || 1)
    const safeSize = Math.min(100, Math.max(10, Math.trunc(pageSize) || 50))
    const [total, rows] = await Promise.all([
        prisma.memberSalesLedger.count({ where: { userId } }),
        prisma.memberSalesLedger.findMany({
            where: { userId },
            orderBy: { occurredAt: 'desc' },
            skip: (safePage - 1) * safeSize,
            take: safeSize,
            select: { id: true, role: true, type: true, orderId: true, courseId: true, amount: true, occurredAt: true },
        }),
    ])
    return { rows, total, totalPages: Math.max(1, Math.ceil(total / safeSize)) }
}
