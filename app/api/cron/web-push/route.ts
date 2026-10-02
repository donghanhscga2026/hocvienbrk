import { isAuthorizedRequest } from '@/lib/request-auth'
import { crmFailure, crmResponse } from '@/lib/crm/http'
import { processWebPush } from '@/lib/web-push-worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(request: Request) {
  if (!isAuthorizedRequest(request,{secretEnv:'CRON_SECRET',allowQuerySecret:false,allowedHeaderNames:[]}).isAuthorized) return crmResponse({error:'Unauthorized'},401)
  try { return crmResponse(await processWebPush({execute:new URL(request.url).searchParams.get('execute')==='1'})) }
  catch (error) { return crmFailure(error) }
}
