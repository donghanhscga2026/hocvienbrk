# TÀI LIỆU TỔNG QUAN DỰ ÁN HỌC VIỆN BRK
> **Mục đích**: Tài liệu này cung cấp bức tranh toàn cảnh về kiến trúc hệ thống, công nghệ nền tảng và triết lý thiết kế của dự án Học Viện BRK. Đây là cẩm nang khởi đầu dành cho cả lập trình viên (Developers) và quản trị viên (Administrators).

---

## 1. GIỚI THIỆU CHUNG
**Học Viện BRK** là một nền tảng học trực tuyến kết hợp hệ thống quản trị cộng đồng và tiếp thị liên kết (Affiliate). Hệ thống được thiết kế để không chỉ cung cấp khóa học mà còn quản lý cây phả hệ phức tạp (Genealogy), theo dõi doanh thu và hỗ trợ công cụ Email Marketing.

### 🎯 Các phân hệ chính:
1. **Hệ thống Học tập (LMS)**: Player học tập, quản lý khóa học/bài học.
2. **Hệ thống Tiếp thị liên kết (Affiliate)**: Tracking cookie, tính toán hoa hồng, ví điện tử.
3. **Hệ thống Nhân mạch (Genealogy)**: Sơ đồ phả hệ đa cấp, quản lý đội nhóm đa hệ thống (TCA, KTC).
4. **Hệ thống Quản trị (Admin/Teacher)**: Phân quyền bảo mật, phê duyệt thanh toán, công cụ quản lý.
5. **Hệ thống Cộng đồng (Site Profile)**: Trang cá nhân định danh, quản lý cộng sự.

---

## 2. NỀN TẢNG CÔNG NGHỆ (TECH STACK)
Dự án được xây dựng trên các công nghệ hiện đại nhất để đảm bảo hiệu năng và khả năng mở rộng:

| Thành phần | Công nghệ sử dụng | Chú thích |
|:---|:---|:---|
| **Framework** | **Next.js 16 (App Router)** | Kiến trúc Server-first, tối ưu SEO và tốc độ tải trang. |
| **Database ORM**| **Prisma (v5.22+)** | Quản lý schema, migrations và query an toàn type-safe. |
| **Database** | **PostgreSQL** | Cơ sở dữ liệu quan hệ mạnh mẽ, lưu trữ cây phả hệ qua mô hình Closure Table. |
| **Authentication**| **NextAuth v5 (Auth.js)** | Hỗ trợ đăng nhập Credentials, Google OAuth, hỗ trợ Edge runtime. |
| **Giao diện** | **Tailwind CSS v4** | Utility-first CSS framework tích hợp LightningCSS. |
| **Thành phần UI**| **Shadcn/UI & Lucide-React** | Thư viện UI tái sử dụng cao và bộ icon chuẩn. |
| **Ngôn ngữ** | **TypeScript** | Strict mode 100%, bảo vệ an toàn kiểu dữ liệu. |
| **Storage** | **Supabase Storage** | Lưu trữ ảnh Avatar, chứng từ thanh toán thay vì mã hóa Base64 trong DB. |

---

## 3. KIẾN TRÚC HỆ THỐNG (ARCHITECTURE)

Dự án tuân thủ chặt chẽ mô hình **Server-First Architecture** của Next.js App Router:

### A. Mô hình luồng dữ liệu (Data Flow)
1. **Server Components (Mặc định)**: Fetch dữ liệu trực tiếp từ Database thông qua Prisma, không cần lộ API endpoint.
2. **Client Components (`"use client"`)**: Chỉ sử dụng tại "lá" của cây component (ví dụ: các form nhập liệu, nút bấm có tương tác, video player).
3. **Server Actions (`"use server"`)**: Xử lý các tác vụ Mutation (Tạo, Sửa, Xóa) trực tiếp từ Server, thay thế cho API Routes truyền thống, đảm bảo an toàn dữ liệu và tích hợp sẵn bảo mật phân quyền.

### B. Cấu trúc thư mục lõi
```text
HocVien-BRK/
├── app/                  # (App Router) Chứa các trang giao diện và API
│   ├── actions/          # Chứa toàn bộ Server Actions (logic nghiệp vụ chính)
│   ├── api/              # Chứa các endpoint API tích hợp ngoài (TCA sync, cron jobs)
│   ├── tools/            # Khu vực dành riêng cho các công cụ Admin và Teacher
│   └── (pages)           # Các trang public: '/', '/login', '/courses'...
├── components/           # (UI Components) Phân chia theo module
│   ├── admin/            # Các component quản trị (Form, Modal, Tables)
│   ├── course/           # Các component liên quan đến khóa học (Player, Cards)
│   ├── genealogy/        # Các component cây nhân mạch (Nodes, Modals)
│   └── ui/               # Thư viện UI cơ bản (Buttons, Inputs từ Shadcn)
├── lib/                  # (Business Logic & Utilities)
│   ├── prisma.ts         # Khởi tạo kết nối Database (Singleton)
│   ├── email-*.ts        # Các service liên quan đến hệ thống Email MKT
│   └── affiliate/        # Logic lõi tính toán hoa hồng và tracking
├── prisma/               # (Database)
│   └── schema.prisma     # Nơi định nghĩa toàn bộ mô hình dữ liệu (Models)
├── proxy.ts              # (Interceptor) Next.js Middleware xử lý Auth và Affiliate tracking
```

---

## 4. TRIẾT LÝ THIẾT KẾ (DESIGN SYSTEM)
Dự án sử dụng Design System độc quyền `brk-theme` dựa trên biến CSS (CSS Variables) để dễ dàng kiểm soát Light/Dark mode.

### Màu sắc chủ đạo:
- `brk-bg`: Màu nền chính (Sáng/Tối).
- `brk-surface`: Màu nền của thẻ (Cards, Modals).
- `brk-accent`: Màu cam chủ đạo (Thương hiệu BRK).
- `brk-text`, `brk-text-muted`: Màu chữ chính và phụ.

*Lưu ý cho Dev: Không sử dụng các class màu cứng như `bg-white` hay `text-black` cho các UI tái sử dụng, hãy sử dụng các biến `bg-brk-surface`, `text-brk-text`.*

---

## 5. DANH MỤC TÀI LIỆU CHI TIẾT
Bộ tài liệu này được chia thành các phân hệ độc lập. Quản trị viên hoặc lập trình viên có thể tra cứu nhanh theo từng file:

- `01_GIAO_DIEN_TRANG_CHU.md`: Logic hiển thị trang chủ động.
- `02_XAC_THUC_VA_BAO_MAT.md`: Đăng ký, OTP, Google Auth.
- `03_PROFILE_VA_CAI_DAT.md`: Quản lý tài khoản.
- `04_AFFILIATE_GIOI_THIEU.md`: Hệ thống giới thiệu và hoa hồng.
- `05_GENEALOGY_NHAN_MACH.md`: Cây phả hệ đa cấp.
- `06_HOC_TAP_COURSE_PLAYER.md`: Hệ thống bài giảng, xem khóa học.
- `07_QUAN_TRI_KHOA_HOC.md`: Hướng dẫn dành cho Giáo viên.
- `08_PAYMENTS_THANH_TOAN.md`: Xử lý giao dịch và tự động kích hoạt.
- `09_EMAIL_MARKETING.md`: Công cụ gửi thư hàng loạt.
- `10_COMMUNITY_SITE_PROFILE.md`: Hệ thống cộng đồng.
- `11_ADMIN_TOOLS_HE_THONG.md`: Quản trị cấp cao và đa hệ thống.
