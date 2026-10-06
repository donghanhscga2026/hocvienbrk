import {z} from 'zod'

/** Danh mục cố định: không nhận URL ứng dụng do khách gửi lên. */
export const applicationKeys=['teaching','students','payments','vouchers','email','pages','youtube','brk','genealogy'] as const
export type ApplicationKey=typeof applicationKeys[number]
export const applications={
  teaching:{name:'Quản lý giảng dạy',path:'/tools/courses',audience:'staff',roles:['ADMIN','TEACHER'],scope:'Khóa học được tài khoản quản lý trên hệ thống chính.'},
  students:{name:'Quản lý học viên',path:'/tools/students',audience:'staff',roles:['ADMIN','TEACHER'],scope:'Học viên được tài khoản phụ trách trên hệ thống chính.'},
  payments:{name:'Quản lý thanh toán',path:'/tools/payments',audience:'staff',roles:['ADMIN','TEACHER'],scope:'Đơn đăng ký và thanh toán được tài khoản quản lý.'},
  vouchers:{name:'Voucher',path:'/tools/vouchers',audience:'staff',roles:['ADMIN','TEACHER'],scope:'Mã giảm giá theo quyền tài khoản trên hệ thống chính.'},
  email:{name:'Email marketing',path:'/tools/email-mkt',audience:'staff',roles:['ADMIN','TEACHER'],scope:'Chiến dịch và danh sách người nhận được tài khoản quản lý.'},
  pages:{name:'Page & landing page',path:'/tools/pages',audience:'member',roles:['ADMIN','TEACHER','AFFILIATE','STUDENT'],scope:'Trang và nội dung theo quyền sở hữu của tài khoản.'},
  youtube:{name:'Công cụ YouTube',path:'/tools/youtube-tools',audience:'member',roles:['ADMIN','TEACHER','AFFILIATE','STUDENT'],scope:'Kênh và dữ liệu YouTube của tài khoản đã kết nối.'},
  brk:{name:'BRK & ví cá nhân',path:'/tools/brk',audience:'member',roles:['ADMIN','TEACHER','AFFILIATE','STUDENT'],scope:'Ví và thông tin BRK tài khoản được phép truy cập.'},
  genealogy:{name:'Nhân mạch',path:'/tools/genealogy',audience:'member',roles:['ADMIN','TEACHER','AFFILIATE','STUDENT'],scope:'Nhân mạch tài khoản được phép truy cập trên hệ thống chính.'},
} as const
const flag=z.boolean().default(false)
export const applicationsSchema=z.object({teaching:flag,students:flag,payments:flag,vouchers:flag,email:flag,pages:flag,youtube:flag,brk:flag,genealogy:flag}).strict()
export type ApplicationFlags=z.infer<typeof applicationsSchema>
export const noApplications=applicationsSchema.parse({})
export const allApplications=applicationsSchema.parse(Object.fromEntries(applicationKeys.map(key=>[key,true])))
type User={id:number;role:string}
type Profile={userId:number|null;members:{userId:number}[]}
export function isWebsiteStaff(profile:Profile,user:User|null) {
  return !!user && ['ADMIN','TEACHER','INSTRUCTOR'].includes(user.role) && (profile.userId===user.id || profile.members.some(member=>member.userId===user.id))
}
export function canUseApplication(key:ApplicationKey,profile:Profile,user:User|null) {
  const app=applications[key]
  return !!user && (app.roles as readonly string[]).includes(user.role) && (app.audience!=='staff' || isWebsiteStaff(profile,user))
}
export function effectiveApplications(state:{base:ApplicationFlags;extra:ApplicationFlags;enabled:ApplicationFlags}):ApplicationFlags {
  return applicationsSchema.parse(Object.fromEntries(applicationKeys.map(key=>[key,(state.base[key] || state.extra[key]) && state.enabled[key]])))
}
