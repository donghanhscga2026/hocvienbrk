'use client'

import { useEffect, useState } from 'react'
import { getBrkWalletData } from '@/app/actions/brk-actions'
import BrkWalletCard from '@/components/brk/BrkWalletCard'

interface Transaction {
  id: number
  amount: number
  type: string
  description: string
  balanceBefore: number
  balanceAfter: number
  createdAt: string
}

interface WalletData {
  wallet: { balance: number; totalEarned: number; totalWithdrawn: number } | null
  transactions: Transaction[]
}

export default function BrkWalletPage() {
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBrkWalletData().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-center text-gray-500">Đang tải...</div>

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Ví BRK</h1>

      {data?.wallet && (
        <BrkWalletCard
          balance={Number(data.wallet.balance)}
          totalEarned={Number(data.wallet.totalEarned)}
          totalWithdrawn={Number(data.wallet.totalWithdrawn)}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Lịch sử giao dịch</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {data?.transactions.map((tx) => (
            <div key={tx.id} className="p-4 flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-gray-700">{tx.description}</span>
                <div className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString('vi-VN')}</div>
              </div>
              <span className={`font-semibold ${Number(tx.amount) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {Number(tx.amount) >= 0 ? '+' : ''}${Number(tx.amount).toFixed(2)}
              </span>
            </div>
          ))}
          {(!data?.transactions || data.transactions.length === 0) && (
            <div className="p-8 text-center text-gray-400">Chưa có giao dịch</div>
          )}
        </div>
      </div>
    </div>
  )
}
