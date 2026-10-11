import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { crmCourseAccess } from '@/lib/crm/course-access'
import { CrmError } from '@/lib/crm/service'
import { requireDomainCourse } from '@/lib/website/domain-context'
import CrmCourseDashboard from '@/components/crm/CrmCourseDashboard'

export const dynamic = 'force-dynamic'
export default async function CrmCoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params
  const query = z.object({ view: z.enum(['feed', 'members']).default('feed'), student: z.coerce.number().int().nonnegative().optional() }).safeParse(await searchParams)
  const courseId = z.coerce.number().int().positive().safeParse(id)
  if (!query.success || !courseId.success) notFound()
  let course: Awaited<ReturnType<typeof crmCourseAccess>>
  try {
    const actor = await getCrmActor()
    await requireDomainCourse(courseId.data)
    course = await crmCourseAccess(prisma, actor, courseId.data, query.data.student)
  } catch (error) {
    if (error instanceof CrmError && error.status === 401) redirect('/login?callbackUrl=' + encodeURIComponent('/tools/crm/course/' + id + '?' + new URLSearchParams({ view: query.data.view, ...(query.data.student !== undefined ? { student: String(query.data.student) } : {}) })))
    if (error instanceof CrmError && [403, 404].includes(error.status)) notFound()
    throw error
  }
  return <CrmCourseDashboard courseId={course.id} courseName={course.name_lop} view={query.data.view} studentId={query.data.student} />
}
