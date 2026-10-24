/**
 * Quy tắc cấu hình hoa hồng affiliate theo khóa học (chốt 2026-10-22).
 *
 * - Hoa hồng TRỰC TIẾP tối thiểu 10% (áp cho cả ADMIN và TEACHER).
 * - Hoa hồng GIÁN TIẾP (tri ân) cố định 2% ở cấp hệ thống
 *   (SystemAffiliateConfig.gratitudeRate) — không cấu hình theo từng khóa,
 *   để mức tri ân cho người giới thiệu đầu tiên đồng nhất trên mọi khóa học.
 * - Giảng viên bị KHÓA chỉnh sửa cấu hình khi khóa học đã khai giảng
 *   (ngày hiện tại, giờ Việt Nam, lớn hơn ngày khai giảng). ADMIN vẫn sửa
 *   được để xử lý ngoại lệ, nhưng sàn 10% vẫn áp dụng.
 */

/** Sàn hoa hồng trực tiếp (%) */
export const MIN_DIRECT_RATE = 10

/** Ngày khai giảng lưu ở Course.date_join (text). Chỉ nhận dạng ISO YYYY-MM-DD. */
export function parseStartDate(dateJoin?: string | null): string | null {
  if (!dateJoin) return null
  const m = dateJoin.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function todayInSaigon(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Saigon' }).format(new Date())
}

/** Đã khai giảng = hôm nay (giờ VN) > ngày khai giảng. Không có ngày hợp lệ => chưa khóa. */
export function isCourseLocked(dateJoin?: string | null): boolean {
  const start = parseStartDate(dateJoin)
  return !!start && todayInSaigon() > start
}

/** '2026-10-19' -> '19/10/2026' */
export function formatDateVN(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Quyền CHẠY LẠI hoa hồng cho giao dịch cũ theo khóa học
 * (lib/affiliate/recalculate.ts, thêm 2026-10-23 theo yêu cầu vận hành).
 *
 * Giai đoạn test: TEACHER được chạy lại cho khóa của chính mình để thử
 * các mức cấu hình mà không cần can thiệp DB tay. SAU giai đoạn test,
 * đặt RERUN_TEACHER_ALLOWED = false → chỉ ADMIN được chạy lại.
 */
export const RERUN_TEACHER_ALLOWED = true

export function canRerunCommissions(role: string): boolean {
  return role === 'ADMIN' || (role === 'TEACHER' && RERUN_TEACHER_ALLOWED)
}
