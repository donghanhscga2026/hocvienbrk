import type { PrismaClient } from '@prisma/client'
import type { CourseEditor } from './permissions'
import { assertCourseEditor } from './permissions'
import { CrmError } from '@/lib/crm/service'

export type PageRevision = { id: string | null; updatedAt: string | null }

/** Chọn mẫu chỉ sửa bản nháp; bản công khai cũ được giữ bằng snapshot bất biến. */
export async function stageTemplate(db: PrismaClient, actor: CourseEditor, slug: string, name: string, snapshot: any, templateKey: string, options?: { revision: PageRevision; codeOnly: true }) {
  await assertCourseEditor(db, actor, { slug })
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'course-page:' + slug}))`
    await assertCourseEditor(tx as PrismaClient, actor, { slug })
    const existing = await tx.coursePage.findUnique({ where: { slug }, include: { sections: { orderBy: { sortOrder: 'asc' } } } })
    if (options && (options.revision.id !== (existing?.id ?? null) || options.revision.updatedAt !== (existing?.updatedAt.toISOString() ?? null))) {
      throw new CrmError('Trang đã thay đổi ở cửa sổ khác. Mã đang sửa được giữ lại; hãy tải lại trang trước khi lưu.', 409)
    }
    const latest = existing ? await tx.coursePageVersion.findFirst({ where: { coursePageId: existing.id }, orderBy: { versionNumber: 'desc' }, select: { versionNumber: true } }) : null
    let version = (latest?.versionNumber || 0) + 1
    if (existing?.status === 'published' && !await tx.coursePageVersion.findFirst({ where: { coursePageId: existing.id, snapshot: { path: ['kind'], equals: 'published' } }, select: { id: true } })) {
      await tx.coursePageVersion.create({ data: { coursePageId: existing.id, versionNumber: version++, snapshot: { kind: 'published', name: existing.name, seo: existing.seo, theme: existing.theme, navigation: existing.navigation, checkoutConfig: existing.checkoutConfig, useTemplate: existing.useTemplate, sections: existing.sections.map(section => ({ sectionKey: section.sectionKey, sectionType: section.sectionType, variant: section.variant, anchorId: section.anchorId, enabled: section.enabled, sortOrder: section.sortOrder, visibility: section.visibility, content: section.content })) } as any } })
    }
    // Sửa code giữ SEO, thanh toán và tên trang; chỉ thay phần giao diện.
    const data = options?.codeOnly
      ? { name: existing?.name || name, seo: { ...(existing?.seo as object || {}), templateKey }, theme: { ...(existing?.theme as object || {}), ...snapshot.theme }, navigation: existing?.navigation || snapshot.navigation || {}, checkoutConfig: existing?.checkoutConfig || snapshot.checkoutConfig || {} }
      : { name, seo: { ...snapshot.seo, templateKey }, theme: snapshot.theme || {}, navigation: snapshot.navigation || {}, checkoutConfig: snapshot.checkoutConfig || {} }
    const page = existing ? await tx.coursePage.update({ where: { id: existing.id }, data }) : await tx.coursePage.create({ data: { slug, ...data, status: 'draft', useTemplate: true } })
    await tx.courseSection.deleteMany({ where: { coursePageId: page.id } })
    await tx.courseSection.createMany({ data: snapshot.sections.map((section: any, index: number) => ({ coursePageId: page.id, sectionKey: section.sectionKey || `section-${index}`, sectionType: section.sectionType || section.type, variant: section.variant || null, anchorId: section.anchorId || null, enabled: section.enabled !== false, sortOrder: section.sortOrder ?? index, visibility: section.visibility || 'all', content: section.content || {} })) })
    // Code đã nằm trong bản nháp hiện tại: không nhân đôi toàn bộ HTML sau mỗi lần lưu.
    if (!options?.codeOnly) await tx.coursePageVersion.create({ data: { coursePageId: page.id, versionNumber: version, snapshot: { ...data, kind: 'manual', useTemplate: true, sections: snapshot.sections } as any } })
    return page
  }, { timeout: 15000 })
}
