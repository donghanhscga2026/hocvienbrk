import prisma from '@/lib/prisma'
import {crmBody,crmFailure,crmResponse} from '@/lib/crm/http'
import {submitForm} from '@/lib/crm/forms'
import {requireDomainModule} from '@/lib/website/domain-context'

export const dynamic='force-dynamic'
export async function POST(request:Request){
  try{
    const raw=await crmBody(request,48000),domain=await requireDomainModule('crm')
    const address=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    return crmResponse(await submitForm(prisma,raw,address,domain?.profileId),201)
  }catch(e){return crmFailure(e)}
}
