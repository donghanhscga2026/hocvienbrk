import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { studentCommand, writeStudents } from '@/lib/crm/students'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const actor = await getCrmActor()
    return crmResponse(await writeStudents(prisma, actor, studentCommand.parse(await crmBody(request, 2000))))
  } catch (error) { return crmFailure(error) }
}
