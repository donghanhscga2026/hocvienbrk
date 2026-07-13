'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, Wallet, Ticket, Loader2 } from 'lucide-react'
import { useMbwDashboard } from './MbwDashboardContext'
import { getMbwDashboard, type MbwDashboardData } from '@/app/actions/mbw-dashboard-actions'

function formatMoney(v: number) {
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 0 })
}

function VoucherTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    VIP: 'bg-purple-100 text-purple-700 border-purple-200',
    ALL: 'bg-blue-100 text-blue-700 border-blue-200',
    CASH: 'bg-amber-100 text-amber-700 border-amber-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[type] || 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  )
}

export default function MbwDashboardPopup() {
  const { isOpen, close } = useMbwDashboard()
  const [data, setData] = useState<MbwDashboardData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    try {
      const result = await getMbwDashboard()
      setData(result)
    } catch (err) {
      console.error('MBW Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) fetchData()
    else setData(null)
  }, [isOpen, fetchData])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) close()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, close])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-brk-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-brk-primary" />
            <div>
              <h2 className="text-sm font-black text-brk-on-surface">Tài khoản Ngân hàng Phước Báu</h2>
              {data && (
                <p className="text-[10px] text-brk-muted">#{data.user.id} {data.user.name || data.user.email}</p>
              )}
            </div>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-brk-primary animate-spin" />
              <p className="text-xs text-gray-400">Đang tải dữ liệu...</p>
            </div>
          ) : data ? (
            <>
              <div className="space-y-2.5">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200 flex items-center justify-between">
                  <p className="text-xs font-bold text-green-700">Thu nhập (VNĐ)</p>
                  <p className="text-sm font-black text-green-600">{formatMoney(data.balance.cash)}đ</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200 flex items-center justify-between">
                  <p className="text-xs font-bold text-amber-700">Thu nhập đối ứng (MBDT)</p>
                  <p className="text-sm font-black text-amber-600">{formatMoney(data.balance.brkd)}đ</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl p-3 border border-purple-200 flex items-center justify-between">
                  <p className="text-xs font-bold text-purple-700">Voucher quy đổi</p>
                  <p className="text-sm font-black text-purple-600">{formatMoney(data.balance.voucherBalance)}đ</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Ticket className="w-3.5 h-3.5 text-purple-500" />
                  <p className="text-xs font-bold text-gray-700">Voucher ({data.vouchers.length})</p>
                </div>
                {data.vouchers.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-4">Chưa có voucher nào</p>
                ) : (
                  <div className="space-y-2">
                    {data.vouchers.map(v => (
                      <div key={v.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{v.voucherName}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <VoucherTypeBadge type={v.voucherType} />
                            {v.expiresAt && (
                              <span className="text-[10px] text-gray-400">
                                HH: {new Date(v.expiresAt).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                        </div>
                        {v.description && (
                          <p className="text-[11px] text-gray-500 leading-relaxed mt-1">{v.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-xs text-gray-400">Không thể tải dữ liệu</p>
              <button onClick={fetchData} className="text-xs text-brk-primary font-bold hover:underline">Thử lại</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
