import 'server-only'
import { headers } from 'next/headers'
import { cache } from 'react'
import prisma from '@/lib/prisma'
import { readAppearance } from '@/lib/wi300/appearance-service'
import { getDeploymentBrand, type DeploymentBrand } from './deployment-brand'
import { isPlatformHost, requestHostname } from '@/lib/website/domain-shared'
import { configuredBrand } from '@/lib/wi300/website-config'

/** Chỉ áp dụng cho website hệ thống của project, không chiếm thương hiệu domain chuyên gia. */
export const getCurrentDeploymentBrand = cache(async (): Promise<DeploymentBrand | null> => {
  const brand = getDeploymentBrand()
  if (!brand) return null
  const host = requestHostname((await headers()).get('host') || '')
  if (!host || !isPlatformHost(host)) return null
  try {
    const { published: appearance } = await readAppearance(prisma)
    return configuredBrand(brand, appearance)
  } catch (error) {
    console.error('[Wi appearance read]', error instanceof Error ? error.name : 'Unknown')
    return brand
  }
})
