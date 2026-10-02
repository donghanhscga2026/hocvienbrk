## Mục tiêu Pull Request

<!-- Mô tả ngắn gọn vấn đề và kết quả mong muốn. -->

## Phạm vi thay đổi

<!-- Liệt kê các khu vực/file chính bị ảnh hưởng. -->

## Kiểm thử bắt buộc

- [ ] Đã kiểm tra chức năng trên môi trường local/dev khi phù hợp
- [ ] `npx prisma generate` thành công
- [ ] `npx tsc --noEmit` thành công
- [ ] `npm run build` thành công
- [ ] GitHub Actions: **TypeScript, Prisma, Security & Build** đã xanh
- [ ] Đã mở và kiểm thử **Vercel Preview** của chính PR này
- [ ] Đã kiểm tra các chức năng cũ liên quan không bị ảnh hưởng

## Database / Prisma

- [ ] PR không thay đổi database/schema/migration
- [ ] Hoặc: có thay đổi database và đã mô tả migration, dry-run/rollback, phạm vi dữ liệu ảnh hưởng
- [ ] Không chỉnh sửa migration đã được merge trước đó
- [ ] Đã xác minh Preview không vô tình ghi dữ liệu Production khi thực hiện test có ghi dữ liệu

## Security

- [ ] Không commit `.env`, password, token, secret hoặc dữ liệu nhạy cảm
- [ ] Nếu liên quan Auth/Authorization: đã kiểm tra cả xác thực và phân quyền phía server
- [ ] Nếu liên quan webhook/cron/upload/payment/wallet/affiliate: đã mô tả rủi ro và cách kiểm thử

## Vercel Preview

**Preview URL:** <!-- dán URL Preview sau khi Vercel tạo -->

**Các luồng đã kiểm thử:**
<!-- Ví dụ: đăng nhập, mở trang khóa học, lưu form... -->

**Kết quả:** <!-- Pass / còn vấn đề -->

## Trước khi merge vào master

- [ ] PR đang đồng bộ với `master` mới nhất
- [ ] Tất cả conversation cần xử lý đã được Resolve
- [ ] CI và Vercel đều xanh
- [ ] Không merge nếu chưa kiểm thử Preview đối với thay đổi ảnh hưởng website
