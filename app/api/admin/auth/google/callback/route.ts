import { auth } from "@/auth";
import { getOAuth2Client } from "@/lib/google-auth";
import { encrypt } from "@/lib/email-encryptor";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!code) {
    return new NextResponse("Code is missing", { status: 400 });
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      return new NextResponse("Refresh token is missing. Please disconnect and reconnect again.", { status: 400 });
    }

    // Lấy thông tin email từ Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    if (!email) {
      return new NextResponse("Could not fetch email from Google", { status: 400 });
    }

    // Mã hóa refresh_token
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // GĐ3: giảng viên nối Gmail của CHÍNH MÌNH (ownerId = userId);
    // admin nối hộp thư HỆ THỐNG (ownerId = null) như trước — TRỪ KHI luồng bắt đầu
    // từ trang "Hộp thư của tôi" (?own=1 → state=own): khi đó admin cũng nối RIÊNG.
    const isTeacher = session.user.role === "TEACHER";
    const own = isTeacher || searchParams.get("state") === "own";
    const ownerId = own ? Number(session.user.id) : null;

    // Tìm sender Gmail hiện tại theo email + provider + chủ sở hữu
    const existing = await prisma.emailSender.findFirst({
      where: { email, provider: 'gmail', ownerId },
    })

    if (existing) {
      await prisma.emailSender.update({
        where: { id: existing.id },
        data: {
          refreshToken: encryptedRefreshToken,
          clientId: process.env.GMAIL_CLIENT_ID || "",
          isActive: true,
        },
      })
    } else if (own) {
      // Hộp thư của giảng viên: hạn mức khởi điểm = hạn mức email/ngày của giảng viên (mặc định 200)
      const { getTeacherDailyEmailLimit } = await import("@/lib/teacher-email");
      const teacherLimit = await getTeacherDailyEmailLimit();
      await prisma.emailSender.create({
        data: {
          email,
          label: `Gmail của ${email.split('@')[0]}`,
          refreshToken: encryptedRefreshToken,
          clientId: process.env.GMAIL_CLIENT_ID || "",
          dailyLimit: teacherLimit,
          ownerId,
        },
      })
    } else {
      await prisma.emailSender.create({
        data: {
          email,
          label: `Vệ tinh ${email.split('@')[0]}`,
          refreshToken: encryptedRefreshToken,
          clientId: process.env.GMAIL_CLIENT_ID || "",
          dailyLimit: 480,
          isMain: email === "hocvienbrk@gmail.com",
        },
      })
    }

    // Nối riêng → quay lại trang Hộp thư của tôi; nối hệ thống → quay lại Email MKT
    return NextResponse.redirect(new URL(own ? "/tools/email-mkt/mailbox?connected=1" : "/tools/email-mkt", req.url));

  } catch (error: any) {
    console.error("OAuth Callback Error:", error);
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}
