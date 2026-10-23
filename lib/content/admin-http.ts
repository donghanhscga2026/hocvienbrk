import { auth } from '@/auth'
import { CrmError } from '@/lib/crm/service'
import { crmResponse } from '@/lib/crm/http'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
export async function contentActor() {
  const session = await auth()
  return session?.user?.id == null ? NaN : Number(session.user.id)
}
export function contentFailure(error: unknown) {
  if (error instanceof CrmError) return crmResponse({ error: error.message }, error.status)
  if (error instanceof ZodError) return crmResponse({ error: error.issues[0]?.message || 'Kiểm tra nội dung.' }, 400)
  if (error instanceof SyntaxError) return crmResponse({ error: 'JSON không hợp lệ.' }, 400)
  if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2025', 'P2003', 'P2034'].includes(error.code)) return crmResponse({ error: 'Dữ liệu đã thay đổi hoặc đường dẫn bị trùng. Tải lại và kiểm tra.' }, 409)
  console.error('[Content CMS]', error instanceof Error ? error.name : 'Unknown')
  return crmResponse({ error: 'Chưa xử lý được nội dung. Vui lòng thử lại.' }, 503)
}
