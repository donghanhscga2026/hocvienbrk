import prisma from '@/lib/prisma'
import { decideReminders, reminderEventKey, reminderTitle } from './reminders'

/**
 * Chạy nhắc ghi Điểm A/B cho học viên đang học: tạo AppNotification
 * (chuông trong app) cho các ghi danh thỏa điều kiện. Khóa eventKey duy
 * nhất của AppNotification bảo đảm không nhắc trùng trong cùng tháng —
 * chạy lại bao nhiêu lần cũng an toàn.
 *
 * Hiệu năng: quét toàn bộ ghi danh đang học theo từng trang (trước đây
 * chỉ quét 500 ghi danh đầu tiên nên phần còn lại không bao giờ được
 * nhắc), và mỗi trang chỉ dùng 3 truy vấn — lấy Điểm A/B, kiểm tra
 * eventKey đã có bằng một truy vấn gộp, ghi các thông báo thiếu bằng
 * createMany (trước đây là 2 truy vấn nối tiếp cho từng ghi danh, một
 * lượt quét 500 ghi danh mất ~177 giây dù không tạo thông báo nào).
 */

const DAY_MS = 24 * 60 * 60 * 1000

export interface ReminderRunResult { scanned: number; created: number }

export async function runBaselineReminders(now = new Date(), batchSize = 500): Promise<ReminderRunResult> {
    const pairKey = (userId: number, courseId: number) => `${userId}:${courseId}`
    let scanned = 0
    let created = 0
    let lastId = 0

    for (;;) {
        const enrollments = await prisma.enrollment.findMany({
            where: { status: 'ACTIVE', id: { gt: lastId } },
            orderBy: { id: 'asc' },
            take: batchSize,
            select: {
                id: true, userId: true, courseId: true, createdAt: true,
                course: { select: { name_khoa: true, name_lop: true } },
            },
        })
        if (enrollments.length === 0) break
        scanned += enrollments.length
        lastId = enrollments[enrollments.length - 1].id

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

        const candidates: {
            eventKey: string; recipientId: number; kind: string; title: string; courseId: number; enrollmentId: number
        }[] = []
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
                candidates.push({
                    eventKey: reminderEventKey(e.id, kind, now),
                    recipientId: e.userId,
                    kind: 'BASELINE_REMINDER',
                    title: reminderTitle(kind, courseName),
                    courseId: e.courseId,
                    enrollmentId: e.id,
                })
            }
        }

        if (candidates.length > 0) {
            const existing = await prisma.appNotification.findMany({
                where: { eventKey: { in: candidates.map((c) => c.eventKey) } },
                select: { eventKey: true },
            })
            const existingKeys = new Set(existing.map((x) => x.eventKey))
            const fresh = candidates.filter((c) => !existingKeys.has(c.eventKey))
            if (fresh.length > 0) {
                const res = await prisma.appNotification.createMany({ data: fresh, skipDuplicates: true })
                created += res.count
            }
        }

        if (enrollments.length < batchSize) break
    }
    return { scanned, created }
}
