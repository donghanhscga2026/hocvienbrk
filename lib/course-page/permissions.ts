import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { domainContext } from '@/lib/website/domain-context'
import { canTeach } from '@/lib/wi300/personal-space'
import { CrmError } from '@/lib/crm/service'
import type { PrismaClient } from '@prisma/client'

export type CourseEditor = { id: number; role: string }
/** Quyền được đọc lại từ DB; không dựa vào role cũ trong phiên đăng nhập. */
export async function courseEditorActor(): Promise<CourseEditor> {
  if (await domainContext()) throw new CrmError('Quản lý mẫu và trang bán tại hệ thống chính.', 403)
  const session = await auth()
  const id = session?.user?.id == null ? NaN : Number(session.user.id)
  if (!Number.isSafeInteger(id) || id < 0) throw new CrmError('Vui lòng đăng nhập.', 401)
  const actor = await prisma.user.findUnique({ where: { id }, select: { role: true } })
  if (!actor || !canTeach(actor.role)) throw new CrmError('Bạn chưa có quyền giảng dạy.', 403)
  return { id, role: actor.role }
}

export async function assertCourseEditor(db: PrismaClient, actor: CourseEditor, target: { slug?: string; pageId?: string }) {
  let slug = target.slug
  if (target.pageId) slug = (await db.coursePage.findUnique({ where: { id: target.pageId }, select: { slug: true } }))?.slug
  if (!slug) throw new CrmError('Không tìm thấy trang bán.', 404)
  const course = await db.course.findUnique({ where: { id_khoa: slug }, select: { teacherId: true } })
  if (actor.role !== 'ADMIN' && (!course || course.teacherId !== actor.id)) throw new CrmError('Bạn không có quyền sửa khóa học này.', 403)
  return slug
}

export async function coursePageActionAccess(target: { slug?: string; pageId?: string }) {
  try { await assertCourseEditor(prisma, await courseEditorActor(), target); return null }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : 'Không có quyền chỉnh trang.' } }
}
