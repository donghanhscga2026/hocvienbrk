'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface MbwDashboardContextType {
  isOpen: boolean
  open: () => void
  close: () => void
}

const MbwDashboardContext = createContext<MbwDashboardContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
})

export function useMbwDashboard() {
  return useContext(MbwDashboardContext)
}

export function MbwDashboardProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <MbwDashboardContext.Provider value={{ isOpen, open, close }}>
      {children}
    </MbwDashboardContext.Provider>
  )
}
