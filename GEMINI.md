# GEMINI.md - Project Instruction & Rules (HocVien-BRK)

> Tệp này là hướng dẫn nền tảng cho AI Agent khi làm việc trong workspace này. Mọi hành động phải tuân thủ nghiêm ngặt các quy tắc dưới đây.

---

## 💎 QUY TẮC KIM CƯƠNG (BẮT BUỘC TUÂN THỦ)

1.  **LUÔN LƯU BACKUP TRƯỚC KHI SỬA**:
    *   Trước khi thực hiện bất kỳ thay đổi nào, hãy sao chép nội dung file gốc vào thư mục `plan_temp/` dưới dạng `.txt` (Ví dụ: `app/page_backup_20260412.txt`).
2.  **SO SÁNH CODE CŨ VỚI MỚI**:
    *   Đọc kỹ code cũ trước khi viết code mới.
    *   Không tự ý "sáng tạo" hay thay đổi code cũ nếu không có yêu cầu hoặc chưa được xác nhận.
    *   Nếu muốn tối ưu code cũ, phải hỏi ý kiến User và nhận xác nhận trước khi thực hiện.
3.  **CHỈ SỬA ĐỔI PHẪU THUẬT (SURGICAL EDITS)**:
    *   **KHÔNG** viết lại toàn bộ file. Chỉ chỉnh sửa đúng phần cần thiết.
    *   Thêm ghi chú (comment) vào code về việc: "Sửa cái gì, tác dụng như thế nào".
4.  **DỪNG LẠI VÀ HỎI (SOCRATIC GATE)**:
    *   Với các yêu cầu phức tạp, phải đặt ít nhất **3 câu hỏi chiến lược** trước khi làm.
    *   Mỗi bước hoàn thành phải chờ User xác nhận mới được làm tiếp bước sau.
5.  **KIỂM TRA LOG & SO SÁNH HỆ THỐNG**:
    *   Khi có lỗi, hãy kiểm tra Console Log trước.
    *   Nếu một hệ thống (TCA) chạy mà hệ thống khác (Học viên) không chạy, hãy dùng `git diff` để so sánh và tìm điểm khác biệt.

---

## 🛠 TECH STACK & CONTEXT

*   **Framework**: Next.js 16 (App Router) - **Cực kỳ quan trọng**.
*   **Database**: Prisma ORM + PostgreSQL.
*   **Authentication**: NextAuth v5.
*   **Styling**: Tailwind CSS v4.
*   **Language**: TypeScript (Strict Mode).
*   **Hệ thống chính**: Affiliate (Multi-level), Landing Page, Share Module.

---

## 🚀 QUY TẮC NEXT.JS 16 & TYPESCRIPT (CHI TIẾT)

1.  **Route Handler Params**: `params` PHẢI là một Promise.
    ```typescript
    export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        const { id } = await params;
    }
    ```
2.  **useSearchParams()**: Phải luôn được bọc trong `<Suspense>`.
3.  **Cache Management**: KHÔNG dùng `revalidateTag`. Sử dụng `revalidatePath('/path')` để thay thế.
4.  **Server vs Client**:
    *   Prisma KHÔNG chạy được trong Client Component.
    *   Sử dụng API Fetch (`/api/...`) cho Client Components thay vì gọi trực tiếp Server Actions chứa Prisma logic trong `useEffect`.
5.  **State Management**: Tránh re-render vô hạn. Ưu tiên dùng `useRef` cho các giá trị tạm thời trong navigation/loading state.

---

## 📋 QUY TRÌNH LÀM VIỆC (WORKFLOW)

### Bước 1: Nghiên cứu (Research)
*   Sử dụng `grep_search` và `glob` để hiểu cấu trúc và các dependency liên quan.
*   Xác nhận lỗi bằng cách kiểm tra log hoặc tạo script tái hiện (reproduction script).

### Bước 2: Chiến lược (Strategy)
*   Đưa ra phương án giải quyết ngắn gọn.
*   Xác nhận thư mục backup trong `plan_temp/`.
*   Đặt câu hỏi làm rõ nếu có bất kỳ điểm nào chưa chắc chắn.

### Bước 3: Thực thi (Execution)
*   Thực hiện thay đổi nhỏ, "phẫu thuật".
*   Thêm comment tiếng Việt giải thích thay đổi.
*   Chạy `npm run lint` và `npx prisma validate` (nếu sửa schema).

### Bước 4: Xác minh (Validation)
*   Luôn chạy `npm run build` trước khi báo cáo hoàn thành.
*   Chờ User xác nhận kết quả.

---

## 🎨 NGÔN NGỮ & ĐỊNH DẠNG

*   **Giao tiếp**: Trả lời bằng tiếng Việt (ngắn gọn, tập trung vào kỹ thuật).
*   **Comment Code**: Viết bằng **tiếng Việt**.
*   **Tên biến/hàm**: Viết bằng tiếng Anh theo quy ước:
    *   Components: `PascalCase`.
    *   Hooks/Utils: `camelCase`.
    *   Actions: `PascalCase` (với suffix `-actions.ts`).

---

## 📁 TÀI LIỆU THAM KHẢO QUAN TRỌNG

*   `AGENTS.md`: Quy tắc chi tiết của dự án.
*   `NEXTJS16_RULES.md`: Các lỗi build thường gặp và cách sửa.
*   `PLAN.md`: Lịch sử thay đổi và kế hoạch kỹ thuật.
*   `docs/AFFILIATE_SYSTEM.md`: Tài liệu logic hệ thống Affiliate.

---
**Ghi chú**: Tôi đã đọc và hiểu các quy tắc này. Tôi sẽ áp dụng chúng ngay lập tức từ bước tiếp theo.
