import prisma from '@/lib/prisma'

/**
 * Course lưu category ở 2 dạng: quan hệ `categoryId` -> CourseCategory, và cột
 * `category` (string, denormalized) dùng làm fallback hiển thị cho dữ liệu cũ
 * chưa gán categoryId. Hàm này là nơi DUY NHẤT tính tên hiển thị từ categoryId,
 * để cột string luôn đồng bộ dù course được tạo/sửa từ đường nào (server action
 * hay API route).
 */
export async function resolveCourseCategoryName(categoryId: number | null | undefined): Promise<string> {
    if (!categoryId) return 'Khác'
    const cat = await prisma.courseCategory.findUnique({ where: { id: categoryId }, select: { name: true } })
    return cat?.name ?? 'Khác'
}
