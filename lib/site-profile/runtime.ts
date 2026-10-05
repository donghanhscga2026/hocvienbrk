import 'server-only'

import { headers } from 'next/headers'
import { unstable_cache } from 'next/cache'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

export type SiteHomepageType = 'community' | 'profile' | 'landing' | 'website'
export type SiteCourseScopeMode = 'all' | 'profile' | 'teacher' | 'ids' | 'category'

export interface SiteRuntimeConfig {
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

export const SITE_PROFILE_INCLUDE = {
  user: { select: { id: true, name: true, image: true } },
  members: {
    include: { user: { select: { id: true, name: true, image: true } } },
  },
  theme: true,
  domains: {
    where: { isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
  },
  surveys: true,
  landingPages: {
    where: { isActive: true },
    take: 50,
  },
  affiliateCampaign: {
    include: { levels: true },
  },
} satisfies Prisma.SiteProfileInclude

export type RuntimeSiteProfile = Prisma.SiteProfileGetPayload<{
  include: typeof SITE_PROFILE_INCLUDE
}>

function bool(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function intArray(value: unknown) {
  if (!Array.isArray(value)) return undefined
  const result = value
    .map(item => Number(item))
    .filter(item => Number.isInteger(item) && item > 0)
  return result.length ? Array.from(new Set(result)) : undefined
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

  return {
    homepage: {
      type: homepageType,
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

const getProfileForHostnameCached = unstable_cache(
  async (hostname: string): Promise<RuntimeSiteProfile | null> => {
    if (!hostname) return null
    const candidates = hostname.startsWith('www.') ? [hostname, hostname.slice(4)] : [hostname]
    const domain = await prisma.siteProfileDomain.findFirst({
      where: {
        hostname: { in: candidates },
        isActive: true,
        profile: { isActive: true },
      },
      include: {
        profile: {
          include: SITE_PROFILE_INCLUDE,
        },
      },
    })
    return domain?.profile || null
  },
  ['site-profile-by-hostname'],
  { tags: ['site-profile'], revalidate: 300 },
)

const getDefaultRuntimeProfileCached = unstable_cache(
  async (): Promise<RuntimeSiteProfile | null> => {
    return prisma.siteProfile.findFirst({
      where: { isDefault: true, isActive: true },
      include: SITE_PROFILE_INCLUDE,
    })
  },
  ['default-runtime-site-profile'],
  { tags: ['site-profile'], revalidate: 300 },
)

export async function getSiteProfileForHostname(hostname: string) {
  return getProfileForHostnameCached(normalizeSiteHostname(hostname))
}

export async function getCurrentSiteProfile() {
  const requestHeaders = await headers()
  const hostname = normalizeSiteHostname(
    requestHeaders.get('x-forwarded-host') || requestHeaders.get('host'),
  )
  return (await getProfileForHostnameCached(hostname)) || getDefaultRuntimeProfileCached()
}

export function getCourseWhereForProfile(profile: RuntimeSiteProfile): Prisma.CourseWhereInput {
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
        ...profile.members.map(member => member.userId),
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

export async function canProfileAccessCourse(profile: RuntimeSiteProfile, courseId: number) {
  const course = await prisma.course.findFirst({
    where: {
      ...getCourseWhereForProfile(profile),
      id: courseId,
    },
    select: { id: true },
  })
  return Boolean(course)
}
