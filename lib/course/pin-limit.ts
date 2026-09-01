import prisma from '@/lib/prisma'

export const MAX_PINNED_COURSES = 3

export const PIN_LIMIT_ERROR = `Chỉ được ghim tối đa ${MAX_PINNED_COURSES} khóa học. Vui lòng bỏ ghim một khóa trước khi ghim khóa khác.`

/**
 * Kiểm tra còn chỗ để ghim thêm 1 khóa học hay không (giới hạn MAX_PINNED_COURSES
 * khóa được ghim cùng lúc trên toàn hệ thống). Truyền `excludeCourseId` khi đang
 * sửa một khóa đã ghim sẵn để không tự đếm chính nó.
 */
export async function canPinAnotherCourse(excludeCourseId?: number): Promise<boolean> {
    const pinnedCount = await prisma.course.count({
        where: {
            pin: { gt: 0 },
            ...(excludeCourseId ? { id: { not: excludeCourseId } } : {}),
        },
    })
    return pinnedCount < MAX_PINNED_COURSES
}
