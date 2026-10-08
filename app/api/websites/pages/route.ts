import prisma from '@/lib/prisma'
import {ownedProfile} from '@/lib/website/server'
import {readWebsitePages} from '@/lib/website/pages-server'
import {websitePagesKey,websitePagesSchema,blankWebsitePages} from '@/lib/website/pages'
import {isPlatformHost,requestHostname} from '@/lib/website/domain-shared'
import {crmBody,crmResponse} from '@/lib/crm/http'
import {websiteFailure} from '@/lib/website/http'
import {CrmError} from '@/lib/crm/service'

async function manager(request:Request){
  if(!isPlatformHost(requestHostname(request.headers.get('host') || '')))throw new CrmError('Quản lý trang tại hệ thống chính.',403)
  return ownedProfile()
}
export async function GET(request:Request){
  try{const profile=await manager(request);return crmResponse({content:await readWebsitePages(profile.id),slug:profile.slug,active:profile.isActive})}catch(error){return websiteFailure(error)}
}
export async function POST(request:Request){
  try{
    const profile=await manager(request),input=websitePagesSchema.parse(await crmBody(request,900*1024))
    if(!profile.isActive && input.pages.some(p=>p.published))throw new CrmError('Trang riêng chưa được bật.',403)
    const content=await prisma.$transaction(async tx=>{
      // Trang và menu dùng chung khóa với API template trang con, tránh cập nhật đồng thời.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420311, ${profile.id}::integer)`
      const row=await tx.systemConfig.findUnique({where:{key:websitePagesKey(profile.id)}})
      const current=row?websitePagesSchema.parse(row.value):blankWebsitePages()
      if(current.revision!==input.revision)throw new CrmError('Trang hoặc menu đã đổi ở cửa sổ khác. Tải lại trước khi lưu.',409)
      const value={...input,revision:current.revision+1}
      await tx.systemConfig.upsert({where:{key:websitePagesKey(profile.id)},create:{key:websitePagesKey(profile.id),value},update:{value}})
      return value
    })
    return crmResponse({content,slug:profile.slug,active:profile.isActive})
  }catch(error){return websiteFailure(error)}
}
