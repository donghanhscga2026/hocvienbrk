import { NextResponse } from "next/server"
import { lookupLoginPhone, validLoginPhone } from "@/lib/auth/phone-login"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const phone = body?.phone
    if (!validLoginPhone(phone)) return NextResponse.json({ error: "Số điện thoại không hợp lệ." }, { status: 400 })
    const ip = getClientIp(request)
    const limit = await checkRateLimit(`phone-login:lookup:ip:${ip}`, { max: 12, windowMs: 15 * 60 * 1000 })
    if (!limit.allowed) return NextResponse.json({ error: "Vui lòng thử lại sau ít phút." }, { status: 429 })
    const user = await lookupLoginPhone(phone)
    // Do not expose role, ID, email or MFA status to an unauthenticated caller.
    return NextResponse.json({ found: Boolean(user) })
  } catch {
    return NextResponse.json({ error: "Không thể kiểm tra lúc này." }, { status: 500 })
  }
}
