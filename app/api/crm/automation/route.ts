import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { readPhaseThree, writePhaseThree } from '@/lib/crm/phase-three'
import { phaseThreeCommand, phaseThreeQuery } from '@/lib/crm/phase-three-validation'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try { return crmResponse(await readPhaseThree(prisma, await getCrmActor(), phaseThreeQuery.parse(Object.fromEntries(new URL(request.url).searchParams)))) }
  catch (error) { return crmFailure(error) }
}
export async function POST(request: Request) {
  try { const actor = await getCrmActor(); return crmResponse(await writePhaseThree(prisma, actor, phaseThreeCommand.parse(await crmBody(request, 100000)))) }
  catch (error) { return crmFailure(error) }
}
