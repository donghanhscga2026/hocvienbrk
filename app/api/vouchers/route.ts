import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = session.user.role as Role
    if (userRole !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const vouchers = await prisma.voucher.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ vouchers })
  } catch (error: any) {
    console.error('GET /api/vouchers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
