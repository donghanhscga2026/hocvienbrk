import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { requireDomainModule } from "@/lib/website/domain-context"
import { canRerunCommissions } from "@/lib/affiliate/config-rules"
import { recalculateCourseCommissions } from "@/lib/affiliate/recalculate"

/**
 * Chạy lại hoa hồng cho toàn bộ giao dịch cũ của MỘT khóa học theo cấu
 * hình hiện tại (lib/affiliate/recalculate.ts).
 *
 * - POST { courseId, dryRun: true }  → xem trước chênh lệch (không ghi).
 * - POST { courseId, dryRun: false } → áp dụng (tạo/điều chỉnh/hủy dòng
 *   PENDING, cập nhật ví ghi nhận kèm log, ghi ActivityLog).
 * - Quyền: ADMIN mọi khóa; TEACHER chỉ khóa của mình và chỉ trong giai
 *   đoạn test (RERUN_TEACHER_ALLOWED ở config-rules.ts).
 */
export async function POST(request: NextRequest) {
  await requireDomainModule('affiliate')
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = Number(session.user.id)
  const role = session.user.role
  if (!canRerunCommissions(role)) {
    return NextResponse.json(
      { error: 'Bạn không có quyền chạy lại hoa hồng' },
      { status: 403 }
    )
  }

  let body: { courseId?: number; dryRun?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 })
  }
  const courseId = Number(body.courseId)
  if (!courseId) {
    return NextResponse.json({ error: 'Thiếu courseId' }, { status: 400 })
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, teacherId: true }
  })
  if (!course) {
    return NextResponse.json({ error: 'Không tìm thấy khóa học' }, { status: 404 })
  }
  if (role === 'TEACHER' && course.teacherId !== userId) {
    return NextResponse.json(
      { error: 'Bạn chỉ chạy lại được hoa hồng cho khóa học của mình' },
      { status: 403 }
    )
  }

  try {
    const report = await recalculateCourseCommissions({
      courseId,
      dryRun: body.dryRun !== false,
      actorId: userId
    })
    return NextResponse.json({ success: true, report })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Chạy lại hoa hồng thất bại' },
      { status: 500 }
    )
  }
}
