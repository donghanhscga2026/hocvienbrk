import 'server-only'
import { headers } from 'next/headers'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import prisma from '@/lib/prisma'
import { appearanceKey, readAppearance } from '@/lib/wi300/appearance-service'
import { getDeploymentBrand, type DeploymentBrand } from './deployment-brand'
import { isPlatformHost, requestHostname } from '@/lib/website/domain-shared'
import { configuredBrand } from '@/lib/wi300/website-config'

// Cache only published settings. The explicit key separates sites and preview branches;
// admin reads still use readAppearance directly to get the latest draft/revision.
const getPublishedAppearance = unstable_cache(async (key: string) => {
  const { published } = await readAppearance(prisma, key)
  return published
}, ['wi300-published-appearance-v1'], { revalidate: 300 })

/** Chỉ áp dụng cho website hệ thống của project, không chiếm thương hiệu domain chuyên gia. */
export const getCurrentDeploymentBrand = cache(async (): Promise<DeploymentBrand | null> => {
  const brand = getDeploymentBrand()
  if (!brand) return null
  const host = requestHostname((await headers()).get('host') || '')
  if (!host || !isPlatformHost(host)) return null
  try {
    const appearance = await getPublishedAppearance(appearanceKey())
    return configuredBrand(brand, appearance)
  } catch (error) {
    console.error('[Wi appearance read]', error instanceof Error ? error.name : 'Unknown')
    return brand
  }
})
