import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { courseEditorActor } from '@/lib/course-page/permissions'
import { CrmError } from '@/lib/crm/service'

const noStore = { 'Cache-Control': 'private, no-store' }

// Số suất ưu đãi đầu tiên đã dùng của một sản phẩm/dịch vụ, cho khối quản trị hiển thị.
export async function GET(request: Request) {
  try {
    const actor = await courseEditorActor()
    const raw = new URL(request.url).searchParams.get('courseId') || ''
    if (!/^\d+$/.test(raw))
      return NextResponse.json({ error: 'Thiếu mã sản phẩm.' }, { status: 400, headers: noStore })
    const courseId = Number(raw)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    })
    if (!course)
      return NextResponse.json({ error: 'Không tìm thấy sản phẩm.' }, { status: 404, headers: noStore })
    if (actor.role !== 'ADMIN' && course.teacherId !== actor.id)
      return NextResponse.json(
        { error: 'Không có quyền xem sản phẩm này.' },
        { status: 403, headers: noStore },
      )
    const used = await prisma.enrollment.count({
      where: { courseId, status: { in: ['ACTIVE', 'COMPLETED'] } },
    })
    return NextResponse.json({ used }, { headers: noStore })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof CrmError ? error.message : 'Không tải được số suất đã dùng.' },
      { status: error instanceof CrmError ? error.status : 500, headers: noStore },
    )
  }
}
