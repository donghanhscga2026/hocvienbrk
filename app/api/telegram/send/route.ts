import { NextRequest, NextResponse } from "next/server"
import { sendTelegramToUser } from "@/lib/telegram-bot"
import { isAuthorizedRequest } from "@/lib/request-auth"

/**
 * API nội bộ nhận lệnh gửi tin nhắn Telegram cá nhân cho học viên qua userId
 * Xác thực qua Bearer Token sử dụng TELEGRAM_WEBHOOK_SECRET làm mật mã bảo mật
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = isAuthorizedRequest(request as NextRequest & { nextUrl?: { searchParams: URLSearchParams } }, {
      secretEnv: 'TELEGRAM_WEBHOOK_SECRET',
      allowedHeaderNames: ['x-telegram-webhook-secret', 'x-webhook-secret'],
      allowQuerySecret: false,
    })

    if (!authResult.isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, message } = await request.json()

    if (!userId || typeof userId !== "number") {
      return NextResponse.json({ error: "Yêu cầu userId hợp lệ (định dạng số)." }, { status: 400 })
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Nội dung tin nhắn không được để trống." }, { status: 400 })
    }

    const success = await sendTelegramToUser(userId, message)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Gửi tin nhắn thất bại hoặc tài khoản chưa liên kết Telegram." }, { status: 500 })
    }
  } catch (error: any) {
    console.error("❌ API /api/telegram/send error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
