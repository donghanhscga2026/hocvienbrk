import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { courseEditorActor } from '@/lib/course-page/permissions'
import { deliveryKey } from '@/lib/offerings/workspace'
import { deliveryStateSchema } from '@/lib/offerings/shared'
import { CrmError } from '@/lib/crm/service'

const responseHeaders = { 'Cache-Control': 'private, no-store' }
async function target(slug: string) {
  const actor = await courseEditorActor()
  const course = await prisma.course.findUnique({
    where: { id_khoa: slug },
    select: { id: true, teacherId: true, productGroup: true },
  })
  if (!course || course.productGroup !== 'SERVICE' || (actor.role !== 'ADMIN' && actor.id !== course.teacherId))
    throw new CrmError('Không có quyền quản lý dịch vụ.', 403)
  return { actor, course }
}
function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof CrmError ? error.message : 'Không xử lý được yêu cầu. Kiểm tra dữ liệu và thử lại.' },
    { status: error instanceof CrmError ? error.status : 400, headers: responseHeaders },
  )
}
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { course } = await target((await params).slug)
    const rows = await prisma.enrollment.findMany({
      where: { courseId: course.id, status: 'ACTIVE' },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { userId: 'asc' },
    })
    const rawUserId = new URL(request.url).searchParams.get('userId')
    const userId = rawUserId == null ? null : z.coerce.number().int().min(0).parse(rawUserId)
    if (userId != null && !rows.some((row) => row.userId === userId))
      throw new CrmError('Khách chưa có quyền dịch vụ.', 404)
    const row =
      userId == null ? null : await prisma.systemConfig.findUnique({ where: { key: deliveryKey(course.id, userId) } })
    return NextResponse.json(
      {
        customers: rows.map((row) => ({ id: row.userId, name: row.user.name || `Khách #${row.userId}` })),
        state: deliveryStateSchema.parse(row?.value || {}),
      },
      { headers: responseHeaders },
    )
  } catch (error) {
    return failure(error)
  }
}
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new CrmError('Nguồn yêu cầu không hợp lệ.', 403)
    const { course, actor } = await target((await params).slug)
    const text = await request.text()
    if (text.length > 90000) throw new CrmError('Nội dung quá dài.', 413)
    const { userId, state } = z
      .object({ userId: z.number().int().min(0), state: deliveryStateSchema })
      .strict()
      .parse(JSON.parse(text))
    const key = deliveryKey(course.id, userId)
    const saved = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
      const freshCourse = await tx.course.findUnique({
        where: { id: course.id },
        select: { teacherId: true, productGroup: true },
      })
      if (
        !freshCourse ||
        freshCourse.productGroup !== 'SERVICE' ||
        (actor.role !== 'ADMIN' && freshCourse.teacherId !== actor.id)
      )
        throw new CrmError('Quyền quản lý đã thay đổi.', 403)
      const enrollment = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
        select: { status: true },
      })
      if (!enrollment || !['ACTIVE', 'COMPLETED'].includes(enrollment.status))
        throw new CrmError('Khách chưa có quyền dịch vụ.', 403)
      const old = await tx.systemConfig.findUnique({ where: { key } })
      const previous = deliveryStateSchema.parse(old?.value || {})
      if (previous.version !== state.version)
        throw new CrmError('Dữ liệu đã thay đổi. Tải lại trước khi sửa tiếp.', 409)
      const value = { ...state, version: state.version + 1, history: [...previous.history, { at: new Date().toISOString(), phase: state.phase, actorId: actor.id }].slice(-30) }
      await tx.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
      return value
    })
    return NextResponse.json({ state: saved }, { headers: responseHeaders })
  } catch (error) {
    return failure(error)
  }
}
