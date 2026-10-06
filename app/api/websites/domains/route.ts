import { accessKey, accessSchema, effectiveModules } from '@/lib/website/access'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import {domainWebsite} from '@/lib/website/presentation-server'
import { ownedProfile } from '@/lib/website/server'
import { normalizeHostname, isPlatformHost, requestHostname } from '@/lib/website/domain-shared'
import { verifyDomain } from '@/lib/website/domain-verification'
import { crmBody, crmResponse } from '@/lib/crm/http'
import { websiteFailure } from '@/lib/website/http'
import { CrmError } from '@/lib/crm/service'

async function manager(request: Request) {
  if(!isPlatformHost(requestHostname(request.headers.get('host') || ''))) throw new CrmError('Quản lý tên miền trên hệ thống chính.',403)
  const profile=await ownedProfile()
  if(profile.user?.role!=='ADMIN') throw new CrmError('Custom domain đang thử nghiệm; quản trị viên cần cấp quyền.',403)
  return profile
}
const command=z.discriminatedUnion('action',[
  z.object({action:z.literal('add'),hostname:z.string().max(253)}).strict(),
  z.object({action:z.literal('check'),hostname:z.string().max(253)}).strict(),
  z.object({action:z.literal('disable'),hostname:z.string().max(253)}).strict(),
  z.object({action:z.literal('remove'),hostname:z.string().max(253)}).strict(),
  z.object({action:z.literal('modules'),hostname:z.string().max(253),courses:z.boolean(),crm:z.boolean(),affiliate:z.boolean()}).strict(),
])
export async function GET(request: Request) {
  try { const profile=await manager(request); return crmResponse({slug:profile.slug,domains:await prisma.siteProfileDomain.findMany({where:{profileId:profile.id},orderBy:{createdAt:'asc'}})}) }
  catch(e) { return websiteFailure(e) }
}
export async function POST(request: Request) {
  try {
    const profile=await manager(request)
    const input=command.parse(await crmBody(request,2000))
    let hostname: string
    try { hostname=normalizeHostname(input.hostname) } catch(e) { throw new CrmError(e instanceof Error ? e.message : 'Tên miền không hợp lệ.') }
    if(input.action==='add') {
      if(!profile.isActive || !await domainWebsite(profile)) throw new CrmError('Kích hoạt website và chọn giao diện hợp lệ trước khi nối tên miền.',409)
      await prisma.$transaction(async tx=>{
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420304)`
        if(await tx.siteProfileDomain.count({where:{profileId:profile.id}})>=3) throw new CrmError('Mỗi website thử nghiệm được tối đa 3 tên miền.',409)
        const config=await tx.systemConfig.findUnique({where:{key:accessKey(profile.id)}})
        const modules=config ? effectiveModules(accessSchema.parse(config.value)) : {}
        await tx.siteProfileDomain.create({data:{hostname,profileId:profile.id,token:randomBytes(24).toString('hex'),...modules}})
      })
    } else {
      const where={hostname,profileId:profile.id}
      const domain=await prisma.siteProfileDomain.findFirst({where})
      if(!domain) throw new CrmError('Không tìm thấy tên miền của bạn.',404)
      if(input.action==='remove') await prisma.siteProfileDomain.deleteMany({where})
      if(input.action==='disable') await prisma.siteProfileDomain.updateMany({where,data:{isActive:false,checkedAt:new Date(),message:'Đã tạm dừng tên miền'}})
      if(input.action==='modules') {
        const config=await prisma.systemConfig.findUnique({where:{key:accessKey(profile.id)}})
        if(config) throw new CrmError('Hãy chỉnh chức năng trong Quản lý website.',409)
        await prisma.siteProfileDomain.updateMany({where,data:{courses:input.courses,crm:input.crm,affiliate:input.affiliate}})
      }
      if(input.action==='check') {
        if(!profile.isActive || !await domainWebsite(profile)) throw new CrmError('Giao diện đang chọn chưa sẵn sàng hoặc website đang bị khóa.',409)
        const checkedAt=new Date()
        const checking='Đang kiểm tra DNS và HTTPS'
        const reserved=await prisma.siteProfileDomain.updateMany({where:{...where,OR:[{checkedAt:null},{checkedAt:{lt:new Date(Date.now()-30000)}}]},data:{checkedAt,message:checking}})
        if(!reserved.count) throw new CrmError('Chờ 30 giây trước lần kiểm tra tiếp theo.',429)
        const result=await verifyDomain(hostname,domain.token)
        // So sánh token và thời điểm: không bật bản ghi vừa bị thay thế/xóa trong lúc kiểm tra.
        await prisma.siteProfileDomain.updateMany({where:{...where,token:domain.token,checkedAt,message:checking},data:{message:result.message,...(result.valid ? {verifiedAt:new Date(),isActive:true} : {})}})
      }
    }
    return crmResponse({domains:await prisma.siteProfileDomain.findMany({where:{profileId:profile.id},orderBy:{createdAt:'asc'}})})
  } catch(e) { return websiteFailure(e) }
}
