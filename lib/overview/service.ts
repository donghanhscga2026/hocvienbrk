import prisma from '@/lib/prisma'

/**
 * Tổng quan vận hành chương trình + vinh danh học tập + lịch sự kiện tự
 * sinh — mọi số liệu đọc từ cùng các nguồn sự thật đã xây ở GĐ1–GĐ3
 * (điểm danh, sổ cái, cuộc đua, huy hiệu, liên kết tài khoản). GĐ4.
 */

export interface OpsOverview {
    activeRaces: number
    raceMembers: number
    sessionsRecorded: number
    attendanceRate: number | null
    ledgerGmvThisMonth: number
    badgesAwarded: number
    linkedAccounts: number
    newMembersThisMonth: number
}

export async function getOpsOverview(now = new Date()): Promise<OpsOverview> {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const [activeRaces, raceMembers, present, absent, ledger, badgesAwarded, linkedAccounts, newMembers] = await Promise.all([
        prisma.race.count({ where: { status: 'ACTIVE' } }),
        prisma.raceEnrollment.count({ where: { race: { status: 'ACTIVE' } } }),
        prisma.attendanceRecord.count({ where: { status: 'PRESENT' } }),
        prisma.attendanceRecord.count({ where: { status: 'ABSENT' } }),
        prisma.memberSalesLedger.findMany({
            where: { occurredAt: { gte: monthStart } },
            select: { type: true, amount: true },
        }),
        prisma.userBadge.count(),
        prisma.connectedAccount.count({ where: { status: { in: ['ACTIVE', 'ERROR'] } } }),
        prisma.enrollment.count({ where: { status: 'ACTIVE', createdAt: { gte: monthStart } } }),
    ])
    const sessionsRecorded = await prisma.attendanceSession.count()
    const gmv = ledger.reduce((sum, e) => sum + (e.type === 'ACCRUAL' ? e.amount : -e.amount), 0)
    const totalAttendance = present + absent
    return {
        activeRaces,
        raceMembers,
        sessionsRecorded,
        attendanceRate: totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : null,
        ledgerGmvThisMonth: gmv,
        badgesAwarded,
        linkedAccounts,
        newMembersThisMonth: newMembers,
    }
}

export interface TeamStanding {
    team: number
    group: number
    members: number
    lessonsCompleted: number
    attendancePresent: number
    attendanceTotal: number
}

export async function getTeamStandings(courseId: number): Promise<TeamStanding[]> {
    const enrollments = await prisma.enrollment.findMany({
        where: { courseId, status: 'ACTIVE' },
        select: { id: true, userId: true, team: true, group: true },
    })
    if (enrollments.length === 0) return []
    const enrollmentIds = enrollments.map((e) => e.id)
    const userIds = enrollments.map((e) => e.userId)
    const [progressCounts, attendance] = await Promise.all([
        prisma.lessonProgress.groupBy({
            by: ['enrollmentId'],
            where: { enrollmentId: { in: enrollmentIds }, status: 'COMPLETED' },
            _count: { id: true },
        }),
        prisma.attendanceRecord.findMany({
            where: { userId: { in: userIds }, session: { courseId } },
            select: { userId: true, status: true },
        }),
    ])
    const lessonsByEnrollment = new Map(progressCounts.map((p) => [p.enrollmentId, p._count.id]))
    const key = (team: number, group: number) => `${team}|${group}`
    const map = new Map<string, TeamStanding>()
    const teamOfUser = new Map<number, string>()
    for (const e of enrollments) {
        const k = key(e.team || 1, e.group || 1)
        teamOfUser.set(e.userId, k)
        const row = map.get(k) ?? { team: e.team || 1, group: e.group || 1, members: 0, lessonsCompleted: 0, attendancePresent: 0, attendanceTotal: 0 }
        row.members++
        row.lessonsCompleted += lessonsByEnrollment.get(e.id) ?? 0
        map.set(k, row)
    }
    for (const a of attendance) {
        const k = teamOfUser.get(a.userId)
        if (!k) continue
        const row = map.get(k)
        if (!row) continue
        row.attendanceTotal++
        if (a.status === 'PRESENT') row.attendancePresent++
    }
    return [...map.values()]
        .sort((a, b) => b.lessonsCompleted - a.lessonsCompleted || a.team - b.team)
}

export interface HonorRow { userId: number; userName: string | null; email: string; value: number }

export async function getTopBadgeEarners(limit = 10): Promise<HonorRow[]> {
    const grouped = await prisma.userBadge.groupBy({ by: ['userId'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: limit })
    if (grouped.length === 0) return []
    const users = await prisma.user.findMany({ where: { id: { in: grouped.map((g) => g.userId) } }, select: { id: true, name: true, email: true } })
    const byId = new Map(users.map((u) => [u.id, u]))
    return grouped.map((g) => ({
        userId: g.userId,
        userName: byId.get(g.userId)?.name ?? null,
        email: byId.get(g.userId)?.email ?? '',
        value: g._count.id,
    }))
}

export async function getTopLearnersThisMonth(limit = 10, now = new Date()): Promise<HonorRow[]> {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const progresses = await prisma.lessonProgress.findMany({
        where: { status: 'COMPLETED', updatedAt: { gte: monthStart } },
        select: { enrollment: { select: { userId: true, user: { select: { name: true, email: true } } } } },
    })
    const counts = new Map<number, HonorRow>()
    for (const p of progresses) {
        const u = p.enrollment
        const row = counts.get(u.userId) ?? { userId: u.userId, userName: u.user.name, email: u.user.email, value: 0 }
        row.value++
        counts.set(u.userId, row)
    }
    return [...counts.values()].sort((a, b) => b.value - a.value).slice(0, limit)
}

export interface AgendaEvent {
    date: Date
    kind: 'SESSION' | 'RACE_START' | 'RACE_END' | 'LEAVE'
    title: string
    detail: string
}

/** Lịch sự kiện tự sinh cho một thành viên: buổi học đã điểm danh của
 *  các khóa đang học, mốc bắt đầu/kết thúc cuộc đua mình tham gia và
 *  ngày nghỉ đã duyệt của mình. */
export async function getMyAgenda(userId: number): Promise<AgendaEvent[]> {
    const [sessions, raceEnrollments, leaves] = await Promise.all([
        prisma.attendanceSession.findMany({
            where: { course: { enrollments: { some: { userId, status: 'ACTIVE' } } } },
            orderBy: { sessionDate: 'desc' },
            take: 100,
            include: { course: { select: { name_khoa: true, name_lop: true } } },
        }),
        prisma.raceEnrollment.findMany({ where: { userId }, include: { race: true } }),
        prisma.raceLeave.findMany({ where: { userId, status: 'APPROVED' }, orderBy: { date: 'desc' }, take: 50, include: { race: { select: { name: true } } } }),
    ])
    const events: AgendaEvent[] = []
    for (const s of sessions) {
        events.push({
            date: s.sessionDate, kind: 'SESSION',
            title: s.title,
            detail: `Buổi học · ${s.course.name_khoa || s.course.name_lop || `Khóa #${s.courseId}`}`,
        })
    }
    for (const e of raceEnrollments) {
        events.push({ date: e.race.startsAt, kind: 'RACE_START', title: `Bắt đầu: ${e.race.name}`, detail: 'Cuộc đua tăng tốc' })
        events.push({ date: e.race.endsAt, kind: 'RACE_END', title: `Kết thúc: ${e.race.name}`, detail: 'Cuộc đua tăng tốc' })
    }
    for (const l of leaves) {
        events.push({ date: l.date, kind: 'LEAVE', title: `Ngày nghỉ đã duyệt`, detail: l.race.name })
    }
    return events.sort((a, b) => b.date.getTime() - a.date.getTime())
}
