import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { bulkFilters, bulkWhere, selectRequests, updateRequestsBulk } from '@/lib/crm/request-bulk'
import { textWorkbook } from '@/lib/crm/xlsx'
import { formatCrmDate, REQUEST_STATUSES } from '@/lib/crm/shared'
import { REQUEST_TOPICS, requestTopic } from '@/lib/crm/request-workflow'
import { CrmError } from '@/lib/crm/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
const exportInput = z.object({ action: z.literal('EXPORT'), filters: bulkFilters.optional(), ids: z.array(z.uuid()).min(1).max(200).optional() }).strict()
export async function POST(request: Request) {
  try {
    const actor = await getCrmActor(), raw = await crmBody(request, 50000)
    if (raw.action === 'SELECT') {
      const input = z.object({ action: z.literal('SELECT'), filters: bulkFilters }).strict().parse(raw)
      return crmResponse(await selectRequests(prisma, actor, input.filters))
    }
    if (raw.action !== 'EXPORT') return crmResponse(await updateRequestsBulk(prisma, actor, raw))
    const input = exportInput.parse(raw), where = await bulkWhere(prisma, actor, input.ids ? {} : input.filters || {})
    const rows = await prisma.crmRequest.findMany({ where: { ...where, ...(input.ids ? { id: { in: input.ids } } : {}) }, select: { id: true, name: true, email: true, phone: true, category: true, source: true, content: true, status: true, resolution: true, createdAt: true, ownerId: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50001 })
    if (rows.length > 50000) throw new CrmError('Có hơn 50.000 yêu cầu. Hãy thu hẹp bộ lọc trước khi xuất.', 413)
    const owners = await prisma.user.findMany({ where: { id: { in: [...new Set(rows.flatMap(row => row.ownerId == null ? [] : [row.ownerId]))] } }, select: { id: true, name: true } })
    const names = new Map(owners.map(row => [row.id, row.name]))
    const file = textWorkbook(['Mã yêu cầu', 'Người gửi', 'Email', 'Điện thoại', 'Chủ đề', 'Nguồn', 'Nội dung', 'Trạng thái', 'Phụ trách', 'Kết quả nội bộ', 'Ngày gửi'], rows.map(row => [row.id, row.name, row.email || '', row.phone || '', REQUEST_TOPICS[requestTopic(row)], row.source, row.content, REQUEST_STATUSES[row.status as keyof typeof REQUEST_STATUSES], row.ownerId == null ? 'Chưa phân công' : names.get(row.ownerId) || '#' + row.ownerId, row.resolution, formatCrmDate(row.createdAt)]))
    return new Response(new Uint8Array(file), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="crm-requests.xlsx"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) { return crmFailure(error) }
}
