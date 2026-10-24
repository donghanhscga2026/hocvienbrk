import prisma from '@/lib/prisma'
import { METRIC_LABELS, type MetricKey } from './scoring'

/** Đọc dữ liệu cuộc đua — một nguồn cho trang học viên và quản trị. */

export interface LeaderboardRow {
    userId: number
    userName: string | null
    email: string
    team: number
    totalPoints: number
    byMetric: Partial<Record<MetricKey, { quantity: number; points: number }>>
}

export async function getLeaderboard(raceId: number, limit = 200): Promise<LeaderboardRow[]> {
    const [enrollments, events] = await Promise.all([
        prisma.raceEnrollment.findMany({
            where: { raceId },
            include: { user: { select: { name: true, email: true } } },
        }),
        prisma.metricEvent.findMany({ where: { raceId, periodKey: 'TOTAL' } }),
    ])
    const rows = new Map<number, LeaderboardRow>()
    for (const e of enrollments) {
        rows.set(e.userId, {
            userId: e.userId, userName: e.user.name, email: e.user.email,
            team: e.team, totalPoints: 0, byMetric: {},
        })
    }
    for (const ev of events) {
        const row = rows.get(ev.userId)
        if (!row) continue
        row.byMetric[ev.metricKey as MetricKey] = { quantity: ev.quantity, points: ev.points }
        row.totalPoints += ev.points
    }
    return [...rows.values()].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, limit)
}

export function metricLabel(key: string): string {
    return METRIC_LABELS[key as MetricKey] ?? key
}

export interface TeamStanding {
    team: number
    members: number
    totalPoints: number
    avgPoints: number
}

/** Bảng điểm theo đội trong một cuộc đua — cộng từ chính bảng xếp hạng
 *  cá nhân nên hai bảng không bao giờ lệch nhau. */
export async function getRaceTeamStandings(raceId: number): Promise<TeamStanding[]> {
    const leaderboard = await getLeaderboard(raceId, 1000)
    const map = new Map<number, TeamStanding>()
    for (const row of leaderboard) {
        const entry = map.get(row.team) ?? { team: row.team, members: 0, totalPoints: 0, avgPoints: 0 }
        entry.members++
        entry.totalPoints += row.totalPoints
        map.set(row.team, entry)
    }
    const rows = [...map.values()]
    for (const r of rows) r.avgPoints = r.members > 0 ? Math.round((r.totalPoints / r.members) * 10) / 10 : 0
    return rows.sort((a, b) => b.totalPoints - a.totalPoints || a.team - b.team)
}
