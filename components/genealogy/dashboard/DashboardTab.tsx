'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Users, GitBranch, Loader2, ChevronDown, UserCheck, UserX, Clock, Award, Handshake, Layers, Crown, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import TabShell from '@/components/genealogy/ui/TabShell'
import { getSystemDetailStatsAction, getLeaderboardAction, type LeaderboardCriteria } from '@/app/actions/system-actions'
import { getSystemMemberListAction } from '@/app/actions/admin-actions'

interface DashboardTabProps {
  selectedSystem: number | null
  setSelectedSystem: (v: number | null) => void
  mySystems: { onSystem: number; nameSystem: string | null }[]
}

interface LeaderboardEntry {
  rank: number
  userId: number
  name: string
  image: string | null
  level: number
  teamSize: number
  revenue: number
  income: number
  points: number
}

interface SystemDetailStats {
  system: { onSystem: number; nameSystem: string | null }
  stats: {
    totalMembers: number
    activeMembers: number
    pendingMembers: number
    expiredMembers: number
    bdhMembers: number
    dhttMembers: number
    activatedMembers: number
    closureCount: number
    maxDepth: number
    levelDistribution: Record<number, number>
  }
}

export type ModalFilterType = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'BDH' | 'DONGCHIA'
export type SortOption = 'join' | 'expiry' | 'referral' | 'sales' | 'income'

interface MemberRecord {
  id: number
  name: string
  image: string | null
  joinOrder: number
  referralCount: number
  sales: number
  income: number
  level: number
  status: string
  activatedAt?: string | Date | null
  expiresAt?: string | Date | null
  inDongChia?: boolean
}

const criteriaOptions: { value: LeaderboardCriteria; label: string; shortFormat: (v: LeaderboardEntry) => string; format: (v: LeaderboardEntry) => string }[] = [
  { value: 'teamSize', label: 'Top chia sẻ', shortFormat: (m) => `${m.teamSize} NGƯỜI`, format: (m) => `${m.teamSize.toLocaleString('vi')} người` },
  { value: 'revenue', label: 'Top Doanh số', shortFormat: (m) => `${m.revenue.toLocaleString('vi')}đ`, format: (m) => `${m.revenue.toLocaleString('vi')}đ` },
  { value: 'income', label: 'Top Thu nhập', shortFormat: (m) => `${m.income.toLocaleString('vi')}đ`, format: (m) => `${m.income.toLocaleString('vi')}đ` },
  { value: 'points', label: 'Top Điểm thưởng', shortFormat: (m) => `${m.points.toLocaleString('vi')} pts`, format: (m) => `${m.points.toLocaleString('vi')} pts` },
]

export default function DashboardTab({ selectedSystem, setSelectedSystem, mySystems }: DashboardTabProps) {
  const [detailStats, setDetailStats] = useState<SystemDetailStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [criteria, setCriteria] = useState<LeaderboardCriteria>('teamSize')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [modalFilter, setModalFilter] = useState<ModalFilterType>('ALL')
  const [modalMembers, setModalMembers] = useState<MemberRecord[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalSort, setModalSort] = useState<SortOption>('join')

  useEffect(() => {
    if (selectedSystem === null) { setDetailStats(null); setLeaderboard([]); return }
    setLoading(true)
    setError('')
    Promise.all([
      getSystemDetailStatsAction(selectedSystem),
      getLeaderboardAction(selectedSystem, criteria),
    ]).then(([statsRes, leaderRes]) => {
      if (statsRes.success) setDetailStats(statsRes as SystemDetailStats)
      else setError(statsRes.error || 'Lỗi tải dữ liệu')
      if (leaderRes.success) setLeaderboard(leaderRes.leaderboard || [])
    }).catch(err => setError(err.message || 'Lỗi kết nối'))
      .finally(() => setLoading(false))
  }, [selectedSystem, criteria])

  const openMembersModal = async (filterType: ModalFilterType) => {
    if (selectedSystem === null) return
    setModalFilter(filterType)
    if (filterType === 'EXPIRED') setModalSort('expiry')
    else setModalSort('join')
    setModalOpen(true)
    setModalLoading(true)
    try {
      const res = await getSystemMemberListAction(selectedSystem)
      if (res.success && res.members) {
        setModalMembers(res.members as MemberRecord[])
      }
    } catch (e) {
      console.error('Lỗi tải danh sách thành viên:', e)
    } finally {
      setModalLoading(false)
    }
  }

  const selectedName = mySystems.find(s => s.onSystem === selectedSystem)?.nameSystem || `#${selectedSystem}`

  const header = (
    <div className="px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Chọn hệ thống</span>
        <div className="relative flex-1 sm:w-64">
          <select
            value={selectedSystem ?? ''}
            onChange={(e) => setSelectedSystem(e.target.value ? Number(e.target.value) : null)}
            className={`w-full appearance-none text-[11px] font-black px-3 py-2.5 pr-8 rounded-xl border-2 outline-none cursor-pointer transition-all duration-300 ${selectedSystem === null ? 'bg-pink-50 text-pink-700 border-pink-300 animate-[pulse_1.5s_infinite] shadow-[0_0_15px_rgba(236,72,153,0.25)]' : 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border-indigo-200 hover:border-indigo-400 hover:shadow-md'}`}
          >
            <option value="">{selectedSystem === null ? '➔ CHỌN NGAY' : `ĐANG XEM: ${selectedName}`}</option>
            {mySystems.map(sys => (
              <option key={sys.onSystem} value={sys.onSystem}>{sys.nameSystem || `#${sys.onSystem}`}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
        </div>
      </div>
    </div>
  )

  if (selectedSystem === null) {
    return (
      <TabShell header={header}>
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-indigo-300" />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Chọn hệ thống để xem tổng quan</span>
        </div>
      </TabShell>
    )
  }

  if (loading) {
    return (
      <TabShell header={header}>
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải dữ liệu...</span>
        </div>
      </TabShell>
    )
  }

  const s = detailStats?.stats
  const top3 = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3, 10)
  const currentCriteria = criteriaOptions.find(c => c.value === criteria) || criteriaOptions[0]

  const filteredModalMembers = modalMembers.filter(m => {
    if (modalFilter === 'ALL') return true
    if (modalFilter === 'ACTIVE') return m.status === 'ACTIVE'
    if (modalFilter === 'EXPIRED') return m.status === 'EXPIRED'
    if (modalFilter === 'PENDING') return m.status === 'PENDING'
    if (modalFilter === 'BDH') return m.level >= 2
    if (modalFilter === 'DONGCHIA') return !!m.inDongChia
    return true
  })

  const now = new Date().getTime()
  const sortedModalMembers = [...filteredModalMembers].sort((a, b) => {
    if (modalSort === 'expiry') {
      const isExpiredA = a.status === 'EXPIRED' || (a.expiresAt && new Date(a.expiresAt).getTime() <= now)
      const isExpiredB = b.status === 'EXPIRED' || (b.expiresAt && new Date(b.expiresAt).getTime() <= now)
      if (isExpiredA && !isExpiredB) return -1
      if (!isExpiredA && isExpiredB) return 1
      const timeA = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.MAX_SAFE_INTEGER
      const timeB = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.MAX_SAFE_INTEGER
      return timeA - timeB
    }
    if (modalSort === 'referral') return b.referralCount - a.referralCount
    if (modalSort === 'sales') return b.sales - a.sales
    if (modalSort === 'income') return b.income - a.income
    return a.joinOrder - b.joinOrder
  })

  const getExpiryStatusBadge = (m: MemberRecord) => {
    if (m.status === 'EXPIRED') return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-700 border border-red-200">Đã hết hạn</span>
    if (!m.expiresAt) return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700">Hoạt động</span>
    const expTime = new Date(m.expiresAt).getTime()
    const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-700 border border-red-200">Quá hạn ({Math.abs(diffDays)} ngày)</span>
    if (diffDays <= 3) return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">Sắp hết hạn ({diffDays} ngày)</span>
    return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700">Còn {diffDays} ngày</span>
  }

  const modalTitleMap: Record<ModalFilterType, string> = {
    ALL: 'Tổng thành viên',
    ACTIVE: 'Thành viên đang hoạt động',
    EXPIRED: 'Danh sách thành viên hết hạn / quá hạn',
    PENDING: 'Thành viên chờ kích hoạt',
    BDH: 'Danh sách Ban Điều Hành (Level 2+)',
    DONGCHIA: 'Danh sách đủ điều kiện đồng chia',
  }

  return (
    <TabShell header={header}>
      <div className="p-3 sm:p-4 overflow-y-auto">
        {error && <div className="p-3 bg-red-50 rounded-2xl text-red-600 text-xs font-bold mb-4">{error}</div>}

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-1/2">
            <div className="bg-gradient-to-br from-white via-amber-50/30 to-white rounded-2xl border border-amber-200/50 shadow-lg overflow-hidden h-full">
              <div className="px-4 py-3 flex items-center justify-between border-b border-amber-100/50">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Bảng vinh danh</h3>
                </div>
                <select
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value as LeaderboardCriteria)}
                  className="text-[10px] font-black bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 outline-none cursor-pointer uppercase tracking-wider"
                >
                  {criteriaOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {top3.length > 0 ? (
                <div className="p-4">
                  <div className="flex items-end justify-center gap-3 mb-4">
                    {top3[1] && <PodiumCard entry={top3[1]} crown="gold" height="h-20" shortFormat={currentCriteria.shortFormat} />}
                    {top3[0] && <PodiumCard entry={top3[0]} crown="diamond" height="h-28" shortFormat={currentCriteria.shortFormat} />}
                    {top3[2] && <PodiumCard entry={top3[2]} crown="silver" height="h-16" shortFormat={currentCriteria.shortFormat} />}
                  </div>
                  {rest.length > 0 && (
                    <div className="space-y-1 mt-3 pt-3 border-t border-slate-100">
                      {rest.map((entry) => (
                        <div key={entry.userId} className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                          <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 border',
                            entry.rank <= 5 ? 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                          )}>
                            {entry.rank}
                          </div>
                          <AvatarCircle image={entry.image} name={entry.name} size="w-6 h-6" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold text-slate-700 truncate block">{entry.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-500 shrink-0">{currentCriteria.shortFormat(entry)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 font-bold">Chưa có dữ liệu vinh danh</div>
              )}
            </div>
          </div>

          <div className="lg:w-1/2 space-y-4">
            {s && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<Users className="w-4 h-4 text-indigo-500" />} label="Tổng thành viên" value={s.totalMembers} onClick={() => openMembersModal('ALL')} />
                  <StatCard icon={<UserCheck className="w-4 h-4 text-emerald-500" />} label="Đang hoạt động" value={s.activeMembers} onClick={() => openMembersModal('ACTIVE')} />
                  <StatCard icon={<UserX className="w-4 h-4 text-red-500" />} label="Hết hạn" value={s.expiredMembers} onClick={() => openMembersModal('EXPIRED')} />
                  <StatCard icon={<Clock className="w-4 h-4 text-amber-500" />} label="Chờ kích hoạt" value={s.pendingMembers} onClick={() => openMembersModal('PENDING')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<Award className="w-4 h-4 text-violet-500" />} label="BDH (Lv2+)" value={s.bdhMembers} onClick={() => openMembersModal('BDH')} />
                  <StatCard icon={<Handshake className="w-4 h-4 text-pink-500" />} label="Đồng chia" value={s.dhttMembers} onClick={() => openMembersModal('DONGCHIA')} />
                  <StatCard icon={<GitBranch className="w-4 h-4 text-cyan-500" />} label="Closures" value={s.closureCount} />
                  <StatCard icon={<Layers className="w-4 h-4 text-orange-500" />} label="Chiều sâu" value={s.maxDepth} />
                </div>

                {Object.keys(s.levelDistribution).length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Phân bố Level</h3>
                    <div className="space-y-2">
                      {Object.entries(s.levelDistribution).sort(([a], [b]) => Number(a) - Number(b)).map(([level, count]) => {
                        const maxCount = Math.max(...Object.values(s.levelDistribution))
                        return (
                          <div key={level} className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-600 w-10 shrink-0">Lv{level}</span>
                            <div className="flex-1 h-5 bg-slate-50 rounded-lg overflow-hidden relative">
                              <div className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-lg transition-all duration-700" style={{ width: `${(count / maxCount) * 100}%` }} />
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-700">{count}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100">
              <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-sm sm:text-base font-black tracking-tight uppercase flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    {modalTitleMap[modalFilter]}
                  </h2>
                  <p className="text-[10px] text-slate-300 font-bold tracking-wider mt-0.5">
                    Hệ thống #{selectedSystem} • {sortedModalMembers.length} thành viên
                  </p>
                </div>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
                {([
                  ['ALL', 'Tất cả'],
                  ['ACTIVE', 'Hoạt động'],
                  ['EXPIRED', 'Hết hạn/Quá hạn'],
                  ['PENDING', 'Chờ kích hoạt'],
                  ['BDH', 'BDH (Lv2+)'],
                  ['DONGCHIA', 'Đồng chia'],
                ] as const).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => {
                      setModalFilter(type)
                      if (type === 'EXPIRED') setModalSort('expiry')
                      else setModalSort('join')
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap',
                      modalFilter === type
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="px-5 py-2 bg-slate-100/60 flex items-center gap-2 text-[10px] font-bold text-slate-500 shrink-0 overflow-x-auto">
                <span className="uppercase tracking-wider shrink-0">Sắp xếp:</span>
                {([
                  ['join', 'Tham gia'],
                  ['expiry', 'Thời hạn / Quá hạn'],
                  ['referral', 'Giới thiệu'],
                  ['sales', 'Doanh số'],
                  ['income', 'Thu nhập'],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setModalSort(val)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap',
                      modalSort === val ? 'bg-slate-800 text-white font-black' : 'text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
                {modalLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Đang tải danh sách thành viên...</span>
                  </div>
                ) : sortedModalMembers.length === 0 ? (
                  <div className="text-center py-16 text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Không có thành viên nào trong mục này
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedModalMembers.map((m, index) => (
                      <div key={`${m.id}-${index}`} className="bg-white p-3 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <AvatarCircle image={m.image} name={m.name} size="w-9 h-9" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-900 truncate">#{m.id} {m.name}</span>
                              <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[8px] font-black shrink-0">Lv{m.level}</span>
                              {m.inDongChia && <span className="px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200 text-[8px] font-black shrink-0">Đồng chia</span>}
                              {getExpiryStatusBadge(m)}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold mt-1 flex-wrap">
                              <span>GT: <strong className="text-slate-700">{m.referralCount}</strong></span>
                              <span>DS: <strong className="text-emerald-600">{Number(m.sales || 0).toLocaleString('vi')}đ</strong></span>
                              <span>TN: <strong className="text-indigo-600">{Number(m.income || 0).toLocaleString('vi')}đ</strong></span>
                            </div>
                          </div>
                        </div>
                        <Link href={`/tools/students/${m.id}`} target="_blank" className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 text-[10px] font-black hover:bg-indigo-100 transition-colors shrink-0" title="Xem hồ sơ thành viên">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Hồ sơ</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-500 font-bold">Hiển thị {sortedModalMembers.length} / {modalMembers.length} thành viên</span>
                <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black rounded-xl transition-colors">Đóng</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TabShell>
  )
}

function PodiumCard({ entry, crown, height, shortFormat }: { entry: LeaderboardEntry; crown: 'diamond' | 'gold' | 'silver'; height: string; shortFormat: (v: LeaderboardEntry) => string }) {
  const crownConfig = {
    diamond: {
      label: 'TOP 1',
      value: shortFormat(entry),
      bg: 'from-cyan-100 via-blue-50 to-indigo-100',
      border: 'border-cyan-300',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.4)]',
      text: 'text-cyan-700',
      ring: 'ring-cyan-300',
      crownSvg: (
        <svg viewBox="0 0 60 44" className="w-10 h-7">
          <defs>
            <linearGradient id="diamondGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#a5f3fc" /><stop offset="25%" stopColor="#22d3ee" /><stop offset="50%" stopColor="#ffffff" /><stop offset="75%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#0891b2" /></linearGradient>
            <filter id="diamondGlow"><feGaussianBlur stdDeviation="1" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="diamondSparkle"><feGaussianBlur stdDeviation="0.5" /></filter>
          </defs>
          <path d="M6 38 L12 14 L20 26 L30 4 L40 26 L48 14 L54 38 Z" fill="url(#diamondGrad)" stroke="#06b6d4" strokeWidth="1.5" filter="url(#diamondGlow)" />
          <path d="M12 14 L20 26 L30 4 L40 26 L48 14" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
          <path d="M6 38 L54 38" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
          <circle cx="30" cy="4" r="2.5" fill="#ffffff" filter="url(#diamondSparkle)"><animate attributeName="r" values="2.5;1;2.5" dur="1.5s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" /></circle>
          <circle cx="20" cy="22" r="1.5" fill="#ffffff" filter="url(#diamondSparkle)"><animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" /></circle>
          <circle cx="40" cy="22" r="1.5" fill="#ffffff" filter="url(#diamondSparkle)"><animate attributeName="opacity" values="0.8;0.2;0.8" dur="2.2s" repeatCount="indefinite" /></circle>
        </svg>
      ),
    },
    gold: {
      label: 'TOP 2',
      value: shortFormat(entry),
      bg: 'from-amber-100 via-yellow-50 to-amber-100',
      border: 'border-amber-300',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
      text: 'text-amber-700',
      ring: 'ring-amber-300',
      crownSvg: (
        <svg viewBox="0 0 60 44" className="w-10 h-7">
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fde68a" /><stop offset="30%" stopColor="#fbbf24" /><stop offset="60%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#b45309" /></linearGradient>
            <filter id="goldShine"><feGaussianBlur stdDeviation="0.5" /></filter>
          </defs>
          <path d="M6 38 L12 16 L20 26 L30 6 L40 26 L48 16 L54 38 Z" fill="url(#goldGrad)" stroke="#b45309" strokeWidth="1.5" />
          <path d="M12 16 L20 26 L30 6 L40 26 L48 16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <path d="M6 38 L54 38" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
          <circle cx="30" cy="6" r="3" fill="#fef3c7" stroke="#b45309" strokeWidth="1" filter="url(#goldShine)" />
          <circle cx="12" cy="16" r="2" fill="#fef3c7" stroke="#b45309" strokeWidth="0.8" />
          <circle cx="48" cy="16" r="2" fill="#fef3c7" stroke="#b45309" strokeWidth="0.8" />
          <circle cx="30" cy="6" r="1" fill="#ffffff" opacity="0.6"><animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" /></circle>
        </svg>
      ),
    },
    silver: {
      label: 'TOP 3',
      value: shortFormat(entry),
      bg: 'from-slate-100 via-gray-50 to-slate-100',
      border: 'border-slate-300',
      glow: 'shadow-[0_0_12px_rgba(148,163,184,0.3)]',
      text: 'text-slate-600',
      ring: 'ring-slate-300',
      crownSvg: (
        <svg viewBox="0 0 60 44" className="w-10 h-7">
          <defs>
            <linearGradient id="silverGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f1f5f9" /><stop offset="30%" stopColor="#cbd5e1" /><stop offset="60%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#64748b" /></linearGradient>
          </defs>
          <path d="M6 38 L12 16 L20 26 L30 6 L40 26 L48 16 L54 38 Z" fill="url(#silverGrad)" stroke="#64748b" strokeWidth="1.5" />
          <path d="M12 16 L20 26 L30 6 L40 26 L48 16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <path d="M6 38 L54 38" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <circle cx="30" cy="6" r="2.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
          <circle cx="12" cy="16" r="1.8" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
          <circle cx="48" cy="16" r="1.8" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
          <circle cx="30" cy="6" r="1" fill="#ffffff" opacity="0.5"><animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.5s" repeatCount="indefinite" /></circle>
        </svg>
      ),
    },
  }
  const c = crownConfig[crown]
  return (
    <div className={cn('flex flex-col items-center', crown === 'gold' ? 'order-first' : crown === 'diamond' ? 'order-2' : 'order-3')}>
      {c.crownSvg}
      <div className={cn('rounded-full ring-4 ring-offset-2 mt-1.5', c.ring)}>
        <AvatarCircle image={entry.image} name={entry.name} size="w-12 h-12" />
      </div>
      <span className="text-[8px] font-black text-slate-400 mt-1">#{entry.userId}</span>
      <span className={cn('text-[10px] font-black mt-1 w-20 text-center leading-tight break-words', c.text)}>{entry.name}</span>
      <div className={cn('mt-2 w-20 rounded-t-xl bg-gradient-to-b border-t-2 border-x-2 flex flex-col items-center justify-center gap-0.5', c.bg, c.border, c.glow, height)}>
        <span className={cn('text-[10px] font-black uppercase tracking-widest', c.text)}>{c.label}</span>
        <span className={cn('text-[9px] font-black leading-none', c.text)}>{c.value}</span>
      </div>
    </div>
  )
}

function AvatarCircle({ image, name, size = 'w-10 h-10' }: { image: string | null; name: string; size?: string }) {
  if (image) {
    return <img src={image} alt={name} className={cn('rounded-full object-cover border border-slate-200', size)} />
  }
  return (
    <div className={cn('rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-black border border-white shadow-sm', size)}>
      <span className="text-[10px]">{name.substring(0, 1).toUpperCase()}</span>
    </div>
  )
}

function StatCard({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: number; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm transition-all duration-200',
        onClick ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md hover:scale-[1.02] active:scale-95' : ''
      )}
    >
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span></div>
      <p className="text-xl sm:text-2xl font-black text-slate-800">{value.toLocaleString('vi')}</p>
    </div>
  )
}
