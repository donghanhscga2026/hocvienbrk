import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const links = await prisma.affiliateLink.findMany({
      orderBy: { id: 'desc' },
      take: 20,
      select: { id: true, userId: true, code: true, name: true, campaignId: true }
    })
    return NextResponse.json({ links })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}