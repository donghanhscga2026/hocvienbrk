import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { phaseTwoCommand, phaseTwoQuery, readPhaseTwo, writePhaseTwo } from '@/lib/crm/phase-two'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const actor = await getCrmActor()
    return crmResponse(await readPhaseTwo(prisma, actor, phaseTwoQuery.parse(Object.fromEntries(new URL(request.url).searchParams))))
  } catch (error) { return crmFailure(error) }
}
export async function POST(request: Request) {
  try {
    const actor = await getCrmActor()
    return crmResponse(await writePhaseTwo(prisma, actor, phaseTwoCommand.parse(await crmBody(request, 200000))))
  } catch (error) { return crmFailure(error) }
}
