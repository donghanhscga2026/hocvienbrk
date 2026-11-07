import prisma from '@/lib/prisma'
import type { CrmActor } from '@/lib/crm/shared'
import { CrmError } from '@/lib/crm/service'
import {
  DEFAULT_CARE_TEMPLATES, canCreateTemplate, canEditTemplate, canViewTemplate,
  normalizeShortcut, validateShortcut, validateTemplateBody,
  type CareActorLike, type CareTemplateScope,
} from './templates-lib'

/**
 * Care Engine GĐ2 — tầng dữ liệu của thư viện câu mẫu (Prisma).
 * Mọi kiểm tra quyền/phạm vi nằm ở đây để các route API dùng chung;
 * logic thuần (render/validate/quyền) ở templates-lib.ts.
 */

export async function careActorContext(actor: CrmActor): Promise<CareActorLike> {
  const isAdmin = actor.role === 'ADMIN'
  if (isAdmin) return { id: actor.id, isAdmin, role: actor.role, courseIds: [] }
  const courses = await prisma.course.findMany({ where: { teacherId: actor.id }, select: { id: true } })
  return { id: actor.id, isAdmin, role: actor.role, courseIds: courses.map((c) => c.id) }
}

export interface CareTemplateDto {
  id: number
  shortcut: string
  name: string
  body: string
  scope: CareTemplateScope
  courseId: number | null
  courseName: string | null
  ownerId: number
  ownerName: string
  usedCount: number
  isActive: boolean
  canEdit: boolean
  updatedAt: string
}

type TemplateRow = {
  id: number; shortcut: string; name: string; body: string; scope: CareTemplateScope
  courseId: number | null; ownerId: number; usedCount: number; isActive: boolean; updatedAt: Date
  course: { name_khoa: string | null; name_lop: string | null } | null
  owner: { name: string | null } | null
}

function toDto(ctx: CareActorLike, t: TemplateRow): CareTemplateDto {
  return {
    id: t.id, shortcut: t.shortcut, name: t.name, body: t.body, scope: t.scope,
    courseId: t.courseId,
    courseName: t.course ? (t.course.name_khoa || t.course.name_lop) : null,
    ownerId: t.ownerId, ownerName: t.owner?.name || `Thành viên #${t.ownerId}`,
    usedCount: t.usedCount, isActive: t.isActive,
    canEdit: canEditTemplate(ctx, t),
    updatedAt: t.updatedAt.toISOString(),
  }
}

const templateInclude = {
  course: { select: { name_khoa: true, name_lop: true } },
  owner: { select: { name: true } },
} as const

/**
 * Nạp 6 mẫu mặc định (phạm vi SYSTEM) khi thư viện chưa có mẫu hệ thống
 * nào — idempotent, chạy lười ở lần đọc đầu tiên. Chủ sở hữu là tài khoản
 * quản trị đầu tiên của hệ thống (không hardcode id); chưa có quản trị
 * thì bỏ qua, lần đọc sau sẽ thử lại.
 */
export async function ensureDefaultCareTemplates(): Promise<void> {
  const existing = await prisma.careTemplate.count({ where: { scope: 'SYSTEM' } })
  if (existing > 0) return
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { id: 'asc' }, select: { id: true } })
  if (!admin) return
  await prisma.careTemplate.createMany({
    data: DEFAULT_CARE_TEMPLATES.map((t) => ({ ...t, scope: 'SYSTEM' as const, ownerId: admin.id })),
    skipDuplicates: true,
  })
}

export async function listVisibleTemplates(
  actor: CrmActor,
  filters: { q?: string; scope?: CareTemplateScope | null; courseId?: number | null; includeInactive?: boolean },
): Promise<{ ctx: CareActorLike; templates: CareTemplateDto[] }> {
  await ensureDefaultCareTemplates()
  const ctx = await careActorContext(actor)
  const rows = await prisma.careTemplate.findMany({
    where: {
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.scope ? { scope: filters.scope } : {}),
      ...(filters.courseId != null ? { courseId: filters.courseId } : {}),
    },
    orderBy: [{ scope: 'asc' }, { usedCount: 'desc' }, { name: 'asc' }],
    take: 300,
    include: templateInclude,
  })
  const q = (filters.q || '').trim().toLowerCase()
  const visible = rows
    .filter((t) => canViewTemplate(ctx, t))
    .filter((t) => !q || t.name.toLowerCase().includes(q) || t.shortcut.includes(q) || t.body.toLowerCase().includes(q))
  return { ctx, templates: visible.map((t) => toDto(ctx, t as TemplateRow)) }
}

/** Shortcut là duy nhất trong cùng phạm vi (chỉ tính mẫu đang bật). */
async function assertShortcutUnique(input: { scope: CareTemplateScope; courseId: number | null; ownerId: number; shortcut: string; excludeId?: number }): Promise<void> {
  const clash = await prisma.careTemplate.findFirst({
    where: {
      shortcut: input.shortcut, scope: input.scope, isActive: true,
      ...(input.scope === 'COURSE' ? { courseId: input.courseId } : {}),
      ...(input.scope === 'PERSONAL' ? { ownerId: input.ownerId } : {}),
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
    select: { id: true },
  })
  if (clash) throw new CrmError(`Phím tắt ${input.shortcut} đã được dùng trong phạm vi này. Hãy chọn phím tắt khác.`, 409)
}

export interface CareTemplateInput {
  shortcut: string
  name: string
  body: string
  scope: CareTemplateScope
  courseId: number | null
}

function validateInput(input: CareTemplateInput): { shortcut: string; name: string; body: string } {
  const shortcutError = validateShortcut(input.shortcut)
  if (shortcutError) throw new CrmError(shortcutError, 400)
  const name = input.name.trim()
  if (name.length < 3 || name.length > 120) throw new CrmError('Tên câu mẫu phải từ 3 đến 120 ký tự.', 400)
  const bodyError = validateTemplateBody(input.body)
  if (bodyError) throw new CrmError(bodyError, 400)
  if (input.scope === 'COURSE' && input.courseId == null) throw new CrmError('Câu mẫu theo khóa cần chọn khóa học.', 400)
  if (input.scope !== 'COURSE' && input.courseId != null) throw new CrmError('Chỉ câu mẫu theo khóa mới gắn khóa học.', 400)
  return { shortcut: normalizeShortcut(input.shortcut), name, body: input.body.trim() }
}

export async function createCareTemplate(actor: CrmActor, input: CareTemplateInput): Promise<CareTemplateDto> {
  const ctx = await careActorContext(actor)
  if (!canCreateTemplate(ctx, input.scope, input.courseId)) {
    throw new CrmError('Bạn không có quyền tạo câu mẫu ở phạm vi này.', 403)
  }
  const valid = validateInput(input)
  await assertShortcutUnique({ scope: input.scope, courseId: input.courseId, ownerId: actor.id, shortcut: valid.shortcut })
  const created = await prisma.careTemplate.create({
    data: { ...valid, scope: input.scope, courseId: input.courseId, ownerId: actor.id },
    include: templateInclude,
  })
  return toDto(ctx, created as TemplateRow)
}

export async function updateCareTemplate(actor: CrmActor, id: number, patch: Partial<CareTemplateInput> & { isActive?: boolean }): Promise<CareTemplateDto> {
  const ctx = await careActorContext(actor)
  const existing = await prisma.careTemplate.findUnique({ where: { id }, include: templateInclude })
  if (!existing) throw new CrmError('Không tìm thấy câu mẫu.', 404)
  if (!canEditTemplate(ctx, existing)) throw new CrmError('Bạn không có quyền sửa câu mẫu này.', 403)
  const next: CareTemplateInput = {
    shortcut: patch.shortcut ?? existing.shortcut,
    name: patch.name ?? existing.name,
    body: patch.body ?? existing.body,
    scope: patch.scope ?? existing.scope,
    courseId: patch.courseId !== undefined ? patch.courseId : existing.courseId,
  }
  // Đổi phạm vi/khóa tương đương tạo mới ở phạm vi đó — phải có quyền tương ứng.
  if ((next.scope !== existing.scope || next.courseId !== existing.courseId) && !canCreateTemplate(ctx, next.scope, next.courseId)) {
    throw new CrmError('Bạn không có quyền chuyển câu mẫu sang phạm vi này.', 403)
  }
  const valid = validateInput(next)
  await assertShortcutUnique({ scope: next.scope, courseId: next.courseId, ownerId: existing.ownerId, shortcut: valid.shortcut, excludeId: id })
  const updated = await prisma.careTemplate.update({
    where: { id },
    data: {
      ...valid, scope: next.scope, courseId: next.courseId,
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    },
    include: templateInclude,
  })
  return toDto(ctx, updated as TemplateRow)
}

/** Xóa mềm: tắt mẫu (giữ lịch sử hẹn giờ đã gắn mẫu), không xóa hẳn dòng. */
export async function deactivateCareTemplate(actor: CrmActor, id: number): Promise<CareTemplateDto> {
  return updateCareTemplate(actor, id, { isActive: false })
}

/** Lấy 1 mẫu để render khi gửi nhắc — bắt buộc đang bật và actor nhìn thấy được. */
export async function getTemplateForSend(actor: CrmActor, id: number) {
  const ctx = await careActorContext(actor)
  const template = await prisma.careTemplate.findUnique({ where: { id } })
  if (!template || !template.isActive) throw new CrmError('Câu mẫu không còn khả dụng.', 400)
  if (!canViewTemplate(ctx, template)) throw new CrmError('Bạn không có quyền dùng câu mẫu này.', 403)
  return template
}

export async function bumpTemplateUsedCount(id: number): Promise<void> {
  await prisma.careTemplate.update({ where: { id }, data: { usedCount: { increment: 1 } } }).catch(() => undefined)
}
