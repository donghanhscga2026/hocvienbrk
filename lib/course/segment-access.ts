import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// Thư viện bài giảng thông minh (GĐ1) — phân quyền dùng chung cho API đoạn.
// Khớp đúng cách trang học kiểm tra: học viên cần Enrollment ACTIVE;
// ADMIN hoặc GV sở hữu khóa (course.teacherId === userId) được quản lý đoạn.

export type SegmentAccess = {
    userId: number
    role: string | null
    isManager: boolean
    enrollmentId: number | null
}

export async function resolveSegmentAccess(courseId: number, teacherId: number | null): Promise<SegmentAccess | null> {
    const session = await auth()
    if (!session?.user?.id) return null
    const userId = parseInt(session.user.id)
    if (Number.isNaN(userId)) return null

    const isManager = session.user.role === 'ADMIN' || (teacherId != null && teacherId === userId)
    if (isManager) return { userId, role: session.user.role ?? null, isManager, enrollmentId: null }

    const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: { id: true, status: true },
    })
    if (!enrollment || enrollment.status !== 'ACTIVE') return null
    return { userId, role: session.user.role ?? null, isManager, enrollmentId: enrollment.id }
}

/** Nạp lesson + teacherId của khóa chứa nó; null nếu lesson không thuộc courseId. */
export async function loadLessonForSegments(courseId: number, lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: {
            id: true,
            courseId: true,
            title: true,
            videoUrl: true,
            type: true,
            content: true,
            course: { select: { teacherId: true } },
        },
    })
    if (!lesson || lesson.courseId !== courseId) return null
    return lesson
}
