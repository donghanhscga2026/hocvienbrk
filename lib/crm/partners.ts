import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { CrmError } from './service'
import { requestScope } from './requests'
import type { CrmActor } from './shared'
import { PARTNER_SOURCE, partnerOutcome } from './request-workflow'

export const PARTNER_KINDS = { BUSINESS: 'Doanh nghiệp', TEACHER: 'Giảng viên', BOTH: 'Đăng ký cả hai', UNKNOWN: 'Cần xác minh' } as const
export const partnerQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  kind: z.enum(['BUSINESS', 'TEACHER', 'BOTH', 'UNKNOWN']).optional(),
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED']).optional(),
  outcome: z.enum(['PENDING', 'MORE_INFO', 'ACCEPTED', 'DECLINED']).optional(),
  owner: z.union([z.literal('unassigned'), z.coerce.number().int().nonnegative()]).optional(),
  q: z.string().trim().max(150).default(''),
  export: z.literal('xlsx').optional(),
}).strict()
import { partnerDetails } from './partner-details'
export { partnerDetails } from './partner-details'
export async function readCrmPartners(db: PrismaClient, actor: CrmActor, query: z.infer<typeof partnerQuery>) {
  // Apply authorization in DB before projecting, counting, filtering or exporting.
  const where = { AND: [requestScope(actor), { source: PARTNER_SOURCE }], ...(query.status ? { status: query.status } : {}), ...(query.owner !== undefined ? { ownerId: query.owner === 'unassigned' ? null : query.owner } : {}) }
  const stats = { new: 0, unassigned: 0, moreInfo: 0, accepted: 0 }
  const matches = []
  const search = query.q.toLocaleLowerCase('vi-VN')
  let cursor: string | undefined
  do {
    const rows = await db.crmRequest.findMany({ where, select: { id: true, name: true, userId: true, email: true, phone: true, content: true, status: true, resolution: true, history: true, ownerId: true, createdAt: true, updatedAt: true }, orderBy: { id: 'asc' }, take: 500, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) })
    for (const row of rows) {
      const partner = partnerDetails(row.content, row.history)
      const outcome = partnerOutcome(row.history)
      if (query.kind && partner.kind !== query.kind || query.outcome && outcome !== query.outcome || search && ![row.name, row.email, row.phone, partner.organization, row.content].some(value => value?.toLocaleLowerCase('vi-VN').includes(search))) continue
      const { history, ...safe } = row; void history
      matches.push({ ...safe, partner, outcome })
      if (row.status === 'NEW') stats.new++
      if (row.ownerId == null) stats.unassigned++
      if (outcome === 'MORE_INFO') stats.moreInfo++
      if (outcome === 'ACCEPTED') stats.accepted++
    }
    // Reject oversized exports explicitly; never deliver a silently truncated file.
    if (matches.length > 50000) throw new CrmError('Có hơn 50.000 hồ sơ phù hợp. Hãy lọc theo nhóm hoặc người phụ trách trước khi xuất.', 413)
    cursor = rows.length === 500 ? rows.at(-1)!.id : undefined
  } while (cursor)
  matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))
  return { partners: query.export ? matches : matches.slice((query.page - 1) * 20, query.page * 20), total: matches.length, stats }
}
