import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { crmFailure, crmResponse } from '@/lib/crm/http'
import { partnerQuery, readCrmPartners, PARTNER_KINDS } from '@/lib/crm/partners'
import { PARTNER_OUTCOMES } from '@/lib/crm/request-workflow'
import { REQUEST_STATUSES, formatCrmDate } from '@/lib/crm/shared'
import { textWorkbook } from '@/lib/crm/xlsx'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const actor = await getCrmActor()
    const query = partnerQuery.parse(Object.fromEntries(new URL(request.url).searchParams))
    const result = await readCrmPartners(prisma, actor, query)
    if (!query.export) return crmResponse(result)
    const ids = [...new Set(result.partners.map(row => row.ownerId).filter((id): id is number => id != null))]
    const owners = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    const names = new Map(owners.map(row => [row.id, row.name]))
    const file = textWorkbook(['Mã yêu cầu', 'Nhóm đối tác', 'Doanh nghiệp', 'Người gửi', 'Mã tài khoản', 'Điện thoại', 'Email', 'Chuyên môn', 'Đề xuất hợp tác', 'Hồ sơ tham khảo', 'Trạng thái', 'Kết quả đánh giá', 'Người phụ trách', 'Kết quả xử lý nội bộ', 'Ngày gửi', 'Cập nhật', 'Thông tin gốc'], result.partners.map(row => [row.id, PARTNER_KINDS[row.partner.kind], row.partner.organization, row.name, row.userId == null ? '' : String(row.userId), row.phone || '', row.email || '', row.partner.expertise, row.partner.proposal, row.partner.portfolio, REQUEST_STATUSES[row.status as keyof typeof REQUEST_STATUSES] || row.status, PARTNER_OUTCOMES[row.outcome], row.ownerId == null ? 'Chưa phân công' : names.get(row.ownerId) || '#' + row.ownerId, row.resolution, formatCrmDate(row.createdAt), formatCrmDate(row.updatedAt), row.content]))
    return new Response(new Uint8Array(file), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="wi300-partners.xlsx"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) { return crmFailure(error) }
}
