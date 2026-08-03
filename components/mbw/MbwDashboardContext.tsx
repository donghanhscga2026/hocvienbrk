'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { getMbwDashboard, type MbwDashboardData } from '@/app/actions/mbw-dashboard-actions'

interface MbwDashboardContextType {
  isOpen: boolean
  data: MbwDashboardData | null
  loading: boolean
  open: () => void
  close: () => void
  refresh: () => Promise<void>
}

const MbwDashboardContext = createContext<MbwDashboardContextType>({
  isOpen: false,
  data: null,
  loading: false,
  open: () => {},
  close: () => {},
  refresh: async () => {},
})

export function useMbwDashboard() {
  return useContext(MbwDashboardContext)
}

export function MbwDashboardProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const isLoggedIn = status === 'authenticated'

  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<MbwDashboardData | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getMbwDashboard())
    } catch {
      // Bỏ qua lỗi tạm thời (chưa đăng nhập / lỗi mạng)
    } finally {
      setLoading(false)
    }
  }, [])

  // Prefetch dữ liệu ví ngay khi đã đăng nhập → mở popup hiển thị tức thì
  useEffect(() => {
    if (isLoggedIn) {
      refresh()
    }
  }, [isLoggedIn, refresh])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <MbwDashboardContext.Provider value={{ isOpen, data, loading, open, close, refresh }}>
      {children}
    </MbwDashboardContext.Provider>
  )
}
