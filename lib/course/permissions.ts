import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { Role } from '@prisma/client'

export type CourseAuthContext = {
    userId: number
    isAdmin: boolean
    isTeacher: boolean
}

/** Lấy thông tin phân quyền của session hiện tại. Trả về null nếu chưa đăng nhập. */
export async function getCourseAuthContext(): Promise<CourseAuthContext | null> {
    const session = await auth()
    if (!session?.user?.id) return null
    return {
        userId: parseInt(session.user.id),
        isAdmin: session.user.role === Role.ADMIN,
        isTeacher: session.user.role === Role.TEACHER,
    }
}

/** ADMIN luôn được phép. TEACHER chỉ được thao tác course/lesson của chính mình. */
export function canManageCourse(ctx: CourseAuthContext, courseTeacherId: number | null): boolean {
    return ctx.isAdmin || courseTeacherId === ctx.userId
}

/**
 * Guard dùng cho Server Actions ('use server') — trả về { success, error } khi bị chặn.
 * Dùng: const { denied, ctx } = await requireCourseAccessAction(course.teacherId)
 *       if (denied) return denied
 */
export async function requireCourseAccessAction(
    courseTeacherId: number | null
): Promise<{ denied: { success: false; error: string } | null; ctx: CourseAuthContext | null }> {
    const ctx = await getCourseAuthContext()
    if (!ctx) return { denied: { success: false, error: 'Unauthorized' }, ctx: null }
    if (!canManageCourse(ctx, courseTeacherId)) {
        return { denied: { success: false, error: 'Bạn không có quyền thao tác khóa học này' }, ctx }
    }
    return { denied: null, ctx }
}

/**
 * Guard dùng cho API routes — trả về NextResponse khi bị chặn.
 * Dùng: const { denied, ctx } = await requireCourseAccessApi(course.teacherId)
 *       if (denied) return denied
 */
export async function requireCourseAccessApi(
    courseTeacherId: number | null
): Promise<{ denied: NextResponse | null; ctx: CourseAuthContext | null }> {
    const ctx = await getCourseAuthContext()
    if (!ctx) return { denied: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), ctx: null }
    if (!canManageCourse(ctx, courseTeacherId)) {
        return {
            denied: NextResponse.json({ error: 'Forbidden: Bạn không có quyền thao tác khóa học này' }, { status: 403 }),
            ctx,
        }
    }
    return { denied: null, ctx }
}
