'use client'

import { useEffect, useState } from 'react'
import { getBrkLevelData } from '@/app/actions/brk-actions'
import BrkLevelProgress from '@/components/brk/BrkLevelProgress'

interface LevelConfig {
  id: number
  level: number
  pointsRequired: string
  personalFeePct: string
  giftValue: number
  timeLimitDays: number | null
  branchReqs: { id: number; branchLevel: number; count: number }[]
}

interface LevelProgress {
  currentLevel: number
  totalPoints: number
  progress: number
  pointsNeeded: number
  currentConfig: LevelConfig | null
  nextConfig: LevelConfig | null
  giftClaimed: boolean
  levelUpRecords: { id: number; fromLevel: number; toLevel: number; promotedAt: string }[]
}

export default function BrkLevelPage() {
  const [onSystem, setOnSystem] = useState(4)
  const [progress, setProgress] = useState<LevelProgress | null>(null)
  const [configs, setConfigs] = useState<LevelConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBrkLevelData(onSystem).then((d) => {
      setProgress(d.progress as any)
      setConfigs(d.configs as any)
    }).catch(console.error).finally(() => setLoading(false))
  }, [onSystem])

  if (loading) return <div className="p-6 text-center text-gray-500">Đang tải...</div>

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Thăng tiến cấp bậc</h1>

      {progress && (
        <BrkLevelProgress
          currentLevel={progress.currentLevel}
          totalPoints={progress.totalPoints}
          progress={progress.progress}
          pointsNeeded={progress.pointsNeeded}
          nextLevel={progress.nextConfig?.level}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Bảng cấp bậc</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Cấp</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Điểm yêu cầu</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Phí cá nhân</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Quà tặng</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Yêu cầu nhánh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {configs.map((cfg) => (
                <tr key={cfg.id} className={progress?.currentLevel === cfg.level ? 'bg-amber-50' : ''}>
                  <td className="px-4 py-3 font-medium">
                    Cấp {cfg.level}
                    {progress?.currentLevel === cfg.level && (
                      <span className="ml-2 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Hiện tại</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{Number(cfg.pointsRequired).toFixed(0)}</td>
                  <td className="px-4 py-3 text-right">{cfg.personalFeePct}%</td>
                  <td className="px-4 py-3 text-right">{cfg.giftValue > 0 ? `${cfg.giftValue.toLocaleString()}đ` : '-'}</td>
                  <td className="px-4 py-3 text-right text-xs">
                    {cfg.branchReqs.map((br) => `${br.count} nhánh Cấp ${br.branchLevel}`).join(', ') || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
