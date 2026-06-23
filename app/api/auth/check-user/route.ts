import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

function normalizePhoneForQuery(input: string): string[] {
  const cleaned = input.replace(/\s/g, '').replace(/^0/, '84')
  const variants: string[] = []
  if (cleaned.startsWith('+')) {
    variants.push(cleaned)
    variants.push(cleaned.slice(1))
  } else if (cleaned.startsWith('84')) {
    variants.push('+84' + cleaned.slice(2))
    variants.push(cleaned)
  } else {
    variants.push(cleaned)
    variants.push('+' + cleaned)
  }
  if (cleaned.startsWith('84')) {
    variants.push('0' + cleaned.slice(2))
  }
  return [...new Set(variants)]
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập email hoặc số điện thoại" }, { status: 400 })
    }

    const trimmed = query.trim()

    // Try to find by email
    let user = await prisma.user.findFirst({
      where: { email: { equals: trimmed, mode: 'insensitive' } },
      select: { id: true, email: true, phone: true, name: true }
    })

    // If not found by email, try phone
    if (!user) {
      const phoneVariants = normalizePhoneForQuery(trimmed)
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

    function maskPhone(phone: string): string {
      if (!phone) return ''
      const cleaned = phone.replace(/\s/g, '')
      if (cleaned.length <= 4) return cleaned
      return cleaned.slice(0, 4) + '***'
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
