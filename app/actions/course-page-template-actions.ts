'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdminAction } from '@/lib/api-auth'
import { resolveImageUrl } from '@/lib/image-utils'
import {
  ImportedSectionCandidate,
  StoredTemplateSnapshot,
  WebsiteTemplateAnalysis,
} from '@/lib/course-page/importer/types'

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'website-template'
}

function replaceStrings(value: unknown, replacements: Map<string, string>): unknown {
  if (typeof value === 'string') return replacements.get(value) || value
  if (Array.isArray(value)) return value.map(item => replaceStrings(item, replacements))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        replaceStrings(item, replacements),
      ]),
    )
  }
  return value
}

async function mirrorSelectedImages(
  analysis: WebsiteTemplateAnalysis,
  selectedSectionIds: string[],
): Promise<WebsiteTemplateAnalysis> {
  const selected = new Set(selectedSectionIds)
  const urls = Array.from(new Set(
    analysis.sections
      .filter(section => selected.has(section.id))
      .flatMap(section => section.images || [])
      .map(image => image.src)
      .filter(src => /^https?:\/\//i.test(src)),
  )).slice(0, 50)

  if (!urls.length) return jsonSafe(analysis)

  const replacements = new Map<string, string>()
  for (let i = 0; i < urls.length; i += 4) {
    const batch = urls.slice(i, i + 4)
    const resolved = await Promise.all(
      batch.map(url => resolveImageUrl(url, 'course-templates')),
    )
    batch.forEach((url, index) => {
      const stored = resolved[index]
      if (stored) replacements.set(url, stored)
    })
  }

  return replaceStrings(jsonSafe(analysis), replacements) as WebsiteTemplateAnalysis
}

function mapImportedSection(section: ImportedSectionCandidate, sortOrder: number) {
  return {
    sectionKey: section.sourceId || `imported-${sortOrder + 1}`,
    sectionType: section.sectionType,
    variant: 'imported-v1',
    anchorId: section.sourceId || null,
    enabled: true,
    sortOrder,
    visibility: 'all' as const,
    content: jsonSafe({
      ...section.content,
      design: section.design,
      importedMeta: {
        label: section.label,
        sourceClass: section.sourceClass,
        confidence: section.confidence,
      },
      importedSource: {
        sectionType: section.sectionType,
        heading: section.heading,
        paragraphs: section.paragraphs,
        listItems: section.listItems,
        cards: section.cards,
        tableRows: section.tableRows,
        images: section.images,
        actions: section.actions,
        faqItems: section.faqItems,
        formFields: section.formFields,
      },
    }),
  }
}

function buildSnapshot(
  name: string,
  analysis: WebsiteTemplateAnalysis,
  selectedSectionIds: string[],
): StoredTemplateSnapshot {
  const byId = new Map(analysis.sections.map(section => [section.id, section]))
  const selected = selectedSectionIds
    .map(id => byId.get(id))
    .filter((section): section is ImportedSectionCandidate => Boolean(section))

  if (!selected.length) throw new Error('Hãy chọn ít nhất một phần trước khi tạo mẫu')

  const primaryColor = analysis.theme.primaryColor || '#6D28D9'
  const secondaryColor = analysis.theme.secondaryColor || '#F4C430'
  const backgroundColor = analysis.theme.backgroundColor || '#FFFFFF'
  const textColor = analysis.theme.textColor || '#1F2937'

  return {
    name,
    seo: {
      title: analysis.title || name,
      description: analysis.description || '',
      importedFrom: analysis.finalUrl || analysis.sourceUrl || null,
    },
    theme: {
      primaryColor,
      secondaryColor,
      backgroundColor,
      textColor,
      headingFont: analysis.theme.headingFont,
      bodyFont: analysis.theme.bodyFont,
      borderRadius: analysis.theme.borderRadius || '18px',
      containerWidth: analysis.theme.containerWidth || '1120px',
      importedLayout: true,
    },
    navigation: {
      shortName: name,
      ctaText: 'Đăng ký ngay',
      sticky: true,
    },
    checkoutConfig: {
      enabled: true,
      provider: 'vietqr',
      currency: 'VND',
      paymentDescriptionPrefix: 'CK',
      orderExpirationMinutes: 15,
      registrationFields: [
        { name: 'fullName', label: 'Họ và tên', type: 'text', required: true },
        { name: 'phone', label: 'Số điện thoại', type: 'tel', required: true },
      ],
      successMode: 'show_message',
    },
    useTemplate: true,
    sections: selected.map((section, index) => mapImportedSection(section, index)),
  }
}

export async function getStoredCoursePageTemplates() {
  const denied = await requireAdminAction()
  if (denied) return denied

  try {
    const templates = await prisma.coursePageTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        sourceUrl: true,
        sourceType: true,
        thumbnailUrl: true,
        analysis: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return { success: true, templates }
  } catch (error: any) {
    console.error('[CoursePageTemplate] List error:', error)
    return { success: false, error: error.message || 'Không thể tải thư viện mẫu', templates: [] }
  }
}

export async function getStoredCoursePageTemplateOptions() {
  const denied = await requireAdminAction()
  if (denied) return denied

  try {
    const templates = await prisma.coursePageTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, key: true, name: true },
    })
    return { success: true, templates }
  } catch (error: any) {
    console.error('[CoursePageTemplate] Options error:', error)
    return { success: false, error: error.message || 'Không thể tải danh sách mẫu', templates: [] }
  }
}

export async function createStoredCoursePageTemplate(input: {
  name: string
  description?: string
  analysis: WebsiteTemplateAnalysis
  selectedSectionIds: string[]
}) {
  const denied = await requireAdminAction()
  if (denied) return denied

  try {
    const name = input.name?.trim()
    if (!name) return { success: false, error: 'Vui lòng đặt tên cho mẫu' }
    if (!input.analysis?.sections?.length) return { success: false, error: 'Chưa có kết quả phân tích website' }

    // Mirror external images into our own storage before persisting the template.
    // If a remote image cannot be downloaded, resolveImageUrl safely keeps the
    // original URL so template creation is not blocked.
    const storedAnalysis = await mirrorSelectedImages(input.analysis, input.selectedSectionIds)
    const snapshot = buildSnapshot(name, storedAnalysis, input.selectedSectionIds)
    const key = `custom-${slugify(name)}-${Date.now().toString(36)}`
    const firstImage = storedAnalysis.sections
      .filter(section => input.selectedSectionIds.includes(section.id))
      .flatMap(section => section.images || [])
      .find(image => /^https?:\/\//i.test(image.src))

    const template = await prisma.coursePageTemplate.create({
      data: {
        key,
        name,
        description: input.description?.trim() || null,
        sourceUrl: storedAnalysis.finalUrl || storedAnalysis.sourceUrl || null,
        sourceType: storedAnalysis.sourceType,
        thumbnailUrl: firstImage?.src || null,
        snapshot: jsonSafe(snapshot) as any,
        analysis: jsonSafe({
          ...storedAnalysis,
          sections: storedAnalysis.sections.map(section => ({
            ...section,
            enabled: input.selectedSectionIds.includes(section.id),
          })),
        }) as any,
      },
    })

    revalidatePath('/tools/courses/templates')
    return { success: true, template: { id: template.id, key: template.key, name: template.name } }
  } catch (error: any) {
    console.error('[CoursePageTemplate] Create error:', error)
    return { success: false, error: error.message || 'Không thể tạo mẫu từ website' }
  }
}

export async function deleteStoredCoursePageTemplate(templateId: string) {
  const denied = await requireAdminAction()
  if (denied) return denied

  try {
    await prisma.coursePageTemplate.delete({ where: { id: templateId } })
    revalidatePath('/tools/courses/templates')
    return { success: true }
  } catch (error: any) {
    console.error('[CoursePageTemplate] Delete error:', error)
    return { success: false, error: error.message || 'Không thể xóa mẫu' }
  }
}

export async function applyStoredCoursePageTemplate(
  templateId: string,
  courseSlug: string,
  courseName: string,
) {
  const denied = await requireAdminAction()
  if (denied) return denied

  try {
    const template = await prisma.coursePageTemplate.findUnique({ where: { id: templateId } })
    if (!template) return { success: false, error: 'Không tìm thấy mẫu' }

    const snapshot = template.snapshot as any as StoredTemplateSnapshot
    if (!Array.isArray(snapshot.sections) || !snapshot.sections.length) {
      return { success: false, error: 'Mẫu không có nội dung để áp dụng' }
    }

    const result = await prisma.$transaction(async tx => {
      const existing = await tx.coursePage.findUnique({ where: { slug: courseSlug } })

      const latestVersion = existing
        ? await tx.coursePageVersion.findFirst({
            where: { coursePageId: existing.id },
            orderBy: { versionNumber: 'desc' },
            select: { versionNumber: true },
          })
        : null
      let nextVersionNumber = (latestVersion?.versionNumber || 0) + 1

      // Keep the previous live page in history when an older published page
      // predates our published-snapshot mechanism.
      if (existing?.status === 'published') {
        const publishedVersion = await tx.coursePageVersion.findFirst({
          where: {
            coursePageId: existing.id,
            snapshot: { path: ['kind'], equals: 'published' },
          },
          select: { id: true },
        })

        if (!publishedVersion) {
          const currentSections = await tx.courseSection.findMany({
            where: { coursePageId: existing.id },
            orderBy: { sortOrder: 'asc' },
          })
          await tx.coursePageVersion.create({
            data: {
              coursePageId: existing.id,
              versionNumber: nextVersionNumber++,
              snapshot: {
                name: existing.name,
                seo: existing.seo,
                theme: existing.theme,
                navigation: existing.navigation,
                checkoutConfig: existing.checkoutConfig,
                useTemplate: existing.useTemplate,
                sections: currentSections.map(section => ({
                  sectionKey: section.sectionKey,
                  sectionType: section.sectionType,
                  variant: section.variant,
                  anchorId: section.anchorId,
                  enabled: section.enabled,
                  sortOrder: section.sortOrder,
                  visibility: section.visibility,
                  content: section.content,
                })),
                kind: 'published',
              } as any,
            },
          })
        }
      }

      const seo = {
        ...(snapshot.seo || {}),
        templateKey: `custom:${template.id}`,
        storedTemplateId: template.id,
      }
      const publishedAt = new Date()

      // Choosing a template from the course list is an explicit "apply" action,
      // matching the built-in template flow: the selected template becomes live.
      // Later Builder edits remain protected by the published snapshot below.
      const page = existing
        ? await tx.coursePage.update({
            where: { id: existing.id },
            data: {
              name: courseName || snapshot.name || template.name,
              status: 'published',
              publishedAt,
              seo: seo as any,
              theme: snapshot.theme as any,
              navigation: snapshot.navigation as any,
              checkoutConfig: snapshot.checkoutConfig as any,
              useTemplate: true,
            },
          })
        : await tx.coursePage.create({
            data: {
              slug: courseSlug,
              name: courseName || snapshot.name || template.name,
              status: 'published',
              publishedAt,
              seo: seo as any,
              theme: snapshot.theme as any,
              navigation: snapshot.navigation as any,
              checkoutConfig: snapshot.checkoutConfig as any,
              useTemplate: true,
            },
          })

      await tx.courseSection.deleteMany({ where: { coursePageId: page.id } })
      await tx.courseSection.createMany({
        data: snapshot.sections.map(section => ({
          coursePageId: page.id,
          sectionKey: section.sectionKey,
          sectionType: section.sectionType,
          variant: section.variant || null,
          anchorId: section.anchorId || null,
          enabled: section.enabled !== false,
          sortOrder: section.sortOrder,
          visibility: section.visibility || 'all',
          content: section.content as any,
        })),
      })

      await tx.coursePageVersion.create({
        data: {
          coursePageId: page.id,
          versionNumber: nextVersionNumber,
          snapshot: {
            name: page.name,
            seo,
            theme: snapshot.theme,
            navigation: snapshot.navigation,
            checkoutConfig: snapshot.checkoutConfig,
            useTemplate: true,
            sections: snapshot.sections.map(section => ({
              sectionKey: section.sectionKey,
              sectionType: section.sectionType,
              variant: section.variant || null,
              anchorId: section.anchorId || null,
              enabled: section.enabled !== false,
              sortOrder: section.sortOrder,
              visibility: section.visibility || 'all',
              content: section.content,
            })),
            kind: 'published',
          } as any,
        },
      })

      return page
    })

    revalidatePath(`/khoa-hoc/${courseSlug}`)
    revalidatePath('/tools/courses')
    revalidatePath('/tools/courses/templates')
    return { success: true, page: result }
  } catch (error: any) {
    console.error('[CoursePageTemplate] Apply error:', error)
    return { success: false, error: error.message || 'Không thể áp dụng mẫu' }
  }
}
