import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const steps = await prisma.accountAssistantStep.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        stepKey: true,
        question: true,
        agentVideoUrl: true,
        guideVideoUrl: true,
        guideTitle: true,
        options: true,
        order: true,
      },
    })

    return NextResponse.json({ steps })
  } catch (error: any) {
    console.error("Error fetching assistant steps:", error)
    return NextResponse.json({ error: "Lỗi khi tải dữ liệu" }, { status: 500 })
  }
}
