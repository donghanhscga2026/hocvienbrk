import { NextResponse } from "next/server"
import { lookupLoginPhone, validLoginPhone } from "@/lib/auth/phone-login"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { generateLoginOtp, storeLoginOtp } from "@/lib/auth/email-login-otp"
import { sendGmail } from "@/lib/notifications"

const GENERIC_MESSAGE = "Nếu số điện thoại có email liên kết, mã xác thực sẽ được gửi đến email đó."
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const phone = body?.phone
    if (!validLoginPhone(phone)) return NextResponse.json({ error: "Số điện thoại không hợp lệ." }, { status: 400 })
    const ip = getClientIp(request)
    const limits = await Promise.all([
      checkRateLimit(`login-otp:ip:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 }),
      checkRateLimit(`login-otp:phone:${phone.replace(/\D/g, "")}`, { max: 3, windowMs: 15 * 60 * 1000 }),
    ])
    if (limits.some(l => !l.allowed)) return NextResponse.json({ error: "Bạn yêu cầu quá nhiều lần. Vui lòng thử lại sau." }, { status: 429 })
    const user = await lookupLoginPhone(phone)
    // Email must be verified to prevent sending a login credential to an unverified address.
    if (!user?.email || !user.emailVerified) return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
    const code = generateLoginOtp()
    await storeLoginOtp(user.id, code)
    const result = await sendGmail(user.email, "Mã đăng nhập một lần", `<div style="font-family:Arial,sans-serif"><h2>Mã đăng nhập</h2><p>Mã xác thực của bạn:</p><p style="font-size:28px;font-weight:bold;letter-spacing:5px">${code}</p><p>Mã có hiệu lực trong 10 phút. Nếu không yêu cầu, hãy bỏ qua email này.</p></div>`)
    if (!result.success) {
      console.error("[login-otp] Could not deliver OTP", result.message)
      return NextResponse.json({ error: "Không thể gửi email lúc này. Vui lòng sử dụng mật khẩu hoặc thử lại sau." }, { status: 503 })
    }
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
  } catch (error) {
    console.error("[login-otp] Request failed", error)
    return NextResponse.json({ error: "Không thể gửi mã lúc này." }, { status: 500 })
  }
}
