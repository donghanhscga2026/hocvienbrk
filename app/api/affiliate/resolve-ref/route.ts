import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const refKey = searchParams.get('ref')

    if (!refKey) {
      return NextResponse.json({ error: "Missing ref parameter" }, { status: 400 })
    }

    // 1. Tìm trong AffiliateRef (custom aliases)
    const customRef = await prisma.affiliateRef.findUnique({
      where: { refKey: refKey.toLowerCase() },
      include: { user: { select: { id: true, name: true, email: true } } }
    })

    if (customRef) {
      return NextResponse.json({
        found: true,
        userId: customRef.userId,
        refKey: customRef.refKey,
        type: customRef.type,
        userName: customRef.user.name,
        userEmail: customRef.user.email,
      })
    }

    // 2. Thử parse as number (direct user ID)
    const numericId = parseInt(refKey, 10)
    if (!isNaN(numericId) && numericId > 0) {
      const userById = await prisma.user.findUnique({
        where: { id: numericId },
        select: { id: true, name: true, email: true }
      })

      if (userById) {
        return NextResponse.json({
          found: true,
          userId: numericId,
          refKey: refKey,
          type: "USER_ID",
          userName: userById.name,
          userEmail: userById.email,
        })
      }
    }

    // 3. Tìm trong User theo affiliateCode
    const userByCode = await prisma.user.findUnique({
      where: { affiliateCode: refKey.toUpperCase() },
      select: { id: true, name: true, email: true }
    })

    if (userByCode) {
      return NextResponse.json({
        found: true,
        userId: userByCode.id,
        refKey: refKey,
        type: "AFFILIATE_CODE",
        userName: userByCode.name,
        userEmail: userByCode.email,
      })
    }

    // 4. Không tìm thấy
    return NextResponse.json({
      found: false,
      error: "Ref not found",
      refKey: refKey,
    })

  } catch (error) {
    console.error("[ResolveRef] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}