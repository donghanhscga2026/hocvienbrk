'use client'

interface BrkWalletCardProps {
  balance: number
  totalEarned: number
  totalWithdrawn: number
}

export default function BrkWalletCard({ balance, totalEarned, totalWithdrawn }: BrkWalletCardProps) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200">
      <h3 className="text-lg font-semibold text-amber-800 mb-4">Ví BRK</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Số dư khả dụng</span>
          <span className="text-2xl font-bold text-amber-600">${balance.toFixed(2)}</span>
        </div>
        <div className="h-px bg-amber-200" />
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Đã nhận</span>
          <span className="text-green-600 font-medium">+${totalEarned.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Đã rút</span>
          <span className="text-red-500 font-medium">-${totalWithdrawn.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
