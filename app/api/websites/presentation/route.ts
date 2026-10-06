import prisma from '@/lib/prisma'
import {z} from 'zod'
import {ownedProfile} from '@/lib/website/server'
import {presentationState} from '@/lib/website/presentation-server'
import {presentationKey,presentationSchema} from '@/lib/website/presentation'
import {isPlatformHost,requestHostname} from '@/lib/website/domain-shared'
import {crmBody,crmResponse} from '@/lib/crm/http'
import {websiteFailure} from '@/lib/website/http'
import {CrmError} from '@/lib/crm/service'

async function manager(request:Request) {
  if(!isPlatformHost(requestHostname(request.headers.get('host') || ''))) throw new CrmError('Quản lý giao diện tại hệ thống chính.',403)
  return ownedProfile()
}
function response(state:Awaited<ReturnType<typeof presentationState>>) {
  return {mode:state.mode,revision:state.revision,customPublished:state.customPublished,homepageType:state.homepageType}
}
export async function GET(request:Request) {
  try {const profile=await manager(request);return crmResponse(response(await presentationState(profile.id)))} catch(e){return websiteFailure(e)}
}
const command=z.object({mode:z.enum(['template','custom']),revision:z.number().int().nonnegative()}).strict()
export async function POST(request:Request) {
  try {
    const profile=await manager(request),input=command.parse(await crmBody(request,1000))
    await prisma.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420306, ${profile.id}::integer)`
      const current=await tx.systemConfig.findUnique({where:{key:presentationKey(profile.id)}})
      const row=await tx.siteWebsite.findUnique({where:{profileId:profile.id},select:{published:true}})
      const state=current ? presentationSchema.parse(current.value) : {mode:row?.published ? 'custom' : 'template',revision:0}
      if(state.revision!==input.revision) throw new CrmError('Mẫu đang dùng đã đổi ở cửa sổ khác. Hãy tải lại.',409)
      if(input.mode==='custom' && !row?.published) throw new CrmError('Hãy xuất bản thiết kế tự do trước khi chọn sử dụng.',409)
      const value={mode:input.mode,revision:state.revision+1}
      const fresh=await tx.siteProfile.findUnique({where:{id:profile.id}})
      const raw=fresh?.siteConfig && typeof fresh.siteConfig==='object' && !Array.isArray(fresh.siteConfig)?fresh.siteConfig:{}
      await tx.siteProfile.update({where:{id:profile.id},data:{siteConfig:{...raw,homepage:{type:input.mode==='custom'?'website':'profile'}}}})
      await tx.systemConfig.upsert({where:{key:presentationKey(profile.id)},create:{key:presentationKey(profile.id),value},update:{value}})
    })
    return crmResponse(response(await presentationState(profile.id)))
  } catch(e){return websiteFailure(e)}
}
