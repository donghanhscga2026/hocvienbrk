'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { Role } from '@prisma/client'
import { Zap } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import TabNavigation from '@/components/genealogy/ui/tab-navigation'
import DashboardTab from '@/components/genealogy/dashboard/DashboardTab'
import SettingsTab from '@/components/genealogy/settings/SettingsTab'
import { getMySystemsAction } from '@/app/actions/system-actions'

// [OPTIMIZE] Tab mặc định là "Tổng quan", không phải "Sơ đồ" — hoãn tải thư
// viện @xyflow/react tới khi admin thực sự chuyển sang tab Sơ đồ.
const DiagramSection = dynamic(() => import('@/components/genealogy/diagram/DiagramSection'), { ssr: false })

type TabId = 'dashboard' | 'diagram' | 'settings'

const allTabs = [
  { id: 'dashboard', label: 'Tổng quan', icon: 'BarChart3' as const },
  { id: 'diagram', label: 'Sơ đồ', icon: 'GitBranch' as const },
  { id: 'settings', label: 'Cấu hình', icon: 'Settings' as const },
]

export default function GenealogyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null)
  const [diagramViewKey, setDiagramViewKey] = useState(0)
  const [mySystems, setMySystems] = useState<{ onSystem: number; nameSystem: string | null }[]>([])
  const [systemsLoaded, setSystemsLoaded] = useState(false)
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === Role.ADMIN

  useEffect(() => {
    async function load() {
      const result = await getMySystemsAction()
      if (result.success && Array.isArray(result.systems)) {
        setMySystems(result.systems)
        if (result.systems.length > 0) {
          const maxSystem = Math.max(...result.systems.map((s: any) => s.onSystem))
          setSelectedSystem(maxSystem)
        }
      }
      setSystemsLoaded(true)
    }
    load()
  }, [])

  const tabs = isAdmin ? allTabs : allTabs.filter(t => t.id !== 'settings')

  const handleTabChange = (id: TabId) => {
    setActiveTab(id)
    if (id === 'diagram') {
      setDiagramViewKey(prev => prev + 1)
    }
  }

  if (!systemsLoaded) {
    return (
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
        <MainHeader title="NHÂN MẠCH" toolSlug="genealogy" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
            <Zap className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Đang tải dữ liệu hệ thống...</span>
            <span className="text-[10px] font-bold text-slate-400">Vui lòng chờ trong giây lát</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <MainHeader title="NHÂN MẠCH" toolSlug="genealogy" />
      <TabNavigation tabs={tabs} active={activeTab} onChange={(id) => handleTabChange(id as TabId)} />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className={activeTab === 'dashboard' ? 'flex-1 flex flex-col overflow-hidden min-h-0' : 'hidden'}>
          <DashboardTab
            selectedSystem={selectedSystem}
            setSelectedSystem={setSelectedSystem}
            mySystems={mySystems}
          />
        </div>
        <div className={activeTab === 'diagram' ? 'flex-1 flex flex-col overflow-hidden min-h-0' : 'hidden'}>
          {activeTab === 'diagram' && (
            <DiagramSection selectedSystem={selectedSystem} diagramViewKey={diagramViewKey} />
          )}
        </div>
        {isAdmin && (
          <div className={activeTab === 'settings' ? 'flex-1 flex flex-col overflow-hidden min-h-0' : 'hidden'}>
            <SettingsTab />
          </div>
        )}
      </div>
    </div>
  )
}
