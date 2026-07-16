'use client'

import { useEffect, useState } from 'react'
import { getBrkLevelData, getBrkWalletData } from '@/app/actions/brk-actions'
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

interface TimelineItem {
  key: string
  createdAt: string
  title: string
  desc: string
  event: string
  level: number
  points: number
  teamCount: number
  incomeMBDT: number // MBDT tích lũy
  offsetCASH: number // CASH tích lũy
  changeMBDT: number // MBDT biến động
  changeCASH: number // CASH biến động
  changeVoucher: number
  extra?: {
    newMemberId?: number
    newMemberName?: string
    depth?: number
    leaderChain?: string
    memberMBDT?: number
    memberMBP?: number
    cashVolume?: number
    mBdtVolume?: number
  }
}

export default function BrkLevelPage() {
  const [onSystem, setOnSystem] = useState(4)
  const [progress, setProgress] = useState<LevelProgress | null>(null)
  const [configs, setConfigs] = useState<LevelConfig[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getBrkLevelData(onSystem),
      getBrkWalletData()
    ]).then(([levelData, walletData]) => {
      setProgress(levelData.progress as any)
      setConfigs(levelData.configs as any)

      // Parse transactions to build System 4 growth timeline
      const parsedTx = (walletData.transactions || []).map((tx: any) => {
        try {
          const meta = JSON.parse(tx.description)
          if (meta.sys4) {
            return {
              ...tx,
              meta
            }
          }
        } catch (e) {}
        return null
      }).filter(Boolean) as any[]

      // Group transactions belonging to the same event / timestamp
      const groups: { [key: string]: any[] } = {}
      parsedTx.forEach(tx => {
        const date = new Date(tx.createdAt)
        const timeKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`
        
        let groupKey = ""
        if (tx.meta.event === 'JOIN') {
          groupKey = `join-${tx.userId}`
        } else if (tx.meta.event === 'RETURN_FEE' || tx.meta.event === 'RETURN_FEE_CASH') {
          groupKey = `return-${timeKey}`
        } else if (tx.meta.event === 'F1_ACTIVE' || tx.meta.event === 'F2_ACTIVE') {
          groupKey = `active-${tx.meta.extra?.newMemberId}-${timeKey}`
        } else if (tx.meta.event === 'F1_CONFIRM' || tx.meta.event === 'COMMISSION') {
          groupKey = `confirm-${tx.meta.extra?.newMemberId}-${timeKey}`
        } else if (tx.meta.event === 'REVENUE_SHARE' || tx.meta.event === 'REVENUE_SHARE_CASH') {
          groupKey = `share-${timeKey}`
        } else if (tx.meta.event === 'LEVEL_UP') {
          groupKey = `levelup-${tx.meta.level}-${timeKey}`
        } else if (tx.meta.event === 'VOUCHER') {
          groupKey = `voucher-${timeKey}`
        } else {
          groupKey = `tx-${tx.id}`
        }

        if (!groups[groupKey]) {
          groups[groupKey] = []
        }
        groups[groupKey].push(tx)
      })

      // Convert groups to TimelineItems
      const timelineItems: TimelineItem[] = Object.keys(groups).map(key => {
        const txs = groups[key]
        // Prefer BRKD transaction as main anchor
        const mainTx = txs.find(t => t.balanceType === 'BRKD') || txs[0]
        
        let changeMBDT = 0
        let changeCASH = 0
        let changeVoucher = 0

        txs.forEach(t => {
          if (t.balanceType === 'BRKD') changeMBDT += t.amount
          if (t.balanceType === 'CASH') changeCASH += t.amount
          if (t.balanceType === 'VOUCHER') changeVoucher += t.amount
        })

        let title = mainTx.meta.title
        let desc = mainTx.meta.desc

        // Customize MBDT display volume for confirmations
        let displayChangeMBDT = changeMBDT
        let displayChangeCASH = changeCASH

        if (mainTx.meta.event === 'F1_CONFIRM' || mainTx.meta.event === 'F2_CONFIRM') {
          // Display the accumulated MBDT volume dồn gốc
          displayChangeMBDT = mainTx.meta.extra?.memberMBDT || 0
        }

        return {
          key,
          createdAt: mainTx.createdAt,
          title,
          desc,
          event: mainTx.meta.event,
          level: mainTx.meta.level,
          points: mainTx.meta.points,
          teamCount: mainTx.meta.teamCount,
          incomeMBDT: mainTx.meta.balances.brkd,
          offsetCASH: mainTx.meta.balances.cash,
          changeMBDT: displayChangeMBDT,
          changeCASH: displayChangeCASH,
          changeVoucher,
          extra: mainTx.meta.extra
        }
      })

      // Sort chronological: oldest to newest
      timelineItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      setTimeline(timelineItems)
    }).catch(console.error).finally(() => setLoading(false))
  }, [onSystem])

  const formatMBDT = (value: number) => {
    if (value === 0) return '0'
    return new Intl.NumberFormat('vi-VN').format(value)
  }

  const formatCASH = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(value)
      .replace(/\s?₫/, ' VNĐ')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Đang tải hành trình thăng tiến...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      {/* Title block */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl shadow-xl text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="bg-amber-500 text-slate-950 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Hệ thống 4</span>
            <span className="text-indigo-200 text-sm">Hành trình tăng trưởng</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-100 to-white bg-clip-text text-transparent">
            Hồ Sơ Thăng Tiến Cấp Bậc
          </h1>
          <p className="text-indigo-200 text-sm max-w-xl">
            Theo dõi chi tiết điểm số, doanh số dồn, thu nhập đối ứng và từng mốc thăng hoa của bạn trên hệ thống BRK.
          </p>
        </div>
      </div>

      {/* Progress Card */}
      {progress && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-6 relative overflow-hidden transition-all hover:shadow-lg">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
          <BrkLevelProgress
            currentLevel={progress.currentLevel}
            totalPoints={progress.totalPoints}
            progress={progress.progress}
            pointsNeeded={progress.pointsNeeded}
            nextLevel={progress.nextConfig?.level}
          />
        </div>
      )}

      {/* Growth Timeline Section */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Nhật Ký Hành Trình Tăng Trưởng</h2>
        </div>

        {timeline.length === 0 ? (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center text-slate-400">
            Chưa có ghi nhận biến động lịch sử thăng tiến nào.
          </div>
        ) : (
          <div className="relative border-l-2 border-dashed border-slate-200 ml-4 pl-6 space-y-8">
            {timeline.map((item) => {
              // Determine icon and color based on event type
              let markerColor = "bg-slate-400 text-white ring-slate-100"
              let cardBorder = "border-slate-100 hover:border-slate-200"
              let icon = (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              )

              if (item.event === 'JOIN') {
                markerColor = "bg-blue-600 text-white ring-blue-50"
                cardBorder = "border-blue-100 hover:border-blue-200 bg-blue-50/10"
                icon = (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                )
              } else if (item.event === 'RETURN_FEE' || item.event === 'RETURN_FEE_CASH') {
                markerColor = "bg-teal-600 text-white ring-teal-50"
                cardBorder = "border-teal-100 hover:border-teal-200 bg-teal-50/10"
                icon = (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              } else if (item.event === 'LEVEL_UP') {
                markerColor = "bg-amber-500 text-slate-950 ring-amber-50"
                cardBorder = "border-amber-100 hover:border-amber-200 bg-amber-50/10"
                icon = (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                )
              } else if (item.event === 'F1_ACTIVE' || item.event === 'F2_ACTIVE') {
                markerColor = "bg-indigo-500 text-white ring-indigo-50"
                cardBorder = "border-indigo-100 hover:border-indigo-200"
                icon = (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                )
              } else if (item.event === 'F1_CONFIRM') {
                markerColor = "bg-emerald-600 text-white ring-emerald-50"
                cardBorder = "border-emerald-100 hover:border-emerald-200 bg-emerald-50/5"
                icon = (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )
              } else if (item.event === 'COMMISSION') {
                markerColor = "bg-rose-500 text-white ring-rose-50"
                cardBorder = "border-rose-100 hover:border-rose-200 bg-rose-50/5"
                icon = (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              } else if (item.event === 'REVENUE_SHARE' || item.event === 'REVENUE_SHARE_CASH') {
                markerColor = "bg-violet-600 text-white ring-violet-50"
                cardBorder = "border-violet-100 hover:border-violet-200 bg-violet-50/5"
                icon = (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )
              } else if (item.event === 'VOUCHER') {
                markerColor = "bg-pink-500 text-white ring-pink-50"
                cardBorder = "border-pink-100 hover:border-pink-200 bg-pink-50/5"
                icon = (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                )
              }

              // Format date
              const recordDate = new Date(item.createdAt)
              const timeString = recordDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              const dateString = recordDate.toLocaleDateString('vi-VN')

              return (
                <div key={item.key} className="relative group transition-all duration-300">
                  {/* Timeline Marker Icon */}
                  <div className={`absolute -left-[37px] top-4 w-7 h-7 rounded-full flex items-center justify-center ring-4 transition-all duration-300 group-hover:scale-110 ${markerColor}`}>
                    {icon}
                  </div>

                  {/* Card Event Content */}
                  <div className={`bg-white rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:shadow-md ${cardBorder}`}>
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-3 border-b border-slate-100">
                      <div className="space-y-0.5">
                        <span className="text-xs text-slate-400 font-medium">{timeString} {dateString}</span>
                        <h3 className="font-bold text-slate-800 text-base">{item.title}</h3>
                      </div>

                      {/* Cash / MBDT Changes details */}
                      <div className="text-right">
                        {(item.changeMBDT !== 0 || item.changeCASH !== 0 || item.changeVoucher !== 0) ? (
                          <div className="space-y-0.5">
                            {item.changeMBDT !== 0 && (
                              <div className="text-emerald-600 font-extrabold text-lg leading-tight">
                                +{formatMBDT(item.changeMBDT)}
                              </div>
                            )}
                            {item.changeCASH !== 0 && (
                              <div className="text-slate-500 font-semibold text-xs">
                                +{formatCASH(item.changeCASH)}
                              </div>
                            )}
                            {item.changeVoucher > 0 && (
                              <div className="text-pink-600 font-bold text-xs">
                                +{formatCASH(item.changeVoucher)} Voucher
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">Ghi nhận trạng thái</span>
                        )}
                      </div>
                    </div>

                    {/* Body description */}
                    <div className="py-3 text-sm text-slate-600 space-y-2">
                      <p className="leading-relaxed whitespace-pre-line">{item.desc}</p>
                      
                      {/* Leader/Placement Chain info (if present) */}
                      {item.extra?.leaderChain && (
                        <div className="inline-flex items-center space-x-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-xs text-slate-500">
                          <span className="font-bold text-slate-400">Nhánh bảo trợ:</span>
                          <span className="font-medium">{item.extra.leaderChain}</span>
                        </div>
                      )}
                    </div>

                    {/* Snapshot Grid footer */}
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Points MBP */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Điểm</span>
                        <div className="text-slate-700 font-extrabold text-sm flex items-baseline space-x-0.5">
                          <span>{item.points.toFixed(0)}</span>
                          <span className="text-[10px] text-slate-400 font-normal">MBP</span>
                        </div>
                      </div>

                      {/* Group members count */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Thành viên nhóm</span>
                        <div className="text-slate-700 font-extrabold text-sm flex items-baseline space-x-0.5">
                          <span>{item.teamCount}</span>
                          <span className="text-[10px] text-slate-400 font-normal">thành viên</span>
                        </div>
                      </div>

                      {/* Income MBDT (cỡ chữ to hơn, không đơn vị) */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Thu nhập (MBDT)</span>
                        <div className="text-emerald-700 font-extrabold text-base leading-none">
                          {formatMBDT(item.incomeMBDT)}
                        </div>
                      </div>

                      {/* Offset CASH (cỡ chữ nhỏ hơn, có đơn vị VNĐ) */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Đối ứng</span>
                        <div className="text-slate-600 font-bold text-xs">
                          {formatCASH(item.offsetCASH)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Level configs table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-700">Quy chuẩn Cấp bậc Hệ thống 4</h2>
          <span className="text-xs text-slate-400 font-medium">Bảng tham chiếu</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Cấp bậc</th>
                <th className="px-5 py-3 text-right text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Điểm yêu cầu (MBP)</th>
                <th className="px-5 py-3 text-right text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Hoa hồng chênh lệch</th>
                <th className="px-5 py-3 text-right text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Quà tặng Voucher</th>
                <th className="px-5 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider text-[11px] pl-8">Yêu cầu nhánh bảo trợ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {configs.map((cfg) => {
                const isCurrent = progress?.currentLevel === cfg.level
                return (
                  <tr key={cfg.id} className={`transition-colors hover:bg-slate-50/30 ${isCurrent ? 'bg-amber-50/40 font-medium' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${isCurrent ? 'text-amber-700' : 'text-slate-700'}`}>Cấp {cfg.level}</span>
                        {isCurrent && (
                          <span className="text-[10px] text-amber-700 bg-amber-100/70 border border-amber-200/50 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider scale-95">Hiện tại</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-600">{Number(cfg.pointsRequired).toLocaleString()} MBP</td>
                    <td className="px-5 py-3.5 text-right text-slate-600 font-semibold">{cfg.personalFeePct}%</td>
                    <td className="px-5 py-3.5 text-right text-slate-600">{cfg.giftValue > 0 ? `${cfg.giftValue.toLocaleString()} VNĐ` : '-'}</td>
                    <td className="px-5 py-3.5 text-left pl-8 text-xs text-slate-500">
                      {cfg.branchReqs.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {cfg.branchReqs.map((br) => (
                            <span key={br.id} className="bg-slate-100 border border-slate-200/50 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium">
                              {br.count} nhánh Cấp {br.branchLevel}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Không có</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
