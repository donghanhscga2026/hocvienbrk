import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { CrmError } from '@/lib/crm/service'
import { computeLessonDeadlineUTC } from './deadline'
import { exportDate, type ExportSheet, type ExportCell } from './export-workbook'

export const memberExportInput = z.object({
  courseIds: z.array(z.number().int().positive()).min(1).max(50).refine(ids => new Set(ids).size === ids.length),
  status: z.enum(['ALL', 'ACTIVE', 'PENDING']).default('ALL'),
  reports: z.boolean().default(false),
  format: z.enum(['EXCEL', 'GOOGLE']).default('EXCEL'),
  userIds: z.array(z.number().int().nonnegative()).min(1).max(10000).optional(),
}).strict()
export type MemberExportInput = z.infer<typeof memberExportInput>
type Actor = { id: number; role: string }

// Xuất số điểm/trạng thái đã lưu; không chấm lại, không đổi hạn nộp hoặc dữ liệu.
export function exportedProgressState(progress: { status: string; scores: unknown; submittedAt: Date | null } | undefined, deadline: number, now: number) {
  if (progress?.status === 'COMPLETED') return (progress.scores as { timing?: number } | null)?.timing === -1 ? 'Đã hoàn thành, nộp muộn' : 'Đã hoàn thành, đúng hạn'
  if (progress?.submittedAt) return now > deadline ? 'Đã nộp, chưa hoàn thành, quá hạn' : 'Đã nộp, chưa hoàn thành'
  return now > deadline ? 'Chưa nộp, quá hạn' : 'Chưa nộp, chưa tới hạn'
}
export async function memberExportSheets(db: PrismaClient, actor: Actor, raw: unknown, now = new Date()) {
  const input = memberExportInput.parse(raw)
  if (!['ADMIN', 'TEACHER', 'INSTRUCTOR'].includes(actor.role)) throw new CrmError('Bạn không có quyền xuất thông tin học viên.', 403)
  const courses = await db.course.findMany({ where: { id: { in: input.courseIds }, ...(actor.role === 'ADMIN' ? {} : { teacherId: actor.id }) }, select: { id: true, id_khoa: true, name_lop: true }, orderBy: { id: 'asc' } })
  if (courses.length !== input.courseIds.length) throw new CrmError('Bạn không có quyền xuất một số khóa học đã chọn.', 403)
  const where = { courseId: { in: input.courseIds }, ...(input.status === 'ALL' ? {} : { status: input.status }), ...(input.userIds ? { userId: { in: input.userIds } } : {}) }
  const count = await db.enrollment.count({ where })
  if (!count) throw new CrmError('Không có học viên phù hợp với lựa chọn xuất.')
  if (count > 10000) throw new CrmError('Báo cáo vượt 10.000 lượt đăng ký. Chọn ít khóa hoặc lọc học viên để xuất.')
  const lessons = input.reports ? await db.lesson.findMany({ where: { courseId: { in: input.courseIds } }, select: { id: true, courseId: true, order: true, title: true }, orderBy: [{ courseId: 'asc' }, { order: 'asc' }, { id: 'asc' }] }) : []
  if (input.reports && count * Math.max(1, lessons.length) > 200000) throw new CrmError('Báo cáo quá lớn. Xuất từng khóa hoặc chỉ xuất danh sách học viên.')
  const enrollments = await db.enrollment.findMany({ where, take: 10001, orderBy: [{ courseId: 'asc' }, { userId: 'asc' }], select: { id: true, courseId: true, status: true, createdAt: true, activatedAt: true, startedAt: true, memberRole: true, team: true, group: true, user: { select: { id: true, name: true, phone: true, email: true } }, ...(input.reports ? { lessonProgress: { where: { status: { not: 'RESET' }, lesson: { courseId: { in: input.courseIds } } }, select: { lessonId: true, status: true, scores: true, totalScore: true, submittedAt: true, assignment: true } } } : {}) } })
  if (enrollments.length > 10000) throw new CrmError('Có thêm đăng ký trong lúc xuất. Hãy thu hẹp phạm vi xuất.')
  const courseMap = new Map(courses.map(course => [course.id, course]))
  const identity = (entry: typeof enrollments[number]): ExportCell[] => [String(entry.user.id), entry.user.name || '', entry.user.phone?.startsWith('+84') ? '0' + entry.user.phone.slice(3) : entry.user.phone || '', entry.user.email || '', courseMap.get(entry.courseId)!.id_khoa, courseMap.get(entry.courseId)!.name_lop]
  const statusLabels: Record<string, string> = { ACTIVE: 'Đã kích hoạt', PENDING: 'Chờ kích hoạt', CANCELLED: 'Đã hủy', COMPLETED: 'Hoàn thành', EXPIRED: 'Hết hạn' }
  const headers = ['Mã thành viên', 'Họ tên', 'Số điện thoại', 'Email', 'Mã khóa học', 'Khóa học đăng ký']
  const sheets: ExportSheet[] = [{ name: 'Danh sách học viên', headers: ['STT', ...headers, 'Ngày đăng ký (giờ VN)', 'Ngày kích hoạt (giờ VN)', 'Ngày bắt đầu học', 'Trạng thái đăng ký', 'Vai trò', 'Team', 'Group'], rows: enrollments.map((entry, index) => [index + 1, ...identity(entry), exportDate(entry.createdAt), exportDate(entry.activatedAt), exportDate(entry.startedAt, true), statusLabels[entry.status] || entry.status, entry.memberRole, entry.team, entry.group]), widths: [8, 18, 28, 20, 32, 20, 40] }]
  if (input.reports) {
    const reportRows: ExportCell[][] = [], summaryRows: ExportCell[][] = []
    for (const entry of enrollments) {
      const ownLessons = lessons.filter(lesson => lesson.courseId === entry.courseId)
      const progress = new Map(entry.lessonProgress?.map(item => [item.lessonId, item]) || [])
      let submitted = 0, completed = 0, onTime = 0
      for (const lesson of ownLessons) {
        const p = progress.get(lesson.id)
        const deadline = computeLessonDeadlineUTC(entry.startedAt || entry.activatedAt || entry.createdAt, lesson.order)
        if (p?.submittedAt) submitted++
        if (p?.status === 'COMPLETED') { completed++; if ((p.scores as { timing?: number } | null)?.timing !== -1) onTime++ }
        const assignment = p?.assignment as { reflection?: string; links?: unknown[]; supports?: boolean[] } | null
        reportRows.push([...identity(entry), lesson.order, lesson.title, exportedProgressState(p, deadline, now.getTime()), exportDate(p?.submittedAt), p?.submittedAt ? p.totalScore : null, typeof assignment?.reflection === 'string' ? assignment.reflection : '', Array.isArray(assignment?.links) ? assignment.links.filter(item => typeof item === 'string').join('\n') : '', Array.isArray(assignment?.supports) ? assignment.supports.filter(Boolean).length : null])
      }
      summaryRows.push([...identity(entry), ownLessons.length, submitted, completed, onTime, completed - onTime, ...lessons.map(lesson => lesson.courseId !== entry.courseId ? '' : exportedProgressState(progress.get(lesson.id), computeLessonDeadlineUTC(entry.startedAt || entry.activatedAt || entry.createdAt, lesson.order), now.getTime()))])
    }
    sheets.push({ name: 'Tổng hợp nộp bài', headers: [...headers, 'Tổng bài', 'Số bài đã nộp', 'Số bài hoàn thành', 'Hoàn thành đúng hạn', 'Hoàn thành nộp muộn', ...lessons.map(lesson => `${courseMap.get(lesson.courseId)!.id_khoa} · Bài ${lesson.order}: ${lesson.title}`)], rows: summaryRows })
    sheets.push({ name: 'Chi tiết bài nộp', headers: [...headers, 'Thứ tự bài', 'Tên bài học', 'Tình trạng bài', 'Thời gian nộp (giờ VN)', 'Điểm hiện tại', 'Nội dung báo cáo', 'Link minh chứng', 'Số minh chứng hỗ trợ'], rows: reportRows, widths: [18, 28, 20, 32, 18, 35, 12, 35, 38, 25, 18, 65, 60, 20] })
  }
  sheets.push({ name: 'Thông tin báo cáo', headers: ['Thông tin', 'Giá trị'], rows: [['Xuất lúc (giờ Việt Nam)', exportDate(now)], ['Phạm vi khóa học', courses.map(course => `${course.id_khoa}: ${course.name_lop}`).join('\n')], ['Trạng thái đăng ký', input.status === 'ALL' ? 'Tất cả trạng thái' : statusLabels[input.status]], ['Số lượt đăng ký', enrollments.length], ['Phạm vi học viên', input.userIds ? 'Theo danh sách học viên đang lọc' : 'Tất cả học viên thuộc khóa đã chọn'], ['Quy tắc báo cáo', 'Điểm và trạng thái hoàn thành dùng dữ liệu đang lưu. Đã nộp không đồng nghĩa đã hoàn thành. Bài RESET thuộc lộ trình cũ không được tính.'], ['Tỷ lệ/nhóm', 'Báo cáo xuất toàn bộ người phù hợp bộ lọc, không loại Team chưa có Phụng sự hoặc nhóm tạm dừng như một số thống kê dashboard.'], ['Ô trống', 'Số điện thoại/email chưa có để trống; điểm chỉ có khi tồn tại bài nộp hiện tại.']] })
  return { sheets, input, total: enrollments.length, title: courses.length === 1 ? courses[0].name_lop : `${courses.length} khóa học` }
}
