import 'server-only'
import { headers } from 'next/headers'
import { cache } from 'react'
import { getDeploymentBrand } from './deployment-brand'
import { isPlatformHost, requestHostname } from '@/lib/website/domain-shared'

/** Chỉ áp dụng cho website hệ thống của project, không chiếm thương hiệu domain chuyên gia. */
export const getCurrentDeploymentBrand = cache(async () => {
  const brand = getDeploymentBrand()
  if (!brand) return null
  const host = requestHostname((await headers()).get('host') || '')
  return host && isPlatformHost(host) ? brand : null
})
