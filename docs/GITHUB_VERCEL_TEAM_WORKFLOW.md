# SOP GitHub + Vercel cho đội phát triển MFC

Tài liệu này là quy trình vận hành chuẩn đã được kiểm chứng thực tế trên repository `hocvienbrk`.

## 1. Nguyên tắc

- `master` là mã nguồn Production ổn định và là nguồn sự thật chung.
- Không phát triển tính năng trực tiếp trên `master`.
- Mỗi công việc có branch riêng.
- Mọi thay đổi vào `master` đi qua Pull Request.
- CI xanh là điều kiện kỹ thuật; nghiệm thu Preview là điều kiện chức năng khi thay đổi ảnh hưởng website.

## 2. Luồng chuẩn

```text
master mới nhất
   ↓
feature/* | fix/* | chore/* | docs/*
   ↓
phát triển
   ↓
kiểm thử local
   ↓
Pull Request → master
   ↓
Security CI + required checks
   ↓
Vercel Preview
   ↓
nghiệm thu
   ↓
merge
   ↓
master / Production
```

## 3. Bắt đầu công việc

1. Đồng bộ `master`.
2. Tạo branch từ `master` mới nhất.
3. Dùng tên branch thể hiện đúng mục tiêu.
4. Không dùng chung branch cho các công việc độc lập.

Ví dụ:

```text
feature/crm-customer-filter
fix/login-redirect
chore/update-ci
docs/update-workflow
```

## 4. Kiểm thử trước PR

Tối thiểu:

```bash
npm ci
npx prisma generate
npx tsc --noEmit
npm run build
```

Không đưa secret, password, token, `.env` hoặc dữ liệu nhạy cảm vào Git.

## 5. Tạo Pull Request

Luôn kiểm tra:

```text
base: master
compare: branch đang phát triển
```

Điền Pull Request template đầy đủ. PR phải mô tả mục tiêu, phạm vi, kiểm thử, database/security nếu có và kết quả Vercel Preview.

## 6. Ruleset Protect Master

`master` hiện được bảo vệ bằng ruleset `Protect Master`.

Các lớp bảo vệ đang áp dụng gồm:

- Không xóa `master`.
- Không force push.
- Thay đổi đi qua Pull Request.
- Conversation phải được Resolve.
- Required status check phải thành công.
- Branch phải cập nhật với `master` trước khi merge.

Required check chính:

```text
TypeScript, Prisma, Security & Build
```

Không tắt Ruleset chỉ để merge nhanh.

## 7. Security CI

CI chuẩn kiểm tra các lớp chính:

- cài dependency bằng `npm ci`;
- Prisma generate/validate;
- TypeScript;
- security-critical lint;
- production dependency audit/report;
- production build.

Workflow CI chỉ có quyền đọc repository và không tự sửa/push source code.

Nếu CI đỏ: mở job lỗi, xác định nguyên nhân, sửa trên chính branch PR rồi để CI chạy lại.

## 8. Vercel Preview

Mỗi PR ảnh hưởng website cần kiểm tra Preview của chính PR đó.

Kiểm tra:

- trang mở được;
- chức năng mới hoạt động;
- luồng cũ liên quan không bị hỏng;
- responsive nếu sửa UI;
- không có lỗi hiển nhiên trước khi merge.

Vercel xanh chỉ xác nhận deploy thành công, không thay thế kiểm thử chức năng.

## 9. Chính sách Preview Database hiện tại

Dự án chưa dùng staging database trả phí. Preview hiện có thể nhận các biến kết nối Production.

Do đó:

- mặc định chỉ kiểm thử UI và read-only;
- không tạo/sửa/xóa dữ liệu Production chỉ để test;
- không chạy migration thử trên Production;
- không chạy script mutation từ Preview.

Khi hiếm khi cần CRUD, có thể thiết kế bảng `test_<tablename>` cho đúng phạm vi cần thử. Không clone toàn bộ database.

Việc tạo bảng test, script hoặc chuyển dữ liệu vẫn phải tuân thủ dry-run → kiểm tra → xác nhận → execute → verify.

`test_*` là biện pháp vận hành tiết kiệm chi phí, không phải database isolation hoàn chỉnh.

## 10. Prisma và migration

- Không sửa migration đã merge.
- Schema mới dùng migration mới.
- Script ghi DB phải dry-run mặc định.
- Chỉ execute sau xác nhận.
- Có thống kê trước/sau.
- Không tự động chuyển dữ liệu test vào Production.

## 11. Khu vực rủi ro cao

Cần review và test kỹ hơn đối với:

- Auth, password, authorization, role.
- Prisma/schema/migration.
- Payment, wallet, commission, affiliate.
- Cron và webhook.
- Upload/file processing.
- Dữ liệu cá nhân.
- Script sửa dữ liệu hàng loạt.

Không test mutation Production tùy tiện cho các khu vực này.

## 12. Nhiều developer làm song song

Mỗi developer dùng branch riêng từ `master`.

Không merge branch của developer khác vào branch của mình chỉ để đồng bộ. Khi `master` thay đổi:

1. cập nhật branch từ `master`;
2. xử lý conflict trên feature branch;
3. chạy lại test;
4. push;
5. chờ CI/Preview mới.

Sau một PR được merge, `master` mới trở thành baseline chung.

## 13. Reviewer và CODEOWNERS

Hiện chưa bắt buộc CODEOWNERS/approval độc lập vì chưa xác minh reviewer kỹ thuật thứ hai thường trực.

Khi có reviewer độc lập:

1. xác định ownership theo khu vực;
2. thêm `.github/CODEOWNERS`;
3. thử Code Owner review trên PR thật;
4. sau khi chắc chắn không khóa workflow mới cân nhắc Required approvals = 1.

## 14. Giám sát PR

MFC PR Watch kiểm tra định kỳ và chỉ cần cảnh báo khi:

- CI/Security CI/Vercel lỗi hoặc bất thường;
- PR conflict hoặc không mergeable;
- PR tồn đọng quá 48 giờ;
- review conversation chưa Resolve.

Không dùng cảnh báo thay cho Ruleset; đây là lớp vận hành bổ sung.

## 15. Checklist trước merge

- [ ] PR đúng base `master`.
- [ ] Branch đồng bộ `master`.
- [ ] `npx prisma generate` thành công.
- [ ] `npx tsc --noEmit` thành công.
- [ ] Production build thành công.
- [ ] Required CI xanh.
- [ ] Vercel Preview đã kiểm tra nếu ảnh hưởng website.
- [ ] Không còn conversation chưa Resolve.
- [ ] Database/security đã kiểm tra riêng nếu liên quan.
- [ ] Không có secret hoặc dữ liệu nhạy cảm trong commit.

Khi tất cả điều kiện phù hợp đều đạt, PR mới được merge.

## 16. Khi có lỗi sau merge

Không sửa nóng trực tiếp trên `master`.

Tạo `fix/*` từ `master`, sửa tối thiểu, test, mở PR và đi lại đúng CI/Preview. Nếu cần restore code hoặc data, tuân thủ quy trình xác nhận/backup của `AGENTS.md`.

## 17. Tài liệu liên quan

- `AGENTS.md`: quy tắc bắt buộc cho AI Agent và thay đổi code/data.
- `.github/TEAM_WORKFLOW.md`: quy trình làm việc nhóm ngắn gọn.
- `.github/pull_request_template.md`: checklist PR.
- `PLAN.md`: lịch sử thay đổi đã xác nhận.
