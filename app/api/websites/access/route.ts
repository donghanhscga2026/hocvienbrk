import {getSiteRuntimeConfig} from '@/lib/site-profile/config'
import {z} from 'zod'
import prisma from '@/lib/prisma'
import {ownedProfile} from '@/lib/website/server'
import {isPlatformHost,requestHostname} from '@/lib/website/domain-shared'
import {accessKey,accessSchema,basicKey,basicSchema,effectiveModules,initialAccess,modulesSchema,noModules} from '@/lib/website/access'
import {applicationKeys,applicationsSchema,allApplications,noApplications} from '@/lib/website/applications'
import {crmBody,crmResponse} from '@/lib/crm/http'
import {websiteFailure} from '@/lib/website/http'
import {CrmError} from '@/lib/crm/service'

async function manager(request:Request) {
  if(!isPlatformHost(requestHostname(request.headers.get('host') || ''))) throw new CrmError('Quản lý website tại hệ thống chính.',403)
  return ownedProfile()
}
async function snapshot(profile:Awaited<ReturnType<typeof ownedProfile>>) {
  const profileId=profile.id
  const [row,basic,domains,managed]=await Promise.all([
    prisma.systemConfig.findUnique({where:{key:accessKey(profileId)}}),
    prisma.systemConfig.findUnique({where:{key:basicKey}}),
    prisma.siteDomain.findMany({where:{profileId},orderBy:{createdAt:'asc'},select:{hostname:true,courses:true,crm:true,affiliate:true,enabled:true}}),
    prisma.siteProfileDomain.findMany({where:{profileId},orderBy:{id:'asc'}})
  ])
  const access=row ? accessSchema.parse(row.value) : initialAccess(domains[0] || (managed.length ? {courses:getSiteRuntimeConfig(profile).modules.courses,crm:false,affiliate:getSiteRuntimeConfig(profile).modules.affiliate} : noModules))
  const template=basic ? basicSchema.parse(basic.value) : {modules:{courses:true,crm:true,affiliate:true},applications:allApplications}
  return {access,basic:template.modules,basicApplications:template.applications,domains:[...domains,...managed.filter(d=>!domains.some(v=>v.hostname===d.hostname)).map(d=>({hostname:d.hostname,enabled:d.isActive}))],configured:!!row}
}
export async function GET(request:Request) {
  try {const profile=await manager(request);return crmResponse({...await snapshot(profile),profileId:profile.id,admin:profile.user?.role==='ADMIN',name:profile.title,slug:profile.slug})} catch(e) {return websiteFailure(e)}
}
const command=z.discriminatedUnion('action',[
  z.object({action:z.literal('basic'),modules:modulesSchema,applications:applicationsSchema.optional()}).strict(),
  z.object({action:z.literal('save'),revision:z.number().int().nonnegative(),enabled:modulesSchema,extra:modulesSchema.optional(),applyBasic:z.boolean().optional(),applications:applicationsSchema.optional(),applicationExtra:applicationsSchema.optional()}).strict()
])
export async function POST(request:Request) {
  try {
    const profile=await manager(request),admin=profile.user?.role==='ADMIN'
    const input=command.parse(await crmBody(request,4000))
    if(input.action==='basic') {
      if(!admin) throw new CrmError('Chỉ quản trị viên được sửa gói cơ bản.',403)
      const value={modules:input.modules,applications:input.applications || noApplications}
      await prisma.systemConfig.upsert({where:{key:basicKey},create:{key:basicKey,value},update:{value}})
    } else {
      if(!admin && (input.extra!==undefined || input.applicationExtra!==undefined || input.applyBasic!==undefined)) throw new CrmError('Bạn không có quyền tự cấp chức năng.',403)
      await prisma.$transaction(async tx=>{
        // Khóa theo website để không ghi đè thay đổi ở cửa sổ khác.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420305, ${profile.id}::integer)`
        const row=await tx.systemConfig.findUnique({where:{key:accessKey(profile.id)}})
        const legacy=await tx.siteDomain.findFirst({where:{profileId:profile.id},orderBy:{createdAt:'asc'}})
        const managed=await tx.siteProfileDomain.findFirst({where:{profileId:profile.id}})
        const runtime=getSiteRuntimeConfig(profile)
        const current=row ? accessSchema.parse(row.value) : initialAccess(legacy || (managed ? {courses:runtime.modules.courses,crm:false,affiliate:runtime.modules.affiliate}:noModules))
        if(current.revision!==input.revision) throw new CrmError('Cấu hình đã đổi. Tải lại trước khi lưu.',409)
        const basic=await tx.systemConfig.findUnique({where:{key:basicKey}})
        const template=basic ? basicSchema.parse(basic.value) : {modules:{courses:true,crm:true,affiliate:true},applications:allApplications}
        const next=accessSchema.parse({...current,revision:current.revision+1,enabled:input.enabled,...(admin && input.extra ? {extra:input.extra} : {}),...(admin && input.applyBasic ? {base:template.modules} : {}),applications:{...current.applications,enabled:input.applications || current.applications.enabled,...(admin && input.applicationExtra ? {extra:input.applicationExtra} : {}),...(admin && input.applyBasic ? {base:template.applications} : {})}})
        if(!admin && (['courses','crm','affiliate'] as const).some(key=>next.enabled[key] && !next.base[key] && !next.extra[key])) throw new CrmError('Chức năng chưa được cấp.',403)
        if(!admin && applicationKeys.some(key=>next.applications.enabled[key] && !next.applications.base[key] && !next.applications.extra[key])) throw new CrmError('Ứng dụng chưa được cấp cho website.',403)
        await tx.systemConfig.upsert({where:{key:accessKey(profile.id)},create:{key:accessKey(profile.id),value:next},update:{value:next}})
        await tx.siteDomain.updateMany({where:{profileId:profile.id},data:effectiveModules(next)})
      })
    }
    return crmResponse({...await snapshot(profile),profileId:profile.id,admin,name:profile.title,slug:profile.slug})
  } catch(e) {return websiteFailure(e)}
}
