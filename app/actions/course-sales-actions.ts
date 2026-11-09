'use server'

import { revalidatePath } from 'next/cache'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireCourseAccessAction } from '@/lib/course/permissions'
import {
  courseSalesContentKey,
  sanitizeCourseSalesContentInput,
  type CourseSalesContentInput,
} from '@/lib/course-sales-content'

async function loadCourseTeacher(courseId: number) {
  return prisma.course.findUnique({ where: { id: courseId }, select: { id: true, teacherId: true, productGroup: true } })
}

/** Đọc 3 ô nội dung trang bán (dạng thô) để form sửa khóa học hiển thị lại. */
export async function getCourseSalesContentAction(courseId: number) {
  const course = await loadCourseTeacher(courseId)
  if (!course) return { success: false as const, error: 'Không tìm thấy khóa học' }
  const { denied } = await requireCourseAccessAction(course.teacherId)
  if (denied) return { success: false as const, error: 'Không có quyền sửa khóa học này' }
  const row = await prisma.systemConfig.findUnique({ where: { key: courseSalesContentKey(courseId) }, select: { value: true } })
  return { success: true as const, content: sanitizeCourseSalesContentInput(row?.value) }
}

/** Lưu 3 ô nội dung trang bán. Chỉ dùng cho khóa học (nhóm COURSE). */
export async function saveCourseSalesContentAction(courseId: number, raw: CourseSalesContentInput) {
  const course = await loadCourseTeacher(courseId)
  if (!course) return { success: false as const, error: 'Không tìm thấy khóa học' }
  if (course.productGroup !== 'COURSE') return { success: false as const, error: 'Nội dung trang bán chỉ dùng cho khóa học' }
  const { denied } = await requireCourseAccessAction(course.teacherId)
  if (denied) return { success: false as const, error: 'Không có quyền sửa khóa học này' }
  const content = sanitizeCourseSalesContentInput(raw)
  const key = courseSalesContentKey(courseId)
  const value = content as unknown as Prisma.InputJsonValue
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
  revalidatePath('/khoa-hoc/[id]', 'page')
  return { success: true as const }
}
