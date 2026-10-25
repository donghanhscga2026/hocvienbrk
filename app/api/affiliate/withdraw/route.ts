import { NextResponse } from "next/server"

/**
 * Đã ngừng (25/10/2026) — theo mô hình vận hành đã chốt 23/10/2026:
 * nền tảng không giữ tiền học phí (tiền về thẳng tài khoản ngân hàng của
 * giảng viên), affiliate chỉ ghi nhận số liệu để lập báo cáo; giảng viên
 * tự thanh toán cho CTV theo trang Quyết Toán GV
 * (/tools/affiliate/settlement).
 *
 * Route được giữ lại để trả 410 rõ ràng thay vì 404 cho các bản app cũ.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Tính năng rút tiền qua nền tảng đã ngừng. Hoa hồng được giảng viên thanh toán trực tiếp theo báo cáo quyết toán.",
    },
    { status: 410 }
  )
}
