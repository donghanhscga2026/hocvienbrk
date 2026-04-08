'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'

const STORAGE_KEY = 'affiliate_ref'
const EXPIRY_DAYS = 30

interface AffiliateRef {
  ref: string
  timestamp: number
}

function AffiliateTrackerInner() {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  useEffect(() => {
    const refParam = searchParams.get('ref')
    
    if (refParam) {
      const refData: AffiliateRef = {
        ref: refParam,
        timestamp: Date.now()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(refData))
      console.log('[Affiliate] Captured ref:', refParam)
      
      const cleanUrl = pathname.split('?')[0]
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [searchParams, pathname])

  return null
}

export default function AffiliateTracker() {
  return (
    <Suspense fallback={null}>
      <AffiliateTrackerInner />
    </Suspense>
  )
}

export function getAffiliateRef(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    
    const data: AffiliateRef = JSON.parse(stored)
    const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000
    
    if (Date.now() - data.timestamp > expiryMs) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    
    return data.ref
  } catch {
    return null
  }
}

export function clearAffiliateRef() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}