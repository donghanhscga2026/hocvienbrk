# Xác nhận điều hướng thông báo bài học

Ngày xác nhận: 2026-10-02. Người dùng xác nhận chức năng đã hoạt động đúng sau PR #35.

- Thông báo mở trang khóa học, kiểm tra bài thuộc khóa học rồi chuyển vào bài học.
- Lệnh mở bài một lần được xóa khỏi lịch sử khóa học để Back không tự mở lại bài.
- Điều hướng bài học đầy đủ giữ trang khóa học thật trong lịch sử, kể cả sau khi tải lại bài.
- Nút “Về khóa học” trên trang học dẫn về đúng khóa học, không phụ thuộc trang trước đó.
- Đã đạt 20 kiểm tra thông báo, 7 kiểm tra Chromium/Next.js, TypeScript, build và triển khai.
- Chưa xác minh riêng trên iOS. Không thay đổi database.

Các tệp: `public/sw.js`, `app/khoa-hoc/[id]/page.tsx`, `components/course/NotificationLessonEntry.tsx`, `components/course/CoursePlayer.tsx`.
Kiểm tra: `scripts/test-web-push-click.cjs`, `scripts/test-notification-navigation.cjs`, `.github/workflows/notification-navigation.yml`.
