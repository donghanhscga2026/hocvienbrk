import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { lookupLoginPhone, maskEmail, validLoginPhone } from "@/lib/auth/phone-login"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    // Mã thành viên: toàn ký số, dưới 7 ký số → tra trực tiếp theo id
    const memberIdRaw = body?.memberId
    if (typeof memberIdRaw === "string" && /^\d{1,6}$/.test(memberIdRaw)) {
      const user = await prisma.user.findUnique({ where: { id: parseInt(memberIdRaw, 10) } })
      // Chỉ trả mã thành viên + email đã che: không lộ role, email đầy đủ hay trạng thái MFA.
      if (!user) return NextResponse.json({ found: false })
      return NextResponse.json({ found: true, memberId: user.id, maskedEmail: user.email ? maskEmail(user.email) : null })
    }
    const phone = body?.phone
    if (!validLoginPhone(phone)) return NextResponse.json({ error: "Số điện thoại không hợp lệ." }, { status: 400 })
    const ip = getClientIp(request)
    const limit = await checkRateLimit(`phone-login:lookup:ip:${ip}`, { max: 12, windowMs: 15 * 60 * 1000 })
    if (!limit.allowed) return NextResponse.json({ error: "Vui lòng thử lại sau ít phút." }, { status: 429 })
    const user = await lookupLoginPhone(phone)
    // Chỉ trả mã thành viên + email đã che: không lộ role, email đầy đủ hay trạng thái MFA.
    if (!user) return NextResponse.json({ found: false })
    return NextResponse.json({ found: true, memberId: user.id, maskedEmail: user.email ? maskEmail(user.email) : null })
  } catch {
    return NextResponse.json({ error: "Không thể kiểm tra lúc này." }, { status: 500 })
  }
}
