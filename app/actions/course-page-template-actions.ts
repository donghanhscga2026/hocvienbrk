'use server'

import { controlsSchema } from '@/lib/course-page/importer/controls'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdminAction } from '@/lib/api-auth'
import { mirrorAnalysisImages } from '@/lib/course-page/importer/image-mirror'
import {
  ImportedSectionCandidate,
  StoredTemplateSnapshot,
  WebsiteTemplateAnalysis,
} from '@/lib/course-page/importer/types'
import { isImportedRegistrationSection } from '@/lib/course-page/importer/registration'
import { compactExactAnalysis } from '@/lib/course-page/importer/compact-analysis'

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
        fidelity: section.fidelity,
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
    .filter(section => !isImportedRegistrationSection(section))

  if (!selected.length) throw new Error('Hãy chọn ít nhất một phần nội dung (form đăng ký nguồn luôn được thay bằng quy trình MFC)')

  if ((analysis.sourceType === 'zip' || analysis.sourceType === 'html') && analysis.exactSource?.url) {
    return {
      name,
      seo: {
        title: analysis.title || name,
        description: analysis.description || '',
        importedFrom: analysis.exactSource.zipFileName || analysis.exactSource.entryPath || 'HTML nguyên trang',
      },
      theme: {
        primaryColor: analysis.theme.primaryColor || '#6D28D9',
        secondaryColor: analysis.theme.secondaryColor || '#F4C430',
        backgroundColor: analysis.theme.backgroundColor || '#FFFFFF',
        textColor: analysis.theme.textColor || '#1F2937',
        headingFont: analysis.theme.headingFont,
        bodyFont: analysis.theme.bodyFont,
        borderRadius: analysis.theme.borderRadius || '18px',
        containerWidth: analysis.theme.containerWidth || '1120px',
        importedLayout: true,
        exactZipLayout: true,
      },
      navigation: {
        shortName: name,
        ctaText: 'Đăng ký ngay',
        sticky: false,
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
      sections: [{
        sectionKey: 'zip-exact-source',
        sectionType: 'rich_content',
        variant: 'zip-source-v1',
        anchorId: null,
        enabled: true,
        sortOrder: 0,
        visibility: 'all' as const,
        content: jsonSafe({
          exactSource: analysis.exactSource,
          controls: analysis.controls ? controlsSchema.parse(analysis.controls) : undefined,
          selectedBlockKeys: selected.map(section => section.id),
          registrationBlockKeys: analysis.sections
            .filter(isImportedRegistrationSection)
            .map(section => section.id),
          importedMeta: {
            label: 'HTML/ZIP nguyên trang',
            sourceClass: analysis.exactSource.entryPath,
            confidence: 1,
          },
        }),
      }],
    }
  }

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

    const selectedSet = new Set(input.selectedSectionIds)
    const unresolvedLocalImages = input.analysis.exactSource?.url
      ? []
      : input.analysis.sections
          .filter(section => selectedSet.has(section.id) && !isImportedRegistrationSection(section))
          .flatMap(section => section.images || [])
          .filter(image => image.src && !/^(?:https?:\/\/|data:image\/|\/uploads\/)/i.test(image.src))

    if (unresolvedLocalImages.length) {
      return {
        success: false,
        error: `Có ${unresolvedLocalImages.length} ảnh đang trỏ tới thư mục cục bộ (ví dụ *_files/...). Hãy dùng file HTML tự chứa ảnh hoặc nhập URL website gốc để hệ thống có thể lưu ảnh vĩnh viễn.`,
      }
    }

    // Mirror external/base64 images into our own storage before persisting the template.
    // If a remote image cannot be downloaded, resolveImageUrl safely keeps the
    // original URL so template creation is not blocked.
    const safeSelectedIds = input.selectedSectionIds.filter(id => {
      const section = input.analysis.sections.find(item => item.id === id)
      return section ? !isImportedRegistrationSection(section) : false
    })
    const storedAnalysis = input.analysis.exactSource?.url
      ? jsonSafe(compactExactAnalysis(input.analysis))
      : await mirrorAnalysisImages(input.analysis, {
          sectionIds: safeSelectedIds,
        })
    const snapshot = buildSnapshot(name, storedAnalysis, safeSelectedIds)
    const key = `custom-${slugify(name)}-${Date.now().toString(36)}`
    const firstImage = storedAnalysis.sections
      .filter(section => safeSelectedIds.includes(section.id))
      .flatMap(section => section.images || [])
      .find(image => /^https?:\/\//i.test(image.src))

    const template = await prisma.coursePageTemplate.create({
      data: {
        key,
        name,
        description: input.description?.trim() || null,
        sourceUrl: storedAnalysis.exactSource?.url || storedAnalysis.finalUrl || storedAnalysis.sourceUrl || null,
        sourceType: storedAnalysis.sourceType,
        thumbnailUrl: firstImage?.src || null,
        snapshot: jsonSafe(snapshot) as any,
        analysis: jsonSafe({
          ...storedAnalysis,
          sections: storedAnalysis.sections.map(section => ({
            ...section,
            enabled: safeSelectedIds.includes(section.id) && !isImportedRegistrationSection(section),
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
