import {z} from 'zod'
import prisma from '@/lib/prisma'
import {ownedProfile} from '@/lib/website/server'
import {readContentTemplate,readWebsitePages} from '@/lib/website/pages-server'
import {pageSlugSchema,contentTemplateKey,contentTemplateSchema,websitePagesKey,websitePagesSchema} from '@/lib/website/pages'
import {decodePageSource,pageCourses} from '@/lib/website/page-template-server'
import {renderPageTemplate} from '@/lib/website/page-template'
import {isPlatformHost,requestHostname} from '@/lib/website/domain-shared'
import {crmBody,crmResponse} from '@/lib/crm/http'
import {websiteFailure} from '@/lib/website/http'
import {CrmError} from '@/lib/crm/service'

async function owner(request:Request){
  if(!isPlatformHost(requestHostname(request.headers.get('host') || '')))throw new CrmError('Nhập template tại hệ thống chính.',403)
  const profile=await ownedProfile(),slug=pageSlugSchema.parse(new URL(request.url).searchParams.get('slug'))
  const content=await readWebsitePages(profile.id)
  if(!content.pages.some(p=>p.slug===slug))throw new CrmError('Trang chưa được tạo. Lưu trang trước khi nhập template.',404)
  return {profile,slug}
}
export async function GET(request:Request){
  try{const {profile,slug}=await owner(request);return crmResponse({template:await readContentTemplate(profile.id,slug),courses:await pageCourses(profile),slug:profile.slug,active:profile.isActive})}catch(error){return websiteFailure(error)}
}
const command=z.discriminatedUnion('action',[
  contentTemplateSchema.omit({active:true,forms:true}).extend({action:z.literal('apply')}).strict(),
  z.object({action:z.literal('builtin'),revision:z.number().int().nonnegative()}).strict(),
])
export async function POST(request:Request){
  try{
    const {profile,slug}=await owner(request),input=command.parse(await crmBody(request,3500*1024))
    if(input.action==='apply'){
      if(!profile.isActive)throw new CrmError('Trang riêng chưa được bật.',403)
      try{renderPageTemplate(decodePageSource(input.source),input.region,[])}catch(error){throw new CrmError(error instanceof Error?error.message:'Template không hợp lệ.')}
    }
    const template=await prisma.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420311, ${profile.id}::integer)`
      const pages=await tx.systemConfig.findUnique({where:{key:websitePagesKey(profile.id)}})
      if(!pages || !websitePagesSchema.parse(pages.value).pages.some(p=>p.slug===slug))throw new CrmError('Trang đã thay đổi. Hãy tải lại.',409)
      const key=contentTemplateKey(profile.id,slug),row=await tx.systemConfig.findUnique({where:{key}})
      const parsed=contentTemplateSchema.safeParse(row?.value),current=parsed.success?parsed.data:null
      if((current?.revision || 0)!==input.revision)throw new CrmError('Template đã đổi ở cửa sổ khác. Hãy tải lại.',409)
      if(input.action==='builtin' && !current)return null
      const value=input.action==='apply'?{revision:input.revision+1,active:true,name:input.name,region:input.region,source:input.source}:{...current!,active:false,revision:input.revision+1}
      await tx.systemConfig.upsert({where:{key},create:{key,value},update:{value}})
      return value
    })
    return crmResponse({template})
  }catch(error){return websiteFailure(error)}
}
