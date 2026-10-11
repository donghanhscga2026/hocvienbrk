import type { PrismaClient } from '@prisma/client'
import type { CrmActor } from './shared'
import { canUseCrm } from './shared'
import { CrmError } from './service'

// Kiểm tra quyền hiện tại mỗi lần mở liên kết CRM, không dựa vào ID trên URL.
export async function crmCourseAccess(db: PrismaClient, actor: CrmActor, courseId: number, studentId?: number) {
  if (!canUseCrm(actor.role)) throw new CrmError('Bạn chưa được cấp quyền CRM.', 403)
  const course = await db.course.findFirst({ where: { id: courseId, ...(actor.role === 'ADMIN' ? {} : { teacherId: actor.id }) }, select: { id: true, name_lop: true } })
  if (!course) throw new CrmError('Bạn không phụ trách khóa học này.', 404)
  if (studentId !== undefined && !await db.enrollment.findFirst({ where: { courseId, userId: studentId, status: 'ACTIVE' }, select: { id: true } })) throw new CrmError('Học viên chưa có đăng ký đang hoạt động trong khóa học này.', 404)
  return course
}
