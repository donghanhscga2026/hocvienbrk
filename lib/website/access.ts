import {z} from 'zod'
import type {DomainModules} from './domain-shared'
import {applicationsSchema,noApplications} from './applications'

export const moduleKeys=['courses','crm','affiliate'] as const
export const moduleLabels={courses:'Khóa học và học tập',crm:'CRM và form tư vấn',affiliate:'Affiliate'}
export const moduleScopes={courses:'Khóa học đã chọn trong hồ sơ website; nếu chưa chọn, dùng khóa của chủ website và thành viên được liên kết.',crm:'Chủ website và giáo viên liên kết dùng CRM của chính tài khoản mình. Chưa tách kho CRM riêng cho từng website.',affiliate:'Liên kết và hoa hồng của tài khoản đang đăng nhập theo quyền affiliate hiện có.'}
export const modulesSchema=z.object({courses:z.boolean(),crm:z.boolean(),affiliate:z.boolean()}).strict()
export const noModules:DomainModules={courses:false,crm:false,affiliate:false}
export const applicationAccessSchema=z.object({base:applicationsSchema,extra:applicationsSchema,enabled:applicationsSchema}).strict()
export const accessSchema=z.object({version:z.literal(1),revision:z.number().int().nonnegative(),base:modulesSchema,extra:modulesSchema,enabled:modulesSchema,applications:applicationAccessSchema.default({base:noApplications,extra:noApplications,enabled:noApplications})}).strict()
export type WebsiteAccess=z.infer<typeof accessSchema>
export const basicKey='website-package:basic:v1'
export const accessKey=(id:number)=>'website-access:'+id
export function effectiveModules(access:WebsiteAccess):DomainModules {
  return Object.fromEntries(moduleKeys.map(key=>[key,(access.base[key] || access.extra[key]) && access.enabled[key]])) as DomainModules
}
export function initialAccess(legacy:DomainModules):WebsiteAccess {
  const modules={courses:legacy.courses,crm:legacy.crm,affiliate:legacy.affiliate}
  return accessSchema.parse({version:1,revision:0,base:{...noModules},extra:{...modules},enabled:{...modules}})
}
/** Đọc mẫu gói cũ mà không tự mở thêm ứng dụng. */
export const basicSchema=z.union([z.object({modules:modulesSchema,applications:applicationsSchema}).strict(),modulesSchema.transform(modules=>({modules,applications:noApplications}))])
