/**
 * Chuẩn hoá thông báo lỗi khi tạo/sửa Course, đặc biệt là lỗi trùng `id_khoa`
 * (unique constraint) — có thể xảy ra dù đã pre-check tồn tại, nếu 2 request
 * chạy đua nhau (race condition). Bắt lỗi Prisma P2002 ở đây thay vì để lộ
 * message nội bộ của Prisma ra ngoài UI.
 */
export function formatCourseSaveError(error: any, id_khoa?: string): string {
    if (error?.code === 'P2002') {
        return id_khoa ? `Mã khóa "${id_khoa}" đã tồn tại` : 'Mã khóa học này đã tồn tại'
    }
    return error?.message || 'Lỗi khi lưu khóa học'
}
