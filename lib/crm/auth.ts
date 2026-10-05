import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { canUseCrm, CrmActor } from './shared'
import { CrmError } from './service'
import { requireDomainModule } from '@/lib/website/domain-context'

export async function getCrmActor(): Promise<CrmActor> {
  const domain=await requireDomainModule('crm')
  const session = await auth()
  if (session?.user?.id == null) throw new CrmError('Vui lòng đăng nhập.', 401)
  const id = Number(session.user.id)
  if (!Number.isInteger(id) || id < 0) throw new CrmError('Phiên đăng nhập không hợp lệ.', 401)
  // Read current role from DB rather than relying on a stale JWT after role revocation.
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true } })
  if (!user || !canUseCrm(user.role)) throw new CrmError('Bạn không có quyền sử dụng CRM.', 403)
  if(domain && domain.profile.userId!==user.id) throw new CrmError('CRM riêng chỉ dành cho chủ website.',403)
  // ADMIN trên hệ thống không được xem toàn bộ CRM khi đang ở domain chuyên gia.
  return { id: user.id, name: user.name || 'Thành viên #' + user.id, role: domain ? 'TEACHER' : user.role }
}
