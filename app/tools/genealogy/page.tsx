'use client'

import { useState, useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { useSession } from 'next-auth/react'
import { Role } from '@prisma/client'
import MainHeader from '@/components/layout/MainHeader'
import TabNavigation from '@/components/genealogy/ui/tab-navigation'
import DashboardTab from '@/components/genealogy/dashboard/DashboardTab'
import DiagramTab from '@/components/genealogy/diagram/DiagramTab'
import SettingsTab from '@/components/genealogy/settings/SettingsTab'
import { getMySystemsAction } from '@/app/actions/system-actions'

type TabId = 'dashboard' | 'diagram' | 'settings'

const allTabs = [
  { id: 'dashboard', label: 'Tổng quan', icon: 'BarChart3' as const },
  { id: 'diagram', label: 'Sơ đồ', icon: 'GitBranch' as const },
  { id: 'settings', label: 'Cấu hình', icon: 'Settings' as const },
]

export default function GenealogyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null)
  const [mySystems, setMySystems] = useState<{ onSystem: number; nameSystem: string | null }[]>([])
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
    }
    load()
  }, [])

  const tabs = isAdmin ? allTabs : allTabs.filter(t => t.id !== 'settings')

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
        <MainHeader title="NHÂN MẠCH" toolSlug="genealogy" />
        <TabNavigation tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id as TabId)} />
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className={activeTab === 'dashboard' ? 'flex-1 flex flex-col overflow-hidden min-h-0' : 'hidden'}>
            <DashboardTab
              selectedSystem={selectedSystem}
              setSelectedSystem={setSelectedSystem}
              mySystems={mySystems}
            />
          </div>
          <div className={activeTab === 'diagram' ? 'flex-1 flex flex-col overflow-hidden min-h-0' : 'hidden'}>
            <DiagramTab selectedSystem={selectedSystem} />
          </div>
          {isAdmin && (
            <div className={activeTab === 'settings' ? 'flex-1 flex flex-col overflow-hidden min-h-0' : 'hidden'}>
              <SettingsTab />
            </div>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  )
}
