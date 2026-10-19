import { notFound } from 'next/navigation'
import { courseEditorActor, assertCourseEditor } from '@/lib/course-page/permissions'
import { readLibraryTemplate } from '@/lib/course-page/template-library'
import { compileTemplateSource } from '@/lib/course-page/template-source'
import prisma from '@/lib/prisma'
import { domainContext } from '@/lib/website/domain-context'
import { createCoursePageFromTemplate, COURSE_TEMPLATE_LIBRARY } from '@/lib/course-page/templates'
import TemplateRenderedPreview from '@/components/course/TemplateRenderedPreview'
import type { CoursePage } from '@/lib/course-page/types'

export default async function Page({ searchParams }: { searchParams: Promise<{ system?: string; id?: string; page?: string; token?: string; version?: string }> }) {
  if (await domainContext()) notFound()
  let actor
  try { actor = await courseEditorActor() } catch { return <p className="p-4 text-sm">Đăng nhập tài khoản có quyền giảng dạy để xem mẫu.</p> }
  const params = await searchParams
  const system = COURSE_TEMPLATE_LIBRARY.find(item => item.key === params.system)
  let page: CoursePage
  if (params.version) {
    if (actor.role !== 'ADMIN') notFound()
    const version = await prisma.coursePageVersion.findUnique({ where: { id: params.version }, select: { snapshot: true } })
    if (!version) notFound()
    const snapshot = version.snapshot as any
    page = { ...snapshot, id: 'preview', slug: 'history-preview', status: 'draft', useTemplate: true, sections: (snapshot.sections || []).map((section: any, index: number) => ({ ...section, id: `preview-${index}`, type: section.sectionType || section.type })) }
  } else if (params.page) {
    try { await assertCourseEditor(prisma, actor, { pageId: params.page }) } catch { notFound() }
    const saved = await prisma.coursePage.findUnique({ where: { id: params.page }, include: { sections: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } } })
    if (!saved) notFound()
    page = { ...saved, useTemplate: true } as unknown as CoursePage
  } else if (system) page = createCoursePageFromTemplate(system.key, 'template-preview')
  else if (params.id) {
    if (/^(shared|private:)/.test(params.id)) {
      let stored
      try { stored = await readLibraryTemplate(prisma, actor, params.id) } catch { notFound() }
      const html = compileTemplateSource(stored.source).html
      page = { id: 'preview', slug: 'template-preview', name: stored.template.name, status: 'draft', useTemplate: true, seo: {}, theme: {}, navigation: {}, checkoutConfig: {}, sections: [{ id: 'source', sectionKey: 'source', type: 'rich_content', variant: 'zip-source-v1', enabled: true, sortOrder: 0, visibility: 'all', content: { exactSource: { html } } }] } as unknown as CoursePage
    } else {
      if (actor.role !== 'ADMIN') notFound()
      const template = await prisma.coursePageTemplate.findUnique({ where: { id: params.id }, select: { snapshot: true } })
      if (!template) notFound()
      const snapshot = template.snapshot as any
      page = { ...snapshot, id: 'preview', slug: 'template-preview', status: 'draft', sections: (snapshot.sections || []).map((section: any, index: number) => ({ ...section, id: `preview-${index}`, type: section.sectionType })) }
    }
  } else notFound()
  return <TemplateRenderedPreview page={page} exportable={Boolean(!params.version && (system || params.page && !page.sections.some(section => section.variant === 'zip-source-v1')) && params.token)} token={params.token || ''} />
}
