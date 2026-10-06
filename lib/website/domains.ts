import 'server-only'
import {cache} from 'react'
import prisma from '@/lib/prisma'
import {Prisma} from '@prisma/client'
import {accessKey,accessSchema,effectiveModules} from './access'
import {effectiveApplications,noApplications} from './applications'
import {requestHostname,isPlatformHost} from './domain-shared'
import {getSiteRuntimeConfig} from '@/lib/site-profile/config'

const profileInclude={members:true,theme:true} as const
/** Hai bảng cũ được đọc qua một bộ phân giải; không tự chuyển hoặc ghi dữ liệu. */
export const findDomain=cache(async(hostname:string)=>{
  if(isPlatformHost(hostname))return null
  let verified
  try{verified=await prisma.siteDomain.findUnique({where:{hostname},include:{profile:{include:profileInclude}}})}
  catch(e){if(!(e instanceof Prisma.PrismaClientKnownRequestError && e.code==='P2021'))throw e}
  let managed
  try{managed=await prisma.siteProfileDomain.findUnique({where:{hostname},include:{profile:{include:profileInclude}}})}
  catch(e){if(!(e instanceof Prisma.PrismaClientKnownRequestError && e.code==='P2021'))throw e}
  // Bản ghi bị tắt không được mở lại bởi nguồn còn lại; trùng chủ sở hữu cũng phải rõ ràng.
  if(verified){
    if(managed && managed.profileId!==verified.profileId)return null
    return verified
  }
  if(!managed)return null
  const config=getSiteRuntimeConfig(managed.profile)
  // Domain do quản trị viên cấp là nguồn tin cậy; domain tự đăng ký vẫn phải xác minh.
  return {...managed,token:'',enabled:managed.isActive,courses:config.modules.courses,crm:false,affiliate:config.modules.affiliate,verifiedAt:managed.createdAt,checkedAt:null,message:'Tên miền được quản trị viên cấp',profile:managed.profile}
})
export async function activeDomain(rawHost:string){
  const domain=await findDomain(requestHostname(rawHost))
  if(!domain?.enabled || !domain.verifiedAt || !domain.profile.isActive)return null
  const row=await prisma.systemConfig.findUnique({where:{key:accessKey(domain.profileId)}})
  // Gói quyền đã lưu là nguồn duy nhất quyết định kết nối sau khi được cấu hình.
  if(!row)return {...domain,applications:noApplications}
  const access=accessSchema.parse(row.value)
  const modules=effectiveModules(access)
  const raw=domain.profile.siteConfig && typeof domain.profile.siteConfig==='object' && !Array.isArray(domain.profile.siteConfig)?domain.profile.siteConfig:{}
  const original=raw.modules && typeof raw.modules==='object' && !Array.isArray(raw.modules)?raw.modules:{}
  return {...domain,...modules,profile:{...domain.profile,siteConfig:{...raw,modules:{...original,courses:modules.courses,affiliate:modules.affiliate}}},applications:effectiveApplications(access.applications)}
}
