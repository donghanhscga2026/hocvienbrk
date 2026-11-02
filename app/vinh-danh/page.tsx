import Link from "next/link"
import prisma from "@/lib/prisma"

export const metadata = {
  title: 'Vinh danh Cộng tác viên | Học viện BRK',
  description: 'Bảng xếp hạng cộng tác viên theo doanh số giới thiệu hàng tháng'
}

/**
 * Trang công khai vinh danh CTV (Affiliate v2 — GĐ4).
 * Xếp hạng theo GMV, chu kỳ tháng, tôn trọng CTV ẩn tên.
 * Giao diện v2 "Đêm vinh danh" (ní Cương duyệt bản mẫu HTML tối 02/11/2026):
 * nền xanh nửa đêm + vàng kim loại gradient, cúp/crown/icon SVG, bục vinh
 * quang có bệ bậc, dòng đua hạng kèm khoảng cách tới hạng trên.
 * Logic dữ liệu giữ nguyên như các bản trước.
 */
export default async function VinhDanhPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; xep?: string }>
}) {
  const params = await searchParams
  const mode = params.xep === 'hoa-hong' ? 'hoa-hong' : 'doanh-so'

  // Các kỳ có dữ liệu
  const periods = await prisma.leaderboardSnapshot.groupBy({
    by: ['period'],
    orderBy: { period: 'desc' },
    take: 12
  }).then(rs => rs.map(r => r.period))

  const period = params.period || periods[0] || currentPrevMonth()

  const snapshots = period
    ? await prisma.leaderboardSnapshot.findMany({
        where: { period },
        include: {
          user: { select: { id: true, name: true, image: true, showOnLeaderboard: true } }
        },
        orderBy: { rank: 'asc' },
        take: 100
      })
    : []

  // Top hoa hồng: toàn bộ người có ghi nhận trong kỳ, sắp theo commissionEarned.
  // Top doanh số: chỉ người có doanh số qua link (gmv > 0) — nhóm hưởng hoa
  // hồng thuần tri ân (gmv = 0) chỉ hiện ở Top hoa hồng.
  const displaySnapshots = mode === 'hoa-hong'
    ? [...snapshots].sort((a, b) => b.commissionEarned - a.commissionEarned || a.rank - b.rank)
    : snapshots.filter((s) => s.gmv > 0)

  const userIds = snapshots.map(s => s.userId)
  const userBadges = userIds.length
    ? await prisma.userBadge.findMany({
        where: { userId: { in: userIds }, period },
        include: { badge: true }
      })
    : []
  const badgeMap = new Map<number, typeof userBadges>()
  for (const ub of userBadges) {
    const arr = badgeMap.get(ub.userId) || []
    arr.push(ub)
    badgeMap.set(ub.userId, arr)
  }

  const fmt = (n: number | bigint) => Number(n).toLocaleString('vi-VN') + 'đ'
  const metricOf = (s: (typeof displaySnapshots)[number]) =>
    mode === 'hoa-hong' ? s.commissionEarned : s.gmv
  const topMetric = displaySnapshots.reduce((max, s) => Math.max(max, metricOf(s)), 0)

  // Số tổng của kỳ — tính trên toàn bộ snapshot của kỳ, không chỉ phần hiển thị.
  const totalGmv = snapshots.reduce((sum, s) => sum + s.gmv, 0)
  const totalCommission = snapshots.reduce((sum, s) => sum + s.commissionEarned, 0)
  const totalOrders = snapshots.reduce((sum, s) => sum + s.orderCount, 0)

  const podium = displaySnapshots.slice(0, 3)
  const rest = displaySnapshots.slice(3)

  const displayName = (s: (typeof displaySnapshots)[number]) =>
    s.user.showOnLeaderboard ? (s.user.name || `CTV #${s.userId}`) : 'CTV ẩn danh'

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  const serif = { fontFamily: 'Cormorant Garamond, Georgia, "Times New Roman", serif' } as const
  const goldText = 'bg-gradient-to-r from-[#8a6414] via-[#d4af37] to-[#ffe98a] bg-clip-text text-transparent'

  const avatar = (s: (typeof displaySnapshots)[number], rank: number, sizeClass: string, textClass: string) => {
    const name = displayName(s)
    const metal = rank === 1
      ? 'from-[#ffe98a] via-[#d4af37] to-[#a87c1f] ring-[#d4af37]/60'
      : rank === 2
        ? 'from-[#f4f6f9] via-[#c9ced6] to-[#8f97a5] ring-[#c9ced6]/50'
        : rank === 3
          ? 'from-[#ffd9ae] via-[#e09a5a] to-[#a8642c] ring-[#e09a5a]/50'
          : 'from-[#ffe98a] via-[#d4af37] to-[#a87c1f] ring-[#d4af37]/40'
    if (s.user.showOnLeaderboard && s.user.image) {
      return (
        <img src={s.user.image} alt={name}
          className={`${sizeClass} rounded-full object-cover ring-4 ${rank === 1 ? 'ring-[#d4af37]/60' : rank === 2 ? 'ring-[#c9ced6]/50' : rank === 3 ? 'ring-[#e09a5a]/50' : 'ring-white/15'}`} />
      )
    }
    return (
      <div className={`${sizeClass} rounded-full ring-4 bg-gradient-to-br ${metal} text-[#231a02] flex items-center justify-center font-extrabold ${textClass} select-none`}>
        {s.user.showOnLeaderboard ? initials(name) : '?'}
      </div>
    )
  }

  const podiumTitles = ['Quán quân', 'Á quân', 'Hạng ba']

  const podiumCard = (s: (typeof displaySnapshots)[number], rank: number) => {
    const badges = badgeMap.get(s.userId) || []
    const isFirst = rank === 1
    const cardClass = isFirst
      ? 'border-[#d4af37]/70 bg-gradient-to-b from-[#2a2110] to-[#171c3a] shadow-[0_22px_48px_rgba(212,175,55,0.22)] pt-10'
      : rank === 2
        ? 'border-[#c9ced6]/40 bg-gradient-to-b from-[#1a2247] to-[#141b3d] pt-8'
        : 'border-[#e09a5a]/50 bg-gradient-to-b from-[#1a2247] to-[#141b3d] pt-8'
    const orderClass = isFirst ? 'order-1 md:order-2' : rank === 2 ? 'order-2 md:order-1' : 'order-3'
    const chipClass = isFirst
      ? 'bg-gradient-to-r from-[#8a6414] via-[#d4af37] to-[#ffe98a] text-[#231a02]'
      : rank === 2
        ? 'bg-gradient-to-r from-[#9aa2b1] via-[#e3e7ee] to-[#9aa2b1] text-[#23262e]'
        : 'bg-gradient-to-r from-[#b06a2e] via-[#f0b57e] to-[#b06a2e] text-[#2e1a05]'
    const metricClass = isFirst
      ? goldText
      : rank === 2
        ? 'bg-gradient-to-r from-[#8f97a5] via-[#eef1f6] to-[#8f97a5] bg-clip-text text-transparent'
        : 'bg-gradient-to-r from-[#a8642c] via-[#ffc890] to-[#a8642c] bg-clip-text text-transparent'
    const stepClass = isFirst
      ? 'h-24 text-6xl bg-gradient-to-b from-[#e9c95c] to-[#b8860b]'
      : rank === 2
        ? 'h-16 text-4xl bg-gradient-to-b from-[#dfe4ec] to-[#99a1b1]'
        : 'h-12 text-3xl bg-gradient-to-b from-[#f0ab6c] to-[#b06a2e]'
    return (
      <div key={s.id} className={`flex flex-col ${orderClass}`}>
        <div className={`relative rounded-3xl border px-6 pb-6 text-center shadow-[0_16px_36px_rgba(0,0,0,0.4)] ${cardClass}`}>
          {isFirst && (
            <svg viewBox="0 0 24 24" className="absolute -top-5 left-1/2 -translate-x-1/2 w-11 h-11 drop-shadow-[0_4px_10px_rgba(212,175,55,0.5)]" aria-hidden="true">
              <defs>
                <linearGradient id="goldCrown" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffe98a" /><stop offset="0.55" stopColor="#d4af37" /><stop offset="1" stopColor="#9a7418" />
                </linearGradient>
              </defs>
              <path fill="url(#goldCrown)" d="M2.5 18.5L4 7l5.2 4.6L12 5l2.8 6.6L20 7l1.5 11.5h-19z" />
              <rect x="2.5" y="19.4" width="19" height="1.9" rx=".9" fill="url(#goldCrown)" />
            </svg>
          )}
          <div className="flex justify-center mb-3">
            {avatar(s, rank, isFirst ? 'w-24 h-24' : 'w-20 h-20', isFirst ? 'text-3xl' : 'text-2xl')}
          </div>
          <div className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold mb-2 ${chipClass}`}>
            {podiumTitles[rank - 1]}
          </div>
          <div style={serif} className={`font-bold text-white leading-snug ${isFirst ? 'text-2xl' : 'text-xl'}`}>
            {displayName(s)}
          </div>
          <div className={`mt-2 text-2xl font-extrabold ${metricClass}`}>
            {fmt(metricOf(s))}
          </div>
          <div className="text-xs text-[#9aa3c7] mt-1">
            {mode === 'hoa-hong'
              ? <>hoa hồng ghi nhận · doanh số {fmt(s.gmv)}{s.orderCount > 0 ? ` · ${s.orderCount} đơn` : ''}</>
              : <>doanh số giới thiệu{s.orderCount > 0 ? ` · ${s.orderCount} đơn` : ''}</>}
          </div>
          {badges.length > 0 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {badges.map((ub) => (
                <span key={ub.id} title={ub.badge.description || ub.badge.name}
                  className="text-2xl">{ub.badge.icon || '🏅'}</span>
              ))}
            </div>
          )}
        </div>
        <div style={serif} className={`mt-3.5 rounded-t-xl flex items-center justify-center font-black text-[#0a0e24]/60 ${stepClass}`}>
          {rank}
        </div>
      </div>
    )
  }

  const statIcon = (kind: 'trend' | 'coin' | 'users' | 'receipt') => {
    const common = 'w-5 h-5'
    if (kind === 'trend') return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#e9c95c" strokeWidth="2" strokeLinecap="round" className={common}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>
    )
    if (kind === 'coin') return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#e9c95c" strokeWidth="2" className={common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5l1.4 2.9 3.1.4-2.3 2.2.6 3.1L12 14.7l-2.8 1.4.6-3.1-2.3-2.2 3.1-.4z" fill="#e9c95c" stroke="none" /></svg>
    )
    if (kind === 'users') return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#e9c95c" strokeWidth="2" strokeLinecap="round" className={common}><circle cx="9" cy="8" r="3.4" /><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S13.9 16 14.5 19" /><circle cx="17" cy="9" r="2.6" /><path d="M15.5 14.7c2.3.2 4.3 1.6 5 4.3" /></svg>
    )
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#e9c95c" strokeWidth="2" strokeLinecap="round" className={common}><path d="M6 3h12v18l-2-1.4L14 21l-2-1.4L10 21l-2-1.4L6 21z" /><path d="M9.5 8h5M9.5 12h5" /></svg>
    )
  }

  const statCards = [
    { icon: 'trend' as const, label: 'Tổng doanh số của kỳ', value: fmt(totalGmv), gold: true },
    { icon: 'coin' as const, label: 'Tổng hoa hồng ghi nhận', value: fmt(totalCommission), gold: true },
    { icon: 'users' as const, label: 'Cộng tác viên lên bảng vàng', value: String(displaySnapshots.length), gold: false },
    { icon: 'receipt' as const, label: 'Tổng số đơn giới thiệu', value: totalOrders.toLocaleString('vi-VN'), gold: false },
  ]

  return (
    <main className="min-h-screen bg-[#0a0e24] text-[#eef0fa] pb-16"
      style={{ backgroundImage: 'radial-gradient(1100px 480px at 50% -80px, rgba(212,175,55,0.14), transparent 60%), radial-gradient(800px 400px at 85% 30%, rgba(88,60,180,0.18), transparent 60%)' }}>

      {/* Đầu trang — sân khấu vinh danh */}
      <div className="relative overflow-hidden text-center px-4 pt-14 pb-8">
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,229,92,0.22) 0%, rgba(212,175,55,0.08) 38%, transparent 68%)' }} />
        <span className="absolute top-16 left-[12%] w-2.5 h-2.5 rounded-sm bg-[#d4af37] opacity-70 select-none" />
        <span className="absolute top-28 left-[20%] w-2 h-3.5 rounded-sm bg-[#ffe55c] opacity-70 select-none" />
        <span className="absolute top-14 right-[14%] w-2 h-2 rounded-full bg-[#b388ff] opacity-70 select-none" />
        <span className="absolute top-36 right-[22%] w-2 h-3 rounded-sm bg-[#d4af37] opacity-70 select-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="relative w-28 h-28 mx-auto mb-2">
            <div className="absolute inset-0 rounded-full border border-[#d4af37]/50 shadow-[0_0_60px_rgba(212,175,55,0.35)]"
              style={{ background: 'radial-gradient(circle at 50% 32%, rgba(255,229,92,0.28), rgba(212,175,55,0.06) 62%)' }} />
            <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto w-14 h-14 drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]" aria-hidden="true">
              <defs>
                <linearGradient id="goldTrophy" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffe98a" /><stop offset="0.5" stopColor="#d4af37" /><stop offset="1" stopColor="#9a7418" />
                </linearGradient>
              </defs>
              <path fill="url(#goldTrophy)" d="M5 2h14v3h3v3.5A4.5 4.5 0 0 1 17.6 13 6 6 0 0 1 13.2 15.9V18h3.3v2.5H7.5V18h3.3v-2.1A6 6 0 0 1 6.4 13 4.5 4.5 0 0 1 2 8.5V5h3V2zm14 4.5v2a2.9 2.9 0 0 0 2.6-2.9c-.9.1-1.7.4-2.6.9zM5 6.5a8.4 8.4 0 0 0-2.6-.9A2.9 2.9 0 0 0 5 8.5v-2z" />
            </svg>
          </div>
          <p className="text-xs font-bold tracking-[0.35em] text-[#d4af37]">Bảng vàng thành tích</p>
          <h1 style={serif} className="text-4xl md:text-6xl font-black leading-tight mt-3">
            Vinh danh<br />
            <span className={goldText}>Cộng tác viên xuất sắc</span>
          </h1>
          <p className="text-sm md:text-base text-[#9aa3c7] mt-3.5">
            {mode === 'hoa-hong'
              ? 'Xếp hạng theo hoa hồng được ghi nhận · Chu kỳ hàng tháng'
              : 'Xếp hạng theo doanh số giới thiệu (GMV) · Chu kỳ hàng tháng'}
          </p>
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto mt-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4af37]" />
            <div className="w-2.5 h-2.5 rotate-45 bg-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]" />
          </div>
          <p className="inline-block mt-4 px-5 py-1.5 rounded-full border border-[#d4af37]/60 bg-[#d4af37]/10 text-sm font-semibold text-[#f5e7c1]">
            Kỳ vinh danh: {formatPeriod(period)}
          </p>

          <div className="flex justify-center gap-2.5 mt-7">
            <a href={`/vinh-danh?period=${period}`}
              className={`px-6 py-2.5 text-sm font-bold rounded-full border transition ${
                mode === 'doanh-so'
                  ? 'bg-gradient-to-r from-[#8a6414] via-[#d4af37] to-[#ffe98a] text-[#231a02] border-transparent shadow-[0_6px_20px_rgba(212,175,55,0.35)]'
                  : 'bg-white/5 text-[#f5e7c1] border-[#d4af37]/50 hover:bg-[#d4af37]/15'
              }`}>
              Top doanh số
            </a>
            <a href={`/vinh-danh?period=${period}&xep=hoa-hong`}
              className={`px-6 py-2.5 text-sm font-bold rounded-full border transition ${
                mode === 'hoa-hong'
                  ? 'bg-gradient-to-r from-[#8a6414] via-[#d4af37] to-[#ffe98a] text-[#231a02] border-transparent shadow-[0_6px_20px_rgba(212,175,55,0.35)]'
                  : 'bg-white/5 text-[#f5e7c1] border-[#d4af37]/50 hover:bg-[#d4af37]/15'
              }`}>
              Top hoa hồng
            </a>
          </div>

          {periods.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {periods.map((p) => (
                <a key={p} href={p === period ? '#' : `/vinh-danh?period=${p}${mode === 'hoa-hong' ? '&xep=hoa-hong' : ''}`}
                  className={`px-4 py-1.5 text-sm rounded-full border transition ${
                    p === period
                      ? 'bg-white/10 text-white border-white/40 font-semibold'
                      : 'bg-transparent text-[#9aa3c7] border-white/15 hover:bg-white/10'
                  }`}>
                  {formatPeriod(p)}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {displaySnapshots.length === 0 ? (
          <p className="text-center text-[#9aa3c7] italic py-16">
            Chưa có dữ liệu vinh danh cho kỳ này. Hãy quay lại sau!
          </p>
        ) : (
          <>
            {/* 4 thẻ số tổng */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-6">
              {statCards.map((c) => (
                <div key={c.label} className="rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-[#1a2247] to-[#141b3d] shadow-[0_12px_30px_rgba(0,0,0,0.35)] px-5 py-5">
                  <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center mb-2.5">
                    {statIcon(c.icon)}
                  </div>
                  <div className={`text-xl font-extrabold leading-tight break-words ${c.gold ? goldText : 'text-white'}`}>
                    {c.value}
                  </div>
                  <div className="text-xs text-[#9aa3c7] mt-1">{c.label}</div>
                </div>
              ))}
            </div>

            {/* Bục vinh quang Top 3 */}
            {podium.length > 0 && (
              <>
                <h2 style={serif} className="text-center text-2xl md:text-3xl font-extrabold text-white mt-14">
                  Bục <span className={goldText}>vinh quang</span>
                </h2>
                <p className="text-center text-sm text-[#9aa3c7] mt-2 mb-10">
                  Ba gương mặt xuất sắc nhất kỳ — đứng trên bệ cao nhất của bảng vàng
                </p>
                <div className="grid md:grid-cols-3 gap-6 md:gap-5 items-end max-w-3xl mx-auto">
                  {podium.map((s, idx) => podiumCard(s, idx + 1))}
                </div>
              </>
            )}

            {/* Hạng 4 trở đi — cuộc đua thứ hạng */}
            {rest.length > 0 && (
              <>
                <div className="flex flex-wrap items-baseline gap-x-3.5 mt-14 mb-5">
                  <h2 style={serif} className="text-xl md:text-2xl font-extrabold text-white">Cuộc đua thứ hạng</h2>
                  <span className="text-xs md:text-sm text-[#9aa3c7]">Mỗi dòng cho thấy còn cách người xếp trên bao nhiêu — vượt một hạng là thêm một lần được xướng tên.</span>
                </div>
                <div className="space-y-3">
                  {rest.map((s, idx) => {
                    const displayRank = idx + 4
                    const badges = badgeMap.get(s.userId) || []
                    const metric = metricOf(s)
                    const pct = topMetric > 0 ? Math.max(4, Math.round((metric / topMetric) * 100)) : 0
                    const above = idx === 0 ? podium[podium.length - 1] : rest[idx - 1]
                    const gap = above ? metricOf(above) - metric : 0
                    const hot = displayRank <= 5
                    return (
                      <div key={s.id}
                        className={`flex items-center gap-4 rounded-2xl border px-5 py-4 bg-gradient-to-b from-[#1a2247] to-[#141b3d] shadow-[0_8px_22px_rgba(0,0,0,0.3)] ${
                          hot ? 'border-[#d4af37]/40' : 'border-white/10'
                        }`}>
                        <div className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center font-extrabold ${
                          hot
                            ? 'bg-gradient-to-r from-[#8a6414] via-[#d4af37] to-[#ffe98a] text-[#231a02]'
                            : 'bg-white/5 border border-white/15 text-[#f5e7c1]'
                        }`}>
                          {displayRank}
                        </div>
                        <div className="shrink-0">{avatar(s, 0, 'w-11 h-11', 'text-sm')}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white truncate">{displayName(s)}</div>
                          <div className="text-xs text-[#9aa3c7]">
                            {mode === 'hoa-hong' ? (
                              <>Hoa hồng được ghi nhận: <span className="font-bold text-[#ffd968]">{fmt(s.commissionEarned)}</span>
                                <span> · Doanh số {fmt(s.gmv)}</span></>
                            ) : (
                              <>Doanh số giới thiệu: <span className="font-bold text-[#ffd968]">{fmt(s.gmv)}</span></>
                            )}
                            {s.orderCount > 0 && <span> · {s.orderCount} đơn</span>}
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden max-w-md">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#8a6414] via-[#d4af37] to-[#ffe98a]"
                              style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-[11px] text-[#c8b26a] mt-1.5">
                            {gap > 0
                              ? <>Còn <b className="text-[#ffe98a]">{fmt(gap)}</b> nữa là vượt hạng {displayRank - 1} · đạt {pct}% so với quán quân</>
                              : <>Đang ngang số liệu với hạng {displayRank - 1} · đạt {pct}% so với quán quân</>}
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {badges.map((ub) => (
                            <span key={ub.id} title={ub.badge.description || ub.badge.name}
                              className="text-xl">{ub.badge.icon || '🏅'}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Khối động viên */}
            <div className="mt-14 rounded-3xl border border-[#d4af37]/50 text-center px-6 py-10 shadow-[0_20px_44px_rgba(0,0,0,0.45)]"
              style={{ background: 'linear-gradient(135deg, #241a04, #3d2c07 45%, #241a04)' }}>
              <p style={serif} className="text-xl md:text-3xl font-extrabold text-white leading-snug">
                Tháng sau, bục vinh quang này<br />có thể xướng tên bạn
              </p>
              <p className="text-sm text-[#f5e7c1]/85 mt-3">
                Lấy link giới thiệu của bạn, chia sẻ khóa học tới người cần — mỗi đơn thành công đều được ghi vào bảng vàng.
              </p>
              <Link href="/tools/affiliate"
                className="inline-block mt-6 px-7 py-3 rounded-full bg-gradient-to-r from-[#8a6414] via-[#d4af37] to-[#ffe98a] text-[#231a02] font-extrabold text-sm shadow-[0_10px_26px_rgba(212,175,55,0.4)] hover:brightness-110 transition">
                Vào trang Cộng tác viên lấy link giới thiệu
              </Link>
            </div>
          </>
        )}

        <p className="text-center text-[11px] text-[#9aa3c7] mt-10">
          {mode === 'hoa-hong'
            ? 'Bảng vinh danh được cập nhật đầu mỗi tháng từ hoa hồng đã ghi nhận của các đơn đã thanh toán.'
            : 'Bảng vinh danh được cập nhật đầu mỗi tháng từ doanh số giới thiệu đã ghi nhận.'}
        </p>
      </div>
    </main>
  )
}

function formatPeriod(p: string): string {
  const m = p.match(/^(\d{4})-(\d{2})$/)
  if (!m) return `Kỳ ${p}`
  return `Tháng ${Number(m[2])}/${m[1]}`
}

function currentPrevMonth(): string {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
}
