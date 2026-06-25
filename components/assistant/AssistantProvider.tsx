'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import AssistantPopup from './AssistantPopup'

export type DisplayMode = 'icon' | 'avatar'

export interface AssistantGuideData {
  id: number
  pagePath: string
  title: string
  script: string | null
  textContent: string | null
  videoUrl: string | null
  agentVideoUrl: string | null
}

interface AssistantContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  displayMode: DisplayMode
  guideData: AssistantGuideData | null
}

const AssistantContext = createContext<AssistantContextType | null>(null)

export function useFloatingAssistant() {
  const ctx = useContext(AssistantContext)
  if (!ctx) throw new Error('useFloatingAssistant must be used within AssistantProvider')
  return ctx
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('icon')
  const [guideData, setGuideData] = useState<AssistantGuideData | null>(null)

  const fetchGuide = useCallback(async (pagePath: string) => {
    try {
      const res = await fetch(`/api/assistant-guide?pagePath=${encodeURIComponent(pagePath)}`)
      const json = await res.json()
      if (json.success) {
        setGuideData(json.data)
      } else {
        setGuideData(null)
      }
    } catch {
      setGuideData(null)
    }
  }, [])

  useEffect(() => {
    fetchGuide(pathname)
  }, [pathname, fetchGuide])

  useEffect(() => {
    fetch('/api/assistant-guide/config').then(r => r.json()).then(json => {
      if (json.success) setDisplayMode(json.data.displayMode)
    }).catch(() => {})
  }, [])

  return (
    <AssistantContext.Provider value={{ isOpen, setIsOpen, displayMode, guideData }}>
      {children}
      {isOpen && <AssistantPopup />}
    </AssistantContext.Provider>
  )
}
