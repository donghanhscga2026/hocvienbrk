# Quy trình làm việc nhóm MFC

Tài liệu này quy định luồng phát triển chuẩn cho repository `hocvienbrk`. Mục tiêu là giữ `master` ổn định khi nhiều người hoặc AI cùng phát triển.

## 1. Luồng chuẩn

```text
master
  ↓
feature/* hoặc fix/*
  ↓
phát triển + kiểm thử local
  ↓
Pull Request → master
  ↓
GitHub Actions + Vercel Preview
  ↓
nghiệm thu
  ↓
merge
  ↓
master / Production
```

Không phát triển tính năng trực tiếp trên `master`.

## 2. Bắt đầu một công việc

1. Đồng bộ `master` mới nhất.
2. Tạo branch riêng từ `master`.
3. Mỗi công việc dùng một branch riêng.
4. Đặt tên rõ mục đích, ví dụ:
   - `feature/crm-customer-filter`
   - `fix/course-progress-score`
   - `chore/update-ci`
5. Không dùng chung một feature branch cho nhiều người nếu các công việc độc lập.

## 3. Khi nhiều người cùng phát triển

Mỗi developer làm trên branch của mình. Không merge branch của developer A vào branch của developer B chỉ để "đồng bộ".

Nếu `master` có thay đổi mới trong lúc đang phát triển:

1. Hoàn thành hoặc commit phần đang làm.
2. Cập nhật branch từ `master` mới nhất.
3. Giải quyết conflict trên feature branch.
4. Chạy lại kiểm thử.
5. Push branch để PR chạy lại CI và Vercel Preview.

`master` là nguồn sự thật chung để các branch đồng bộ.

## 4. Kiểm tra trước Pull Request

Tối thiểu phải chạy:

```bash
npm ci
npx prisma generate
npx tsc --noEmit
npm run build
```

Nếu thay đổi chỉ phù hợp với một phần hệ thống, vẫn phải bảo đảm TypeScript và production build không lỗi.

Không commit file `.env`, token, password, secret hoặc dữ liệu nhạy cảm.

## 5. Pull Request vào master

PR phải dùng:

```text
base: master
compare: feature/fix branch
```

Điền checklist trong Pull Request template.

Không merge khi:

- CI bắt buộc chưa xanh.
- Branch chưa đồng bộ với `master`.
- Conversation cần xử lý chưa Resolve.
- Có conflict.
- Thay đổi ảnh hưởng website nhưng chưa kiểm tra Vercel Preview.

Ruleset `Protect Master` là lớp bảo vệ bắt buộc và không được bỏ qua để merge nhanh.

## 6. Vercel Preview

Mỗi PR ảnh hưởng website phải được kiểm tra trên Vercel Preview trước khi merge.

Kiểm tra tối thiểu:

- Trang liên quan mở được.
- Luồng chính của tính năng hoạt động.
- Không có lỗi rõ ràng ở chức năng cũ liên quan.
- Responsive khi thay đổi giao diện.

### Chính sách dữ liệu Preview hiện tại

Hiện tại Preview chưa có database staging riêng. Vì vậy phải coi mọi kết nối tới database hiện tại là dữ liệu Production.

Mặc định:

- Ưu tiên kiểm thử giao diện và thao tác chỉ đọc.
- Không tạo/sửa/xóa dữ liệu thật chỉ để thử nghiệm.
- Không chạy script mutation từ Preview.

Nếu thật sự cần kiểm thử CRUD và phạm vi nhỏ, có thể thiết kế bảng thử nghiệm riêng theo quy ước `test_<tablename>`. Chỉ tạo khi có nhu cầu cụ thể, không nhân bản hàng loạt bảng Production.

Dữ liệu thử nghiệm không tự động chuyển sang bảng thật. Nếu cần chuyển dữ liệu, phải có bước kiểm tra và xác nhận riêng.

## 7. Database và Prisma

- Không chỉnh sửa migration đã merge.
- Thay đổi schema phải tạo migration mới.
- Không thử migration tùy tiện trên Production.
- Script ghi dữ liệu phải dry-run mặc định và chỉ thực thi sau khi được xác nhận.
- Phải có thống kê trước/sau đối với thao tác dữ liệu.
- Không dùng `test_*` cho dữ liệu thật.

Các thay đổi liên quan dữ liệu cần mô tả rõ trong PR: bảng bị ảnh hưởng, migration, rollback hoặc cách phục hồi, và phạm vi dữ liệu.

## 8. Khu vực rủi ro cao

Cần kiểm tra kỹ hơn khi PR tác động tới:

- Auth, đăng nhập, password, authorization và role.
- Prisma schema, migration và dữ liệu.
- Payment, wallet, commission và affiliate.
- Webhook và cron.
- Upload và xử lý file.
- Thông tin cá nhân của học viên.
- Các script sửa dữ liệu hàng loạt.

Không thực hiện thử nghiệm ghi dữ liệu Production chỉ để xác minh các khu vực này.

## 9. Điều kiện merge

Chỉ merge khi đồng thời thỏa mãn:

- PR đúng phạm vi.
- Branch cập nhật với `master`.
- `npx tsc --noEmit` thành công.
- Production build thành công.
- GitHub Actions bắt buộc xanh.
- Vercel Preview đã được kiểm tra khi phù hợp.
- Không còn conversation chưa Resolve.
- Các thay đổi database/security đã được kiểm tra riêng.

Sau merge, `master` trở thành baseline mới cho các công việc tiếp theo.

## 10. Reviewer và CODEOWNERS

Hiện tại chưa bắt buộc CODEOWNERS hoặc một approval độc lập vì chưa xác minh có reviewer kỹ thuật thứ hai thường trực.

Khi có thêm reviewer GitHub độc lập:

1. Xác định người chịu trách nhiệm từng khu vực.
2. Thêm `.github/CODEOWNERS`.
3. Bật yêu cầu review từ Code Owners cho vùng rủi ro.
4. Sau khi kiểm tra không gây khóa quy trình, cân nhắc tăng Required approvals từ 0 lên 1.

Không bật yêu cầu approval chỉ để có hình thức nếu người tạo PR và người duyệt thực tế vẫn là cùng một người.

## 11. Quy tắc nghiệm thu

CI xanh chứng minh code vượt qua kiểm tra tự động, không thay thế nghiệm thu chức năng.

Thứ tự chuẩn:

```text
CI xanh
→ Vercel Preview
→ kiểm thử chức năng
→ xác nhận
→ merge
```

Với thay đổi tài liệu hoặc cấu hình không ảnh hưởng giao diện/runtime, có thể ghi rõ trong PR vì sao không cần kiểm thử giao diện Preview.
