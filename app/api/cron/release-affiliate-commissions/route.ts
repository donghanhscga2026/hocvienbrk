import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { CommissionStatus } from "@prisma/client"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()

    const result = await prisma.affiliateCommission.updateMany({
      where: {
        status: CommissionStatus.PENDING,
        availableAt: { lte: now },
      },
      data: {
        status: CommissionStatus.AVAILABLE,
      },
    })

    return NextResponse.json({
      success: true,
      released: result.count,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("[Cron] Release commissions error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
