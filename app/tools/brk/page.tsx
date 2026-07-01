'use client'

import { useEffect, useState } from 'react'
import BrkWalletCard from '@/components/brk/BrkWalletCard'
import BrkLevelProgress from '@/components/brk/BrkLevelProgress'
import BrkRevenueHistory from '@/components/brk/BrkRevenueHistory'
import { getBrkDashboard, getAvailableBrkSystems, joinBrkSystem, cancelBrkMembership, getBrkRevenueShare } from '@/app/actions/brk-actions'

interface BrkSystemInfo {
  onSystem: number
  nameSystem: string
  level: number
  totalPoints: number
  f1Count: number
  totalDownline: number
  activatedAt: string | null
  expiresAt: string | null
  gracePeriodEnd: string | null
  levelProgress: {
    currentLevel: number
    totalPoints: number
    progress: number
    pointsNeeded: number
    nextConfig: { level: number } | null
  } | null
  bonusEligible: boolean
}

interface AvailableSystem {
  onSystem: number
  nameSystem: string
  fee: number
  durationDays: number
  graceDays: number
  returnPct: number
  joined: boolean
  userStatus: string | null
}

export default function BrkDashboardPage() {
  const [walletBalance, setWalletBalance] = useState(0)
  const [systems, setSystems] = useState<BrkSystemInfo[]>([])
  const [availableSystems, setAvailableSystems] = useState<AvailableSystem[]>([])
  const [revenueAwards, setRevenueAwards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'systems' | 'revenue'>('dashboard')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [dashboard, available] = await Promise.all([
        getBrkDashboard(),
        getAvailableBrkSystems()
      ])
      setWalletBalance(dashboard.walletBalance)
      setSystems(dashboard.systems)
      setAvailableSystems(available)

      if (dashboard.systems.length > 0) {
        const awards = await getBrkRevenueShare(dashboard.systems[0].onSystem)
        setRevenueAwards(awards)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(onSystem: number) {
    try {
      const result = await joinBrkSystem(onSystem)
      if (result.status === 'ACTIVE') {
        await loadData()
      } else if (result.status === 'PENDING' && result.courseIdKhoa) {
        window.location.href = `/khoa-hoc/${result.courseIdKhoa}`
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleCancel(onSystem: number) {
    if (!confirm('Bạn có chắc muốn hủy kích hoạt? Hành động này chỉ khả dụng trong thời gian cân nhắc.')) return
    await cancelBrkMembership(onSystem)
    await loadData()
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Đang tải...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">BRK Affiliate</h1>
        <div className="flex gap-2">
          {['dashboard', 'systems', 'revenue'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'dashboard' ? 'Tổng quan' : tab === 'systems' ? 'Hệ thống' : 'Đồng chia'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <BrkWalletCard balance={walletBalance} totalEarned={0} totalWithdrawn={0} />
          </div>
          <div className="lg:col-span-2 space-y-4">
            {systems.map((sys) => (
              <div key={sys.onSystem} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{sys.nameSystem}</h3>
                    <p className="text-sm text-gray-500">
                      F1: {sys.f1Count} | Tổng hạ: {sys.totalDownline} | Điểm: {sys.totalPoints.toFixed(0)} BRKD
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    Cấp {sys.level}
                  </span>
                </div>

                {sys.levelProgress && (
                  <BrkLevelProgress
                    currentLevel={sys.levelProgress.currentLevel}
                    totalPoints={sys.levelProgress.totalPoints}
                    progress={sys.levelProgress.progress}
                    pointsNeeded={sys.levelProgress.pointsNeeded}
                    nextLevel={sys.levelProgress.nextConfig?.level}
                  />
                )}

                <div className="flex gap-2 mt-3">
                  {sys.gracePeriodEnd && new Date(sys.gracePeriodEnd) > new Date() && (
                    <button
                      onClick={() => handleCancel(sys.onSystem)}
                      className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      Hủy (còn trong thời gian cân nhắc)
                    </button>
                  )}
                  {sys.bonusEligible && (
                    <span className="px-3 py-1.5 text-sm bg-amber-50 text-amber-600 rounded-lg">
                      Đủ điều kiện nhận thưởng 2 F1
                    </span>
                  )}
                </div>
              </div>
            ))}

            {systems.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                Bạn chưa tham gia hệ thống BRK nào. Hãy chuyển qua tab "Hệ thống" để tham gia.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'systems' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableSystems.map((sys) => (
            <div key={sys.onSystem} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition">
              <h3 className="font-semibold text-gray-800 text-lg mb-2">{sys.nameSystem}</h3>
              <div className="space-y-1 text-sm text-gray-500 mb-4">
                <p>Phí: ${sys.fee}</p>
                <p>Thời hạn: {sys.durationDays} ngày</p>
                <p>Cân nhắc: {sys.graceDays} ngày</p>
                <p>Hoàn lại: {sys.returnPct}%</p>
              </div>
              {sys.joined ? (
                <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sys.userStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {sys.userStatus === 'ACTIVE' ? 'Đã tham gia' : sys.userStatus === 'CANCELLED' ? 'Đã hủy' : 'Đã hết hạn'}
                </span>
              ) : (
                <button
                  onClick={() => handleJoin(sys.onSystem)}
                  className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium text-sm"
                >
                  Tham gia ngay
                </button>
              )}
            </div>
          ))}

          {availableSystems.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              Chưa có hệ thống BRK nào được tạo.
            </div>
          )}
        </div>
      )}

      {activeTab === 'revenue' && (
        <BrkRevenueHistory awards={revenueAwards} />
      )}
    </div>
  )
}
