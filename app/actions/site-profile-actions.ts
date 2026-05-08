'use server'

import prisma from '@/lib/prisma'
import { FALLBACK_PROFILE, FALLBACK_COURSES, FALLBACK_POSTS, FALLBACK_SURVEY } from '@/lib/db-fallback'

// ─────────────────────────────────────────────────────────
// GET ACTIONS
// ─────────────────────────────────────────────────────────

/**
 * Lấy profile theo slug
 */
export async function getSiteProfile(slug: string) {
  try {
    return await prisma.siteProfile.findUnique({
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
  } catch (error) {
    console.error(`[DB ERROR] getSiteProfile(${slug}):`, error)
    return null
  }
}

/**
 * Lấy profile theo slug (không yêu cầu isActive)
 */
export async function getSiteProfileAdmin(slug: string) {
  try {
    return await prisma.siteProfile.findUnique({
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
  } catch (error) {
    console.error(`[DB ERROR] getSiteProfileAdmin(${slug}):`, error)
    return null
  }
}

/**
 * Lấy profile theo ID (Admin)
 */
export async function getSiteProfileAdminById(id: number) {
  try {
    return await prisma.siteProfile.findUnique({
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
  } catch (error) {
    console.error(`[DB ERROR] getSiteProfileAdminById(${id}):`, error)
    return null
  }
}

/**
 * Lấy profile của user hiện tại
 */
export async function getMySiteProfile(userId: number) {
  try {
    return await prisma.siteProfile.findUnique({
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
  } catch (error) {
    console.error(`[DB ERROR] getMySiteProfile(${userId}):`, error)
    return null
  }
}

/**
 * Lấy BRK default profile
 */
export async function getDefaultProfile() {
  try {
    const profile = await prisma.siteProfile.findFirst({
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
    return profile || (FALLBACK_PROFILE as any)
  } catch (error) {
    console.error("[DB ERROR] getDefaultProfile:", error)
    return FALLBACK_PROFILE as any
  }
}

/**
 * Lấy tất cả profiles (Admin)
 */
export async function getAllSiteProfiles() {
  try {
    return await prisma.siteProfile.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        user: { select: { name: true, image: true } },
      }
    })
  } catch (error) {
    console.error("[DB ERROR] getAllSiteProfiles:", error)
    return []
  }
}

/**
 * Lấy khóa học theo profile
 */
export async function getCoursesForProfile(profile: any) {
  try {
    // Nếu có courseIds cụ thể
    if (profile.courseIds && Array.isArray(profile.courseIds) && profile.courseIds.length > 0) {
      return await prisma.course.findMany({
        where: { id: { in: profile.courseIds }, status: true },
        orderBy: [{ pin: 'asc' }, { id: 'asc' }]
      })
    }

    // Nếu là Teacher → chỉ khóa của teacher đó
    if (profile.userId && profile.userId !== 0) {
      return await prisma.course.findMany({
        where: { teacherId: profile.userId, status: true },
        orderBy: [{ pin: 'asc' }, { id: 'asc' }]
      })
    }

    // BRK gốc → tất cả khóa học
    return await prisma.course.findMany({
      where: { status: true },
      orderBy: [{ pin: 'asc' }, { id: 'asc' }]
    })
  } catch (error) {
    console.error("[DB ERROR] getCoursesForProfile:", error)
    return FALLBACK_COURSES as any[]
  }
}

/**
 * Lấy survey theo profile - Cá nhân hóa
 */
export async function getSurveyForProfile(profile: any) {
  try {
    // Ưu tiên 1: selectedSurveyId cụ thể
    if (profile.selectedSurveyId) {
      return await prisma.survey.findUnique({
        where: { id: profile.selectedSurveyId }
      })
    }
    
    // Ưu tiên 2: surveys[] relation (backward compatible)
    if (profile.surveys && profile.surveys.length > 0) {
      return profile.surveys.find((s: any) => s.isActive) || profile.surveys[0]
    }
    
    // Ưu tiên 3: Teacher profile - chỉ lấy survey thuộc về profile này
    const surveyWhere = profile.isDefault
      ? { isActive: true }  // BRK: survey global
      : { profileId: profile.id, isActive: true }  // Teacher: survey riêng
    
    return await prisma.survey.findFirst({ where: surveyWhere })
  } catch (error) {
    console.error("[DB ERROR] getSurveyForProfile:", error)
    return FALLBACK_SURVEY
  }
}

/**
 * Lấy bài đăng theo profile - Cá nhân hóa Community
 */
export async function getPostsForProfile(profile: any) {
  try {
    const where: any = { published: true }
    
    if (profile.communityCategoryId) {
      where.categoryId = profile.communityCategoryId
    }
    
    if (profile.userId && profile.userId !== 0) {
      where.authorId = profile.userId
    }
    
    const limit = profile.communityLimit || 10
    
    return await prisma.post.findMany({
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
  } catch (error) {
    console.error("[DB ERROR] getPostsForProfile:", error)
    return FALLBACK_POSTS
  }
}

/**
 * Lấy danh sách PostCategories
 */
export async function getPostCategories() {
  try {
    return await prisma.postCategory.findMany({
      orderBy: { order: 'asc' }
    })
  } catch (error) {
    console.error("[DB ERROR] getPostCategories:", error)
    return []
  }
}

/**
 * Lấy danh sách Surveys
 */
export async function getAllSurveys() {
  try {
    return await prisma.survey.findMany({
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    console.error("[DB ERROR] getAllSurveys:", error)
    return []
  }
}

// ─────────────────────────────────────────────────────────
// SAVE ACTIONS - No fallbacks needed, just handle errors
// ─────────────────────────────────────────────────────────

/**
 * Tạo profile mới cho Teacher
 */
export async function createSiteProfile(userId: number, slug: string) {
  try {
    const existing = await prisma.siteProfile.findUnique({ where: { slug } })
    if (existing) return { error: 'Slug đã được sử dụng' }

    const existingUser = await prisma.siteProfile.findUnique({ where: { userId } })
    if (existingUser) return { error: 'User này đã có profile' }

    const profile = await prisma.siteProfile.create({
      data: { userId, slug, isActive: false }
    })

    return { success: true, profile }
  } catch (error) {
    return { error: 'Không thể kết nối database để tạo profile' }
  }
}

/**
 * Cập nhật profile (Admin)
 */
export async function updateSiteProfile(id: number, data: any) {
  try {
    if (data.slug) {
      const existing = await prisma.siteProfile.findFirst({
        where: { slug: data.slug, NOT: { id } }
      })
      if (existing) return { error: 'Slug đã được sử dụng' }
    }

    if (data.isDefault) {
      await prisma.siteProfile.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false }
      })
    }

    const profile = await prisma.siteProfile.update({
      where: { id },
      data: data as any
    })

    const { revalidatePath } = await import('next/cache')
    revalidatePath(`/tools/site-profiles/${id}/edit`)
    revalidatePath(`/${profile.slug}`)
    revalidatePath('/')

    return { success: true, profile }
  } catch (error) {
    return { error: 'Lỗi cập nhật database' }
  }
}

/**
 * Tăng view count
 */
export async function incrementProfileView(slug: string) {
  try {
    return await prisma.siteProfile.update({
      where: { slug },
      data: { viewCount: { increment: 1 } }
    })
  } catch {
    return null
  }
}
