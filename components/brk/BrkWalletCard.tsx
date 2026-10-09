'use client'

import { useWi300Brand } from '@/components/wi300/Wi300BrandContext'
import { walletMoney } from '@/lib/wi300/wallet-display'

interface BrkWalletCardProps {
  balance: number
  totalEarned: number
  totalWithdrawn: number
}

export default function BrkWalletCard({ balance, totalEarned, totalWithdrawn }: BrkWalletCardProps) {
  const wi300 = !!useWi300Brand()
  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200">
      <h3 className="text-lg font-semibold text-amber-800 mb-4">{wi300 ? 'Ví Wi' : 'Ví MFC'}</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Số dư khả dụng</span>
          <span className="text-2xl font-bold text-amber-600">{walletMoney(balance, wi300)}</span>
        </div>
        <div className="h-px bg-amber-200" />
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Đã nhận</span>
          <span className="text-green-600 font-medium">+{walletMoney(totalEarned, wi300)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Đã rút</span>
          <span className="text-red-500 font-medium">-{walletMoney(totalWithdrawn, wi300)}</span>
        </div>
      </div>
    </div>
  )
}
