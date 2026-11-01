import { auth } from "@/auth";
import { getAuthUrl } from "@/lib/google-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();

  // Admin nối hộp thư hệ thống; Giảng viên nối Gmail của chính mình (GĐ3).
  // ?own=1 (từ trang "Hộp thư của tôi"): nối Gmail làm hộp thư RIÊNG của chính
  // người đang đăng nhập — áp dụng cho cả admin. Giảng viên luôn nối riêng.
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const own = session.user.role === "TEACHER" || searchParams.get("own") === "1";
  const url = getAuthUrl(own ? "own" : "system");
  return NextResponse.redirect(url);
}
