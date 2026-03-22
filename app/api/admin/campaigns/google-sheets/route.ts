import { auth } from "@/auth";
import { getOAuth2Client } from "@/lib/google-auth";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/email-encryptor";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { spreadsheetId, range = "Sheet1!A:B" } = await req.json();

    // Lấy token của một sender bất kỳ đã kết nối để mượn quyền đọc Sheet
    // Hoặc tốt nhất là dùng một tài khoản đã kết nối
    const sender = await prisma.emailSender.findFirst({
      where: { isActive: true }
    });

    if (!sender) {
      return new NextResponse("Vui lòng kết nối ít nhất 1 Google Account trong Email Pool để sử dụng tính năng này.", { status: 400 });
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: decrypt(sender.refreshToken),
    });

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json([]);
    }

    // Giả định cột 1 là Email, cột 2 là Tên
    const recipients = rows.slice(1).map((row, index) => ({
      id: 9000 + index, // ID tạm để bảng chọn hoạt động
      email: row[0],
      name: row[1] || "Học viên",
    })).filter(r => r.email && r.email.includes("@"));

    return NextResponse.json(recipients);

  } catch (error: any) {
    console.error("Google Sheets Error:", error);
    return new NextResponse(`Lỗi Google Sheets: ${error.message}`, { status: 500 });
  }
}
