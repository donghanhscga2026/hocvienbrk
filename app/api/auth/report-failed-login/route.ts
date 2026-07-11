import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAllPhoneVariants } from "@/lib/phone-utils";

type IdentifierType = 'student_id' | 'email' | 'phone' | 'unknown';
type ErrorType = 'NOT_FOUND' | 'INVALID_PASSWORD' | 'NO_PASSWORD' | 'UNKNOWN';

function detectIdentifierType(identifier: string): IdentifierType {
  if (/^\d+$/.test(identifier)) return 'student_id';
  if (identifier.includes('@')) return 'email';
  const digitsOnly = identifier.replace(/\D/g, '');
  if (digitsOnly.length >= 8 && digitsOnly.length <= 15) return 'phone';
  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json();
    if (!identifier) {
      return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
    }

    const identifierType = detectIdentifierType(identifier);
    let user = null;
    let errorType: ErrorType = 'NOT_FOUND';

    // Look up user based on identifier type
    if (identifierType === 'student_id') {
      const id = parseInt(identifier);
      user = await prisma.user.findUnique({ where: { id } });
    } else if (identifierType === 'email') {
      user = await prisma.user.findFirst({
        where: { email: { equals: identifier.toLowerCase().trim(), mode: 'insensitive' } },
      });
    } else if (identifierType === 'phone') {
      const phoneVariants = getAllPhoneVariants(identifier);
      user = await prisma.user.findFirst({
        where: { phone: { in: phoneVariants } },
      });
    }

    // Build response
    const userInfo = user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    } : null;

    if (user) {
      if (!user.password) {
        errorType = 'NO_PASSWORD';
      } else {
        errorType = 'INVALID_PASSWORD';
      }
    }

    // Send Telegram notification to FAILED_LOGIN group
    const time = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const typeLabels: Record<IdentifierType, string> = {
      student_id: 'Mã học viên',
      email: 'Email',
      phone: 'Số điện thoại',
      unknown: 'Không xác định',
    };

    const errorLabels: Record<string, string> = {
      NOT_FOUND: 'Không tìm thấy tài khoản',
      INVALID_PASSWORD: 'Sai mật khẩu',
      NO_PASSWORD: 'Chưa thiết lập mật khẩu',
      UNKNOWN: 'Lỗi không xác định',
    };

    let userDetail = '';
    if (userInfo) {
      userDetail =
        `\n📋 Thông tin user:\n` +
        `  🆔 Mã HV: #${userInfo.id}\n` +
        `  👤 Họ tên: ${userInfo.name || 'N/A'}\n` +
        `  📧 Email: ${userInfo.email || 'N/A'}\n` +
        `  📞 SĐT: ${userInfo.phone || 'N/A'}`;
    } else {
      userDetail = `\n⚠️ Không tìm thấy user trong DB`;
    }

    const msg = `⚠️ <b>ĐĂNG NHẬP THẤT BẠI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 Định danh nhập vào: <code>${identifier}</code>\n` +
      `📋 Loại định danh: ${typeLabels[identifierType]}\n` +
      `❌ Lỗi: <b>${errorLabels[errorType]}</b>\n` +
      `${userDetail}\n` +
      `⏰ Thời gian: ${time}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 Học viên nên: Kiểm tra lại thông tin hoặc dùng tính năng Quên tài khoản/Quên mật khẩu`;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID_FAILED_LOGIN || process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
      }).catch(() => {});
    }

    return NextResponse.json({
      identifierType,
      errorType,
      userFound: !!user,
      userInfo,
    });
  } catch (error: any) {
    console.error("❌ [ReportFailedLogin] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
