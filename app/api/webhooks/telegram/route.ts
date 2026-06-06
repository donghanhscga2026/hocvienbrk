import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { sendTelegramMessage, parseBotCommand, setPendingConfirmation, getPendingConfirmation, clearPendingConfirmation } from "@/lib/telegram-bot"

export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret) {
    const headerSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (headerSecret !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const update = await request.json()

  if (!update.message?.text) {
    return NextResponse.json({ ok: true })
  }

  const chatId = update.message.chat.id
  const text = update.message.text.trim()
  const parsed = parseBotCommand(text)

  if (!parsed) {
    return NextResponse.json({ ok: true })
  }

  const { command, payload } = parsed

  if (command === 'otp' || (command === 'start' && payload.startsWith('otp_'))) {
    const email = payload.startsWith('otp_') ? payload.slice(4) : payload

    if (!email || !email.includes('@')) {
      await sendTelegramMessage(chatId, '❌ Email không hợp lệ. Vui lòng thử lại.')
      return NextResponse.json({ ok: true })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const token = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        expires: { gt: new Date() },
      },
    })

    if (!token) {
      await sendTelegramMessage(
        chatId,
        '❌ Không tìm thấy mã OTP cho email này.\n' +
        'Vui lòng đăng ký tài khoản trước tại https://giautoandien.io.vn/register'
      )
      return NextResponse.json({ ok: true })
    }

    setPendingConfirmation(chatId, normalizedEmail)

    await sendTelegramMessage(
      chatId,
      `<b>Xác nhận nhận mã OTP</b>\n\n` +
      `📧 Email: ${normalizedEmail}\n\n` +
      `Bạn có muốn nhận mã OTP kích hoạt tài khoản không?\n` +
      `Ấn /confirm để xác nhận.`
    )
    return NextResponse.json({ ok: true })
  }

  if (command === 'confirm') {
    const pending = getPendingConfirmation(chatId)

    if (!pending) {
      await sendTelegramMessage(
        chatId,
        '❌ Không có yêu cầu OTP nào đang chờ.\n' +
        'Vui lòng gửi lại yêu cầu từ website: https://giautoandien.io.vn/register'
      )
      return NextResponse.json({ ok: true })
    }

    const token = await prisma.verificationToken.findFirst({
      where: {
        identifier: pending.email,
        expires: { gt: new Date() },
      },
    })

    if (!token) {
      clearPendingConfirmation(chatId)
      await sendTelegramMessage(
        chatId,
        '❌ Mã OTP đã hết hạn hoặc không tồn tại.\n' +
        'Vui lòng đăng ký lại tài khoản tại https://giautoandien.io.vn/register'
      )
      return NextResponse.json({ ok: true })
    }

    clearPendingConfirmation(chatId)
    const otpCode = token.token

    await sendTelegramMessage(
      chatId,
      `<b>✅ Mã OTP của bạn là:</b>\n\n` +
      `<code>${otpCode}</code>\n\n` +
      `⏱ Hiệu lực: 24 giờ kể từ khi đăng ký\n` +
      `🌐 Nhập mã tại: https://giautoandien.io.vn/register`
    )
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
