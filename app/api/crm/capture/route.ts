import prisma from '@/lib/prisma'
import { captureLead } from '@/lib/crm/intake'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    // Only use the platform's trusted header. Unknown proxies share a conservative bucket.
    const address = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'unknown'
    return crmResponse(await captureLead(prisma, await crmBody(request, 8000), address))
  } catch (error) { return crmFailure(error) }
}
