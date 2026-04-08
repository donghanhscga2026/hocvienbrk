import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const campaigns = await prisma.affiliateCampaign.findMany({
      select: { id: true, name: true, slug: true, isDefault: true, isActive: true }
    })
    return NextResponse.json({ campaigns })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}