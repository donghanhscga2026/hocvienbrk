import prisma from '@/lib/prisma'
import { BADGE_CATALOG, isEarned, type BadgeDefinition, type BadgeMetric } from './catalog'

/**
 * Engine trao huy hiệu tự động — đo các chỉ số đời thường của một thành
 * viên từ dữ liệu thật rồi trao huy hiệu còn thiếu. Idempotent: UserBadge
 * duy nhất theo (userId, badgeId, period) với period null cho huy hiệu
 * tích lũy trọn đời; chạy lại không trao trùng. Gọi từ cron badge-awards
 * hoặc khi thành viên mở trang Huy hiệu (đồng bộ nhẹ cho chính họ).
 *
 * Tối ưu vận hành (26/10/2026): bản đầu đồng bộ catalog (24 upsert) TRƯỚC
 * MỖI thành viên và đo từng người bằng nhiều truy vấn riêng lẻ — lượt
 * chạy toàn hệ thống đầu tiên chạm timeout 900 giây mới xong 2 người.
 * Bản này: catalog chỉ đồng bộ 1 lần mỗi tiến trình; lượt toàn hệ thống
 * đo GỘP bằng các truy vấn groupBy/findMany dùng chung cho mọi thành
 * viên, trao bằng createMany và báo chuông 1 lần cho mỗi thành viên có
 * huy hiệu mới (kind BADGE_AWARDED, xem lib/app-notifications.ts).
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

function emptyMetrics(): MemberBadgeMetrics {
    return {
        LESSONS_COMPLETED: 0,
        ACTIVE_DAYS: 0,
        COURSES_COMPLETED: 0,
        VIDEOS_PUBLISHED: 0,
        CHANNEL_VIEWS: 0,
        REVENUE_TOTAL: 0,
        CUSTOMERS_TOTAL: 0,
        RACE_BEST_RANK: 0,
    }
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

let catalogReady: Promise<void> | null = null

/** Đồng bộ định nghĩa huy hiệu từ code vào bảng Badge (upsert theo code).
 *  Chỉ chạy 1 lần mỗi tiến trình — các lời gọi sau dùng lại cùng promise. */
export async function ensureBadgeCatalog(): Promise<void> {
    if (!catalogReady) {
        catalogReady = (async () => {
            await Promise.all(BADGE_CATALOG.map((def) => prisma.badge.upsert({
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
            })))
        })()
        // Đồng bộ lỗi thì cho phép thử lại ở lời gọi sau thay vì kẹt cả tiến trình.
        catalogReady.catch(() => { catalogReady = null })
    }
    return catalogReady
}

/** Báo chuông cho thành viên vừa nhận huy hiệu mới (1 thông báo gộp cho
 *  cả đợt). Lỗi thông báo không bao giờ chặn việc trao huy hiệu. */
async function notifyBadgeAwards(userId: number, defs: BadgeDefinition[]): Promise<void> {
    if (defs.length === 0) return
    try {
        const names = defs.map((d) => `${d.icon} ${d.name}`).join(', ')
        const title = defs.length === 1
            ? `Chúc mừng! Bạn vừa nhận huy hiệu mới: ${names}`
            : `Chúc mừng! Bạn vừa nhận ${defs.length} huy hiệu mới: ${names}`
        await prisma.appNotification.create({
            data: {
                // Khóa sự kiện xác định theo đúng tập huy hiệu của đợt trao:
                // chạy lại cùng một đợt không sinh thông báo trùng.
                eventKey: `badge-award:${userId}:${defs.map((d) => d.code).sort().join('+')}`,
                recipientId: userId,
                kind: 'BADGE_AWARDED',
                title,
            },
        })
    } catch (error) {
        console.error('[badges] tạo thông báo huy hiệu thất bại', error)
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
    const earnedDefs = BADGE_CATALOG.filter((def) => {
        const badgeId = badgeIdByCode.get(def.code)
        return badgeId != null && !owned.has(badgeId) && isEarned(def, metrics[def.metric as BadgeMetric])
    })
    if (earnedDefs.length > 0) {
        await prisma.userBadge.createMany({
            data: earnedDefs.map((def) => ({ userId, badgeId: badgeIdByCode.get(def.code)! })),
            skipDuplicates: true,
        })
        await notifyBadgeAwards(userId, earnedDefs)
    }
    return { userId, awarded: earnedDefs.map((d) => d.code) }
}

/** Đo gộp cho nhiều thành viên bằng các truy vấn dùng chung (groupBy /
 *  findMany theo lô) thay vì đo từng người — nền của lượt trao toàn hệ
 *  thống để không còn chạm timeout như bản đầu. */
async function measureAllMembers(userIds: number[]): Promise<Map<number, MemberBadgeMetrics>> {
    const result = new Map<number, MemberBadgeMetrics>()
    for (const id of userIds) result.set(id, emptyMetrics())
    if (userIds.length === 0) return result

    const enrollments = await prisma.enrollment.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true, courseId: true },
    })
    const enrollmentById = new Map(enrollments.map((e) => [e.id, e]))

    const [completedProgress, lessonCounts, ledgerGroups, customerRows, accounts, raceTotals] = await Promise.all([
        prisma.lessonProgress.findMany({
            where: { status: 'COMPLETED', enrollment: { userId: { in: userIds } } },
            select: { enrollmentId: true, submittedAt: true, updatedAt: true },
        }),
        prisma.lesson.groupBy({ by: ['courseId'], _count: { id: true } }),
        prisma.memberSalesLedger.groupBy({
            by: ['userId', 'type'],
            where: { userId: { in: userIds } },
            _sum: { amount: true },
        }),
        prisma.order.findMany({
            where: { status: 'PAID', affiliateId: { in: userIds } },
            select: { affiliateId: true, buyerId: true },
            distinct: ['affiliateId', 'buyerId'],
        }),
        prisma.connectedAccount.findMany({
            where: { userId: { in: userIds }, status: { in: ['ACTIVE', 'ERROR'] } },
            select: { id: true, userId: true },
        }),
        prisma.metricEvent.groupBy({
            by: ['raceId', 'userId'],
            where: { periodKey: 'TOTAL', race: { status: 'FINISHED' } },
            _sum: { points: true },
        }),
    ])

    // Học tập: số bài, số ngày hoạt động, số bài hoàn thành theo ghi danh.
    const daysByUser = new Map<number, Set<string>>()
    const completedByEnrollment = new Map<number, number>()
    for (const p of completedProgress) {
        const enrollment = enrollmentById.get(p.enrollmentId)
        if (!enrollment) continue
        const m = result.get(enrollment.userId)
        if (!m) continue
        m.LESSONS_COMPLETED++
        completedByEnrollment.set(p.enrollmentId, (completedByEnrollment.get(p.enrollmentId) ?? 0) + 1)
        let days = daysByUser.get(enrollment.userId)
        if (!days) { days = new Set(); daysByUser.set(enrollment.userId, days) }
        days.add(vnDayKey(p.submittedAt ?? p.updatedAt))
    }
    for (const [userId, days] of daysByUser) {
        const m = result.get(userId)
        if (m) m.ACTIVE_DAYS = days.size
    }
    const totalByCourse = new Map(lessonCounts.map((l) => [l.courseId, l._count.id]))
    for (const e of enrollments) {
        const total = totalByCourse.get(e.courseId) ?? 0
        const m = result.get(e.userId)
        if (m && total > 0 && (completedByEnrollment.get(e.id) ?? 0) >= total) m.COURSES_COMPLETED++
    }

    // Kinh doanh: doanh thu ròng từ sổ cái + khách riêng biệt qua affiliate.
    for (const g of ledgerGroups) {
        const m = result.get(g.userId)
        if (m) m.REVENUE_TOTAL += (g.type === 'ACCRUAL' ? 1 : -1) * (g._sum.amount ?? 0)
    }
    const customersByUser = new Map<number, Set<number>>()
    for (const row of customerRows) {
        if (row.affiliateId == null) continue
        let set = customersByUser.get(row.affiliateId)
        if (!set) { set = new Set(); customersByUser.set(row.affiliateId, set) }
        set.add(row.buyerId)
    }
    for (const [userId, set] of customersByUser) {
        const m = result.get(userId)
        if (m) m.CUSTOMERS_TOTAL = set.size
    }

    // Nội dung: video đã đăng + lượt xem ở snapshot mới nhất của mỗi kênh.
    if (accounts.length > 0) {
        const accountIds = accounts.map((a) => a.id)
        const ownerByAccount = new Map(accounts.map((a) => [a.id, a.userId]))
        const [videoCounts, latestSnapshots] = await Promise.all([
            prisma.externalContentItem.groupBy({ by: ['accountId'], where: { accountId: { in: accountIds } }, _count: { id: true } }),
            prisma.socialSnapshot.findMany({
                where: { accountId: { in: accountIds } },
                orderBy: { capturedAt: 'desc' },
                distinct: ['accountId'],
                select: { accountId: true, totalViews: true },
            }),
        ])
        for (const v of videoCounts) {
            const m = result.get(ownerByAccount.get(v.accountId) ?? -1)
            if (m) m.VIDEOS_PUBLISHED += v._count.id
        }
        for (const s of latestSnapshots) {
            const m = result.get(ownerByAccount.get(s.accountId) ?? -1)
            if (m) m.CHANNEL_VIEWS += Math.round(s.totalViews)
        }
    }

    // Cuộc đua: hạng tốt nhất từ tổng điểm từng cuộc đua đã kết thúc.
    const totalsByRace = new Map<number, { userId: number; points: number }[]>()
    for (const t of raceTotals) {
        let arr = totalsByRace.get(t.raceId)
        if (!arr) { arr = []; totalsByRace.set(t.raceId, arr) }
        arr.push({ userId: t.userId, points: t._sum.points ?? 0 })
    }
    for (const totals of totalsByRace.values()) {
        for (const mine of totals) {
            const m = result.get(mine.userId)
            if (!m) continue
            const rank = totals.filter((t) => t.points > mine.points).length + 1
            if (m.RACE_BEST_RANK === 0 || rank < m.RACE_BEST_RANK) m.RACE_BEST_RANK = rank
        }
    }

    return result
}

export interface PlannedBadgeAward { userId: number; badgeId: number; def: BadgeDefinition }

/** Tính trước toàn bộ huy hiệu sẽ trao cho mọi thành viên có hoạt động
 *  mà KHÔNG ghi gì vào DB — dùng cho dry-run kiểm chứng trước khi chạy
 *  thật và là nền của awardBadgesForAllUsers. */
export async function planAllBadgeAwards(): Promise<{ userIds: number[]; planned: PlannedBadgeAward[] }> {
    await ensureBadgeCatalog()
    // Chỉ xét người dùng có hoạt động: đã ghi danh, có sổ cái, hoặc có tài khoản liên kết.
    const [enrolled, ledgerUsers, linked] = await Promise.all([
        prisma.enrollment.findMany({ distinct: ['userId'], select: { userId: true }, take: 5000 }),
        prisma.memberSalesLedger.findMany({ distinct: ['userId'], select: { userId: true }, take: 5000 }),
        prisma.connectedAccount.findMany({ distinct: ['userId'], select: { userId: true }, take: 5000 }),
    ])
    const userIds = [...new Set([...enrolled, ...ledgerUsers, ...linked].map((x) => x.userId))]

    const badges = await prisma.badge.findMany({
        where: { code: { in: BADGE_CATALOG.map((b) => b.code) }, isActive: true },
        select: { id: true, code: true },
    })
    const badgeIdByCode = new Map(badges.map((b) => [b.code, b.id]))
    const badgeIds = badges.map((b) => b.id)

    const [metricsByUser, ownedRows] = await Promise.all([
        measureAllMembers(userIds),
        badgeIds.length
            ? prisma.userBadge.findMany({ where: { userId: { in: userIds }, badgeId: { in: badgeIds } }, select: { userId: true, badgeId: true } })
            : Promise.resolve([]),
    ])
    const ownedByUser = new Map<number, Set<number>>()
    for (const row of ownedRows) {
        let set = ownedByUser.get(row.userId)
        if (!set) { set = new Set(); ownedByUser.set(row.userId, set) }
        set.add(row.badgeId)
    }

    const planned: PlannedBadgeAward[] = []
    for (const userId of userIds) {
        const metrics = metricsByUser.get(userId)
        if (!metrics) continue
        const owned = ownedByUser.get(userId) ?? new Set<number>()
        for (const def of BADGE_CATALOG) {
            const badgeId = badgeIdByCode.get(def.code)
            if (badgeId == null || owned.has(badgeId)) continue
            if (isEarned(def, metrics[def.metric as BadgeMetric])) {
                planned.push({ userId, badgeId, def })
            }
        }
    }
    return { userIds, planned }
}

export async function awardBadgesForAllUsers(): Promise<{ users: number; awardedTotal: number }> {
    const { userIds, planned } = await planAllBadgeAwards()
    if (planned.length > 0) {
        await prisma.userBadge.createMany({
            data: planned.map((p) => ({ userId: p.userId, badgeId: p.badgeId })),
            skipDuplicates: true,
        })
        const defsByUser = new Map<number, BadgeDefinition[]>()
        for (const p of planned) {
            let defs = defsByUser.get(p.userId)
            if (!defs) { defs = []; defsByUser.set(p.userId, defs) }
            defs.push(p.def)
        }
        for (const [userId, defs] of defsByUser) {
            await notifyBadgeAwards(userId, defs)
        }
    }
    return { users: userIds.length, awardedTotal: planned.length }
}
