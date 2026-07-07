import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { onEmailVerified } from "@/lib/affiliate/points-manager";

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Thiếu thông tin email hoặc mã OTP" }, { status: 400 });
    }

    // 1. Tìm token trong DB
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: otp,
        expires: { gt: new Date() } // Phải còn hạn
      }
    });

    if (!verificationToken) {
      return NextResponse.json({ error: "Mã xác minh không hợp lệ hoặc đã hết hạn" }, { status: 400 });
    }

    // 2. Tìm user
    const user = await prisma.user.findUnique({
      where: { email: email },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
        return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    // 3. Cập nhật trạng thái emailVerified cho User
    await prisma.user.update({
      where: { email: email },
      data: { emailVerified: new Date() }
    });

    // 4. Xóa token sau khi đã sử dụng
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: otp
        }
      }
    });

    // 5. Cộng điểm affiliate cho người giới thiệu (nếu có)
    await onEmailVerified(user.id);

    // 6. Gửi thông báo Telegram về việc xác minh thành công
    try {
        const { sendTelegram } = await import("@/lib/notifications");
        const msg = `✅ <b>XÁC MINH THÀNH CÔNG</b>\n👤 Học viên: <b>${user.name}</b> (#${user.id})\n📧 Email: ${user.email}\n\n🔓 Tài khoản đã chính thức được kích hoạt.`;
        await sendTelegram(msg, 'REGISTER');
    } catch (e) {
        console.error("Telegram notification error:", e);
    }

    return NextResponse.json({ 
        success: true, 
        message: "Xác minh tài khoản thành công! Bây giờ bạn có thể đăng nhập." 
    });

  } catch (error: any) {
    console.error("OTP Verification Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra trong quá trình xác minh" }, { status: 500 });
  }
}
