import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireOfferingWorkspace, WorkspaceError } from '@/lib/offerings/workspace'
import { courseEditorActor } from '@/lib/course-page/permissions'
import { readOfferingDetails } from '@/lib/offerings/server'
import { effectiveService } from '@/lib/offerings/service'
import { intakeKey, intakeStateSchema } from '@/lib/offerings/intake'
import { CrmError } from '@/lib/crm/service'
const headers = { 'Cache-Control': 'private, no-store' }
function fail(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Không xử lý được hồ sơ.' },
    { status: error instanceof CrmError || error instanceof WorkspaceError ? error.status : 400, headers },
  )
}
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const raw = new URL(request.url).searchParams.get('userId')
    let courseId: number, userId: number, questions
    if (raw !== null) {
      const actor = await courseEditorActor()
      const course = await prisma.course.findUnique({
        where: { id_khoa: slug },
        select: { id: true, teacherId: true, productGroup: true },
      })
      if (
        !course ||
        course.productGroup !== 'SERVICE' ||
        (actor.role !== 'ADMIN' && course.teacherId !== actor.id)
      )
        throw new CrmError('Không có quyền xem hồ sơ.', 403)
      courseId = course.id
      userId = z.coerce.number().int().min(0).parse(raw)
      questions = effectiveService(await readOfferingDetails(courseId)).questions
    } else {
      const context = await requireOfferingWorkspace(slug, 'SERVICE')
      courseId = context.course.id
      userId = context.userId
      questions = effectiveService(context.details).questions
    }
    const row = await prisma.systemConfig.findUnique({ where: { key: intakeKey(courseId, userId) } })
    return NextResponse.json({ questions, state: intakeStateSchema.parse(row?.value || {}) }, { headers })
  } catch (error) {
    return fail(error)
  }
}
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new CrmError('Nguồn yêu cầu không hợp lệ.', 403)
    const { course, userId } = await requireOfferingWorkspace((await params).slug, 'SERVICE')
    const text = await request.text()
    if (text.length > 50000) throw new CrmError('Hồ sơ quá dài.', 413)
    const input = z
      .object({
        version: z.number().int().min(0),
        answers: z.record(z.string().max(80), z.string().trim().max(2000)),
      })
      .strict()
      .parse(JSON.parse(text))
    const key = intakeKey(course.id, userId)
    const state = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
      const enrollment = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
        select: { status: true },
      })
      if (!enrollment || !['ACTIVE', 'COMPLETED'].includes(enrollment.status))
        throw new CrmError('Quyền dịch vụ đã thay đổi.', 403)
      const config = effectiveService(await readOfferingDetails(course.id, tx))
      const answers = config.questions.map((q) => {
        const value = input.answers[q.id] || ''
        if (q.required && !value) throw new CrmError(`Vui lòng điền: ${q.label}`, 400)
        if (value && q.type === 'SELECT' && !q.options.includes(value))
          throw new CrmError(`Lựa chọn không hợp lệ: ${q.label}`, 400)
        if (value && q.type === 'LINK') {
          let valid = false
          try {
            valid = new URL(value).protocol === 'https:'
          } catch {}
          if (!valid) throw new CrmError(`Dùng link HTTPS cho: ${q.label}`, 400)
        }
        return { id: q.id, label: q.label, value }
      })
      const old = await tx.systemConfig.findUnique({ where: { key } })
      const previous = intakeStateSchema.parse(old?.value || {})
      if (previous.version !== input.version)
        throw new CrmError('Hồ sơ đã thay đổi. Tải lại trước khi lưu.', 409)
      const value = { version: previous.version + 1, submittedAt: new Date().toISOString(), answers }
      await tx.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
      return value
    })
    return NextResponse.json({ state }, { headers })
  } catch (error) {
    return fail(error)
  }
}
