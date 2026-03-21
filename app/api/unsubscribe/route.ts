import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return new NextResponse("Email is required", { status: 400 });
  }

  try {
    // Thêm vào blacklist
    await prisma.emailBlacklist.upsert({
      where: { email },
      update: { reason: "UNSUBSCRIBED" },
      create: { email, reason: "UNSUBSCRIBED" },
    });

    return new NextResponse(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>Đã hủy đăng ký thành công</h1>
        <p>Bạn sẽ không nhận được các email thông báo từ Học Viện BRK nữa.</p>
        <a href="/">Quay lại trang chủ</a>
      </div>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });

  } catch (error: any) {
    return new NextResponse("Error: " + error.message, { status: 500 });
  }
}
