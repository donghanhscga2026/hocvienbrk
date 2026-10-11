import prisma from '@/lib/prisma'
import { createAccountSupport } from '@/lib/crm/account-support'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'

export async function POST(request: Request) {
  try {
    const address = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'unknown'
    return crmResponse(await createAccountSupport(prisma, await crmBody(request, 12000), address), 201)
  } catch (error) { return crmFailure(error) }
}
