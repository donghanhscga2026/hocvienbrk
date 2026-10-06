import 'server-only'

import { headers } from 'next/headers'
import { unstable_cache } from 'next/cache'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

import {getCourseWhereForProfile,normalizeSiteHostname} from './config'
import {activeDomain} from '@/lib/website/domains'
import {isPlatformHost} from '@/lib/website/domain-shared'
export * from './config'

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

const getRuntimeProfileBySlugCached = unstable_cache(
  async (slug: string): Promise<RuntimeSiteProfile | null> => {
    if (!slug) return null
    return prisma.siteProfile.findUnique({
      where: { slug, isActive: true },
      include: SITE_PROFILE_INCLUDE,
    })
  },
  ['runtime-site-profile-by-slug'],
  { tags: ['site-profile'], revalidate: 300 },
)

export async function getSiteProfileForHostname(hostname: string) {
  const domain=await activeDomain(normalizeSiteHostname(hostname))
  if(!domain)return null
  const profile=await prisma.siteProfile.findUnique({where:{id:domain.profileId},include:SITE_PROFILE_INCLUDE})
  return profile ? {...profile,siteConfig:domain.profile.siteConfig}:null
}

export async function getCurrentSiteProfile() {
  const requestHeaders = await headers()
  const hostname = normalizeSiteHostname(
    requestHeaders.get('host'),
  )
  // Tên miền ngoài hệ thống phải được bộ định tuyến thống nhất chấp nhận.
  if(hostname && !isPlatformHost(hostname)){
    return getSiteProfileForHostname(hostname)
  }
  const hostnameProfile = await getProfileForHostnameCached(hostname)
  if (hostnameProfile) return hostnameProfile

  const configuredSlug = process.env.SITE_PROFILE_KEY?.trim()
  if (configuredSlug) {
    const configuredProfile = await getRuntimeProfileBySlugCached(configuredSlug)
    if (configuredProfile) return configuredProfile
  }

  return getDefaultRuntimeProfileCached()
}

export async function canProfileAccessCourse(profile: RuntimeSiteProfile, courseId: number) {
  const course = await prisma.course.findFirst({
    where: {
      AND: [getCourseWhereForProfile(profile), {id:courseId}],
    },
    select: { id: true },
  })
  return Boolean(course)
}
