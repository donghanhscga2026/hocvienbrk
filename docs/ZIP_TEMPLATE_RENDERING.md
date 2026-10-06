# Hiển thị mẫu website ZIP

## Bản sửa đã được xác nhận ngày 2026-10-06

PR #77 và #79 đã merge vào `master`, triển khai trên Vercel của donghanhscga2026 và được người dùng xác nhận hoạt động trên `giautoandien.io.vn`.

Storage phục vụ HTML upload dưới dạng văn bản. Iframe sử dụng endpoint `/api/course-template-source?source=...` để nhận HTML đúng kiểu nội dung. Endpoint chỉ chấp nhận HTTPS và đường dẫn HTML trong thư mục `uploads/course-template-sources` thuộc Supabase đã cấu hình; chặn redirect, giới hạn tải 8MB và 15 giây. HTML vẫn chạy trong sandbox, không có quyền cùng origin, kết nối mạng hoặc gửi form.

Bộ phân tích trước đây dùng sai backreference của thẻ đóng, nên nhận diện cả trang thành một khối `imported-1`. Khối này không khớp các `data-mfc-block` trong HTML và làm iframe ẩn toàn trang sau cấu hình. PR #79 sửa nhận diện thẻ, đồng thời giữ khả năng hiển thị mẫu đã lưu với lựa chọn tổng cũ. Bỏ chọn toàn bộ vẫn ẩn toàn bộ.

ZIP Bản Đồ Tài Chính thực tế gồm 23 file, 16 asset được nhúng và được phân tích thành 16 phần, 13 ảnh. Kiểm thử bao gồm URL nguồn, sandbox, lỗi upstream, giới hạn tải, cấu hình lựa chọn khối và giữ nội dung Hero sau cấu hình.

## Phân biệt bản triển khai

Production: `https://giautoandien.io.vn/tools/courses/templates`, từ nhánh `master`.

URL preview của `integration/website-multisite` có thể còn code cũ. Một preview thành công chỉ chứng minh commit tương ứng đã build; không chứng minh nó đã có các bản sửa mới trên `master`.
