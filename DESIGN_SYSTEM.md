# HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM) - HỌC VIỆN BRK

Tài liệu này lưu trữ các thông số kỹ thuật về giao diện (UI) của dự án. Mọi thay đổi trong code sẽ được cập nhật đồng bộ vào đây.

## 1. THÔNG SỐ CHUNG (GLOBAL)

| Đối tượng | Thông số | Chi tiết |
| :--- | :--- | :--- |
| **Phông chữ (Font)** | `Be Vietnam Pro` | Phông chữ chính toàn trang, hỗ trợ tiếng Việt hoàn hảo. |
| **Màu nền (Background)** | `bg-black` / `bg-zinc-950` | Tone màu đen chủ đạo cho toàn bộ hệ thống Elite. |
| **Màu chữ chính** | `text-white` | Màu trắng tinh khôi cho độ tương phản cao trên nền đen. |

## 2. THANH ĐIỀU HƯỚNG (HEADER)

| Thành phần | Font & Kích thước | Màu sắc | Nội dung & Vị trí |
| :--- | :--- | :--- | :--- |
| **Brand Logo** | `Image` (h-12, w-auto) | `logobrk-50px.png` | Logo hình ảnh - Góc trái. |
| **Menu Desktop** | `text-[13px]`, `font-black`, `tracking-widest` | `white`, Hover: `yellow-400` | TRANG CHỦ, KHÓA HỌC... - Căn giữa. |
| **Thông tin Học viên**| `text-[10px]/[13px]`, `font-black` | `yellow-300` | "CHÀO, [Tên] (ID: [Mã])" - Góc phải. |
| **Nút Đăng xuất** | `text-xs`, `font-black` | Nền `white`, Chữ `black` | "ĐĂNG XUẤT" - Bo tròn full. |
| **Mobile Menu** | `text-sm`, `font-black` | Nền `black`, Chữ `white` | Hiện khi bấm biểu tượng Ba gạch (Hamburger). |

## 3. KHU VỰC TRUNG TÂM (HERO SECTION)

| Thành phần | Font & Kích thước | Màu sắc | Hiệu ứng & Vị trí |
| :--- | :--- | :--- | :--- |
| **Tiêu đề chính** | `text-3xl/5xl/6xl`, `font-black` | `white` (Opacity 90%) | "HỌC VIỆN BRK" - Dòng trên, VIẾT HOA. |
| **Tiêu đề phụ** | `text-2xl/4xl/5xl`, `font-black` | `yellow-400` (Glow) | "NGÂN HÀNG PHƯỚC BÁU" - Dòng dưới, VIẾT HOA. |
| **Hiệu ứng Glow** | N/A | Vàng Lóe Sáng | Hiệu ứng 3D huyền bí, lóe sáng liên tục. |
| **Khoảng cách** | `gap-6` | N/A | Khoảng cách giữa 2 dòng tiêu đề. |

## 4. THẺ KHÓA HỌC (COURSE CARD)

| Thành phần | Font & Kích thước | Màu sắc | Quy cách hiển thị |
| :--- | :--- | :--- | :--- |
| **Ảnh minh họa** | `aspect-[16/9]`, `object-cover` | `full-width` | Tỉ lệ chuẩn 16:9 (tương đương 1280x720). |
| **Biểu tượng (Icon)** | `text-2xl` (📘) | Blue | Căn giữa hoàn hảo với dòng tiêu đề. |
| **Tên khóa học** | `text-base/lg`, `font-black`, `Normal Case`, `Inter` | `black` | Hiển thị TRÊN 1 DÒNG duy nhất (Truncate). |
| **Nhãn Phí cam kết**| `text-[10px]/[11px]`, `font-black` | Nền `Red`, Chữ `White` | Bo tròn full, bóng đổ nhẹ. |
| **Nhãn Miễn phí** | `text-[10px]/[11px]`, `font-black` | Nền `Yellow`, Chữ `Black`| Bo tròn full, nổi bật. |
| **Nhãn Kích hoạt** | `text-[10px]/[11px]`, `font-black` | Nền `Sky-500`, Chữ `White`| "ĐÃ KÍCH HOẠT" - Đồng bộ màu nút. |
| **Mô tả ngắn** | `text-[14px]`, `medium` | `gray-500` | HIỆN ĐẦY ĐỦ nôi dung, không dùng line-clamp. |
| **Nút Kích hoạt ngay**| `text-sm/base`, `font-black` | Nền `Sky-500`, Chữ `White`| "Kích hoạt miễn phí/ngay" - Bo tròn full. |
| **Nút Vào học ngay** | `text-sm/base`, `font-black` | Nền `Green-600`, Chữ `White`| "VÀO HỌC NGAY" - Bo tròn full. |

---
*Lưu ý: Tài liệu này được cập nhật tự động bởi Antigravity Agent.*
