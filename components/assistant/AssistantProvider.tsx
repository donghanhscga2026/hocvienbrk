'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import AssistantPopup from './AssistantPopup'

export type DisplayMode = 'icon' | 'avatar'

export interface AssistantGuideSection {
  type: 'color_legend' | 'features' | 'text' | 'tips'
  title: string
  items?: Array<{
    color?: string
    label?: string
    desc?: string
    feature?: string
    text?: string
  }>
  content?: string
}

export interface AssistantGuideData {
  id: number
  pagePath: string | null
  title: string
  script: string | null
  textContent: string | null
  videoUrl: string | null
  agentVideoUrl: string | null
  toolSlug: string | null
  sections: AssistantGuideSection[] | null
}

interface AssistantContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  displayMode: DisplayMode
  guideData: AssistantGuideData | null
  toolGuideData: AssistantGuideData | null
  activeTab: 'guide' | 'features'
  setActiveTab: (tab: 'guide' | 'features') => void
  showToast: boolean
  dismissToast: () => void
}

const AssistantContext = createContext<AssistantContextType | null>(null)

const TOAST_SEEN_KEY = 'assist_toast_seen'

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
  const [toolGuideData, setToolGuideData] = useState<AssistantGuideData | null>(null)
  const [activeTab, setActiveTab] = useState<'guide' | 'features'>('guide')
  const [showToast, setShowToast] = useState(false)

  const fetchGuide = useCallback(async (pagePath: string) => {
    try {
      const res = await fetch(`/api/assistant-guide?pagePath=${encodeURIComponent(pagePath)}`)
      const json = await res.json()
      if (json.success && json.data) {
        if (json.data.pageGuide) {
          setGuideData(json.data.pageGuide)
        }
        if (json.data.toolGuide) {
          setToolGuideData(json.data.toolGuide)
          if (json.data.toolGuide.sections) {
            setActiveTab('features')
          }
        }
      } else {
        setGuideData(null)
        setToolGuideData(null)
      }
    } catch {
      setGuideData(null)
      setToolGuideData(null)
    }
  }, [])

  useEffect(() => {
    fetchGuide(pathname)
  }, [pathname, fetchGuide])

  useEffect(() => {
    if (!guideData && !toolGuideData) return
    const seen: Record<string, boolean> = JSON.parse(localStorage.getItem(TOAST_SEEN_KEY) || '{}')
    if (!seen[pathname]) {
      const timer = setTimeout(() => setShowToast(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [pathname, guideData, toolGuideData])

  useEffect(() => {
    fetch('/api/assistant-guide/config').then(r => r.json()).then(json => {
      if (json.success) setDisplayMode(json.data.displayMode)
    }).catch(() => {})
  }, [])

  const dismissToast = useCallback(() => {
    setShowToast(false)
    try {
      const seen: Record<string, boolean> = JSON.parse(localStorage.getItem(TOAST_SEEN_KEY) || '{}')
      seen[pathname] = true
      localStorage.setItem(TOAST_SEEN_KEY, JSON.stringify(seen))
    } catch {}
  }, [pathname])

  return (
    <AssistantContext.Provider value={{
      isOpen, setIsOpen, displayMode, guideData, toolGuideData,
      activeTab, setActiveTab, showToast, dismissToast,
    }}>
      {children}
      {showToast && (guideData || toolGuideData) && (
        <AssistantToast
          guideData={guideData}
          toolGuideData={toolGuideData}
          onOpen={() => { setIsOpen(true); dismissToast() }}
          onDismiss={dismissToast}
        />
      )}
      {isOpen && <AssistantPopup />}
    </AssistantContext.Provider>
  )
}

function AssistantToast({
  guideData, toolGuideData, onOpen, onDismiss,
}: {
  guideData: AssistantGuideData | null
  toolGuideData: AssistantGuideData | null
  onOpen: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed bottom-6 right-6 z-[300] animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 max-w-xs">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0 mt-0.5">💡</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">
              {guideData?.title || toolGuideData?.title || 'Trợ lý ảo'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Trang này có hướng dẫn, bấm xem để biết thêm.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={onOpen}
            className="flex-1 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Xem
          </button>
          <button
            onClick={onDismiss}
            className="py-1.5 px-3 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
          >
            Để sau
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
