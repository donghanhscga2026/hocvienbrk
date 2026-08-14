/**
 * Hạn nộp bài của "Ngày N" (lessonOrder) trong 1 khóa học, tính từ mốc bắt
 * đầu học riêng của từng thành viên (Enrollment.startedAt). Dùng CHUNG cho cả
 * lúc chấm điểm khi nộp bài (submitAssignmentAction) lẫn lúc đọc/hiển thị
 * trạng thái đúng hạn/muộn (dashboard, roster) — tránh viết lại công thức ở
 * nhiều nơi rồi lệch nhau (đã từng gây lỗi lệch 7 tiếng do quy đổi múi giờ
 * VN 2 lần, xem app/actions/course-actions.ts).
 *
 * startedAt luôn được lưu là UTC midnight (00:00:00.000Z) của NGÀY VN mà
 * thành viên chọn — bản thân giá trị này đã là một "nhãn ngày VN", KHÔNG
 * phải một thời điểm UTC cần quy đổi thêm. Hạn nộp = startedAt + (N-1) ngày
 * + 16:59:59.999 UTC (= 23:59:59.999 giờ Việt Nam của ngày tương ứng).
 */
export function computeLessonDeadlineUTC(startedAt: Date | string, lessonOrder: number): number {
    const startUTC = new Date(startedAt).getTime()
    return startUTC
        + (lessonOrder - 1) * 86400000
        + 16 * 3600000
        + 59 * 60000
        + 59 * 1000
        + 999
}
