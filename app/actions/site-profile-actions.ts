'use server'

import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { wi300CoursePreferences, wi300CourseWhere } from '@/lib/wi300/course-visibility'
import { managedProfile, websiteActor, WEBSITE_MANAGER_ROLE } from '@/lib/website/management'
import { FALLBACK_PROFILE, FALLBACK_COURSES, FALLBACK_POSTS, FALLBACK_SURVEY } from '@/lib/db-fallback'
import { auth } from '@/auth'
import { canCreateProfile } from '@/lib/auth/roles'
import { domainContext } from '@/lib/website/domain-context'
import { requireAdminAction } from '@/lib/api-auth'
import { unstable_cache, revalidateTag } from 'next/cache'
import {presentationKey,presentationSchema} from '@/lib/website/presentation'
import { getCourseWhereForProfile, getSiteRuntimeConfig, normalizeSiteHostname } from '@/lib/site-profile/runtime'

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
        members: {
          include: { user: { select: { id: true, name: true, image: true } } }
        },
        theme: true,
        domains: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
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
  const denied = await requireAdminAction(); if (denied) return null
  try {
    return await prisma.siteProfile.findUnique({
      where: { slug },
      include: {
        user: { select: { name: true, image: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } }
        },
        theme: true,
        domains: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
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
    await managedProfile(id)
    const profile=await prisma.siteProfile.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, image: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } }
        },
        theme: true,
        verifiedDomains: { select: { hostname: true } },
        domains: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
        surveys: true,
        landingPages: true,
        affiliateCampaign: {
          include: { levels: true }
        }
      }
    })
    const access=profile ? await prisma.systemConfig.findUnique({where:{key:'website-access:'+profile.id}}):null
    if (!profile) return null
    const home = getSiteRuntimeConfig(profile).homepage.type
    const communityAvailable = home === 'profile' || home === 'community'
    return {...profile,websiteAccessConfigured:!!access,communityAvailable}
  } catch (error) {
    console.error(`[DB ERROR] getSiteProfileAdminById(${id}):`, error)
    return null
  }
}

/**
 * Lấy profile của user hiện tại
 */
export async function getMySiteProfile(userId: number, profileId?: number) {
  try {
    const actor = await websiteActor()
    if (actor.id !== userId) return null
    const target = await managedProfile(profileId)
    return await prisma.siteProfile.findUnique({
      where: { id: target.id },
      include: {
        user: { select: { name: true, image: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } }
        },
        theme: true,
        domains: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
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
 * Lấy MFC default profile
 * [OPTIMIZE] Đây là dữ liệu nền cho trang chủ — trang được xem nhiều nhất hệ
 * thống — nhưng gần như không đổi giữa các lượt truy cập. Cache 10 phút, làm
 * mới ngay khi admin lưu profile (xem revalidateTag('site-profile') trong
 * updateSiteProfile bên dưới).
 */
export const getDefaultProfile = unstable_cache(
  async () => {
    try {
      const profile = await prisma.siteProfile.findFirst({
        where: { isDefault: true, isActive: true },
        include: {
          user: { select: { name: true, image: true } },
          members: {
            include: { user: { select: { id: true, name: true, image: true } } }
          },
          theme: true,
          domains: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
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
  },
  ['default-site-profile'],
  { tags: ['site-profile'], revalidate: 600 }
)

/**
 * Lấy tất cả profiles (Admin)
 */
export async function getAllSiteProfiles() {
  const denied = await requireAdminAction(); if (denied) return []
  try {
    return await prisma.siteProfile.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        user: { select: { name: true, image: true } },
        domains: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
      }
    })
  } catch (error) {
    console.error("[DB ERROR] getAllSiteProfiles:", error)
    return []
  }
}

// [OPTIMIZE] profile.viewCount/updatedAt đổi trên MỖI lượt xem trang (xem
// incrementProfileView) — nếu dùng thẳng object profile làm khoá cache của
// unstable_cache (khoá suy ra từ tham số truyền vào), cache sẽ luôn "miss" vì
// khoá đổi liên tục. Loại 2 field này trước khi dùng làm tham số cache.
function stripVolatileProfileFields(profile: any) {
  if (!profile) return profile
  const { viewCount, updatedAt, ...rest } = profile
  return rest
}

/**
 * Lấy khóa học theo profile
 * [OPTIMIZE] Cache 10 phút theo tag 'site-profile' — cùng tag với
 * getDefaultProfile/updateSiteProfile nên tự làm mới khi admin sửa profile.
 */
const getCoursesForProfileCached = unstable_cache(
  async (where: Prisma.CourseWhereInput) => {
    const courses = await prisma.course.findMany({
      where,
      include: {
        courseCategory: true,
        teacherBankAccount: true,
        teacher: { select: { name: true } },
        _count: { select: { enrollments: { where: { status: 'ACTIVE' } }, lessons: true } }
      },
      orderBy: [{ pin: 'asc' }, { id: 'asc' }]
    })
    return courses.map(course => ({ ...course, activeStudentCount: course._count?.enrollments ?? 0 }))
  },
  ['courses-for-profile-visibility-v2'],
  { tags: ['site-profile'], revalidate: 600 }
)

export async function getCoursesForProfile(profile: any) {
  let wi300 = false
  try {
    // Read request branding outside unstable_cache; the resolved scope is its cache key.
    wi300 = Boolean(await getCurrentDeploymentBrand())
    const base = getCourseWhereForProfile(profile)
    const where = wi300 ? wi300CourseWhere(base, await wi300CoursePreferences(prisma)) : base
    return await getCoursesForProfileCached(where)
  } catch (error) {
    console.error("[DB ERROR] getCoursesForProfile:", error)
    return wi300 ? [] : FALLBACK_COURSES as any[]
  }
}

/**
 * Lấy survey theo profile - Cá nhân hóa
 * [OPTIMIZE] Cache 10 phút theo tag 'site-profile', cùng lý do như trên.
 */
const getSurveyForProfileCached = unstable_cache(
  async (profile: any) => {
    if (!getSiteRuntimeConfig(profile).modules.surveys) return null

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
  },
  ['survey-for-profile'],
  { tags: ['site-profile'], revalidate: 600 }
)

export async function getSurveyForProfile(profile: any) {
  try {
    return await getSurveyForProfileCached(stripVolatileProfileFields(profile))
  } catch (error) {
    console.error("[DB ERROR] getSurveyForProfile:", error)
    return FALLBACK_SURVEY
  }
}

/**
 * Lấy bài đăng theo profile - Cá nhân hóa Community
 * [OPTIMIZE] Cache 10 phút theo tag 'site-profile', cùng lý do như trên.
 */
const getPostsForProfileCached = unstable_cache(
  async (profile: any) => {
    if (!getSiteRuntimeConfig(profile).modules.community) return []

    const where: any = { published: true }

    if (profile.communityCategoryId) {
      where.categoryId = profile.communityCategoryId
    }

    if (profile.userId && profile.userId !== 0) {
      const associateIds = profile.members?.map((m: any) => m.userId) || []
      const allAuthorIds = [profile.userId, ...associateIds]
      where.authorId = { in: allAuthorIds }
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
  },
  ['posts-for-profile'],
  { tags: ['site-profile'], revalidate: 600 }
)

export async function getPostsForProfile(profile: any) {
  try {
    return await getPostsForProfileCached(stripVolatileProfileFields(profile))
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

// ─────────────────────────────────────────────────────────
// SAVE ACTIONS - No fallbacks needed, just handle errors
// ─────────────────────────────────────────────────────────

/**
 * Tạo profile mới cho Teacher (Admin chọn teacher để gán profile)
 */
export async function createSiteProfile(userId: number | null, slug: string) {
  try {
        if (await domainContext()) return { error: 'Tạo website tại hệ thống chính.' }
        const session = await auth()
        if (session?.user?.id == null) return { error: 'Vui lòng đăng nhập.' }
        const actor = await prisma.user.findUnique({ where: { id: Number(session.user.id) }, select: { id: true, role: true } })
        if (!actor || !canCreateProfile(actor.role)) return { error: 'Chỉ giảng viên hoặc admin được tạo website.' }
        if (actor.role !== 'ADMIN') {
          if (userId != null && userId !== actor.id) return { error: 'Bạn chỉ được tạo website cho chính mình.' }
          userId = actor.id
        }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 50) return { error: 'Đường dẫn không hợp lệ.' }
        if (userId != null && (!Number.isSafeInteger(userId) || userId < 0)) return { error: 'Mã chủ website không hợp lệ.' }
        const existing = await prisma.siteProfile.findUnique({ where: { slug } })
        if (existing) return { error: 'Slug đã được sử dụng' }

        const existingLanding = await prisma.landingPage.findUnique({ where: { slug } })
        if (existingLanding) return { error: 'Slug đã được sử dụng bởi Landing Page' }

        if (userId != null) {
          const existingUser = await prisma.siteProfile.findUnique({ where: { userId } })
          if (existingUser) return { error: 'User này đã có profile' }
        }

    const profile = await prisma.siteProfile.create({
      data: { userId: userId ?? null, slug, isActive: false }
    })

    return { success: true, profile }
  } catch (error) {
    return { error: 'Không thể kết nối database để tạo profile' }
  }
}

/**
 * Cập nhật profile (chủ sở hữu profile hoặc Admin)
 */
export async function updateSiteProfile(id: number, data: any) {
  try {
        const actor = await websiteActor()
        await managedProfile(id)
        const isAdmin = actor.role === 'ADMIN'
        // Không nhận nested Prisma writes; người quản trị cộng tác chỉ sửa nội dung.
        const editable = ['slug','title','subtitle','heroImage','heroOverlay','messageContent','messageDetail','messageImage','accentColor','backgroundColor','footerText','showCommunity','showAllCourses','coursesTitle','allCoursesTitle','communityTitle','metaTitle','metaDescription','metaImage','selectedSurveyId','communityCategoryId','greetingMessages']
        if (isAdmin) editable.push('isDefault','userId','siteConfig','isActive')
        data = Object.fromEntries(Object.entries(data).filter(([key]) => editable.includes(key)))

        if (data.slug) {
            const existing = await prisma.siteProfile.findFirst({
                where: { slug: data.slug, NOT: { id } }
            })
            if (existing) return { error: 'Slug đã được sử dụng' }

            const existingLanding = await prisma.landingPage.findUnique({ where: { slug: data.slug } })
            if (existingLanding) return { error: 'Slug đã được sử dụng bởi Landing Page' }
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
    revalidatePath(`/page/${profile.slug}`)
    revalidatePath('/')
    revalidateTag('site-profile', { expire: 0 })

    return { success: true, profile }
  } catch (error) {
    return { error: 'Lỗi cập nhật database' }
  }
}

export async function updateSiteProfileRuntime(
  id: number,
  input: {
    primaryDomain?: string
    additionalDomains?: string[]
    siteConfig?: Record<string, unknown>
    themeId?: string | null
  },
) {
  const denied = await requireAdminAction()
  if (denied) return { error: denied.error }
  if((input.siteConfig?.homepage as {type?:string}|undefined)?.type==='website') return {error:'Thiết kế tự do đã được gỡ bỏ. Hãy sử dụng mẫu có sẵn.'}

  const updateDomains = input.primaryDomain !== undefined || input.additionalDomains !== undefined
  const primaryDomain = normalizeSiteHostname(input.primaryDomain)
  const additionalDomains = Array.from(new Set(
    (input.additionalDomains || [])
      .map(normalizeSiteHostname)
      .filter(Boolean)
      .filter(hostname => hostname !== primaryDomain),
  ))
  const domains = [primaryDomain, ...additionalDomains].filter(Boolean)

  try {
    const profile = await prisma.siteProfile.findUnique({ where: { id }, select: { id: true, slug: true, siteConfig: true } })
    if (!profile) return { error: 'Không tìm thấy profile' }

    const existingConfig = profile.siteConfig && typeof profile.siteConfig === 'object' && !Array.isArray(profile.siteConfig)
      ? profile.siteConfig as Record<string, unknown>
      : {}
    const mergedConfig = {
      ...existingConfig,
      ...(input.siteConfig || {}),
    }

    if (domains.length) {
      const verified=await prisma.siteDomain.findMany({where:{hostname:{in:domains}}})
      if(verified.length)return {error:'Tên miền này đã được quản lý trong Website của tôi. Hãy chỉnh tại mục Tên miền ở đó.'}
      const conflicts = await prisma.siteProfileDomain.findMany({
        where: { hostname: { in: domains }, NOT: { profileId: id } },
        select: { hostname: true },
      })
      if (conflicts.length) {
        return { error: `Domain đã được sử dụng: ${conflicts.map(item => item.hostname).join(', ')}` }
      }
    }

    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420304)`
      const occupied=await tx.siteDomain.findMany({where:{hostname:{in:domains}}})
      const foreign=await tx.siteProfileDomain.findMany({where:{hostname:{in:domains},NOT:{profileId:id}}})
      if(occupied.length || foreign.length)throw new Error('Tên miền đã được cấp ở cửa sổ khác')
      // Bỏ cờ cũ trước khi đổi domain chính, tránh vi phạm unique index.
      if (updateDomains) await tx.siteProfileDomain.updateMany({where:{profileId:id},data:{isPrimary:false}})
      const rawHome=input.siteConfig?.homepage as {type?:string}|undefined
      if(rawHome?.type){
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420306, ${id}::integer)`
        const current=await tx.systemConfig.findUnique({where:{key:presentationKey(id)}})
        const revision=current ? presentationSchema.parse(current.value).revision:0
        const value={mode:'template',revision:revision+1}
        await tx.systemConfig.upsert({where:{key:presentationKey(id)},create:{key:presentationKey(id),value},update:{value}})
      }
      await tx.siteProfile.update({
        where: { id },
        data: {
          siteConfig: mergedConfig as any,
          ...(input.themeId !== undefined ? { themeId: input.themeId || null } : {}),
        },
      })

      if (updateDomains) await tx.siteProfileDomain.deleteMany({
        where: { profileId: id, hostname: { notIn: domains.length ? domains : ['__none__'] } },
      })

      for (let index = 0; updateDomains && index < domains.length; index += 1) {
        await tx.siteProfileDomain.upsert({
          where: { hostname: domains[index] },
          create: {
            profileId: id,
            hostname: domains[index],
            isPrimary: index === 0,
            isActive: true,
          },
          update: {
            profileId: id,
            isPrimary: index === 0,
            isActive: true,
          },
        })
      }
    })

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/')
    revalidatePath(`/page/${profile.slug}`)
    revalidatePath(`/tools/site-profiles/${id}/edit`)
    revalidateTag('site-profile', { expire: 0 })
    return { success: true }
  } catch (error) {
    console.error('[DB ERROR] updateSiteProfileRuntime:', error)
    return { error: 'Lỗi cập nhật cấu hình website' }
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

// ─────────────────────────────────────────────────────────
// MEMBER MANAGEMENT
// ─────────────────────────────────────────────────────────

/**
 * Thêm cộng sự vào profile
 */
export async function addProfileMember(profileId: number, userId: number, role: string = 'ASSOCIATE') {
  try {
    const profile = await managedProfile(profileId, true)
    if (profile.userId === userId) return { error: 'User này là chủ sở hữu profile' }

    if (![WEBSITE_MANAGER_ROLE, 'ASSOCIATE'].includes(role)) return { error: 'Quyền cộng sự không hợp lệ' }
    if (!Number.isSafeInteger(userId) || userId < 0 || !await prisma.user.findUnique({where:{id:userId},select:{id:true}})) return { error: 'Không tìm thấy tài khoản cộng sự' }
    const member = await prisma.siteProfileMember.upsert({
      where: { profileId_userId: { profileId, userId } },
      create: { profileId, userId, role },
      update: { role }
    })

    const { revalidatePath } = await import('next/cache')
    revalidatePath(`/tools/site-profiles/${profileId}/edit`)
    revalidatePath(`/tools/my-site/edit`)
    revalidatePath(`/page/${profile.slug}`)
    // [OPTIMIZE] getDefaultProfile/getCoursesForProfile/getSurveyForProfile/
    // getPostsForProfile đều cache theo tag này (bao gồm members[]) — thiếu
    // dòng này thì trang chủ vẫn hiện danh sách cộng sự cũ tới khi cache tự
    // hết hạn (600s).
    revalidateTag('site-profile', { expire: 0 })

    return { success: true, member }
  } catch (error) {
    console.error("[DB ERROR] addProfileMember:", error)
    return { error: 'Lỗi khi thêm thành viên' }
  }
}

/**
 * Xóa cộng sự khỏi profile
 */
export async function removeProfileMember(profileId: number, userId: number) {
  try {
    const profile = await managedProfile(profileId, true)
    await prisma.siteProfileMember.delete({
      where: { profileId_userId: { profileId, userId } }
    })

    const { revalidatePath } = await import('next/cache')
    revalidatePath(`/tools/site-profiles/${profileId}/edit`)
    revalidatePath(`/tools/my-site/edit`)
    revalidatePath(`/page/${profile.slug}`)
    revalidateTag('site-profile', { expire: 0 })

    return { success: true }
  } catch (error) {
    console.error("[DB ERROR] removeProfileMember:", error)
    return { error: 'Lỗi khi xóa thành viên' }
  }
}
