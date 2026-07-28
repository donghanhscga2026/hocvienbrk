'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Users, GitBranch, Loader2, ChevronDown, UserCheck, UserX, Clock, Award, Handshake, Layers, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import TabShell from '@/components/genealogy/ui/TabShell'
import { getSystemDetailStatsAction, getLeaderboardAction, type LeaderboardCriteria } from '@/app/actions/system-actions'

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

  return (
    <TabShell header={header}>
      <div className="p-3 sm:p-4 overflow-y-auto">
        {error && <div className="p-3 bg-red-50 rounded-2xl text-red-600 text-xs font-bold mb-4">{error}</div>}

        {/* ===== 2-COLUMN DESKTOP / STACKED MOBILE ===== */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* LEFT: VINH DANH */}
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
                  {/* PODIUM: Top 3 */}
                  <div className="flex items-end justify-center gap-3 mb-4">
                    {top3[1] && <PodiumCard entry={top3[1]} crown="gold" height="h-20" shortFormat={currentCriteria.shortFormat} />}
                    {top3[0] && <PodiumCard entry={top3[0]} crown="diamond" height="h-28" shortFormat={currentCriteria.shortFormat} />}
                    {top3[2] && <PodiumCard entry={top3[2]} crown="silver" height="h-16" shortFormat={currentCriteria.shortFormat} />}
                  </div>

                  {/* TOP 4-10 LIST */}
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

          {/* RIGHT: THỐNG KÊ PHÂN TÍCH */}
          <div className="lg:w-1/2 space-y-4">
            {s && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<Users className="w-4 h-4 text-indigo-500" />} label="Tổng thành viên" value={s.totalMembers} />
                  <StatCard icon={<UserCheck className="w-4 h-4 text-emerald-500" />} label="Đang hoạt động" value={s.activeMembers} />
                  <StatCard icon={<UserX className="w-4 h-4 text-red-500" />} label="Hết hạn" value={s.expiredMembers} />
                  <StatCard icon={<Clock className="w-4 h-4 text-amber-500" />} label="Chờ kích hoạt" value={s.pendingMembers} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<Award className="w-4 h-4 text-violet-500" />} label="BDH (Lv2+)" value={s.bdhMembers} />
                  <StatCard icon={<Handshake className="w-4 h-4 text-pink-500" />} label="Đồng chia" value={s.dhttMembers} />
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

                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tóm tắt</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-slate-500">Tỷ lệ hoạt động:</span><span className="font-black text-slate-800">{s.totalMembers ? Math.round((s.activeMembers / s.totalMembers) * 100) : 0}%</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-violet-500" /><span className="text-slate-500">Tỷ lệ BDH:</span><span className="font-black text-slate-800">{s.totalMembers ? Math.round((s.bdhMembers / s.totalMembers) * 100) : 0}%</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-pink-500" /><span className="text-slate-500">Tỷ lệ đồng chia:</span><span className="font-black text-slate-800">{s.totalMembers ? Math.round((s.dhttMembers / s.totalMembers) * 100) : 0}%</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-500" /><span className="text-slate-500">Closures/Member:</span><span className="font-black text-slate-800">{s.totalMembers ? (s.closureCount / s.totalMembers).toFixed(1) : 0}</span></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
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
            <linearGradient id="diamondGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a5f3fc" />
              <stop offset="25%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="75%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <filter id="diamondGlow"><feGaussianBlur stdDeviation="1" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="diamondSparkle"><feGaussianBlur stdDeviation="0.5" /></filter>
          </defs>
          <path d="M6 38 L12 14 L20 26 L30 4 L40 26 L48 14 L54 38 Z" fill="url(#diamondGrad)" stroke="#06b6d4" strokeWidth="1.5" filter="url(#diamondGlow)" />
          <path d="M12 14 L20 26 L30 4 L40 26 L48 14" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
          <path d="M6 38 L54 38" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
          {/* Sparkles */}
          <circle cx="30" cy="4" r="2.5" fill="#ffffff" filter="url(#diamondSparkle)">
            <animate attributeName="r" values="2.5;1;2.5" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="20" cy="22" r="1.5" fill="#ffffff" filter="url(#diamondSparkle)">
            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="40" cy="22" r="1.5" fill="#ffffff" filter="url(#diamondSparkle)">
            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="12" cy="14" r="1" fill="#ffffff" filter="url(#diamondSparkle)">
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="48" cy="14" r="1" fill="#ffffff" filter="url(#diamondSparkle)">
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.5s" repeatCount="indefinite" />
          </circle>
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
            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <filter id="goldShine"><feGaussianBlur stdDeviation="0.5" /></filter>
          </defs>
          <path d="M6 38 L12 16 L20 26 L30 6 L40 26 L48 16 L54 38 Z" fill="url(#goldGrad)" stroke="#b45309" strokeWidth="1.5" />
          <path d="M12 16 L20 26 L30 6 L40 26 L48 16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <path d="M6 38 L54 38" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
          {/* Gems */}
          <circle cx="30" cy="6" r="3" fill="#fef3c7" stroke="#b45309" strokeWidth="1" filter="url(#goldShine)" />
          <circle cx="12" cy="16" r="2" fill="#fef3c7" stroke="#b45309" strokeWidth="0.8" />
          <circle cx="48" cy="16" r="2" fill="#fef3c7" stroke="#b45309" strokeWidth="0.8" />
          <circle cx="30" cy="6" r="1" fill="#ffffff" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
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
            <linearGradient id="silverGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="30%" stopColor="#cbd5e1" />
              <stop offset="60%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>
          <path d="M6 38 L12 16 L20 26 L30 6 L40 26 L48 16 L54 38 Z" fill="url(#silverGrad)" stroke="#64748b" strokeWidth="1.5" />
          <path d="M12 16 L20 26 L30 6 L40 26 L48 16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <path d="M6 38 L54 38" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          {/* Gems */}
          <circle cx="30" cy="6" r="2.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
          <circle cx="12" cy="16" r="1.8" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
          <circle cx="48" cy="16" r="1.8" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
          <circle cx="30" cy="6" r="1" fill="#ffffff" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.5s" repeatCount="indefinite" />
          </circle>
        </svg>
      ),
    },
  }
  const c = crownConfig[crown]

  return (
    <div className={cn('flex flex-col items-center', crown === 'gold' ? 'order-first' : crown === 'diamond' ? 'order-2' : 'order-3')}>
      {/* Crown */}
      {c.crownSvg}
      {/* Avatar */}
      <div className={cn('rounded-full ring-4 ring-offset-2 mt-1.5', c.ring)}>
        <AvatarCircle image={entry.image} name={entry.name} size="w-12 h-12" />
      </div>
      {/* userId centered below avatar */}
      <span className="text-[8px] font-black text-slate-400 mt-1">#{entry.userId}</span>
      {/* Name - pushed down */}
      <span className={cn('text-[10px] font-black mt-1 w-20 text-center leading-tight break-words', c.text)}>{entry.name}</span>
      {/* Pedestal with achievement inside */}
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span></div>
      <p className="text-xl sm:text-2xl font-black text-slate-800">{value.toLocaleString('vi')}</p>
    </div>
  )
}
