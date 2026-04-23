'use server'

import prisma from '@/lib/prisma'

// ─────────────────────────────────────────────────────────
// GET ACTIONS
// ─────────────────────────────────────────────────────────

/**
 * Lấy profile theo slug
 */
export async function getSiteProfile(slug: string) {
  return prisma.siteProfile.findUnique({
    where: { slug, isActive: true },
    include: {
      user: { select: { name: true, image: true } },
      theme: true,
      surveys: true,
      landingPages: {
        where: { isActive: true },
        take: 10
      },
      affiliateCampaign: {
        include: { levels: true }
      }
    }
  })
}

/**
 * Lấy profile theo slug (không yêu cầu isActive)
 */
export async function getSiteProfileAdmin(slug: string) {
  return prisma.siteProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { name: true, image: true, email: true } },
      theme: true,
      surveys: true,
      landingPages: true,
      affiliateCampaign: {
        include: { levels: true }
      }
    }
  })
}

/**
 * Lấy profile theo ID (Admin)
 */
export async function getSiteProfileAdminById(id: number) {
  return prisma.siteProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, image: true, email: true } },
      theme: true,
      surveys: true,
      landingPages: true,
      affiliateCampaign: {
        include: { levels: true }
      }
    }
  })
}

/**
 * Lấy profile của user hiện tại
 */
export async function getMySiteProfile(userId: number) {
  return prisma.siteProfile.findUnique({
    where: { userId },
    include: {
      theme: true,
      surveys: true,
      landingPages: true,
      affiliateCampaign: {
        include: { levels: true }
      }
    }
  })
}

/**
 * Lấy BRK default profile
 */
export async function getDefaultProfile() {
  return prisma.siteProfile.findFirst({
    where: { isDefault: true, isActive: true },
    include: {
      user: { select: { name: true, image: true } },
      theme: true,
      surveys: true,
      landingPages: {
        where: { isActive: true },
        take: 10
      },
      affiliateCampaign: {
        include: { levels: true }
      }
    }
  })
}

/**
 * Lấy tất cả profiles (Admin)
 */
export async function getAllSiteProfiles() {
  return prisma.siteProfile.findMany({
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' }
    ],
    include: {
      user: { select: { name: true, image: true } },
    }
  })
}

/**
 * Lấy khóa học theo profile
 */
export async function getCoursesForProfile(profile: any) {
  // Nếu có courseIds cụ thể
  if (profile.courseIds && Array.isArray(profile.courseIds)) {
    return prisma.course.findMany({
      where: { id: { in: profile.courseIds }, status: true },
      orderBy: [{ pin: 'asc' }, { id: 'asc' }]
    })
  }

  // Nếu là Teacher → chỉ khóa của teacher đó
  if (profile.userId) {
    return prisma.course.findMany({
      where: { teacherId: profile.userId, status: true },
      orderBy: [{ pin: 'asc' }, { id: 'asc' }]
    })
  }

  // BRK gốc → tất cả khóa học
  return prisma.course.findMany({
    where: { status: true },
    orderBy: [{ pin: 'asc' }, { id: 'asc' }]
  })
}

/**
 * Lấy survey theo profile - Cá nhân hóa
 */
export async function getSurveyForProfile(profile: any) {
  // Ưu tiên 1: selectedSurveyId cụ thể
  if (profile.selectedSurveyId) {
    return prisma.survey.findUnique({
      where: { id: profile.selectedSurveyId }
    })
  }
  
  // Ưu tiên 2: surveys[] relation (backward compatible)
  if (profile.surveys && profile.surveys.length > 0) {
    return profile.surveys.find((s: any) => s.isActive) || profile.surveys[0]
  }
  
  // Ưu tiên 3: Teacher profile - chỉ lấy survey thuộc về profile này
  // BRK profile (isDefault=true) - lấy survey global (profileId=null)
  const surveyWhere = profile.isDefault
    ? { isActive: true }  // BRK: survey global
    : { profileId: profile.id, isActive: true }  // Teacher: survey riêng
  
  return prisma.survey.findFirst({ where: surveyWhere })
}

/**
 * Lấy bài đăng theo profile - Cá nhân hóa Community
 */
export async function getPostsForProfile(profile: any) {
  const where: any = { published: true }
  
  // Filter by category nếu có
  if (profile.communityCategoryId) {
    where.categoryId = profile.communityCategoryId
  }
  
  // Filter by author (teacher's posts) nếu là teacher profile
  if (profile.userId) {
    where.authorId = profile.userId
  }
  
  const limit = profile.communityLimit || 10
  
  const posts = await prisma.post.findMany({
    where,
    orderBy: [
      { pin: 'desc' },
      { createdAt: 'desc' }
    ],
    take: limit,
    include: {
      author: { select: { name: true, image: true } },
      _count: { select: { comments: true } }
    }
  })
  
  return posts
}

/**
 * Lấy danh sách PostCategories
 * [PENDING] Cần chạy SQL migration trước
 */
export async function getPostCategories() {
  try {
    return prisma.postCategory.findMany({
      orderBy: { order: 'asc' }
    })
  } catch {
    return []
  }
}

/**
 * Lấy danh sách Surveys
 */
export async function getAllSurveys() {
  return prisma.survey.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

// ─────────────────────────────────────────────────────────
// SAVE ACTIONS
// ─────────────────────────────────────────────────────────

/**
 * Tạo profile mới cho Teacher
 */
export async function createSiteProfile(userId: number, slug: string) {
  // Kiểm tra slug đã tồn tại chưa
  const existing = await prisma.siteProfile.findUnique({
    where: { slug }
  })

  if (existing) {
    return { error: 'Slug đã được sử dụng' }
  }

  // Kiểm tra user đã có profile chưa
  const existingUser = await prisma.siteProfile.findUnique({
    where: { userId }
  })

  if (existingUser) {
    return { error: 'User này đã có profile' }
  }

  const profile = await prisma.siteProfile.create({
    data: {
      userId,
      slug,
      isActive: false, // Cần admin approve
    }
  })

  return { success: true, profile }
}

/**
 * Cập nhật profile (Admin)
 */
export async function updateSiteProfile(id: number, data: {
  slug?: string
  isActive?: boolean
  isDefault?: boolean
  heroImage?: string
  heroOverlay?: number
  title?: string
  subtitle?: string
  messageContent?: string
  messageDetail?: string
  messageImage?: string
  surveyTitle?: string
  customRoadmap?: any
  roadmapTitle?: string
  courseIds?: number[]
  coursesTitle?: string
  allCoursesTitle?: string
  showAllCourses?: boolean
  showCommunity?: boolean
  communityTitle?: string
  footerText?: string
  footerLinks?: any
  metaTitle?: string
  metaDescription?: string
  metaImage?: string
  themeId?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  selectedSurveyId?: number | null
  communityCategoryId?: number | null
  greetingMessages?: {
    morning: string
    afternoon: string
    evening: string
  } | null
}) {
  // Kiểm tra slug trùng nếu đang update slug
  if (data.slug) {
    const existing = await prisma.siteProfile.findFirst({
      where: { 
        slug: data.slug,
        NOT: { id }
      }
    })

    if (existing) {
      return { error: 'Slug đã được sử dụng' }
    }
  }

  // Nếu set isDefault = true, unset các profile default khác
  if (data.isDefault) {
    await prisma.siteProfile.updateMany({
      where: { 
        isDefault: true,
        NOT: { id }
      },
      data: { isDefault: false }
    })
  }

  const profile = await prisma.siteProfile.update({
    where: { id },
    data: data as any
  })

  // Xóa cache để hiển thị dữ liệu mới
  const { revalidatePath } = await import('next/cache')
  revalidatePath(`/tools/site-profiles/${id}/edit`)
  revalidatePath(`/${profile.slug}`)
  revalidatePath('/')

  console.log(`[OK] Updated SiteProfile #${id}:`, { slug: profile.slug })

  return { success: true, profile }
}

/**
 * Cập nhật profile của Teacher (chỉ được sửa một số field)
 */
export async function updateMyProfile(userId: number, data: {
  heroImage?: string
  title?: string
  subtitle?: string
  messageContent?: string
  messageDetail?: string
  accentColor?: string
  backgroundColor?: string
  footerText?: string
  footerLinks?: any
}) {
  const profile = await prisma.siteProfile.findUnique({
    where: { userId }
  })

  if (!profile) {
    return { error: 'Profile không tồn tại' }
  }

  // Chỉ cho phép update một số fields nhất định
  const allowedFields = [
    'heroImage', 'title', 'subtitle', 'messageContent', 
    'messageDetail', 'accentColor', 'backgroundColor',
    'footerText', 'footerLinks'
  ]
  
  const filteredData: Record<string, any> = {}
  for (const key of allowedFields) {
    if (key in data) {
      filteredData[key] = (data as any)[key]
    }
  }

  const updated = await prisma.siteProfile.update({
    where: { id: profile.id },
    data: filteredData
  })

  return { success: true, profile: updated }
}

/**
 * Xóa profile
 */
export async function deleteSiteProfile(id: number) {
  const profile = await prisma.siteProfile.findUnique({
    where: { id }
  })

  if (profile?.isDefault) {
    return { error: 'Không thể xóa profile mặc định' }
  }

  await prisma.siteProfile.delete({
    where: { id }
  })

  return { success: true }
}

/**
 * Duyệt profile (Admin)
 */
export async function approveSiteProfile(id: number) {
  return prisma.siteProfile.update({
    where: { id },
    data: { isActive: true }
  })
}

/**
 * Tăng view count
 */
export async function incrementProfileView(slug: string) {
  return prisma.siteProfile.update({
    where: { slug },
    data: { viewCount: { increment: 1 } }
  })
}

// ─────────────────────────────────────────────────────────
// COURSE ACTIONS
// ─────────────────────────────────────────────────────────

/**
 * Lấy danh sách teachers (user có role TEACHER)
 */
export async function getTeachers() {
  return prisma.user.findMany({
    where: { role: 'TEACHER' },
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: 'asc' }
  })
}

/**
 * Gán teacher cho course
 */
export async function assignTeacherToCourse(courseId: number, teacherId: number | null) {
  return prisma.course.update({
    where: { id: courseId },
    data: { teacherId }
  })
}

/**
 * Lấy courses chưa có teacher
 */
export async function getUnassignedCourses() {
  return prisma.course.findMany({
    where: { teacherId: null, status: true },
    orderBy: { name_lop: 'asc' }
  })
}

/**
 * Lấy courses của teacher
 */
export async function getTeacherCourses(teacherId: number) {
  return prisma.course.findMany({
    where: { teacherId },
    orderBy: [{ pin: 'asc' }, { name_lop: 'asc' }]
  })
}
