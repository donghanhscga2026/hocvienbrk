import type { Prisma, PrismaClient } from '@prisma/client'
import { canUseCrm, type CrmActor } from './shared'
import { CrmError } from './service'

// Xuất danh sách tài khoản website mới theo khoảng ngày Việt Nam, trong đúng
// phạm vi phụ trách như mục "Data hôm nay": quản trị thấy toàn bộ tài khoản,
// giáo viên chỉ thấy tài khoản đã ghi danh vào khóa của mình. Chỉ đọc.
// Ngày người dùng chọn là nhãn ngày thuần (yyyy-mm-dd) theo lịch Việt Nam:
// từ 00:00 ngày bắt đầu tới hết ngày kết thúc, không quy đổi thêm lần nào.
export const ACCOUNTS_EXPORT_MAX_DAYS = 366
export const ACCOUNTS_EXPORT_MAX_ROWS = 5000

const DAY_MS = 86400000
const dayLabelFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })

export function vietnamDayLabel(date: Date) {
  return dayLabelFormat.format(date)
}

function parseDayStart(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CrmError(field + ' không hợp lệ.', 400)
  const start = new Date(value + 'T00:00:00+07:00')
  // Đối chiếu vòng lại để loại ngày không có thật (ví dụ 30/02 tự tràn sang tháng 3).
  if (Number.isNaN(start.getTime()) || vietnamDayLabel(start) !== value) throw new CrmError(field + ' không hợp lệ.', 400)
  return start
}

export function accountsExportBounds(from: string, to: string) {
  const start = parseDayStart(from, 'Ngày bắt đầu')
  const lastDayStart = parseDayStart(to, 'Ngày kết thúc')
  if (start.getTime() > lastDayStart.getTime()) throw new CrmError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.', 400)
  const end = new Date(lastDayStart.getTime() + DAY_MS)
  if ((end.getTime() - start.getTime()) / DAY_MS > ACCOUNTS_EXPORT_MAX_DAYS) {
    throw new CrmError('Khoảng ngày xuất tối đa ' + ACCOUNTS_EXPORT_MAX_DAYS + ' ngày. Hãy thu hẹp khoảng ngày.', 400)
  }
  return { start, end }
}

export type NewAccountExportRow = {
  id: number
  name: string | null
  email: string
  phone: string | null
  role: string
  createdAt: Date
  emailVerified: Date | null
  affiliateCode: string | null
  referrerId: number | null
  referrer: { name: string | null } | null
}

const vnDateTimeFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
export function formatVietnamDateTime(value: Date) {
  const part = (type: string) => vnDateTimeFormat.formatToParts(value).find(p => p.type === type)?.value || ''
  return part('day') + '/' + part('month') + '/' + part('year') + ' ' + part('hour') + ':' + part('minute')
}

// Chống Excel/Sheets diễn giải nhầm: ô bắt đầu bằng =, +, -, @ hoặc số 0 đứng đầu
// (số điện thoại Việt Nam) phải được ép kiểu chữ bằng dấu ' ở đầu.
function csvCell(value: string) {
  let text = value
  if (/^[=+\-@]/.test(text) || /^0\d/.test(text)) text = "'" + text
  return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
}

export function buildAccountsCsv(rows: NewAccountExportRow[], now: Date) {
  const header = ['STT', 'ID', 'Họ và tên', 'Email', 'Số điện thoại', 'Ngày đăng ký (giờ VN)', 'Vai trò', 'Người giới thiệu', 'ID người giới thiệu', 'Email đã xác minh', 'Mã affiliate', 'Ghi chú']
  const lines = rows.map((row, index) => [
    String(index + 1),
    String(row.id),
    row.name ?? '',
    row.email,
    row.phone ?? '',
    formatVietnamDateTime(row.createdAt),
    row.role,
    row.referrer?.name ?? '',
    row.referrerId != null ? String(row.referrerId) : '',
    row.emailVerified ? 'Có' : 'Chưa',
    row.affiliateCode ?? '',
    row.createdAt.getTime() > now.getTime() ? 'Ngày đăng ký trong hệ thống nằm ở tương lai, cần kiểm tra lại' : '',
  ].map(csvCell).join(','))
  return '﻿' + [header.map(csvCell).join(','), ...lines].join('\n') + '\n'
}

export async function readNewAccountsExport(
  db: PrismaClient,
  actor: CrmActor,
  input: { from?: string; to?: string },
  now = new Date(),
) {
  if (!canUseCrm(actor.role)) throw new CrmError('Bạn không có quyền sử dụng CRM.', 403)
  const to = input.to || vietnamDayLabel(now)
  const toStart = parseDayStart(to, 'Ngày kết thúc')
  const from = input.from || vietnamDayLabel(new Date(toStart.getTime() - 29 * DAY_MS))
  const { start, end } = accountsExportBounds(from, to)
  const where: Prisma.UserWhereInput = actor.role === 'ADMIN'
    ? { createdAt: { gte: start, lt: end } }
    : { createdAt: { gte: start, lt: end }, enrollments: { some: { course: { teacherId: actor.id } } } }
  const total = await db.user.count({ where })
  if (total > ACCOUNTS_EXPORT_MAX_ROWS) {
    throw new CrmError('Khoảng ngày này có ' + total + ' tài khoản, vượt giới hạn xuất ' + ACCOUNTS_EXPORT_MAX_ROWS + ' tài khoản mỗi lần. Hãy thu hẹp khoảng ngày.', 400)
  }
  const rows = await db.user.findMany({
    where,
    select: {
      id: true, name: true, email: true, phone: true, role: true, createdAt: true,
      emailVerified: true, affiliateCode: true, referrerId: true,
      referrer: { select: { name: true } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: ACCOUNTS_EXPORT_MAX_ROWS,
  })
  return {
    filename: 'tai-khoan-moi-' + from + '-' + to + '.csv',
    total,
    csv: buildAccountsCsv(rows as NewAccountExportRow[], now),
  }
}
