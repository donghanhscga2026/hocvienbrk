'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity-logger'
import { parseZoomCsv, matchAttendees, type ZoomAttendeeRow } from '@/lib/attendance/zoom-csv'

/**
 * Điểm danh bằng nhập báo cáo Zoom — luồng 2 bước theo kỷ luật dự án:
 * (1) previewZoomImport: đọc file, đối chiếu, KHÔNG ghi gì.
 * (2) commitZoomImport: chỉ ghi sau khi quản trị xác nhận bản xem trước.
 * Khớp danh tính chạy ở server trên cả hai bước (client không tự quyết).
 * Quyền: ADMIN, hoặc TEACHER là giảng viên của khóa.
 */

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_ROWS = 3000

async function requireCourseManager(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Bạn cần đăng nhập.' as const }
    const userId = Number(session.user.id)
    const role = session.user.role
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, teacherId: true } })
    if (!course) return { error: 'Không tìm thấy khóa học.' as const }
    if (role !== 'ADMIN' && course.teacherId !== userId) {
        return { error: 'Bạn không có quyền điểm danh cho khóa học này.' as const }
    }
    return { userId, role }
}

async function activeStudents(courseId: number) {
    const enrollments = await prisma.enrollment.findMany({
        where: { courseId, status: 'ACTIVE' },
        select: { userId: true, user: { select: { name: true, email: true } } },
    })
    return enrollments.map((e) => ({ userId: e.userId, name: e.user.name, email: e.user.email }))
}

export interface ImportPreview {
    ok: boolean
    error?: string
    warnings: string[]
    totalRows: number
    matched: { userId: number; studentName: string | null; email: string; minutes: number; via: string }[]
    unmatched: { name: string; email: string; minutes: number }[]
    absent: { userId: number; studentName: string | null; email: string }[]
    rows: ZoomAttendeeRow[]
}

export async function previewZoomImport(formData: FormData): Promise<ImportPreview> {
    const empty: ImportPreview = { ok: false, warnings: [], totalRows: 0, matched: [], unmatched: [], absent: [], rows: [] }
    const courseId = Math.trunc(Number(formData.get('courseId')))
    if (!courseId) return { ...empty, error: 'Thiếu khóa học.' }
    const access = await requireCourseManager(courseId)
    if ('error' in access) return { ...empty, error: access.error }

    const file = formData.get('file')
    if (!(file instanceof File)) return { ...empty, error: 'Chưa chọn file.' }
    if (file.size > MAX_FILE_BYTES) return { ...empty, error: 'File quá lớn (tối đa 5 MB).' }
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    if (head[0] === 0x50 && head[1] === 0x4B) {
        return { ...empty, error: 'Đây là file Excel (.xlsx). Hãy xuất/lưu lại dạng CSV từ Zoom hoặc Google Sheets rồi tải lên.' }
    }

    const text = await file.text()
    const parsed = parseZoomCsv(text)
    if (parsed.rows.length === 0) {
        return { ...empty, error: parsed.warnings[0] ?? 'Không đọc được dữ liệu từ file.', warnings: parsed.warnings }
    }
    if (parsed.rows.length > MAX_ROWS) {
        return { ...empty, error: `File có ${parsed.rows.length} dòng, vượt giới hạn ${MAX_ROWS}.` }
    }

    const students = await activeStudents(courseId)
    const result = matchAttendees(parsed.rows, students)
    const studentById = new Map(students.map((s) => [s.userId, s]))

    return {
        ok: true,
        warnings: parsed.warnings,
        totalRows: parsed.rows.length,
        matched: result.matched.map((m) => ({
            userId: m.userId,
            studentName: studentById.get(m.userId)?.name ?? null,
            email: studentById.get(m.userId)?.email ?? '',
            minutes: m.minutes,
            via: m.via,
        })),
        unmatched: result.unmatched.map((u) => ({ name: u.name, email: u.email, minutes: u.minutes })),
        absent: result.absentUserIds.map((id) => ({
            userId: id,
            studentName: studentById.get(id)?.name ?? null,
            email: studentById.get(id)?.email ?? '',
        })),
        rows: parsed.rows,
    }
}

export interface CommitImportInput {
    courseId: number
    title: string
    sessionDate: string // YYYY-MM-DD
    durationMinutes: number
    markAbsent: boolean
    rows: ZoomAttendeeRow[]
}

export interface CommitImportResult {
    ok: boolean
    error?: string
    sessionId?: number
    presentCount?: number
    absentCount?: number
}

export async function commitZoomImport(input: CommitImportInput): Promise<CommitImportResult> {
    const courseId = Math.trunc(Number(input.courseId))
    if (!courseId) return { ok: false, error: 'Thiếu khóa học.' }
    const access = await requireCourseManager(courseId)
    if ('error' in access) return { ok: false, error: access.error }

    const title = (input.title ?? '').trim().slice(0, 200)
    if (!title) return { ok: false, error: 'Chưa nhập tên buổi học.' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate ?? '')) return { ok: false, error: 'Ngày học không hợp lệ.' }
    const sessionDate = new Date(`${input.sessionDate}T00:00:00.000Z`)
    if (Number.isNaN(sessionDate.getTime())) return { ok: false, error: 'Ngày học không hợp lệ.' }
    const durationMinutes = Math.min(1440, Math.max(1, Math.trunc(Number(input.durationMinutes)) || 90))
    const rows = (input.rows ?? []).slice(0, MAX_ROWS).map((r) => ({
        name: String(r.name ?? '').slice(0, 200),
        email: String(r.email ?? '').toLowerCase().slice(0, 200),
        minutes: Math.min(1440, Math.max(0, Math.trunc(Number(r.minutes)) || 0)),
        joinTime: r.joinTime ?? null,
    }))
    if (rows.length === 0) return { ok: false, error: 'Không có dòng dữ liệu nào để ghi.' }

    const students = await activeStudents(courseId)
    const result = matchAttendees(rows, students)

    const created = await prisma.$transaction(async (tx) => {
        const session = await tx.attendanceSession.create({
            data: { courseId, title, sessionDate, durationMinutes, createdById: access.userId },
        })
        const data = [
            ...result.matched.map((m) => ({
                sessionId: session.id, userId: m.userId, status: 'PRESENT' as const,
                minutesAttended: m.minutes, source: 'ZOOM_IMPORT',
            })),
            ...(input.markAbsent
                ? result.absentUserIds.map((userId) => ({
                    sessionId: session.id, userId, status: 'ABSENT' as const,
                    minutesAttended: 0, source: 'ZOOM_IMPORT',
                }))
                : []),
        ]
        if (data.length > 0) await tx.attendanceRecord.createMany({ data })
        return { sessionId: session.id, present: result.matched.length, absent: input.markAbsent ? result.absentUserIds.length : 0 }
    })

    await logActivity({
        userId: access.userId,
        action: 'ATTENDANCE_IMPORTED',
        detail: `Nhập điểm danh Zoom cho khóa #${courseId}: ${created.present} có mặt, ${created.absent} vắng`,
        metadata: { courseId, sessionId: created.sessionId, present: created.present, absent: created.absent, unmatched: result.unmatched.length },
    }).catch(() => undefined)

    revalidatePath('/tools/diem-danh')
    revalidatePath('/diem-danh')
    return { ok: true, sessionId: created.sessionId, presentCount: created.present, absentCount: created.absent }
}
