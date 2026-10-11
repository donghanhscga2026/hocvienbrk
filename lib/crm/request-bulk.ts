import { z } from 'zod'
import type { PrismaClient } from '@prisma/client'
import { requestScope, updateRequest } from './requests'
import { contactScope, type CrmActor } from './shared'
import { topicScope } from './request-workflow'
import { CrmError } from './service'

export const bulkFilters = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED']).optional(),
  topic: z.enum(['PARTNER', 'LEARNING', 'CONSULTATION', 'SUPPORT', 'FEEDBACK', 'ACCOUNT']).optional(),
  owner: z.union([z.literal('unassigned'), z.number().int().nonnegative()]).optional(),
  contactId: z.number().int().positive().optional(), request: z.uuid().optional(),
}).strict()
const item = z.object({ id: z.uuid(), version: z.number().int().positive() }).strict()
export const bulkCommand = z.object({
  items: z.array(item).min(1).max(200), action: z.enum(['ASSIGN', 'PROCESS', 'RESOLVE']),
  ownerId: z.number().int().nonnegative().nullable().optional(), resolution: z.string().trim().max(4000).optional(),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.items.map(row => row.id)).size !== value.items.length) ctx.addIssue({ code: 'custom', message: 'Yêu cầu được chọn bị trùng.' })
  if (value.action === 'ASSIGN' && value.ownerId === undefined) ctx.addIssue({ code: 'custom', message: 'Chọn người phụ trách.' })
  if (value.action === 'RESOLVE' && !value.resolution) ctx.addIssue({ code: 'custom', message: 'Nhập kết quả xử lý trước khi hoàn tất.' })
  if (value.action !== 'ASSIGN' && value.ownerId !== undefined) ctx.addIssue({ code: 'custom', message: 'Dữ liệu phân công không phù hợp.' })
  if (value.action !== 'RESOLVE' && value.resolution !== undefined) ctx.addIssue({ code: 'custom', message: 'Ghi kết quả trong thao tác hoàn tất.' })
})
export async function bulkWhere(db: PrismaClient, actor: CrmActor, raw: unknown) {
  const filters = bulkFilters.parse(raw), scope = requestScope(actor)
  if (filters.contactId != null && !await db.crmContact.findFirst({ where: { id: filters.contactId, ...contactScope(actor) }, select: { id: true } })) throw new CrmError('Không có quyền xem hồ sơ.', 404)
  return { AND: [scope, ...(filters.topic ? [topicScope(filters.topic)] : [])],
    ...(filters.status ? { status: filters.status } : {}), ...(filters.request ? { id: filters.request } : {}),
    ...(filters.contactId != null ? { contactId: filters.contactId } : {}),
    ...(filters.owner !== undefined ? { ownerId: filters.owner === 'unassigned' ? null : filters.owner } : {}) }
}
export async function selectRequests(db: PrismaClient, actor: CrmActor, raw: unknown) {
  const where = await bulkWhere(db, actor, raw)
  // Snapshot the versions at selection time; never silently expand a later update.
  const items = await db.crmRequest.findMany({ where, select: { id: true, version: true }, orderBy: { id: 'asc' }, take: 201 })
  if (items.length > 200) throw new CrmError('Có hơn 200 yêu cầu. Hãy thu hẹp bộ lọc hoặc chọn từng trang.', 413)
  return { items }
}
export async function updateRequestsBulk(db: PrismaClient, actor: CrmActor, raw: unknown) {
  const input = bulkCommand.parse(raw)
  if (input.action === 'ASSIGN' && actor.role !== 'ADMIN') throw new CrmError('Chỉ quản trị viên được phân công yêu cầu chung.', 403)
  const results: { id: string; updated: boolean; error?: string }[] = []
  // Each item uses the existing transaction, source ownership and version checks.
  for (const row of input.items) {
    try {
      await updateRequest(db, actor, { ...row, action: 'UPDATE', ...(input.action === 'ASSIGN' ? { ownerId: input.ownerId } : input.action === 'PROCESS' ? { status: 'IN_PROGRESS' } : { status: 'RESOLVED', resolution: input.resolution }) })
      results.push({ id: row.id, updated: true })
    } catch (error) {
      if (error instanceof CrmError) results.push({ id: row.id, updated: false, error: error.message })
      else {
        console.error('[CRM bulk]', error instanceof Error ? error.name : 'Unknown error')
        results.push({ id: row.id, updated: false, error: 'Chưa cập nhật được. Hãy tải lại để kiểm tra.' })
        results.push(...input.items.slice(results.length).map(item => ({ id: item.id, updated: false, error: 'Chưa thực hiện do lỗi kết nối trước đó.' })))
        break
      }
    }
  }
  return { results, updated: results.filter(row => row.updated).length, failed: results.filter(row => !row.updated).length }
}
