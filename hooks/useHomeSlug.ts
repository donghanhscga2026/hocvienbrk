'use client'

import { useState, useEffect, useCallback } from 'react'

const HOME_SLUG_KEY = 'brk_home_slug'

export function getHomeSlug(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(HOME_SLUG_KEY)
}

export function setHomeSlug(slug: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(HOME_SLUG_KEY, slug)
}

export function clearHomeSlug(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(HOME_SLUG_KEY)
}

export function useHomeSlug() {
  const [homeSlug, setHomeSlugState] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setHomeSlugState(getHomeSlug())
  }, [])

  const updateHomeSlug = useCallback((slug: string) => {
    setHomeSlug(slug)
    setHomeSlugState(slug)
  }, [])

  const clearHome = useCallback(() => {
    clearHomeSlug()
    setHomeSlugState(null)
  }, [])

  return {
    homeSlug: isClient ? homeSlug : null,
    setHomeSlug: updateHomeSlug,
    clearHomeSlug: clearHome,
    isReady: isClient,
  }
}
