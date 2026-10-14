import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { domainContext } from '@/lib/website/domain-context'
import { createCoursePageFromTemplate, COURSE_TEMPLATE_LIBRARY } from '@/lib/course-page/templates'
import TemplateRenderedPreview from '@/components/course/TemplateRenderedPreview'
import type { CoursePage } from '@/lib/course-page/types'

export default async function Page({ searchParams }: { searchParams: Promise<{ system?: string; id?: string; page?: string; token?: string }> }) {
  if (await domainContext()) notFound()
  const session = await auth(), id = session?.user?.id == null ? NaN : Number(session.user.id)
  if (!Number.isSafeInteger(id) || id < 0 || (await prisma.user.findUnique({ where: { id }, select: { role: true } }))?.role !== 'ADMIN') return <p className="p-4 text-sm">Đăng nhập quản trị viên để xem mẫu.</p>
  const params = await searchParams
  const system = COURSE_TEMPLATE_LIBRARY.find(item => item.key === params.system)
  let page: CoursePage
  if (params.page) {
    const saved = await prisma.coursePage.findUnique({ where: { id: params.page }, include: { sections: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } } })
    if (!saved) notFound()
    page = { ...saved, useTemplate: true } as unknown as CoursePage
  } else if (system) page = createCoursePageFromTemplate(system.key, 'template-preview')
  else if (params.id) {
    const template = await prisma.coursePageTemplate.findUnique({ where: { id: params.id }, select: { snapshot: true } })
    if (!template) notFound()
    const snapshot = template.snapshot as any
    page = { ...snapshot, id: 'preview', slug: 'template-preview', status: 'draft', sections: (snapshot.sections || []).map((section: any, index: number) => ({ ...section, id: `preview-${index}`, type: section.sectionType })) }
  } else notFound()
  return <TemplateRenderedPreview page={page} exportable={Boolean((system || params.page && !page.sections.some(section => section.variant === 'zip-source-v1')) && params.token)} token={params.token || ''} />
}
