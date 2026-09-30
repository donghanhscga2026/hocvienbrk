# BACKUP — Code trước khi sửa bảo mật password

**Ngày tạo:** 2026-09-30

Branch này là bản sao lưu nguyên trạng của `master` trước khi thực hiện đợt hardening phần đăng ký, đăng nhập, mật khẩu, session và phân quyền.

## Mục đích

Giữ lại hành vi cũ để có thể đối chiếu/test các trường hợp đăng nhập, đăng nhập thất bại, đổi mật khẩu và các luồng xác thực hiện hữu.

> CẢNH BÁO: Đây là bản code trước khi hardening. Không dùng branch này làm production. Một số hành vi cũ có thể xử lý plaintext password theo cách không phù hợp cho môi trường thật.

## Phạm vi hardening sau backup

1. Không gửi/log plaintext password.
2. Notification đổi mật khẩu không nhận mật khẩu mới.
3. /admin yêu cầu role ADMIN.
4. Audit API/Server Actions nhạy cảm và kiểm tra quyền server-side.
5. Rate limit dùng shared store cho production, với fail-safe phù hợp.
6. Chống account enumeration.
7. Kiểm soát/ép đổi mật khẩu mặc định.
8. Chuẩn bị/bổ sung MFA cho ADMIN.
9. Session invalidation khi đổi password/role.
10. Audit secrets/env và lịch sử Git trong phạm vi connector cho phép.
