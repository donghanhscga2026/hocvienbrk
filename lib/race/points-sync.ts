import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { METRIC_KEYS, METRIC_SOURCES, pointsFor, resolveMetricConfig, sumPositiveDeltas, type MetricKey } from './scoring'

/**
 * Tính lại điểm cuộc đua từ các nguồn tự động — idempotent nhờ upsert
 * theo (raceId, userId, metricKey, "TOTAL"). Cửa sổ đo: từ lúc cuộc đua
 * bắt đầu tới min(hiện tại, lúc kết thúc). Chạy từ cron /api/cron/race-sync
 * hoặc nút tính lại ở trang quản trị.
 */

export interface RaceSyncResult { raceId: number; members: number; eventsWritten: number }

async function measureUser(userId: number, from: Date, to: Date): Promise<Record<MetricKey, number>> {
    const [ledger, customerOrders, leads, accounts] = await Promise.all([
        prisma.memberSalesLedger.findMany({
            where: { userId, occurredAt: { gte: from, lte: to } },
            select: { type: true, amount: true },
        }),
        prisma.order.findMany({
            where: { affiliateId: userId, status: 'PAID', paidAt: { gte: from, lte: to } },
            select: { buyerId: true },
        }),
        prisma.enrollment.count({
            where: { referrerId: userId, userId: { not: userId }, status: 'ACTIVE', createdAt: { gte: from, lte: to } },
        }),
        prisma.connectedAccount.findMany({
            where: { userId, provider: 'YOUTUBE', status: { in: ['ACTIVE', 'ERROR'] } },
            select: { id: true },
        }),
    ])

    const revenue = ledger.reduce((sum, e) => sum + (e.type === 'ACCRUAL' ? e.amount : -e.amount), 0)
    const customers = new Set(customerOrders.map((o) => o.buyerId)).size

    let videos = 0
    let views = 0
    let followers = 0
    if (accounts.length > 0) {
        const accountIds = accounts.map((a) => a.id)
        const [videoCount, snapshots] = await Promise.all([
            prisma.externalContentItem.count({
                where: { accountId: { in: accountIds }, publishedAt: { gte: from, lte: to } },
            }),
            prisma.socialSnapshot.findMany({
                where: { accountId: { in: accountIds }, capturedAt: { lte: to } },
                orderBy: { capturedAt: 'asc' },
                select: { accountId: true, capturedAt: true, followers: true, totalViews: true },
            }),
        ])
        videos = videoCount
        // Delta trong kỳ: lấy snapshot cuối trước kỳ làm mốc cho từng tài khoản.
        const byAccount = new Map<number, typeof snapshots>()
        for (const s of snapshots) byAccount.set(s.accountId, [...(byAccount.get(s.accountId) ?? []), s])
        for (const list of byAccount.values()) {
            const inWindow = list.filter((s) => s.capturedAt >= from)
            if (inWindow.length === 0) continue
            const before = [...list].reverse().find((s) => s.capturedAt < from)
            const viewSeries = [...(before ? [before.totalViews] : []), ...inWindow.map((s) => s.totalViews)]
            const followerSeries = [...(before ? [before.followers] : []), ...inWindow.map((s) => s.followers)]
            views += sumPositiveDeltas(viewSeries)
            followers += sumPositiveDeltas(followerSeries)
        }
    }

    return { REVENUE: revenue, CUSTOMERS: customers, LEADS: leads, VIDEOS: videos, VIEWS: views, FOLLOWERS: followers }
}

export async function syncRacePoints(raceId: number): Promise<RaceSyncResult> {
    const race = await prisma.race.findUnique({ where: { id: raceId } })
    if (!race) return { raceId, members: 0, eventsWritten: 0 }
    const config = resolveMetricConfig(race.metricConfig)
    const to = new Date(Math.min(Date.now(), race.endsAt.getTime()))
    const members = await prisma.raceEnrollment.findMany({ where: { raceId }, select: { userId: true } })

    let eventsWritten = 0
    for (const member of members) {
        const quantities = await measureUser(member.userId, race.startsAt, to)
        for (const key of METRIC_KEYS) {
            const quantity = quantities[key]
            const points = pointsFor(quantity, config[key])
            await prisma.metricEvent.upsert({
                where: { raceId_userId_metricKey_periodKey: { raceId, userId: member.userId, metricKey: key, periodKey: 'TOTAL' } },
                create: {
                    raceId, userId: member.userId, metricKey: key, periodKey: 'TOTAL',
                    quantity, points, source: METRIC_SOURCES[key],
                    detail: { rule: config[key] } as unknown as Prisma.InputJsonValue, computedAt: new Date(),
                },
                update: { quantity, points, source: METRIC_SOURCES[key], detail: { rule: config[key] } as unknown as Prisma.InputJsonValue, computedAt: new Date() },
            })
            eventsWritten++
        }
    }
    return { raceId, members: members.length, eventsWritten }
}

export async function syncActiveRaces(): Promise<RaceSyncResult[]> {
    const races = await prisma.race.findMany({ where: { status: 'ACTIVE' }, select: { id: true } })
    const results: RaceSyncResult[] = []
    for (const r of races) results.push(await syncRacePoints(r.id))
    return results
}
