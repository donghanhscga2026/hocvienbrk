import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=Mã xác minh không hợp lệ", request.url));
  }

  try {
    // 1. Tìm token trong DB
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: token,
        expires: { gt: new Date() } // Phải còn hạn
      }
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL("/login?error=Mã xác minh đã hết hạn hoặc không tồn tại", request.url));
    }

    // 2. Cập nhật trạng thái emailVerified cho User
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() }
    });

    // 3. Xóa token sau khi đã sử dụng
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: token
        }
      }
    });

    // 4. Chuyển hướng về trang đăng nhập với thông báo thành công
    return NextResponse.redirect(new URL("/login?success=Xác minh email thành công! Bây giờ bạn có thể đăng nhập.", request.url));

  } catch (error) {
    console.error("Verification Error:", error);
    return NextResponse.redirect(new URL("/login?error=Có lỗi xảy ra trong quá trình xác minh", request.url));
  }
}
