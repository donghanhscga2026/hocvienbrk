'use client'

import { createContext, useContext } from 'react'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'

const BrandContext = createContext<DeploymentBrand | null>(null)

export function Wi300BrandProvider({ brand, children }: { brand: DeploymentBrand; children: React.ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export const useWi300Brand = () => useContext(BrandContext)
