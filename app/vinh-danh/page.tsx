import Link from "next/link"
import prisma from "@/lib/prisma"

export const metadata = {
  title: 'Vinh danh Cộng tác viên | Học viện BRK',
  description: 'Bảng xếp hạng cộng tác viên theo doanh số giới thiệu hàng tháng'
}

/**
 * Trang công khai vinh danh CTV (Affiliate v2 — GĐ4).
 * Xếp hạng theo GMV, chu kỳ tháng, tôn trọng CTV ẩn tên.
 * Giao diện thiết kế lại 2026-11-02 theo phong cách trang cuộc đua:
 * banner gradient + thẻ số tổng + bục Top 3 + thanh tiến độ đua hạng.
 * Logic dữ liệu giữ nguyên như bản trước.
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

  const avatar = (s: (typeof displaySnapshots)[number], sizeClass: string, ringClass: string) => {
    const name = displayName(s)
    if (s.user.showOnLeaderboard && s.user.image) {
      return (
        <img src={s.user.image} alt={name}
          className={`${sizeClass} rounded-full object-cover ring-4 ${ringClass}`} />
      )
    }
    return (
      <div className={`${sizeClass} rounded-full ring-4 ${ringClass} bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-lg select-none`}>
        {s.user.showOnLeaderboard ? initials(name) : '?'}
      </div>
    )
  }

  const metricBlock = (s: (typeof displaySnapshots)[number], big: boolean) => (
    mode === 'hoa-hong' ? (
      <>
        <div className={big ? 'text-2xl font-extrabold text-emerald-600' : 'font-bold text-emerald-600'}>
          {fmt(s.commissionEarned)}
        </div>
        <div className="text-xs text-gray-500">
          hoa hồng ghi nhận · doanh số {fmt(s.gmv)}{s.orderCount > 0 ? ` · ${s.orderCount} đơn` : ''}
        </div>
      </>
    ) : (
      <>
        <div className={big ? 'text-2xl font-extrabold text-emerald-600' : 'font-bold text-emerald-600'}>
          {fmt(s.gmv)}
        </div>
        <div className="text-xs text-gray-500">
          doanh số giới thiệu{s.orderCount > 0 ? ` · ${s.orderCount} đơn` : ''}
        </div>
      </>
    )
  )

  const podiumCard = (s: (typeof displaySnapshots)[number], rank: number) => {
    const badges = badgeMap.get(s.userId) || []
    const isFirst = rank === 1
    const cardClass = isFirst
      ? 'bg-gradient-to-b from-amber-300 via-yellow-50 to-white border-amber-300 shadow-xl shadow-amber-200/60 md:-translate-y-4'
      : rank === 2
        ? 'bg-gradient-to-b from-gray-200 via-gray-50 to-white border-gray-200 shadow-lg'
        : 'bg-gradient-to-b from-orange-200 via-orange-50 to-white border-orange-200 shadow-lg'
    const orderClass = isFirst ? 'order-1 md:order-2' : rank === 2 ? 'order-2 md:order-1' : 'order-3'
    const badgeClass = isFirst
      ? 'bg-amber-400 text-amber-900'
      : rank === 2 ? 'bg-gray-400 text-white' : 'bg-orange-400 text-white'
    return (
      <div key={s.id}
        className={`relative rounded-3xl border px-6 ${isFirst ? 'pt-10 pb-8' : 'pt-8 pb-6'} text-center ${cardClass} ${orderClass}`}>
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl">
          {isFirst ? '👑' : rank === 2 ? '🥈' : '🥉'}
        </div>
        <div className="flex justify-center mb-3">
          {avatar(s, isFirst ? 'w-24 h-24' : 'w-20 h-20', isFirst ? 'ring-amber-300' : rank === 2 ? 'ring-gray-300' : 'ring-orange-300')}
        </div>
        <div className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold mb-2 ${badgeClass}`}>
          Hạng {rank}
        </div>
        <div className={`font-extrabold text-gray-900 ${isFirst ? 'text-xl' : 'text-lg'} leading-snug`}>
          {displayName(s)}
        </div>
        <div className="mt-2">{metricBlock(s, true)}</div>
        {badges.length > 0 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {badges.map((ub) => (
              <span key={ub.id} title={ub.badge.description || ub.badge.name}
                className="text-2xl">{ub.badge.icon || '🏅'}</span>
            ))}
          </div>
        )}
      </div>
    )
  }

  const statCards = [
    { icon: '💰', label: 'Tổng doanh số của kỳ', value: fmt(totalGmv), bg: 'bg-amber-100' },
    { icon: '🎉', label: 'Tổng hoa hồng ghi nhận', value: fmt(totalCommission), bg: 'bg-emerald-100' },
    { icon: '🏆', label: 'Cộng tác viên lên bảng', value: String(displaySnapshots.length), bg: 'bg-indigo-100' },
    { icon: '🧾', label: 'Tổng số đơn giới thiệu', value: totalOrders.toLocaleString('vi-VN'), bg: 'bg-rose-100' },
  ]

  return (
    <main className="min-h-screen bg-slate-100 pb-14">
      {/* Banner vinh danh */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 text-white">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-fuchsia-500/20 blur-2xl" />
        <span className="absolute top-8 left-[8%] text-3xl opacity-60 select-none">🎉</span>
        <span className="absolute top-16 right-[10%] text-3xl opacity-60 select-none">🚀</span>
        <span className="absolute bottom-10 right-[22%] text-2xl opacity-40 select-none">✨</span>

        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-16 text-center">
          <div className="text-6xl mb-3">🏆</div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Vinh danh Cộng tác viên
          </h1>
          <p className="text-sm md:text-base text-indigo-200 mt-3">
            {mode === 'hoa-hong'
              ? 'Xếp hạng theo hoa hồng được ghi nhận · Chu kỳ hàng tháng'
              : 'Xếp hạng theo doanh số giới thiệu (GMV) · Chu kỳ hàng tháng'}
          </p>
          <p className="inline-block mt-3 px-4 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-amber-300">
            Kỳ vinh danh: {formatPeriod(period)}
          </p>

          <div className="flex justify-center gap-2 mt-7">
            <a href={`/vinh-danh?period=${period}`}
              className={`px-5 py-2 text-sm font-bold rounded-full border transition ${
                mode === 'doanh-so'
                  ? 'bg-amber-400 text-indigo-950 border-amber-400'
                  : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
              }`}>
              Top doanh số
            </a>
            <a href={`/vinh-danh?period=${period}&xep=hoa-hong`}
              className={`px-5 py-2 text-sm font-bold rounded-full border transition ${
                mode === 'hoa-hong'
                  ? 'bg-amber-400 text-indigo-950 border-amber-400'
                  : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
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
                      ? 'bg-white text-indigo-950 border-white font-semibold'
                      : 'bg-white/5 text-indigo-100 border-white/20 hover:bg-white/15'
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
          <p className="text-center text-gray-400 italic py-16">
            Chưa có dữ liệu vinh danh cho kỳ này. Hãy quay lại sau!
          </p>
        ) : (
          <>
            {/* 4 thẻ số tổng */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 -mt-8 relative z-10">
              {statCards.map((c) => (
                <div key={c.label} className="bg-white rounded-2xl shadow-md px-4 py-4 md:px-5">
                  <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center text-lg mb-2`}>
                    {c.icon}
                  </div>
                  <div className="text-lg md:text-xl font-extrabold text-gray-900 leading-tight break-words">
                    {c.value}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>

            {/* Bục Top 3 */}
            {podium.length > 0 && (
              <>
                <h2 className="text-center text-xl md:text-2xl font-extrabold text-gray-900 mt-12 mb-7">
                  🏆 Vinh danh Top 3 xuất sắc nhất
                </h2>
                <div className="grid md:grid-cols-3 gap-6 md:gap-5 items-end max-w-3xl mx-auto">
                  {podium.map((s, idx) => podiumCard(s, idx + 1))}
                </div>
              </>
            )}

            {/* Hạng 4 trở đi — bảng đua hạng */}
            {rest.length > 0 && (
              <>
                <h2 className="text-lg md:text-xl font-extrabold text-gray-900 mt-12 mb-4">
                  Bảng đua hạng — bám sát Top 3
                </h2>
                <div className="space-y-3">
                  {rest.map((s, idx) => {
                    const displayRank = idx + 4
                    const badges = badgeMap.get(s.userId) || []
                    const metric = metricOf(s)
                    const pct = topMetric > 0 ? Math.max(4, Math.round((metric / topMetric) * 100)) : 0
                    return (
                      <div key={s.id}
                        className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold">
                          {displayRank}
                        </div>
                        <div className="shrink-0">{avatar(s, 'w-11 h-11', 'ring-gray-100')}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 truncate">{displayName(s)}</div>
                          <div className="text-xs text-gray-500">
                            {mode === 'hoa-hong' ? (
                              <>Hoa hồng được ghi nhận: <span className="font-semibold text-emerald-600">{fmt(s.commissionEarned)}</span>
                                <span className="text-gray-400"> · Doanh số {fmt(s.gmv)}</span></>
                            ) : (
                              <>Doanh số giới thiệu: <span className="font-semibold text-emerald-600">{fmt(s.gmv)}</span></>
                            )}
                            {s.orderCount > 0 && <span className="text-gray-400"> · {s.orderCount} đơn</span>}
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden max-w-md">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                              style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            Đạt {pct}% so với người dẫn đầu
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
            <div className="mt-12 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center px-6 py-9 shadow-lg">
              <div className="text-3xl mb-2">🚀</div>
              <p className="text-lg md:text-xl font-bold">
                Tháng sau, tên của bạn có thể xuất hiện trên bục vinh danh này
              </p>
              <p className="text-sm text-emerald-100 mt-2">
                Lấy link giới thiệu của bạn, chia sẻ khóa học tới người cần — mỗi đơn thành công đều được ghi nhận vào bảng đua.
              </p>
              <Link href="/tools/affiliate"
                className="inline-block mt-5 px-6 py-2.5 rounded-full bg-white text-emerald-700 font-bold text-sm shadow hover:bg-emerald-50 transition">
                Vào trang Cộng tác viên lấy link giới thiệu
              </Link>
            </div>
          </>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-10">
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
