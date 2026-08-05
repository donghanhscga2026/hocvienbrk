import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAllPhoneVariants, maskPhone } from "@/lib/phone-utils"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập email hoặc số điện thoại" }, { status: 400 })
    }

    // Chặn dò quét hàng loạt email/SĐT tồn tại trong hệ thống
    const ip = getClientIp(request)
    const byIp = checkRateLimit(`check-user:ip:${ip}`, { max: 15, windowMs: 10 * 60 * 1000 })
    if (!byIp.allowed) {
      return NextResponse.json({ error: "Bạn thử quá nhiều lần. Vui lòng thử lại sau." }, { status: 429 })
    }

    const trimmed = query.trim()

    // Try to find by email
    let user = await prisma.user.findFirst({
      where: { email: { equals: trimmed, mode: 'insensitive' } },
      select: { id: true, email: true, phone: true, name: true }
    })

    // If not found by email, try phone
    if (!user) {
      const phoneVariants = getAllPhoneVariants(trimmed)
      user = await prisma.user.findFirst({
        where: { phone: { in: phoneVariants } },
        select: { id: true, email: true, phone: true, name: true }
      })
    }

    if (!user) {
      return NextResponse.json({ found: false })
    }

    function maskEmail(email: string): string {
      const [local, domain] = email.split('@')
      if (!domain) return email
      const visible = local.slice(0, Math.min(3, local.length))
      return `${visible}***@${domain}`
    }

    return NextResponse.json({
      found: true,
      id: user.id,
      email: maskEmail(user.email),
      phone: maskPhone(user.phone || ''),
    })
  } catch (error: any) {
    console.error("Check user error:", error)
    return NextResponse.json({ error: "Lỗi khi kiểm tra thông tin" }, { status: 500 })
  }
}
