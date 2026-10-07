import type {Prisma} from '@prisma/client'
import {FREE_DESIGN_ENABLED} from '@/lib/website/free-design'

export type SiteHomepageType = 'community' | 'profile' | 'landing' | 'website'
export type SiteCourseScopeMode = 'all' | 'profile' | 'teacher' | 'ids' | 'category'

export interface SiteRuntimeConfig {
  branding: {
    name?: string
    logoUrl?: string
    faviconUrl?: string
  }
  homepage: {
    type: SiteHomepageType
    landingId?: number
    landingSlug?: string
  }
  modules: {
    courses: boolean
    community: boolean
    affiliate: boolean
    tools: boolean
    surveys: boolean
    roadmap: boolean
  }
  courseScope: {
    mode: SiteCourseScopeMode
    teacherIds?: number[]
    courseIds?: number[]
    categoryIds?: number[]
  }
  theme: {
    allowUserOverride: boolean
  }
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function intArray(value: unknown) {
  if (!Array.isArray(value)) return undefined
  const result = value
    .map(item => Number(item))
    .filter(item => Number.isInteger(item) && item > 0)
  return Array.from(new Set(result))
}

export function normalizeSiteHostname(value: string | null | undefined) {
  if (!value) return ''
  const first = value.split(',')[0]?.trim().toLowerCase() || ''
  return first.replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/\.$/, '')
}

export function getSiteRuntimeConfig(profile: {
  siteConfig?: unknown
  courseIds?: unknown
  userId?: number | null
  showAllCourses?: boolean
  showCommunity?: boolean
}): SiteRuntimeConfig {
  const raw = profile.siteConfig && typeof profile.siteConfig === 'object' && !Array.isArray(profile.siteConfig)
    ? profile.siteConfig as Record<string, unknown>
    : {}

  const rawBranding = raw.branding && typeof raw.branding === 'object' && !Array.isArray(raw.branding)
    ? raw.branding as Record<string, unknown>
    : {}

  const rawHomepage = raw.homepage && typeof raw.homepage === 'object' && !Array.isArray(raw.homepage)
    ? raw.homepage as Record<string, unknown>
    : {}
  const homepageType = ['community', 'profile', 'landing', 'website'].includes(String(rawHomepage.type))
    ? String(rawHomepage.type) as SiteHomepageType
    : 'community'

  const rawModules = raw.modules && typeof raw.modules === 'object' && !Array.isArray(raw.modules)
    ? raw.modules as Record<string, unknown>
    : {}

  const rawScope = raw.courseScope && typeof raw.courseScope === 'object' && !Array.isArray(raw.courseScope)
    ? raw.courseScope as Record<string, unknown>
    : {}

  const legacyCourseIds = intArray(profile.courseIds)
  const defaultMode: SiteCourseScopeMode = legacyCourseIds?.length
    ? 'ids'
    : profile.userId != null && profile.userId !== 0
      ? 'profile'
      : 'all'
  const requestedMode = String(rawScope.mode || '')
  const mode = ['all', 'profile', 'teacher', 'ids', 'category'].includes(requestedMode)
    ? requestedMode as SiteCourseScopeMode
    : defaultMode

  const rawTheme = raw.theme && typeof raw.theme === 'object' && !Array.isArray(raw.theme)
    ? raw.theme as Record<string, unknown>
    : {}

  const shortText = (value: unknown) => typeof value === 'string' && value.trim() && value.length <= 500
    ? value.trim()
    : undefined

  return {
    branding: {
      name: shortText(rawBranding.name),
      logoUrl: shortText(rawBranding.logoUrl),
      faviconUrl: shortText(rawBranding.faviconUrl),
    },
    homepage: {
      // Cấu hình cũ được đọc như mẫu có sẵn, không ghi đè dữ liệu trong DB.
      type: homepageType === 'website' && !FREE_DESIGN_ENABLED ? 'profile' : homepageType,
      landingId: Number.isInteger(Number(rawHomepage.landingId)) && Number(rawHomepage.landingId) > 0
        ? Number(rawHomepage.landingId)
        : undefined,
      landingSlug: typeof rawHomepage.landingSlug === 'string' && rawHomepage.landingSlug.trim()
        ? rawHomepage.landingSlug.trim()
        : undefined,
    },
    modules: {
      courses: bool(rawModules.courses, profile.showAllCourses !== false),
      community: bool(rawModules.community, profile.showCommunity !== false),
      affiliate: bool(rawModules.affiliate, true),
      tools: bool(rawModules.tools, true),
      surveys: bool(rawModules.surveys, true),
      roadmap: bool(rawModules.roadmap, true),
    },
    courseScope: {
      mode,
      teacherIds: intArray(rawScope.teacherIds),
      courseIds: intArray(rawScope.courseIds) || legacyCourseIds,
      categoryIds: intArray(rawScope.categoryIds),
    },
    theme: {
      allowUserOverride: bool(rawTheme.allowUserOverride, false),
    },
  }
}


export type CourseScopeProfile={siteConfig?:unknown;courseIds?:unknown;userId?:number|null;showAllCourses?:boolean;showCommunity?:boolean;members?:{userId:number}[]}
export function getCourseWhereForProfile(profile: CourseScopeProfile): Prisma.CourseWhereInput {
  const config = getSiteRuntimeConfig(profile)
  if (!config.modules.courses) return { id: -1 }

  switch (config.courseScope.mode) {
    case 'ids':
      return {
        status: true,
        id: { in: config.courseScope.courseIds || [] },
      }
    case 'teacher':
      return {
        status: true,
        teacherId: { in: config.courseScope.teacherIds || [] },
      }
    case 'category':
      return {
        status: true,
        categoryId: { in: config.courseScope.categoryIds || [] },
      }
    case 'profile': {
      const teacherIds = [
        ...(profile.userId != null && profile.userId !== 0 ? [profile.userId] : []),
        ...(profile.members || []).map(member => member.userId),
      ]
      return {
        status: true,
        teacherId: { in: Array.from(new Set(teacherIds)) },
      }
    }
    case 'all':
    default:
      return { status: true }
  }
}


/** Dùng cùng quy tắc cho proxy, trang danh sách và Server Actions. */
export function courseBelongsToProfile(profile:CourseScopeProfile,course:{id:number;teacherId:number|null;categoryId?:number|null;status:boolean}|null|undefined) {
  const config=getSiteRuntimeConfig(profile)
  if(!course?.status || !config.modules.courses)return false
  const scope=config.courseScope
  if(scope.mode==='ids')return (scope.courseIds || []).includes(course.id)
  if(scope.mode==='teacher')return (scope.teacherIds || []).includes(course.teacherId ?? -1)
  if(scope.mode==='category')return (scope.categoryIds || []).includes(course.categoryId ?? -1)
  if(scope.mode==='profile')return [profile.userId,...(profile.members || []).map(m=>m.userId)].includes(course.teacherId ?? -1)
  return true
}
