# Hợp đồng HTML cho trang bán khóa học

Tài liệu này dành cho người (hoặc công cụ AI) làm trang bán khóa học bên ngoài, để trang đưa lên hệ thống chạy đúng ngay từ đầu: nút bấm mở đúng đăng ký, ảnh hiển thị ổn định, không phải sửa lại nhiều.

## 1. Cách đưa trang lên hệ thống

Trong khóa học → Trang bán khóa học → Dùng code riêng → khu "Nhập trang có sẵn":

- **Nhập từ URL**: dán địa chỉ trang đã đăng ở nơi khác (chỉ http/https công khai).
- **Tải file HTML**: một file `.html` tối đa 8 MB.
- **Tải file ZIP**: gói chứa file HTML chính và tài nguyên đi kèm.

Sau khi nhập, hệ thống mở bước rà soát 3 mục — Ảnh, Sự kiện, Khối — rồi mới đưa trang vào trình sửa code. Trang chỉ đổi trên bản nháp; trang công khai chỉ thay đổi khi bấm **Xuất bản**.

## 2. Ảnh: chỉ dùng link ngoài

- Mọi ảnh phải là **link HTTPS trực tiếp tới file ảnh** (ví dụ link từ Postimages/postimg, Cloudinary hoặc CDN riêng). Hệ thống **không lưu ảnh** lên máy chủ của hệ thống và không nhận ảnh nhúng Base64 trong code (chỉ trừ họa tiết SVG tĩnh tối đa 4 KB).
- Với file ZIP: ảnh nằm trong gói sẽ được liệt kê ở bước rà soát; hãy up từng ảnh lên nền tảng ảnh bên ngoài, dán link HTTPS vào ô tương ứng rồi mới đưa vào trình sửa. Chưa gán đủ link thì nút đưa vào bị khóa.
- Mỗi ảnh nên có chữ thay thế (`alt`) mô tả nội dung ảnh.
- Hệ thống tự thêm `loading="lazy"` và `decoding="async"` cho mọi ảnh trừ ảnh đầu tiên (thường là ảnh hero) khi áp dụng bước rà soát.
- Có nút **Kiểm tra link ảnh** ở bước rà soát: link phải còn sống, trả về đúng file ảnh (`image/*`).

## 3. Sự kiện: thuộc tính `data-mfc-action`

Cách chắc chắn nhất để nút bấm hoạt động đúng là gắn thuộc tính sau vào phần tử bấm được (`a`, `button` hoặc phần tử cha bao quanh chúng — hệ thống nhận phần tử cha gần nhất có thuộc tính này):

| Giá trị | Hành vi khi khách bấm | Thuộc tính đi kèm |
|---|---|---|
| `register` | Mở đăng ký khóa học của hệ thống | Với thẻ `a`, đặt thêm `href="#dang-ky"` |
| `share` | Mở chia sẻ link affiliate của học viên | — |
| `scroll` | Cuộn tới một khối trên trang | `data-mfc-target="<khóa khối>"` (giá trị `data-mfc-block` hoặc `id` của khối đích) |
| `external` | Mở link ngoài ở tab mới | `href` của thẻ `a` (chỉ chấp nhận `http:`, `https:`, `tel:`, `mailto:`) |
| `course` | Chuyển tới trang một khóa học khác | `data-mfc-target="/khoa-hoc/<slug khóa>"` |
| `none` | Hệ thống không can thiệp, JavaScript của trang tự xử lý | — |

Ví dụ:

```html
<a href="#dang-ky" data-mfc-action="register">Đăng ký khóa học</a>
<button type="button" data-mfc-action="share">Chia sẻ khóa học</button>
<a href="#lo-trinh" data-mfc-action="scroll" data-mfc-target="lo-trinh">Xem lộ trình</a>
<a href="https://zalo.me/..." data-mfc-action="external">Nhắn Zalo tư vấn</a>
<a href="/khoa-hoc/KHOA_KHAC" data-mfc-action="course" data-mfc-target="/khoa-hoc/KHOA_KHAC">Xem khóa tiếp theo</a>
```

### Biểu mẫu (form)

- Form có `data-mfc-action="register"`: khi khách gửi form, hệ thống mở đăng ký khóa học và **mang theo dữ liệu đã điền** (họ tên, số điện thoại, email — nhận diện theo tên trường `name`/`hoten`/`fullname`, `phone`/`sdt`/`tel`, `email`) để hiển thị lại cho khách đối chiếu. Dữ liệu này không được lưu vào cơ sở dữ liệu.
- Form không có thuộc tính trên vẫn được hệ thống chuyển thành mở đăng ký (hành vi tương thích cũ) kèm dữ liệu đã điền.
- Form có `data-mfc-action="none"`: hệ thống không can thiệp.

### Cách tương thích cũ (vẫn chạy, không khuyến nghị cho trang mới)

- Liên kết có `href="#dang-ky"` hoặc `#register`, hoặc nút có `data-mfc-register`, vẫn mở đăng ký.
- Liên kết `#<id>` cuộn tới phần tử có `id` đó.
- Ở bước rà soát, hệ thống **gợi ý** hành động theo các dấu hiệu trên; giảng viên là người chốt cuối cùng trong bảng gán sự kiện.

## 4. Khối trên trang

- Dùng các thẻ cấu trúc `header`, `nav`, `section`, `footer` cho từng phần của trang. Hệ thống đánh dấu các khối cấp cao nhất bằng thuộc tính `data-mfc-block="<khóa>"` khi đóng gói trang.
- Ở bước rà soát, từng khối có thể **ẩn/hiện** và một khối có thể được đánh dấu là **khối đăng ký** (khối này được xử lý riêng khi trang hiển thị, giống hành vi hiện tại với các khối chứa form đăng ký). Lựa chọn được lưu cùng trang khi bấm Lưu nháp.
- Cho mỗi khối một `id` có nghĩa (ví dụ `id="lo-trinh"`, `id="hoc-phi"`) để liên kết cuộn tới khối ổn định.

## 5. Giới hạn kỹ thuật

- Tổng HTML/CSS/JavaScript của trang tối đa **1 MB** (không tính ảnh, vì ảnh là link ngoài).
- **Tailwind**: bản qua `https://cdn.tailwindcss.com` (v3) được hệ thống tự biên dịch thành CSS khi xem trước/lưu. Tailwind v4 chạy bằng trình duyệt (`@tailwindcss/browser`) **không** được hỗ trợ — hãy xuất CSS đã biên dịch sẵn.
- Hiệu ứng cuộn AOS (`data-aos`) được hỗ trợ đóng gói sẵn.
- **JavaScript** của trang chạy trong khung sandbox tách biệt: không truy cập được tài khoản, cookie hay dữ liệu của hệ thống; đường giao tiếp duy nhất với trang cha là cầu nối sự kiện ở mục 3. Đừng viết code phụ thuộc `localStorage` của tên miền hệ thống, gọi API của hệ thống, hay mở cửa sổ tùy ý.
- Script từ tên miền lạ có thể bị loại khi nhập từ URL (bản phân tích loại script nguồn); JavaScript viết trực tiếp trong file HTML/ZIP được giữ.
- Trang không được nhúng `iframe`, `object`, `embed` từ bên ngoài; video YouTube được hỗ trợ qua cơ chế ô video của hệ thống.

## 6. Mẫu HTML tối thiểu

```html
<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Trang bán khóa học</title>
<style>
  body { margin: 0; font-family: Arial, sans-serif; color: #203126; background: #fffaf0; }
  section { max-width: 1000px; margin: auto; padding: 48px 20px; }
  h1 { font-size: clamp(28px, 5vw, 52px); }
  a.cta { display: inline-block; padding: 14px 24px; background: #236c1e; color: #fff; border-radius: 10px; text-decoration: none; }
</style>
</head>
<body>
<section id="gioi-thieu">
  <h1>Tên khóa học</h1>
  <p>Giới thiệu lợi ích khóa học tại đây.</p>
  <img src="https://i.postimg.cc/vi-du/anh-hero.jpg" alt="Ảnh giới thiệu khóa học">
  <a class="cta" href="#dang-ky" data-mfc-action="register">Đăng ký khóa học</a>
</section>
<section id="lo-trinh">
  <h2>Lộ trình học</h2>
  <p>Nội dung các phần học…</p>
  <a class="cta" href="#dang-ky" data-mfc-action="register">Đăng ký ngay</a>
</section>
</body>
</html>
```
