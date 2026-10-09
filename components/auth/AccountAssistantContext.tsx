'use client'

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

// [OPTIMIZE] Modal 948 dòng + thư viện libphonenumber-js chỉ cần tải khi
// người dùng thực sự mở trợ lý tài khoản, không phải trên mọi trang.
const AccountAssistantModal = dynamic(() => import('./AccountAssistantModal'), { ssr: false })

interface AccountAssistantContextType {
  enabled: boolean
  isOpen: boolean
  openAssistant: () => void
  closeAssistant: () => void
}

const AccountAssistantContext = createContext<AccountAssistantContextType | null>(null)

export function useAccountAssistant() {
  const ctx = useContext(AccountAssistantContext)
  if (!ctx) throw new Error('useAccountAssistant must be used within AccountAssistantProvider')
  return ctx
}

export function AccountAssistantProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const openAssistant = useCallback(() => {
    if (enabled) setIsOpen(true)
    else router.push('/login?callbackUrl=' + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash))
  }, [enabled, router])
  const closeAssistant = useCallback(() => setIsOpen(false), [])

  return (
    <AccountAssistantContext.Provider value={{ enabled, isOpen: enabled && isOpen, openAssistant, closeAssistant }}>
      {children}
      {enabled && isOpen && <AccountAssistantModal onClose={closeAssistant} />}
    </AccountAssistantContext.Provider>
  )
}
