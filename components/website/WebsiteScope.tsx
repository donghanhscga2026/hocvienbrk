'use client'
import { createContext, useCallback, useContext, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

const WebsiteScope = createContext<number | undefined>(undefined)
export function WebsiteScopeProvider({ children }: { children: React.ReactNode }) {
  const query = useSearchParams(), raw = query.get('profileId')
  const id = raw === null ? undefined : Number(raw)
  return <WebsiteScope.Provider value={id}><div key={String(id)}>{children}</div></WebsiteScope.Provider>
}
/** Giữ ngữ cảnh trong liên kết và request, không dùng cookie chọn website dùng chung giữa các tab. */
export function useWebsiteScope() {
  const profileId = useContext(WebsiteScope)
  const href = useCallback((path: string) => {
    if (profileId === undefined) return path
    const [base, hash] = path.split('#'), [pathname, search] = base.split('?')
    const params = new URLSearchParams(search); params.set('profileId', String(profileId))
    return pathname + '?' + params.toString() + (hash ? '#' + hash : '')
  }, [profileId])
  const scopedFetch = useCallback((path: string, init?: RequestInit) => fetch(href(path), init), [href])
  return useMemo(() => ({ profileId, href, fetch: scopedFetch }), [profileId, href, scopedFetch])
}
