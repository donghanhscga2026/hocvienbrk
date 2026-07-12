'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { X, Wallet, TrendingUp, Ticket, Gem, ClipboardList, LayoutDashboard, Loader2 } from 'lucide-react'
import { useMbwDashboard } from './MbwDashboardContext'
import { getMbwDashboard, type MbwDashboardData } from '@/app/actions/mbw-dashboard-actions'

type TabKey = 'balance' | 'level' | 'voucher' | 'commission' | 'transactions' | 'overview'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'balance', label: 'Số dư', icon: <Wallet className="w-3.5 h-3.5" /> },
  { key: 'level', label: 'Level', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: 'voucher', label: 'Voucher', icon: <Ticket className="w-3.5 h-3.5" /> },
  { key: 'commission', label: 'Hoa hồng', icon: <Gem className="w-3.5 h-3.5" /> },
  { key: 'transactions', label: 'Giao dịch', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { key: 'overview', label: 'Tổng quan', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
]

const AUTO_ROTATE_MS = 5000
const PAUSE_AFTER_CLICK_MS = 10000

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

function BalanceTab({ data }: { data: MbwDashboardData }) {
  const { balance } = data
  const cards = [
    { label: 'Tiền mặt (Cash)', value: balance.cash, color: 'from-green-50 to-emerald-50', border: 'border-green-200', text: 'text-green-700', valueColor: 'text-green-600' },
    { label: 'BRKD', value: balance.brkd, color: 'from-amber-50 to-yellow-50', border: 'border-amber-200', text: 'text-amber-700', valueColor: 'text-amber-600' },
    { label: 'Tích lũy Affiliate', value: balance.affiliatePending + balance.affiliateAvailable, color: 'from-blue-50 to-indigo-50', border: 'border-blue-200', text: 'text-blue-700', valueColor: 'text-blue-600' },
    { label: 'Tổng hợp', value: balance.totalCash, color: 'from-brk-primary/5 to-brk-accent/5', border: 'border-brk-primary/20', text: 'text-brk-primary', valueColor: 'text-brk-primary' },
  ]

  return (
    <div className="space-y-3">
      {cards.map(c => (
        <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-xl p-4 border ${c.border}`}>
          <p className={`text-xs font-bold ${c.text} mb-1`}>{c.label}</p>
          <p className={`text-xl font-black ${c.valueColor}`}>{formatMoney(c.value)}đ</p>
        </div>
      ))}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Chờ duyệt (Affiliate)</span>
          <span className="font-bold text-amber-600">{formatMoney(balance.affiliatePending)}đ</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Khả dụng (Affiliate)</span>
          <span className="font-bold text-green-600">{formatMoney(balance.affiliateAvailable)}đ</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Voucher Balance</span>
          <span className="font-bold text-purple-600">{formatMoney(balance.voucherBalance)}đ</span>
        </div>
      </div>
    </div>
  )
}

const LEVEL_NAMES = ['', 'Cấp 1', 'Cấp 2', 'Cấp 3', 'Cấp 4', 'Cấp 5', 'Cấp 6', 'Cấp 7', 'Cấp 8']
const LEVEL_COLORS = ['', 'bg-slate-400', 'bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-pink-400', 'bg-rose-400', 'bg-red-400', 'bg-amber-400']

function LevelTab({ data }: { data: MbwDashboardData }) {
  if (data.systems.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-8">Chưa có hệ thống nào</p>
  }

  return (
    <div className="space-y-3">
      {data.systems.map(sys => {
        const lp = sys.levelProgress
        return (
          <div key={sys.onSystem} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs text-gray-500">Hệ thống {sys.onSystem}</p>
                <p className="font-bold text-sm text-gray-800">{LEVEL_NAMES[sys.level] || `Cấp ${sys.level}`}</p>
              </div>
              <div className="text-right text-[10px] text-gray-400">
                <p>F1: <span className="font-bold text-gray-600">{sys.f1Count}</span></p>
                <p>Downline: <span className="font-bold text-gray-600">{sys.totalDownline}</span></p>
              </div>
            </div>
            {lp && (
              <>
                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${LEVEL_COLORS[lp.currentLevel + 1] || 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, lp.progress)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">{lp.totalPoints.toFixed(0)} điểm</span>
                  {lp.nextLevel && lp.pointsNeeded > 0 && (
                    <span className="text-gray-400">Cần {lp.pointsNeeded.toFixed(0)} nữa → Cấp {lp.nextLevel}</span>
                  )}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function VoucherTab({ data }: { data: MbwDashboardData }) {
  if (data.vouchers.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-8">Chưa có voucher nào</p>
  }

  return (
    <div className="space-y-2">
      {data.vouchers.map(v => (
        <div key={v.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">{v.voucherName}</p>
            <p className="text-[10px] text-gray-400">{v.voucherCode}</p>
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
      ))}
    </div>
  )
}

function CommissionTab({ data }: { data: MbwDashboardData }) {
  const { commission } = data
  const items = [
    { label: 'Chờ xử lý', value: commission.pending, color: 'text-amber-600' },
    { label: 'Khả dụng', value: commission.available, color: 'text-green-600' },
    { label: 'Đã rút', value: commission.withdrawn, color: 'text-gray-500' },
    { label: 'Tổng tích lũy', value: commission.totalEarned, color: 'text-brk-primary' },
  ]

  return (
    <div className="space-y-3">
      {items.map(it => (
        <div key={it.label} className="flex justify-between items-center bg-gray-50 rounded-xl p-3 border border-gray-100">
          <span className="text-xs text-gray-500">{it.label}</span>
          <span className={`text-sm font-black ${it.color}`}>{formatMoney(it.value)}đ</span>
        </div>
      ))}
    </div>
  )
}

function TransactionsTab({ data }: { data: MbwDashboardData }) {
  if (data.recentTransactions.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-8">Chưa có giao dịch</p>
  }

  return (
    <div className="space-y-2">
      {data.recentTransactions.map(tx => (
        <div key={tx.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-700 truncate">{tx.description || tx.type}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {new Date(tx.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="text-right ml-2 shrink-0">
              <span className={`text-sm font-black ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}đ
              </span>
              <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                tx.source === 'BRK' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {tx.source}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function OverviewTab({ data }: { data: MbwDashboardData }) {
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-brk-primary/5 to-brk-accent/5 rounded-xl p-4 border border-brk-primary/10">
        <p className="text-xs font-bold text-brk-primary mb-2">Tổng quan tài chính</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-gray-500">Cash + Affiliate</p>
            <p className="text-sm font-black text-green-600">{formatMoney(data.balance.totalCash)}đ</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">BRKD</p>
            <p className="text-sm font-black text-amber-600">{formatMoney(data.balance.brkd)}đ</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Hoa hồng chờ</p>
            <p className="text-sm font-black text-amber-600">{formatMoney(data.commission.pending)}đ</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Voucher balance</p>
            <p className="text-sm font-black text-purple-600">{formatMoney(data.balance.voucherBalance)}đ</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <p className="text-xs font-bold text-gray-700 mb-2">Hệ thống</p>
        {data.systems.length === 0 ? (
          <p className="text-xs text-gray-400">Chưa tham gia hệ thống</p>
        ) : (
          <div className="space-y-1.5">
            {data.systems.map(sys => (
              <div key={sys.onSystem} className="flex justify-between text-xs">
                <span className="text-gray-600">#{sys.onSystem} — {LEVEL_NAMES[sys.level] || `Cấp ${sys.level}`}</span>
                <span className="text-gray-400">F1: {sys.f1Count} | DL: {sys.totalDownline}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <p className="text-xs font-bold text-gray-700 mb-2">Voucher ({data.vouchers.length})</p>
        {data.vouchers.length === 0 ? (
          <p className="text-xs text-gray-400">Chưa có voucher</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {data.vouchers.map(v => <VoucherTypeBadge key={v.id} type={v.voucherType} />)}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <p className="text-xs font-bold text-gray-700 mb-2">Hoa hồng</p>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Tổng tích lũy</span>
          <span className="font-bold text-green-600">{formatMoney(data.commission.totalEarned)}đ</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-500">Khả dụng</span>
          <span className="font-bold text-amber-600">{formatMoney(data.commission.available)}đ</span>
        </div>
      </div>
    </div>
  )
}

export default function MbwDashboardPopup() {
  const { isOpen, close } = useMbwDashboard()
  const [data, setData] = useState<MbwDashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('balance')
  const autoRotateRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPausedRef = useRef(false)

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
    if (isOpen) {
      fetchData()
      setActiveTab('balance')
    } else {
      setData(null)
      isPausedRef.current = false
    }
  }, [isOpen, fetchData])

  const nextTab = useCallback(() => {
    setActiveTab(prev => {
      const idx = TABS.findIndex(t => t.key === prev)
      return TABS[(idx + 1) % TABS.length].key
    })
  }, [])

  const startAutoRotate = useCallback(() => {
    if (autoRotateRef.current) clearInterval(autoRotateRef.current)
    autoRotateRef.current = setInterval(nextTab, AUTO_ROTATE_MS)
  }, [nextTab])

  const stopAutoRotate = useCallback(() => {
    if (autoRotateRef.current) {
      clearInterval(autoRotateRef.current)
      autoRotateRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isOpen && !isPausedRef.current) {
      startAutoRotate()
    }
    return () => {
      stopAutoRotate()
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
    }
  }, [isOpen, startAutoRotate, stopAutoRotate])

  const handleManualTabClick = useCallback((tab: TabKey) => {
    setActiveTab(tab)
    isPausedRef.current = true
    stopAutoRotate()
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
    pauseTimeoutRef.current = setTimeout(() => {
      isPausedRef.current = false
      startAutoRotate()
    }, PAUSE_AFTER_CLICK_MS)
  }, [stopAutoRotate, startAutoRotate])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) close()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, close])

  if (!isOpen) return null

  const tabContent: Record<TabKey, React.ReactNode> = {
    balance: data ? <BalanceTab data={data} /> : null,
    level: data ? <LevelTab data={data} /> : null,
    voucher: data ? <VoucherTab data={data} /> : null,
    commission: data ? <CommissionTab data={data} /> : null,
    transactions: data ? <TransactionsTab data={data} /> : null,
    overview: data ? <OverviewTab data={data} /> : null,
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-brk-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div>
            <h2 className="text-base font-black text-brk-on-surface">Ví MBW</h2>
            {data && (
              <p className="text-[10px] text-brk-muted">{data.user.name || data.user.email}</p>
            )}
          </div>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 shrink-0">
          <div className="bg-gray-100 rounded-xl p-1 flex gap-1 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleManualTabClick(tab.key)}
                className={`flex items-center gap-1 px-2.5 py-2 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-brk-primary text-white shadow-sm'
                    : 'text-gray-500 hover:bg-white/50'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-brk-primary animate-spin" />
              <p className="text-xs text-gray-400">Đang tải dữ liệu...</p>
            </div>
          ) : data ? (
            tabContent[activeTab]
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-xs text-gray-400">Không thể tải dữ liệu</p>
              <button onClick={fetchData} className="text-xs text-brk-primary font-bold hover:underline">Thử lại</button>
            </div>
          )}
        </div>

        <div className="shrink-0 h-1.5 mx-4 mb-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brk-primary/30 rounded-full transition-all duration-100 ease-linear"
            style={{
              width: `${((TABS.findIndex(t => t.key === activeTab) + 1) / TABS.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
