import { Prisma } from '@prisma/client'
import { crmFailure, crmResponse } from '@/lib/crm/http'

export function websiteFailure(error: unknown) {
  if(error instanceof Prisma.PrismaClientKnownRequestError && ['P2021','P2022'].includes(error.code)) return crmResponse({ error: 'Trình thiết kế chưa được khởi tạo. Quản trị viên cần áp dụng migration SiteWebsite trước.' },503)
  return crmFailure(error)
}
