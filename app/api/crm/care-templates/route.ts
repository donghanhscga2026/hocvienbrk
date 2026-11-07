import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { careScopeCourseIds } from '@/lib/care/queue'
import { createCareTemplate, listVisibleTemplates } from '@/lib/care/templates-store'
export const dynamic = 'force-dynamic'

const createSchema = z.object({
  shortcut: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
  body: z.string().min(1).max(2200),
  scope: z.enum(['SYSTEM', 'COURSE', 'PERSONAL']),
  courseId: z.number().int().positive().nullable().optional(),
}).strict()

/**
 * Thư viện câu mẫu Care Engine GĐ2: danh sách theo quyền xem (mẫu hệ
 * thống mọi người thấy, mẫu theo khóa chỉ GV khóa đó, mẫu cá nhân chỉ
 * chủ sở hữu — admin thấy tất cả). Kèm danh sách khóa trong phạm vi để
 * UI dựng bộ lọc/biểu mẫu.
 */
export async function GET(request: Request) {
  try {
    const actor = await getCrmActor()
    const url = new URL(request.url)
    const scopeParam = url.searchParams.get('scope')
    const scope = scopeParam === 'SYSTEM' || scopeParam === 'COURSE' || scopeParam === 'PERSONAL' ? scopeParam : null
    const courseIdParam = Number(url.searchParams.get('courseId'))
    const { templates } = await listVisibleTemplates(actor, {
      q: url.searchParams.get('q') || '',
      scope,
      courseId: Number.isInteger(courseIdParam) && courseIdParam > 0 ? courseIdParam : null,
      includeInactive: url.searchParams.get('includeInactive') === '1',
    })
    const courseIds = await careScopeCourseIds(actor)
    const courses = await prisma.course.findMany({
      where: courseIds ? { id: { in: courseIds } } : undefined,
      select: { id: true, name_khoa: true, name_lop: true },
      orderBy: { id: 'asc' },
      take: 300,
    })
    return crmResponse({
      templates,
      courses: courses.map((c) => ({ id: c.id, name: c.name_khoa || c.name_lop || `Khóa học #${c.id}` })),
      isAdmin: actor.role === 'ADMIN',
    })
  } catch (e) { return crmFailure(e) }
}

export async function POST(request: Request) {
  try {
    const raw = await crmBody(request, 8000)
    const actor = await getCrmActor()
    const input = createSchema.parse(raw)
    const template = await createCareTemplate(actor, {
      shortcut: input.shortcut,
      name: input.name,
      body: input.body,
      scope: input.scope,
      courseId: input.courseId ?? null,
    })
    return crmResponse({ template }, 201)
  } catch (e) { return crmFailure(e) }
}
