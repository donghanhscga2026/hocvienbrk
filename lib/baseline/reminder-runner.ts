import prisma from '@/lib/prisma'
import { decideReminders, reminderEventKey, reminderTitle } from './reminders'

/**
 * Chạy nhắc ghi Điểm A/B cho học viên đang học: tạo AppNotification
 * (chuông trong app) cho các ghi danh thỏa điều kiện. Khóa eventKey duy
 * nhất của AppNotification bảo đảm không nhắc trùng trong cùng tháng —
 * chạy lại bao nhiêu lần cũng an toàn.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export interface ReminderRunResult { scanned: number; created: number }

export async function runBaselineReminders(now = new Date(), batchSize = 500): Promise<ReminderRunResult> {
    const enrollments = await prisma.enrollment.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { id: 'asc' },
        take: batchSize,
        select: {
            id: true, userId: true, courseId: true, createdAt: true,
            course: { select: { name_khoa: true, name_lop: true } },
        },
    })
    if (enrollments.length === 0) return { scanned: 0, created: 0 }

    const pairKey = (userId: number, courseId: number) => `${userId}:${courseId}`
    const baselines = await prisma.learnerBaseline.findMany({
        where: {
            OR: enrollments.map((e) => ({ userId: e.userId, courseId: e.courseId })),
        },
        select: { userId: true, courseId: true, kind: true, recordedAt: true },
    })
    const byPair = new Map<string, { a?: Date; b?: boolean }>()
    for (const b of baselines) {
        const key = pairKey(b.userId, b.courseId)
        const entry = byPair.get(key) ?? {}
        if (b.kind === 'A') entry.a = b.recordedAt
        if (b.kind === 'B') entry.b = true
        byPair.set(key, entry)
    }

    let created = 0
    for (const e of enrollments) {
        const entry = byPair.get(pairKey(e.userId, e.courseId)) ?? {}
        const kinds = decideReminders({
            enrollmentId: e.id,
            enrolledDaysAgo: Math.floor((now.getTime() - e.createdAt.getTime()) / DAY_MS),
            hasA: !!entry.a,
            aRecordedDaysAgo: entry.a ? Math.floor((now.getTime() - entry.a.getTime()) / DAY_MS) : null,
            hasB: !!entry.b,
        })
        const courseName = e.course.name_khoa || e.course.name_lop || `khóa học #${e.courseId}`
        for (const kind of kinds) {
            const eventKey = reminderEventKey(e.id, kind, now)
            const exists = await prisma.appNotification.findUnique({ where: { eventKey }, select: { id: true } })
            if (exists) continue
            await prisma.appNotification.create({
                data: {
                    eventKey,
                    recipientId: e.userId,
                    kind: 'BASELINE_REMINDER',
                    title: reminderTitle(kind, courseName),
                    courseId: e.courseId,
                    enrollmentId: e.id,
                },
            })
            created++
        }
    }
    return { scanned: enrollments.length, created }
}
