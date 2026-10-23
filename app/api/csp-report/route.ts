import { NextResponse } from "next/server"

// [Bảo mật P0] Đầu nhận báo cáo vi phạm CSP từ trình duyệt
// (report-uri /api/csp-report trong CSP Report-Only tại next.config.ts).
// Trình duyệt gửi báo cáo không kèm phiên đăng nhập, nên route này không
// xác thực; bù lại nó không đọc/ghi dữ liệu nào, chỉ ghi log rút gọn để
// rà soát trước khi siết CSP thành chế độ chặn thật.
const MAX_BODY_CHARS = 8192

export async function POST(request: Request) {
    try {
        const raw = await request.text()
        if (raw) {
            // Chỉ log các trường cần thiết, cắt ngắn để tránh log phình to
            // hoặc chứa nội dung lạ do bên thứ ba gửi vào.
            console.warn("[csp-report]", raw.slice(0, MAX_BODY_CHARS))
        }
    } catch {
        // Báo cáo lỗi định dạng vẫn trả 204: trình duyệt không cần biết.
    }
    return new NextResponse(null, { status: 204 })
}

export async function GET() {
    return new NextResponse(null, { status: 204 })
}
