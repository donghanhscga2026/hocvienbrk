import prisma from '@/lib/prisma'
import { BADGE_CATALOG, isEarned, type BadgeMetric } from './catalog'

/**
 * Engine trao huy hiệu tự động — đo các chỉ số đời thường của một thành
 * viên từ dữ liệu thật rồi trao huy hiệu còn thiếu. Idempotent: UserBadge
 * duy nhất theo (userId, badgeId, period) với period null cho huy hiệu
 * tích lũy trọn đời; chạy lại không trao trùng. Gọi từ cron badge-awards
 * hoặc khi thành viên mở trang Huy hiệu (đồng bộ nhẹ cho chính họ).
 */

export interface MemberBadgeMetrics {
    LESSONS_COMPLETED: number
    ACTIVE_DAYS: number
    COURSES_COMPLETED: number
    VIDEOS_PUBLISHED: number
    CHANNEL_VIEWS: number
    REVENUE_TOTAL: number
    CUSTOMERS_TOTAL: number
    RACE_BEST_RANK: number
}

function vnDayKey(d: Date): string {
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}

export async function measureMember(userId: number): Promise<MemberBadgeMetrics> {
    const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        select: { id: true, courseId: true },
    })
    const enrollmentIds = enrollments.map((e) => e.id)

    const [completedProgress, ledger, customerOrders, accounts, raceEvents] = await Promise.all([
        enrollmentIds.length
            ? prisma.lessonProgress.findMany({
                where: { enrollmentId: { in: enrollmentIds }, status: 'COMPLETED' },
                select: { enrollmentId: true, submittedAt: true, updatedAt: true },
            })
            : Promise.resolve([]),
        prisma.memberSalesLedger.findMany({ where: { userId }, select: { type: true, amount: true } }),
        prisma.order.findMany({ where: { affiliateId: userId, status: 'PAID' }, select: { buyerId: true } }),
        prisma.connectedAccount.findMany({
            where: { userId, status: { in: ['ACTIVE', 'ERROR'] } },
            select: { id: true },
            }),
        prisma.metricEvent.findMany({
            where: { userId, periodKey: 'TOTAL', race: { status: 'FINISHED' } },
            select: { raceId: true, points: true },
        }),
    ])

    const activeDays = new Set(completedProgress.map((p) => vnDayKey(p.submittedAt ?? p.updatedAt))).size

    // Khóa hoàn thành = mọi bài học của khóa đều có progress COMPLETED.
    let coursesCompleted = 0
    if (enrollments.length > 0) {
        const courseIds = [...new Set(enrollments.map((e) => e.courseId))]
        const lessons = await prisma.lesson.findMany({
            where: { courseId: { in: courseIds } },
            select: { id: true, courseId: true },
        })
        const totalByCourse = new Map<number, number>()
        for (const l of lessons) totalByCourse.set(l.courseId, (totalByCourse.get(l.courseId) ?? 0) + 1)
        const completedByEnrollment = new Map<number, number>()
        for (const p of completedProgress) {
            completedByEnrollment.set(p.enrollmentId, (completedByEnrollment.get(p.enrollmentId) ?? 0) + 1)
        }
        for (const e of enrollments) {
            const total = totalByCourse.get(e.courseId) ?? 0
            if (total > 0 && (completedByEnrollment.get(e.id) ?? 0) >= total) coursesCompleted++
        }
    }

    let videos = 0
    let channelViews = 0
    if (accounts.length > 0) {
        const accountIds = accounts.map((a) => a.id)
        const [count, latestSnapshots] = await Promise.all([
            prisma.externalContentItem.count({ where: { accountId: { in: accountIds } } }),
            prisma.socialSnapshot.findMany({
                where: { accountId: { in: accountIds } },
                orderBy: { capturedAt: 'desc' },
                distinct: ['accountId'],
                select: { totalViews: true },
            }),
        ])
        videos = count
        channelViews = latestSnapshots.reduce((sum, s) => sum + s.totalViews, 0)
    }

    // Hạng tốt nhất: tổng điểm của mình trong từng cuộc đua đã kết thúc,
    // so với mọi người cùng cuộc đua đó.
    let bestRank = 0
    if (raceEvents.length > 0) {
        const myTotals = new Map<number, number>()
        for (const e of raceEvents) myTotals.set(e.raceId, (myTotals.get(e.raceId) ?? 0) + e.points)
        for (const [raceId, myPoints] of myTotals) {
            const all = await prisma.metricEvent.groupBy({
                by: ['userId'],
                where: { raceId, periodKey: 'TOTAL' },
                _sum: { points: true },
            })
            const better = all.filter((a) => (a._sum.points ?? 0) > myPoints).length
            const rank = better + 1
            if (bestRank === 0 || rank < bestRank) bestRank = rank
        }
    }

    return {
        LESSONS_COMPLETED: completedProgress.length,
        ACTIVE_DAYS: activeDays,
        COURSES_COMPLETED: coursesCompleted,
        VIDEOS_PUBLISHED: videos,
        CHANNEL_VIEWS: Math.round(channelViews),
        REVENUE_TOTAL: ledger.reduce((sum, e) => sum + (e.type === 'ACCRUAL' ? e.amount : -e.amount), 0),
        CUSTOMERS_TOTAL: new Set(customerOrders.map((o) => o.buyerId)).size,
        RACE_BEST_RANK: bestRank,
    }
}

/** Đồng bộ định nghĩa huy hiệu từ code vào bảng Badge (upsert theo code). */
export async function ensureBadgeCatalog(): Promise<void> {
    for (const def of BADGE_CATALOG) {
        await prisma.badge.upsert({
            where: { code: def.code },
            create: {
                code: def.code, name: def.name, description: def.description, icon: def.icon,
                tier: def.tier, category: def.category,
                rule: { metric: def.metric, threshold: def.threshold },
            },
            update: {
                name: def.name, description: def.description, icon: def.icon,
                tier: def.tier, category: def.category,
                rule: { metric: def.metric, threshold: def.threshold },
            },
        })
    }
}

export interface AwardResult { userId: number; awarded: string[] }

export async function awardBadgesForUser(userId: number): Promise<AwardResult> {
    await ensureBadgeCatalog()
    const metrics = await measureMember(userId)
    const badges = await prisma.badge.findMany({
        where: { code: { in: BADGE_CATALOG.map((b) => b.code) }, isActive: true },
        select: { id: true, code: true },
    })
    const badgeIdByCode = new Map(badges.map((b) => [b.code, b.id]))
    const owned = new Set(
        (await prisma.userBadge.findMany({ where: { userId, badgeId: { in: badges.map((b) => b.id) } }, select: { badgeId: true } }))
            .map((u) => u.badgeId),
    )
    const awarded: string[] = []
    for (const def of BADGE_CATALOG) {
        const badgeId = badgeIdByCode.get(def.code)
        if (!badgeId || owned.has(badgeId)) continue
        const value = metrics[def.metric as BadgeMetric]
        if (isEarned(def, value)) {
            await prisma.userBadge.create({ data: { userId, badgeId } })
            awarded.push(def.code)
        }
    }
    return { userId, awarded }
}

export async function awardBadgesForAllUsers(batchSize = 200): Promise<{ users: number; awardedTotal: number }> {
    // Chỉ xét người dùng có hoạt động: đã ghi danh, có sổ cái, hoặc có tài khoản liên kết.
    const [enrolled, ledgerUsers, linked] = await Promise.all([
        prisma.enrollment.findMany({ distinct: ['userId'], select: { userId: true }, take: 5000 }),
        prisma.memberSalesLedger.findMany({ distinct: ['userId'], select: { userId: true }, take: 5000 }),
        prisma.connectedAccount.findMany({ distinct: ['userId'], select: { userId: true }, take: 5000 }),
    ])
    const userIds = [...new Set([...enrolled, ...ledgerUsers, ...linked].map((x) => x.userId))].slice(0, batchSize * 10)
    let awardedTotal = 0
    for (const userId of userIds) {
        const result = await awardBadgesForUser(userId)
        awardedTotal += result.awarded.length
    }
    return { users: userIds.length, awardedTotal }
}
