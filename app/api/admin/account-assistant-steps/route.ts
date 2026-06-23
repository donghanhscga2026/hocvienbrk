import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
  }

  try {
    const steps = await prisma.accountAssistantStep.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ steps })
  } catch (error: any) {
    console.error("Error fetching all assistant steps:", error)
    return NextResponse.json({ error: "Lỗi khi tải dữ liệu" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, stepKey, question, agentVideoUrl, guideVideoUrl, guideTitle, options, order, isActive } = body

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID" }, { status: 400 })
    }

    const updated = await prisma.accountAssistantStep.update({
      where: { id },
      data: {
        ...(stepKey !== undefined && { stepKey }),
        ...(question !== undefined && { question }),
        ...(agentVideoUrl !== undefined && { agentVideoUrl }),
        ...(guideVideoUrl !== undefined && { guideVideoUrl }),
        ...(guideTitle !== undefined && { guideTitle }),
        ...(options !== undefined && { options }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ success: true, step: updated })
  } catch (error: any) {
    console.error("Error updating assistant step:", error)
    return NextResponse.json({ error: "Lỗi khi cập nhật" }, { status: 500 })
  }
}
