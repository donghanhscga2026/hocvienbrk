import type { Prisma, PrismaClient } from '@prisma/client'
import { canUseCrm, contactScope, vietnamDayBounds, type CrmActor } from './shared'
import { requestScope } from './requests'
import { CrmError } from './service'

// "Data hôm nay": mọi đăng ký chảy vào website trong ngày Việt Nam hiện tại,
// trong đúng phạm vi phụ trách của người xem — hồ sơ CRM mới, yêu cầu mới
// và tài khoản website mới. Chỉ đọc; không ghi, không gộp, không suy luận
// danh tính giữa các nguồn (một người có thể xuất hiện ở cả ba danh sách).
export async function readToday(db: PrismaClient, actor: CrmActor, page = 1, now = new Date()) {
  if (!canUseCrm(actor.role)) throw new CrmError('Bạn không có quyền sử dụng CRM.', 403)
  const { start, end } = vietnamDayBounds(now)
  const createdToday = { gte: start, lt: end }
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

  const contactWhere: Prisma.CrmContactWhereInput = { ...contactScope(actor), archived: false, createdAt: createdToday }
  const requestWhere: Prisma.CrmRequestWhereInput = { AND: [requestScope(actor)], createdAt: createdToday }
  // Tài khoản website là dữ liệu toàn hệ thống: quản trị xem tất cả, giáo viên
  // chỉ thấy tài khoản đã ghi danh vào khóa của mình (khớp phạm vi học viên CRM).
  const userWhere: Prisma.UserWhereInput = actor.role === 'ADMIN'
    ? { createdAt: createdToday }
    : { createdAt: createdToday, enrollments: { some: { course: { teacherId: actor.id } } } }

  const [contactsTotal, contactsBySource, contacts, requestsTotal, requests, newUsersTotal, newUsers] = await Promise.all([
    db.crmContact.count({ where: contactWhere }),
    db.crmContact.groupBy({ by: ['source'], where: contactWhere, _count: { _all: true }, orderBy: { _count: { source: 'desc' } }, take: 20 }),
    db.crmContact.findMany({
      where: contactWhere,
      select: { id: true, name: true, email: true, phone: true, source: true, createdAt: true, owner: { select: { id: true, name: true, email: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20, skip: (page - 1) * 20,
    }),
    db.crmRequest.count({ where: requestWhere }),
    db.crmRequest.findMany({
      where: requestWhere,
      select: { id: true, name: true, email: true, phone: true, source: true, status: true, content: true, createdAt: true, contactId: true, course: { select: { name_lop: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20,
    }),
    db.user.count({ where: userWhere }),
    db.user.findMany({
      where: userWhere,
      select: { id: true, name: true, email: true, phone: true, createdAt: true, referrerId: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20,
    }),
  ])
  return {
    date,
    stats: { contacts: contactsTotal, requests: requestsTotal, newUsers: newUsersTotal },
    contactsBySource: contactsBySource.map(row => ({ label: row.source, count: row._count._all })),
    contacts, contactsTotal, page,
    requests, requestsTotal,
    newUsers, newUsersTotal,
    generatedAt: now.toISOString(),
  }
}
