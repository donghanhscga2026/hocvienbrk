import prisma from '@/lib/prisma'
import { isAuthorizedRequest } from '@/lib/request-auth'
import { crmFailure, crmResponse } from '@/lib/crm/http'
import { runAutomation } from '@/lib/crm/phase-three'
import { syncStudents } from '@/lib/crm/students'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function GET(request: Request) {
  // Chỉ secret trong header; không nhận secret trong URL hoặc header webhook tự khai.
  if (!isAuthorizedRequest(request, { secretEnv: 'CRON_SECRET', allowQuerySecret: false, allowedHeaderNames: [] }).isAuthorized) return crmResponse({ error: 'Unauthorized' }, 401)
  try {
    const execute = new URL(request.url).searchParams.get('execute') === '1'
    const students = await syncStudents(prisma, { id: -1, role: 'ADMIN', name: 'CRM tự động' }, execute)
    return crmResponse({ ...await runAutomation(prisma, execute), students })
  }
  catch (error) { return crmFailure(error) }
}
