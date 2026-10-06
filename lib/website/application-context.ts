import 'server-only'
import {auth} from '@/auth'
import prisma from '@/lib/prisma'
import {domainContext} from './domain-context'
import {applications,canUseApplication,type ApplicationKey} from './applications'
import {CrmError} from '@/lib/crm/service'

/** Đọc quyền hiện tại trong DB; không dùng vai trò đã hạ xuống STUDENT của phiên domain. */
export async function websiteApplicationUser() {
  const session=await auth()
  if(!session?.user?.id) return null
  const id=Number(session.user.id)
  if(!Number.isSafeInteger(id) || id<0) return null
  return prisma.user.findUnique({where:{id},select:{id:true,name:true,role:true}})
}
export async function connectedApplication(raw:string) {
  if(!Object.prototype.hasOwnProperty.call(applications,raw)) throw new CrmError('Ứng dụng không tồn tại.',404)
  const key=raw as ApplicationKey
  const domain=await domainContext()
  if(!domain || !domain.applications[key]) throw new CrmError('Ứng dụng chưa kết nối với website này.',403)
  const user=await websiteApplicationUser()
  if(!user) throw new CrmError('Vui lòng đăng nhập.',401)
  if(!canUseApplication(key,domain.profile,user)) throw new CrmError('Tài khoản không có quyền dùng ứng dụng này tại website.',403)
  return {key,app:applications[key],user}
}
