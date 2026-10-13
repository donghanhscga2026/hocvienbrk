import 'server-only'
import { headers } from 'next/headers'
import { cache } from 'react'
import prisma from '@/lib/prisma'
import { readAppearance } from '@/lib/wi300/appearance-service'
import { getDeploymentBrand, type DeploymentBrand } from './deployment-brand'
import { isPlatformHost, requestHostname } from '@/lib/website/domain-shared'

/** Chỉ áp dụng cho website hệ thống của project, không chiếm thương hiệu domain chuyên gia. */
export const getCurrentDeploymentBrand = cache(async (): Promise<DeploymentBrand | null> => {
  const brand = getDeploymentBrand()
  if (!brand) return null
  const host = requestHostname((await headers()).get('host') || '')
  if (!host || !isPlatformHost(host)) return null
  try {
    const { published: appearance } = await readAppearance(prisma)
    const c = appearance.common
    return { ...brand, appearance, logoUrl: c.logoUrl || brand.logoUrl, wordmarkUrl: c.logoUrl || brand.wordmarkUrl, iconUrl: c.iconUrl || brand.iconUrl, palette: { ...brand.palette, primary: c.primary, accent: c.accent, background: c.background, onSurface: c.foreground } }
  } catch (error) {
    console.error('[Wi appearance read]', error instanceof Error ? error.name : 'Unknown')
    return brand
  }
})
