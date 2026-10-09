'use client'

import { useWi300Brand } from '@/components/wi300/Wi300BrandContext'
import { walletMoney } from '@/lib/wi300/wallet-display'

interface BrkRevenueAward {
  id: number
  amount: string | number
  pool: {
    roundNumber: number
    totalRevenue: string | number
    poolAmount: string | number
    qualifiedCount: number
    distributedAt: string
  }
}

interface BrkRevenueHistoryProps {
  awards: BrkRevenueAward[]
}

export default function BrkRevenueHistory({ awards }: BrkRevenueHistoryProps) {
  const wi300 = !!useWi300Brand()
  if (!awards || awards.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Lịch sử đồng chia</h3>
        <p className="text-gray-400 text-center py-6">Chưa có kỳ chia doanh thu nào</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Lịch sử đồng chia</h3>
      <div className="space-y-3">
        {awards.map((award) => (
          <div key={award.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium text-gray-700">Kỳ #{award.pool.roundNumber}</span>
              <div className="text-xs text-gray-400 mt-0.5">
                Doanh thu: {walletMoney(Number(award.pool.totalRevenue), wi300)} | Quỹ chia: {walletMoney(Number(award.pool.poolAmount), wi300)} | {award.pool.qualifiedCount} người
              </div>
            </div>
            <div className="text-right">
              <span className="text-green-600 font-semibold">+{walletMoney(Number(award.amount), wi300)}</span>
              <div className="text-xs text-gray-400">
                {award.pool.distributedAt ? new Date(award.pool.distributedAt).toLocaleDateString('vi-VN') : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
