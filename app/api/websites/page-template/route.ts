import {z} from 'zod'
import prisma from '@/lib/prisma'
import {ownedProfile} from '@/lib/website/server'
import {crmBody,crmResponse} from '@/lib/crm/http'
import {websiteFailure} from '@/lib/website/http'
import {CrmError} from '@/lib/crm/service'
import {isPlatformHost,requestHostname} from '@/lib/website/domain-shared'
import {pageTemplateKey,pageTemplateSchema,renderPageTemplate} from '@/lib/website/page-template'
import {decodePageSource,pageCourses,readPageTemplate} from '@/lib/website/page-template-server'
import {boundForms} from '@/lib/crm/forms'
import {connectPageForms} from '@/lib/website/page-forms'

async function owner(request:Request) {
  if(!isPlatformHost(requestHostname(request.headers.get('host') || '')))throw new CrmError('Nhập template tại hệ thống chính.',403)
  return ownedProfile()
}
export async function GET(request:Request) {
  try {
    const profile=await owner(request)
    const template=await readPageTemplate(profile.id)
    if(new URL(request.url).searchParams.get('summary')==='1')return crmResponse({template:template?{active:template.active,name:template.name,revision:template.revision}:null})
    return crmResponse({template,courses:await pageCourses(profile),slug:profile.slug,active:profile.isActive})
  }catch(e){return websiteFailure(e)}
}
const command=z.discriminatedUnion('action',[
  pageTemplateSchema.omit({active:true}).extend({action:z.literal('apply')}).strict(),
  z.object({action:z.literal('builtin'),revision:z.number().int().nonnegative()}).strict(),
])
export async function POST(request:Request) {
  try {
    const profile=await owner(request),input=command.parse(await crmBody(request,3500*1024))
    if(input.action==='apply') {
      if(!profile.isActive)throw new CrmError('Trang chưa được bật. Hãy nhờ quản trị viên bật Page.',403)
      try{connectPageForms(renderPageTemplate(decodePageSource(input.source),input.region,[]),input.forms || [],await boundForms(prisma,profile,input.forms || []),true)}catch(e){if(e instanceof Error && e.name==='PrismaClientKnownRequestError')throw e;throw new CrmError(e instanceof Error?e.message:'Template không hợp lệ.')}
    }
    const template=await prisma.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420307, ${profile.id}::integer)`
      const current=await tx.systemConfig.findUnique({where:{key:pageTemplateKey(profile.id)}})
      const parsed=pageTemplateSchema.safeParse(current?.value),saved=parsed.success?parsed.data:null
      if((saved?.revision || 0)!==input.revision)throw new CrmError('Template đã đổi ở cửa sổ khác. Hãy tải lại.',409)
      if(input.action==='builtin' && !saved)return null
      const value=input.action==='apply'?{revision:input.revision+1,active:true,name:input.name,region:input.region,source:input.source,...(input.forms?.length?{forms:input.forms}:{})}:{...saved!,active:false,revision:input.revision+1}
      await tx.systemConfig.upsert({where:{key:pageTemplateKey(profile.id)},create:{key:pageTemplateKey(profile.id),value},update:{value}})
      return value
    })
    return crmResponse({template})
  }catch(e){return websiteFailure(e)}
}
