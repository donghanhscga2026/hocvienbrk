import { Prisma } from '@prisma/client'
import { crmFailure, crmResponse } from '@/lib/crm/http'

export function websiteFailure(error: unknown) {
  if(error instanceof Prisma.PrismaClientKnownRequestError && ['P2021','P2022'].includes(error.code)) return crmResponse({ error: 'Website chưa được khởi tạo đầy đủ. Quản trị viên cần áp dụng migration của bản đang chạy.' },503)
  return crmFailure(error)
}
