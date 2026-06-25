'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import FloatingAssistant from './FloatingAssistant'

export type AssistantMode = 'minimized' | 'floating' | 'popup'

export interface AssistantGuideData {
  id: number
  pagePath: string
  title: string
  script: string | null
  textContent: string | null
  videoUrl: string | null
}

interface AssistantContextType {
  mode: AssistantMode
  setMode: (mode: AssistantMode) => void
  position: { x: number; y: number }
  setPosition: (pos: { x: number; y: number }) => void
  guideData: AssistantGuideData | null
  fetchGuide: (pagePath: string) => Promise<void>
}

const AssistantContext = createContext<AssistantContextType | null>(null)

export function useFloatingAssistant() {
  const ctx = useContext(AssistantContext)
  if (!ctx) throw new Error('useFloatingAssistant must be used within AssistantProvider')
  return ctx
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mode, setMode] = useState<AssistantMode>('minimized')
  const [position, setPosition] = useState({ x: 0, y: 0 })
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

  return (
    <AssistantContext.Provider value={{ mode, setMode, position, setPosition, guideData, fetchGuide }}>
      {children}
      <FloatingAssistant />
    </AssistantContext.Provider>
  )
}
