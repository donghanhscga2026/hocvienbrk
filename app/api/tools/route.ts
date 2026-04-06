import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const tools = await prisma.tool.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ tools })
  } catch (error: any) {
    console.error('Tools API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
