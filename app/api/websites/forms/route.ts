import {ownedProfile} from '@/lib/website/server'
import {canUseCrm} from '@/lib/crm/shared'
import {CrmError} from '@/lib/crm/service'
import {crmBody,crmFailure,crmResponse} from '@/lib/crm/http'
import {listForms,saveForm} from '@/lib/crm/forms'
import {isPlatformHost,requestHostname} from '@/lib/website/domain-shared'
import prisma from '@/lib/prisma'

export const dynamic='force-dynamic'
async function owner(request:Request){
  if(!isPlatformHost(requestHostname(request.headers.get('host') || '')))throw new CrmError('Quản lý form tại hệ thống chính.',403)
  const profile=await ownedProfile()
  if(!profile.user || !canUseCrm(profile.user.role))throw new CrmError('Chỉ giảng viên có quyền CRM được quản lý form.',403)
  return profile
}
export async function GET(request:Request){
  try{return crmResponse({forms:await listForms(prisma,await owner(request))})}catch(e){return crmFailure(e)}
}
export async function POST(request:Request){
  try{const profile=await owner(request);return crmResponse(await saveForm(prisma,profile,await crmBody(request,40000)))}catch(e){return crmFailure(e)}
}
