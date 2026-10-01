// Safe to import from both client and server; no Prisma or authentication here.
import type { Prisma } from '@prisma/client'
export const CRM_STAGES = ['NEW', 'CONTACTING', 'QUALIFIED', 'PROPOSAL', 'PAYMENT_PENDING', 'WON', 'LOST'] as const
export type CrmStageValue = typeof CRM_STAGES[number]
export const STAGE_LABELS: Record<CrmStageValue, string> = {
  NEW: 'Mới tiếp nhận', CONTACTING: 'Đang liên hệ', QUALIFIED: 'Đã rõ nhu cầu',
  PROPOSAL: 'Đã tư vấn', PAYMENT_PENDING: 'Chờ thanh toán', WON: 'Thành công', LOST: 'Chưa thành công',
}
export const ACTIVITY_LABELS: Record<string, string> = {
  NOTE: 'Ghi chú', CALL: 'Gọi điện', ZALO: 'Zalo', EMAIL: 'Email', MEETING: 'Gặp trực tiếp',
  CREATED: 'Tạo hồ sơ', UPDATED: 'Cập nhật hồ sơ', OPPORTUNITY: 'Cơ hội tư vấn', TASK: 'Công việc',
  IMPORT: 'Nhập dữ liệu', LINK: 'Liên kết tài khoản', FORM: 'Đăng ký qua form',
  AUTOMATION: 'CRM tự động', CONSENT: 'Quyền nhận email',
}
export const CRM_ROLES = ['ADMIN', 'TEACHER', 'INSTRUCTOR'] as const
export type CrmActor = { id: number; role: string; name: string }
export function canUseCrm(role: string) { return CRM_ROLES.some(value => value === role) }
export function canAccessContact(actor: CrmActor, ownerId: number | null) {
  return canUseCrm(actor.role) && (actor.role === 'ADMIN' || ownerId === actor.id)
}
// Always constrain queries on the server, including dashboards and nested records.
export function contactScope(actor: CrmActor): Prisma.CrmContactWhereInput {
  // Hồ sơ học viên chỉ còn được xem khi giáo viên vẫn phụ trách khóa đã đăng ký.
  return actor.role === 'ADMIN' ? {} : { ownerId: actor.id, OR: [
    { studentProfile: false },
    { studentProfile: true, studentUser: { enrollments: { some: { course: { teacherId: actor.id } } } } },
  ] }
}
export function isOpenStage(stage: string) { return stage !== 'WON' && stage !== 'LOST' }
export function formatCrmDate(value: string | Date) {
  return new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
// datetime-local inputs represent Vietnamese wall-clock time, independent of browser timezone.
export function vietnamInputToIso(value: string) {
  return new Date(value + ':00+07:00').toISOString()
}
export function vietnamDayBounds(now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now)
  const part = (type: string) => day.find(p => p.type === type)?.value
  const start = new Date(part('year') + '-' + part('month') + '-' + part('day') + 'T00:00:00+07:00')
  return { start, end: new Date(start.getTime() + 86400000) }
}
export type CrmOwner = { id: number; name: string | null; email: string }
export type CrmTaskView = { id: number; contactId: number; title: string; dueAt: string; completedAt: string | null }
export type CrmOpportunityView = { id: number; title: string; stage: CrmStageValue; amount: number; lostReason: string; version: number; courseId?: number | null }
export type CrmContactView = {
  studentProfile?: boolean;
  id: number; name: string; email: string | null; phone: string | null; source: string; needs: string;
  tags: string[]; ownerId: number | null; owner: CrmOwner | null; archived: boolean; version: number;
  lastContactAt: string | null; updatedAt: string; opportunities: CrmOpportunityView[]; tasks: CrmTaskView[];
}
export type CrmDetail = CrmContactView & { activities: { id: number; type: string; content: string; authorName: string; createdAt: string }[]; activityTotal: number }
