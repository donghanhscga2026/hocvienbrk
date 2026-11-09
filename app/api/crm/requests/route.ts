import { z } from 'zod'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { createRequest, readRequests, requestSource, requestProfile, updateRequest } from '@/lib/crm/requests'
import { sendRequestReplyEmail } from '@/lib/crm/reply-email'
import { getCurrentSiteProfile } from '@/lib/site-profile/runtime'
import { requireDomainCourse, requireDomainModule } from '@/lib/website/domain-context'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const actor = await getCrmActor()
    const params = new URL(request.url).searchParams
    if (params.has('profileId')) return crmResponse(await requestProfile(prisma, actor, z.uuid().parse(params.get('profileId'))))
    if (params.has('sourceId')) return crmResponse(await requestSource(prisma, actor, z.uuid().parse(params.get('sourceId'))))
    const q = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), topic: z.enum(['PARTNER','LEARNING','CONSULTATION','SUPPORT','FEEDBACK','ACCOUNT']).optional(), owner: z.union([z.literal('unassigned'), z.coerce.number().int().nonnegative()]).optional(), status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED']).optional(), request: z.uuid().optional(), contactId: z.coerce.number().int().positive().optional() }).strict().parse(Object.fromEntries(new URL(request.url).searchParams))
    return crmResponse(await readRequests(prisma, actor, q.page, q.status, q.contactId, q.request, q.topic, q.owner === 'unassigned' ? null : q.owner))
  } catch (e) { return crmFailure(e) }
}
export async function POST(request: Request) {
  try {
    const raw = await crmBody(request, 20000)
    const domain=await requireDomainModule('crm')
    if(domain && raw?.courseId !== undefined) { if(typeof raw.courseId!=='number') return crmResponse({error:'Chọn khóa học của website.'},400); await requireDomainCourse(raw.courseId) }
    const session = await auth()
    const userId = session?.user?.id == null ? null : Number(session.user.id)
    const result = await createRequest(prisma, raw, userId != null && Number.isInteger(userId) && userId >= 0 ? userId : null, request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown', domain && domain.profile.userId != null ? { ownerId: domain.profile.userId, source: 'Website: ' + domain.hostname } : undefined, !!await getCurrentDeploymentBrand())
    return crmResponse(result, 201)
  } catch (e) { return crmFailure(e) }
}
export async function PATCH(request: Request) {
  try {
    const raw = await crmBody(request, 20000)
    const result = await updateRequest(prisma, await getCrmActor(), raw)
    // Sau khi phản hồi đã lưu: gửi email cho khách (kể cả khách chưa có tài
    // khoản, dùng email họ để lại). Lỗi gửi email không làm hỏng phản hồi.
    if (raw?.action === 'SEND_REPLY' && typeof raw?.publicReply === 'string' && raw.publicReply.trim()) {
      try {
        const row = await prisma.crmRequest.findUnique({ where: { id: raw.id }, select: { email: true, name: true, content: true, userId: true } })
        if (row?.email?.trim()) {
          const brand = await getCurrentDeploymentBrand()
          const profile = brand ? null : await getCurrentSiteProfile()
          const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
          await sendRequestReplyEmail({
            to: row.email.trim(),
            name: row.name || '',
            reply: raw.publicReply,
            requestContent: row.content || '',
            siteName: brand?.name || profile?.title || 'Wi300',
            myRequestsUrl: row.userId != null && host ? 'https://' + host + '/my-requests?request=' + raw.id : '',
          })
        }
      } catch (error) { console.error('Gửi email phản hồi hỗ trợ thất bại', error) }
    }
    return crmResponse(result)
  }
  catch (e) { return crmFailure(e) }
}
