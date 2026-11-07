import prisma from '@/lib/prisma'
import type { CrmActor } from '@/lib/crm/shared'
import { CrmError } from '@/lib/crm/service'
import { careScopeCourseIds } from './queue'
import { followUpDueAt } from './followups'
import { getTemplateForSend } from './templates-store'

/**
 * Care Engine GĐ2 — tầng dữ liệu của hẹn giờ theo dõi (Prisma).
 * Phạm vi: admin thấy tất cả; giảng viên thấy hẹn thuộc khóa mình dạy
 * hoặc do chính mình đặt. Logic tự hủy thuần ở lib/care/followups.ts,
 * xử lý tới hạn ở lib/care/followup-runner.ts.
 */

export interface CareFollowUpDto {
  id: number
  studentId: number
  studentName: string
  courseId: number | null
  courseName: string | null
  ruleId: string | null
  templateId: number | null
  templateName: string | null
  note: string | null
  dueAt: string
  status: string
  createdById: number
  createdByName: string
  sentAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  createdAt: string
  canCancel: boolean
}

const followUpInclude = {
  student: { select: { name: true } },
  course: { select: { name_khoa: true, name_lop: true } },
  template: { select: { name: true } },
  createdBy: { select: { name: true } },
} as const

type FollowUpRow = {
  id: number; studentId: number; courseId: number | null; ruleId: string | null
  templateId: number | null; note: string | null; dueAt: Date; status: string
  createdById: number; sentAt: Date | null; cancelledAt: Date | null
  cancelReason: string | null; createdAt: Date
  student: { name: string | null } | null
  course: { name_khoa: string | null; name_lop: string | null } | null
  template: { name: string } | null
  createdBy: { name: string | null } | null
}

function canManage(actor: CrmActor, courseIds: number[] | null, row: { createdById: number; courseId: number | null }): boolean {
  if (actor.role === 'ADMIN') return true
  if (row.createdById === actor.id) return true
  return row.courseId != null && courseIds != null && courseIds.includes(row.courseId)
}

function toDto(actor: CrmActor, courseIds: number[] | null, f: FollowUpRow): CareFollowUpDto {
  return {
    id: f.id,
    studentId: f.studentId,
    studentName: f.student?.name || `Học viên #${f.studentId}`,
    courseId: f.courseId,
    courseName: f.course ? (f.course.name_khoa || f.course.name_lop) : null,
    ruleId: f.ruleId,
    templateId: f.templateId,
    templateName: f.template?.name || null,
    note: f.note,
    dueAt: f.dueAt.toISOString(),
    status: f.status,
    createdById: f.createdById,
    createdByName: f.createdBy?.name || `Thành viên #${f.createdById}`,
    sentAt: f.sentAt?.toISOString() ?? null,
    cancelledAt: f.cancelledAt?.toISOString() ?? null,
    cancelReason: f.cancelReason,
    createdAt: f.createdAt.toISOString(),
    canCancel: f.status === 'PENDING' && canManage(actor, courseIds, f),
  }
}

export async function listFollowUps(actor: CrmActor): Promise<CareFollowUpDto[]> {
  const courseIds = await careScopeCourseIds(actor)
  const rows = await prisma.careFollowUp.findMany({
    where: courseIds ? { OR: [{ courseId: { in: courseIds } }, { createdById: actor.id }] } : undefined,
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
    take: 150,
    include: followUpInclude,
  })
  // PENDING lên đầu theo hạn gần nhất; các trạng thái đã chốt xếp theo thời gian chốt mới nhất.
  const pending = rows.filter((r) => r.status === 'PENDING')
  const done = rows.filter((r) => r.status !== 'PENDING')
    .sort((a, b) => (b.sentAt ?? b.cancelledAt ?? b.createdAt).getTime() - (a.sentAt ?? a.cancelledAt ?? a.createdAt).getTime())
  return [...pending, ...done].slice(0, 150).map((r) => toDto(actor, courseIds, r as FollowUpRow))
}

export interface CreateFollowUpInput {
  studentId: number
  courseId: number | null
  ruleId: string | null
  templateId: number | null
  note: string | null
  days: number
}

export async function createFollowUp(actor: CrmActor, input: CreateFollowUpInput): Promise<CareFollowUpDto> {
  const courseIds = await careScopeCourseIds(actor)
  if (input.courseId != null && courseIds && !courseIds.includes(input.courseId)) {
    throw new CrmError('Khóa học không thuộc phạm vi phụ trách của bạn.', 403)
  }
  const student = await prisma.user.findUnique({ where: { id: input.studentId }, select: { id: true } })
  if (!student) throw new CrmError('Không tìm thấy học viên.', 404)
  if (input.courseId != null) {
    // Hẹn phải gắn với 1 ghi danh thật của học viên trong khóa (tránh hẹn nhầm người).
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: input.studentId, courseId: input.courseId },
      select: { id: true },
    })
    if (!enrollment) throw new CrmError('Học viên chưa ghi danh khóa này.', 400)
  }
  if (input.templateId != null) {
    const template = await getTemplateForSend(actor, input.templateId)
    if (template.scope === 'COURSE' && template.courseId !== input.courseId) {
      throw new CrmError('Câu mẫu theo khóa chỉ dùng được cho đúng khóa của mẫu.', 400)
    }
  }
  const created = await prisma.careFollowUp.create({
    data: {
      studentId: input.studentId,
      courseId: input.courseId,
      ruleId: input.ruleId,
      templateId: input.templateId,
      note: input.note,
      dueAt: followUpDueAt(new Date(), input.days),
      createdById: actor.id,
    },
    include: followUpInclude,
  })
  return toDto(actor, courseIds, created as FollowUpRow)
}

/** Hủy tay 1 hẹn đang chờ — người đặt, GV của khóa, hoặc admin. */
export async function cancelFollowUp(actor: CrmActor, id: number): Promise<CareFollowUpDto> {
  const courseIds = await careScopeCourseIds(actor)
  const existing = await prisma.careFollowUp.findUnique({ where: { id }, include: followUpInclude })
  if (!existing) throw new CrmError('Không tìm thấy hẹn theo dõi.', 404)
  if (existing.status !== 'PENDING') throw new CrmError('Hẹn này đã được xử lý xong, không hủy được nữa.', 409)
  if (!canManage(actor, courseIds, existing)) throw new CrmError('Bạn không có quyền hủy hẹn này.', 403)
  const updated = await prisma.careFollowUp.update({
    where: { id },
    data: { status: 'CANCELLED_MANUAL', cancelledAt: new Date(), cancelReason: `Hủy tay bởi ${actor.name}` },
    include: followUpInclude,
  })
  return toDto(actor, courseIds, updated as FollowUpRow)
}
