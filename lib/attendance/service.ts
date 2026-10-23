import prisma from '@/lib/prisma'

/** Đọc dữ liệu điểm danh — một nguồn sự thật cho trang quản trị và học viên. */

export interface SessionSummary {
    id: number
    title: string
    sessionDate: Date
    durationMinutes: number
    present: number
    absent: number
    totalStudents: number
}

export async function listCourseSessions(courseId: number): Promise<SessionSummary[]> {
    const [sessions, totalStudents] = await Promise.all([
        prisma.attendanceSession.findMany({
            where: { courseId },
            orderBy: { sessionDate: 'desc' },
            include: { records: { select: { status: true } } },
        }),
        prisma.enrollment.count({ where: { courseId, status: 'ACTIVE' } }),
    ])
    return sessions.map((s) => ({
        id: s.id,
        title: s.title,
        sessionDate: s.sessionDate,
        durationMinutes: s.durationMinutes,
        present: s.records.filter((r) => r.status === 'PRESENT').length,
        absent: s.records.filter((r) => r.status === 'ABSENT').length,
        totalStudents,
    }))
}

export interface MyAttendanceRow {
    sessionId: number
    courseId: number
    courseName: string
    title: string
    sessionDate: Date
    status: 'PRESENT' | 'ABSENT'
    minutesAttended: number
}

export async function getMyAttendance(userId: number): Promise<MyAttendanceRow[]> {
    const records = await prisma.attendanceRecord.findMany({
        where: { userId },
        orderBy: { session: { sessionDate: 'desc' } },
        take: 200,
        include: {
            session: {
                select: {
                    id: true, title: true, sessionDate: true, courseId: true,
                    course: { select: { name_khoa: true, name_lop: true } },
                },
            },
        },
    })
    return records.map((r) => ({
        sessionId: r.session.id,
        courseId: r.session.courseId,
        courseName: r.session.course.name_khoa || r.session.course.name_lop || `Khóa học #${r.session.courseId}`,
        title: r.session.title,
        sessionDate: r.session.sessionDate,
        status: r.status,
        minutesAttended: r.minutesAttended,
    }))
}
