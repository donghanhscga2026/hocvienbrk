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

  if (session?.user?.role !== "ADMIN") {
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

    // Lưu hoặc cập nhật EmailSender
    await prisma.emailSender.upsert({
      where: { email },
      update: {
        refreshToken: encryptedRefreshToken,
        clientId: process.env.GMAIL_CLIENT_ID || "",
        // Không cập nhật label nếu đã có
        isActive: true,
      },
      create: {
        email,
        label: `Vệ tinh ${email.split('@')[0]}`,
        refreshToken: encryptedRefreshToken,
        clientId: process.env.GMAIL_CLIENT_ID || "",
        dailyLimit: 480,
        isMain: email === "hocvienbrk@gmail.com", // Giả định email chính
      },
    });

    // Quay lại trang quản lý (trang này sẽ được tạo ở bước sau)
    return NextResponse.redirect(new URL("/admin/email-senders", req.url));

  } catch (error: any) {
    console.error("OAuth Callback Error:", error);
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}
