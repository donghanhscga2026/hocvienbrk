import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { createPartnerRequest, readPartnerRequests } from '@/lib/wi300/partner-requests'
import { z } from 'zod'

async function actor() {
  if (!await getCurrentDeploymentBrand()) throw new CrmError('Không tìm thấy trang.', 404)
  const session = await auth()
  const id = session?.user?.id == null ? NaN : Number(session.user.id)
  if (!Number.isSafeInteger(id) || id < 0) throw new CrmError('Vui lòng đăng nhập để gửi và xem yêu cầu.', 401)
  return id
}
export async function GET(request: Request) {
  try {
    const userId = await actor()
    const page = z.coerce.number().int().min(1).max(10000).parse(new URL(request.url).searchParams.get('page') || 1)
    return crmResponse(await readPartnerRequests(prisma, userId, page))
  } catch (error) { return crmFailure(error) }
}
export async function POST(request: Request) {
  try {
    const userId = await actor()
    const input = await crmBody(request, 16000)
    return crmResponse(await createPartnerRequest(prisma, input, userId, request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'), 201)
  } catch (error) { return crmFailure(error) }
}
