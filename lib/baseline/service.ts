import prisma from '@/lib/prisma'
import { computeGrowth, emptyMetrics, type BaselineMetrics, type GrowthMap } from './growth'

/**
 * Đọc dữ liệu Điểm A → Điểm B. Mọi trang (học viên, quản trị) đều đọc qua
 * service này — một nguồn sự thật duy nhất cho mỗi con số (bài học từ
 * WIPA OS: số học viên lệch nhau giữa các trang của cùng một hệ thống).
 */

export interface BaselinePair {
    a: (BaselineMetrics & { recordedAt: Date; note: string | null }) | null
    b: (BaselineMetrics & { recordedAt: Date; note: string | null }) | null
    growth: GrowthMap | null
}

function toMetrics(row: { followers: number; views: number; customers: number; revenue: number }): BaselineMetrics {
    return { followers: row.followers, views: row.views, customers: row.customers, revenue: row.revenue }
}

export async function getBaselinePair(userId: number, courseId: number): Promise<BaselinePair> {
    const rows = await prisma.learnerBaseline.findMany({ where: { userId, courseId } })
    const rowA = rows.find((r) => r.kind === 'A') ?? null
    const rowB = rows.find((r) => r.kind === 'B') ?? null
    const a = rowA ? { ...toMetrics(rowA), recordedAt: rowA.recordedAt, note: rowA.note } : null
    const b = rowB ? { ...toMetrics(rowB), recordedAt: rowB.recordedAt, note: rowB.note } : null
    return { a, b, growth: a && b ? computeGrowth(a, b) : null }
}

export interface CourseGrowthRow {
    userId: number
    userName: string | null
    email: string
    a: BaselineMetrics | null
    b: BaselineMetrics | null
    growth: GrowthMap | null
}

export interface CourseGrowthData {
    rows: CourseGrowthRow[]
    totalStudents: number
    recordedA: number
    recordedB: number
    page: number
    pageSize: number
    totalPages: number
}

/** Bảng tăng trưởng của một khóa cho quản trị — phân trang bắt buộc. */
export async function getCourseGrowth(courseId: number, page = 1, pageSize = 50): Promise<CourseGrowthData> {
    const safePage = Math.max(1, Math.trunc(page) || 1)
    const safeSize = Math.min(100, Math.max(10, Math.trunc(pageSize) || 50))

    const [totalStudents, recordedA, recordedB, enrollments, baselines] = await Promise.all([
        prisma.enrollment.count({ where: { courseId, status: 'ACTIVE' } }),
        prisma.learnerBaseline.count({ where: { courseId, kind: 'A' } }),
        prisma.learnerBaseline.count({ where: { courseId, kind: 'B' } }),
        prisma.enrollment.findMany({
            where: { courseId, status: 'ACTIVE' },
            orderBy: { userId: 'asc' },
            skip: (safePage - 1) * safeSize,
            take: safeSize,
            select: { userId: true, user: { select: { name: true, email: true } } },
        }),
        prisma.learnerBaseline.findMany({ where: { courseId } }),
    ])

    const byUser = new Map<number, { a: BaselineMetrics | null; b: BaselineMetrics | null }>()
    for (const row of baselines) {
        const entry = byUser.get(row.userId) ?? { a: null, b: null }
        if (row.kind === 'A') entry.a = toMetrics(row)
        else entry.b = toMetrics(row)
        byUser.set(row.userId, entry)
    }

    const rows: CourseGrowthRow[] = enrollments.map((e) => {
        const entry = byUser.get(e.userId) ?? { a: null, b: null }
        return {
            userId: e.userId,
            userName: e.user.name,
            email: e.user.email,
            a: entry.a,
            b: entry.b,
            growth: entry.a && entry.b ? computeGrowth(entry.a, entry.b) : null,
        }
    })

    return {
        rows,
        totalStudents,
        recordedA,
        recordedB,
        page: safePage,
        pageSize: safeSize,
        totalPages: Math.max(1, Math.ceil(totalStudents / safeSize)),
    }
}

export { emptyMetrics }

/**
 * Số liệu hệ thống đã tự đo cho một học viên — dùng làm gợi ý điền Điểm B:
 * followers/views từ snapshot mới nhất của các kênh đã liên kết, doanh
 * thu ròng tích lũy từ sổ cái, khách riêng biệt qua đơn PAID affiliate.
 * Trả null khi chưa có nguồn nào đo được.
 */
export interface MeasuredTotals {
    followers: number
    views: number
    customers: number
    revenue: number
}

export async function getMeasuredTotals(userId: number): Promise<MeasuredTotals | null> {
    const [accounts, ledger, orders] = await Promise.all([
        prisma.connectedAccount.findMany({
            where: { userId, status: { in: ['ACTIVE', 'ERROR'] } },
            select: { id: true },
        }),
        prisma.memberSalesLedger.findMany({ where: { userId }, select: { type: true, amount: true } }),
        prisma.order.findMany({ where: { affiliateId: userId, status: 'PAID' }, select: { buyerId: true } }),
    ])
    let followers = 0
    let views = 0
    if (accounts.length > 0) {
        const latest = await prisma.socialSnapshot.findMany({
            where: { accountId: { in: accounts.map((a) => a.id) } },
            orderBy: { capturedAt: 'desc' },
            distinct: ['accountId'],
            select: { followers: true, totalViews: true },
        })
        followers = latest.reduce((s, x) => s + x.followers, 0)
        views = Math.round(latest.reduce((s, x) => s + x.totalViews, 0))
    }
    const revenue = ledger.reduce((s, e) => s + (e.type === 'ACCRUAL' ? e.amount : -e.amount), 0)
    const customers = new Set(orders.map((o) => o.buyerId)).size
    if (accounts.length === 0 && ledger.length === 0 && orders.length === 0) return null
    return { followers, views, customers, revenue: Math.round(revenue) }
}
