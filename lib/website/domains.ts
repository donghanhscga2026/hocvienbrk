import 'server-only'
import {cache} from 'react'
import prisma from '@/lib/prisma'
import {Prisma} from '@prisma/client'
import {accessKey,accessSchema,effectiveModules} from './access'
import {effectiveApplications,noApplications} from './applications'
import {requestHostname,isPlatformHost} from './domain-shared'
import {getSiteRuntimeConfig} from '@/lib/site-profile/config'
import {domainSnapshot} from './domain-snapshot'

const profileInclude={members:true,theme:true} as const
function missingTable(error:unknown) {
  if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2021')return undefined
  throw error
}
/** Hai bảng cũ được đọc qua một bộ phân giải; không tự chuyển hoặc ghi dữ liệu. */
export const findDomain=cache(async(hostname:string)=>{
  if(isPlatformHost(hostname))return null
  const snapshot=await domainSnapshot(hostname)
  if(snapshot)return snapshot.domain
  // Bảng cũ chỉ cần mã chủ sở hữu để kiểm tra trùng, tránh tải website và quan hệ lần thứ hai.
  const [verified,managedRef]=await Promise.all([
    prisma.siteDomain.findUnique({where:{hostname},include:{profile:{include:profileInclude}}}).catch(missingTable),
    prisma.siteProfileDomain.findUnique({where:{hostname},select:{profileId:true}}).catch(missingTable),
  ])
  // Bản ghi bị tắt không được mở lại bởi nguồn còn lại; trùng chủ sở hữu cũng phải rõ ràng.
  if(verified){
    if(managedRef && managedRef.profileId!==verified.profileId)return null
    return verified
  }
  if(!managedRef)return null
  const managed=await prisma.siteProfileDomain.findUnique({where:{hostname},include:{profile:{include:profileInclude}}}).catch(missingTable)
  if(!managed || managed.profileId!==managedRef.profileId)return null
  const config=getSiteRuntimeConfig(managed.profile)
  // Domain do quản trị viên cấp là nguồn tin cậy; domain tự đăng ký vẫn phải xác minh.
  return {...managed,token:'',enabled:managed.isActive,courses:config.modules.courses,crm:false,affiliate:config.modules.affiliate,verifiedAt:managed.createdAt,checkedAt:null,message:'Tên miền được quản trị viên cấp',profile:managed.profile}
})
// Metadata, layout và nội dung dùng cùng kết quả trong một request, không cache quyền giữa các request.
export const activeDomain=cache(async(rawHost:string)=>{
  const hostname=requestHostname(rawHost)
  const snapshot=await domainSnapshot(hostname)
  const domain=snapshot ? snapshot.domain : await findDomain(hostname)
  if(!domain?.enabled || !domain.verifiedAt || !domain.profile.isActive)return null
  const row=snapshot ? (snapshot.access==null ? null : {value:snapshot.access}) : await prisma.systemConfig.findUnique({where:{key:accessKey(domain.profileId)}})
  // Gói quyền đã lưu là nguồn duy nhất quyết định kết nối sau khi được cấu hình.
  if(!row)return {...domain,applications:noApplications}
  const access=accessSchema.parse(row.value)
  const modules=effectiveModules(access)
  const raw=domain.profile.siteConfig && typeof domain.profile.siteConfig==='object' && !Array.isArray(domain.profile.siteConfig)?domain.profile.siteConfig:{}
  const original=raw.modules && typeof raw.modules==='object' && !Array.isArray(raw.modules)?raw.modules:{}
  return {...domain,...modules,profile:{...domain.profile,siteConfig:{...raw,modules:{...original,courses:modules.courses,affiliate:modules.affiliate}}},applications:effectiveApplications(access.applications)}
})
