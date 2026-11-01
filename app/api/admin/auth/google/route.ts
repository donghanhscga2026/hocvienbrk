import { auth } from "@/auth";
import { getAuthUrl } from "@/lib/google-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  // Admin nối hộp thư hệ thống; Giảng viên nối Gmail của chính mình (GĐ3)
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
