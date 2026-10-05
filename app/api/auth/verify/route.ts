import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { onEmailVerified } from "@/lib/affiliate/points-manager";
import { domainContext } from '@/lib/website/domain-context'

export async function GET(request: NextRequest) {
  const website=await domainContext()
  const returnUrl=website ? 'https://'+website.hostname : request.url
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=Mã xác minh không hợp lệ", returnUrl));
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
      return NextResponse.redirect(new URL("/login?error=Mã xác minh đã hết hạn hoặc không tồn tại", returnUrl));
    }

    // 2. Tìm user trước khi cập nhật
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
      select: { id: true }
    });

    // 3. Cập nhật trạng thái emailVerified cho User
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() }
    });

    // 4. Xóa token sau khi đã sử dụng
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: token
        }
      }
    });

    // 5. Cộng điểm affiliate cho người giới thiệu (nếu có)
    if (user) {
      await onEmailVerified(user.id);
    }

    // 6. Chuyển hướng về trang đăng nhập với thông báo thành công
    return NextResponse.redirect(new URL("/login?success=Xác minh email thành công! Bây giờ bạn có thể đăng nhập.", returnUrl));

  } catch (error) {
    console.error("Verification Error:", error);
    return NextResponse.redirect(new URL("/login?error=Có lỗi xảy ra trong quá trình xác minh", returnUrl));
  }
}
