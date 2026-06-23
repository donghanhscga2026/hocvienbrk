'use client'

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import AccountAssistantModal from './AccountAssistantModal'

interface AccountAssistantContextType {
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

export function AccountAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openAssistant = useCallback(() => setIsOpen(true), [])
  const closeAssistant = useCallback(() => setIsOpen(false), [])

  return (
    <AccountAssistantContext.Provider value={{ isOpen, openAssistant, closeAssistant }}>
      {children}
      {isOpen && <AccountAssistantModal onClose={closeAssistant} />}
    </AccountAssistantContext.Provider>
  )
}
