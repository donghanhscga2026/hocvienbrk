'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { CourseStatus, CourseSection, SectionVisibility } from '@/lib/course-page/types'
import { requireAdminAction } from '@/lib/api-auth'
import { createCoursePageFromTemplate, CourseTemplateKey } from '@/lib/course-page/templates'

export async function getCoursePages() {
  try {
    const pages = await prisma.coursePage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return pages;
  } catch (error) {
    console.error('[CoursePage] Get pages error:', error);
    return [];
  }
}

export async function getCoursePage(id: string) {
  try {
    const page = await prisma.coursePage.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    return page;
  } catch (error) {
    console.error('[CoursePage] Get page error:', error);
    return null;
  }
}

export async function getPublishedCoursePageBySlug(slug: string) {
  try {
    const page = await prisma.coursePage.findFirst({
      where: {
        slug,
        status: 'published'
      },
      include: {
        sections: {
          where: { enabled: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    return page;
  } catch (error) {
    console.error('[CoursePage] Get published page by slug error:', error);
    return null;
  }
}

export async function createCoursePage(data: {
  slug: string;
  name: string;
  seo?: Record<string, any>;
  theme?: Record<string, any>;
  navigation?: Record<string, any>;
  checkoutConfig?: Record<string, any>;
  useTemplate?: boolean;
}) {
  const denied = await requireAdminAction()
  if (denied) return denied

  try {
    const existing = await prisma.coursePage.findUnique({
      where: { slug: data.slug }
    });
    if (existing) {
      return { success: false, error: 'Slug đã tồn tại' };
    }

    const page = await prisma.coursePage.create({
      data: {
        slug: data.slug,
        name: data.name,
        seo: data.seo || {},
        theme: data.theme || {
          primaryColor: '#C9683C',
          secondaryColor: '#E8C468',
          backgroundColor: '#1A1B26',
          textColor: '#F2E8D5'
        },
        navigation: data.navigation || {
          shortName: data.name,
          ctaText: 'Đăng ký ngay'
        },
        checkoutConfig: data.checkoutConfig || {
          enabled: true,
          provider: 'vietqr',
          currency: 'VND',
          paymentDescriptionPrefix: 'CK',
          orderExpirationMinutes: 15,
          registrationFields: [
            { name: 'fullName', label: 'Họ và tên', type: 'text', required: true },
            { name: 'phone', label: 'Số điện thoại', type: 'tel', required: true }
          ],
          successMode: 'show_message'
        },
        useTemplate: data.useTemplate !== false
      }
    });

    revalidatePath('/tools/pages');
    return { success: true, page };
  } catch (error: any) {
    console.error('[CoursePage] Create error:', error);
    return { success: false, error: error.message || 'Lỗi khi tạo trang khóa học' };
  }
}

export async function updateCoursePage(
  id: string,
  data: {
    name?: string;
    status?: CourseStatus;
    seo?: Record<string, any>;
    theme?: Record<string, any>;
    navigation?: Record<string, any>;
    checkoutConfig?: Record<string, any>;
    useTemplate?: boolean;
  }
) {
  const denied = await requireAdminAction()
  if (denied) return denied

  try {
    const updated = await prisma.coursePage.update({
      where: { id },
      data: {
        name: data.name,
        status: data.status,
        seo: data.seo,
        theme: data.theme,
        navigation: data.navigation,
        checkoutConfig: data.checkoutConfig,
        useTemplate: data.useTemplate,
        publishedAt: data.status === 'published' ? new Date() : undefined
      }
    });

    revalidatePath(`/khoa-hoc/${updated.slug}`);
    revalidatePath('/tools/pages');
    return { success: true, page: updated };
  } catch (error: any) {
    console.error('[CoursePage] Update error:', error);
    return { success: false, error: error.message || 'Lỗi khi cập nhật trang khóa học' };
  }
}

export async function saveCourseSections(
  coursePageId: string,
  sections: Array<{
    id?: string;
    sectionKey: string;
    sectionType: string;
    variant?: string;
    anchorId?: string;
    enabled: boolean;
    sortOrder: number;
    visibility: SectionVisibility;
    content: Record<string, any>;
  }>
) {
  const denied = await requireAdminAction()
  if (denied) return denied

  try {
    const page = await prisma.coursePage.findUnique({
      where: { id: coursePageId },
      select: { slug: true }
    });

    if (!page) {
      return { success: false, error: 'Không tìm thấy trang khóa học' };
    }

    const createdSections = await prisma.$transaction(async (tx) => {
      await tx.courseSection.deleteMany({ where: { coursePageId } })
      const created = []
      for (const sec of sections) {
        created.push(await tx.courseSection.create({
          data: {
            id: sec.id,
            coursePageId,
            sectionKey: sec.sectionKey,
            sectionType: sec.sectionType,
            variant: sec.variant || null,
            anchorId: sec.anchorId || null,
            enabled: sec.enabled,
            sortOrder: sec.sortOrder,
            visibility: sec.visibility || 'all',
            content: sec.content || {}
          }
        }))
      }
      return created
    });

    revalidatePath(`/khoa-hoc/${page.slug}`);
    return { success: true, sections: createdSections };
  } catch (error: any) {
    console.error('[CoursePage] Save sections error:', error);
    return { success: false, error: error.message || 'Lỗi khi lưu các phần giao diện' };
  }
}


type CoursePageSnapshot = {
  name: string
  seo: Record<string, any>
  theme: Record<string, any>
  navigation: Record<string, any>
  checkoutConfig: Record<string, any>
  useTemplate: boolean
  sections: Array<Record<string, any>>
  kind?: 'published' | 'manual'
}

async function buildCoursePageSnapshot(coursePageId: string, kind: 'published' | 'manual' = 'manual') {
  const page = await prisma.coursePage.findUnique({
    where: { id: coursePageId },
    include: { sections: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!page) return null
  return {
    name: page.name,
    seo: page.seo as Record<string, any>,
    theme: page.theme as Record<string, any>,
    navigation: page.navigation as Record<string, any>,
    checkoutConfig: page.checkoutConfig as Record<string, any>,
    useTemplate: page.useTemplate,
    sections: page.sections.map(section => ({
      sectionKey: section.sectionKey,
      sectionType: section.sectionType,
      variant: section.variant,
      anchorId: section.anchorId,
      enabled: section.enabled,
      sortOrder: section.sortOrder,
      visibility: section.visibility,
      content: section.content,
    })),
    kind,
  } satisfies CoursePageSnapshot
}

async function createCoursePageVersion(coursePageId: string, snapshot: CoursePageSnapshot) {
  const latest = await prisma.coursePageVersion.findFirst({
    where: { coursePageId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  })
  return prisma.coursePageVersion.create({
    data: { coursePageId, versionNumber: (latest?.versionNumber || 0) + 1, snapshot: snapshot as any },
  })
}

export async function getCoursePageVersions(coursePageId: string) {
  const denied = await requireAdminAction()
  if (denied) return denied
  const versions = await prisma.coursePageVersion.findMany({
    where: { coursePageId },
    orderBy: { versionNumber: 'desc' },
    take: 20,
  })
  return { success: true, versions }
}

export async function publishCoursePage(coursePageId: string) {
  const denied = await requireAdminAction()
  if (denied) return denied
  try {
    const snapshot = await buildCoursePageSnapshot(coursePageId, 'published')
    if (!snapshot) return { success: false, error: 'Không tìm thấy trang khóa học' }
    const version = await createCoursePageVersion(coursePageId, snapshot)
    const page = await prisma.coursePage.update({
      where: { id: coursePageId },
      data: { status: 'published', publishedAt: new Date() },
    })
    revalidatePath(`/khoa-hoc/${page.slug}`)
    return { success: true, versionNumber: version.versionNumber }
  } catch (error: any) {
    console.error('[CoursePage] Publish error:', error)
    return { success: false, error: error.message || 'Lỗi khi xuất bản trang' }
  }
}

export async function restoreCoursePageVersion(coursePageId: string, versionNumber: number) {
  const denied = await requireAdminAction()
  if (denied) return denied
  try {
    const version = await prisma.coursePageVersion.findUnique({
      where: { coursePageId_versionNumber: { coursePageId, versionNumber } },
    })
    if (!version) return { success: false, error: 'Không tìm thấy phiên bản' }
    const snapshot = version.snapshot as any as CoursePageSnapshot
    await prisma.$transaction(async tx => {
      await tx.coursePage.update({
        where: { id: coursePageId },
        data: {
          name: snapshot.name,
          seo: snapshot.seo as any,
          theme: snapshot.theme as any,
          navigation: snapshot.navigation as any,
          checkoutConfig: snapshot.checkoutConfig as any,
          useTemplate: snapshot.useTemplate,
        },
      })
      await tx.courseSection.deleteMany({ where: { coursePageId } })
      await tx.courseSection.createMany({
        data: (snapshot.sections || []).map((section: any) => ({
          coursePageId,
          sectionKey: section.sectionKey,
          sectionType: section.sectionType,
          variant: section.variant || null,
          anchorId: section.anchorId || null,
          enabled: section.enabled !== false,
          sortOrder: section.sortOrder || 0,
          visibility: section.visibility || 'all',
          content: section.content || {},
        })),
      })
    })
    return { success: true }
  } catch (error: any) {
    console.error('[CoursePage] Restore version error:', error)
    return { success: false, error: error.message || 'Lỗi khi khôi phục phiên bản' }
  }
}

export async function deleteCoursePage(id: string) {
  const denied = await requireAdminAction()
  if (denied) return denied

  try {
    const page = await prisma.coursePage.findUnique({
      where: { id },
      select: { slug: true }
    });

    if (!page) {
      return { success: false, error: 'Không tìm thấy trang' };
    }

    await prisma.coursePage.delete({
      where: { id }
    });

    revalidatePath(`/khoa-hoc/${page.slug}`);
    revalidatePath('/tools/pages');
    return { success: true };
  } catch (error: any) {
    console.error('[CoursePage] Delete error:', error);
    return { success: false, error: error.message || 'Lỗi khi xóa trang khóa học' };
  }
}


export async function applyCoursePageTemplate(slug: string, courseName: string, templateKey: CourseTemplateKey) {
  const denied = await requireAdminAction()
  if (denied) return denied

  try {
    const preset = createCoursePageFromTemplate(templateKey, slug)
    const existing = await prisma.coursePage.findUnique({ where: { slug } })

    const seo = { ...(preset.seo as any), templateKey }
    const page = existing
      ? await prisma.coursePage.update({
          where: { id: existing.id },
          data: {
            name: courseName || preset.name,
            status: 'published',
            seo,
            theme: preset.theme as any,
            navigation: preset.navigation as any,
            checkoutConfig: preset.checkoutConfig as any,
            useTemplate: true,
            publishedAt: new Date(),
          },
        })
      : await prisma.coursePage.create({
          data: {
            slug,
            name: courseName || preset.name,
            status: 'published',
            seo,
            theme: preset.theme as any,
            navigation: preset.navigation as any,
            checkoutConfig: preset.checkoutConfig as any,
            useTemplate: true,
            publishedAt: new Date(),
          },
        })

    await prisma.$transaction(async (tx) => {
      await tx.courseSection.deleteMany({ where: { coursePageId: page.id } })
      await tx.courseSection.createMany({
        data: preset.sections.map((section: any) => ({
          coursePageId: page.id,
          sectionKey: section.sectionKey,
          sectionType: section.type,
          variant: section.variant || null,
          anchorId: section.anchorId || null,
          enabled: section.enabled !== false,
          sortOrder: section.sortOrder,
          visibility: section.visibility || 'all',
          content: section.content || {},
        })),
      })
    })

    revalidatePath(`/khoa-hoc/${slug}`)
    revalidatePath('/tools/courses')
    revalidatePath('/tools/pages')
    return { success: true, page: { ...page, seo } }
  } catch (error: any) {
    console.error('[CoursePage] Apply template error:', error)
    return { success: false, error: error.message || 'Lỗi khi áp dụng mẫu giao diện' }
  }
}
