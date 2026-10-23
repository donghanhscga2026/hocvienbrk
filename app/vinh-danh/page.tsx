import prisma from "@/lib/prisma"

export const metadata = {
  title: 'Vinh danh Cộng tác viên | Học viện BRK',
  description: 'Bảng xếp hạng cộng tác viên theo doanh số giới thiệu hàng tháng'
}

/**
 * Trang công khai vinh danh CTV (Affiliate v2 — GĐ4).
 * Xếp hạng theo GMV, chu kỳ tháng, tôn trọng CTV ẩn tên.
 */
export default async function VinhDanhPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const params = await searchParams

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
          user: { select: { id: true, name: true, showOnLeaderboard: true } }
        },
        orderBy: { rank: 'asc' },
        take: 100
      })
    : []

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
  const rankStyle = (rank: number) =>
    rank === 1 ? 'bg-yellow-100 text-yellow-700' :
    rank === 2 ? 'bg-gray-100 text-gray-600' :
    rank === 3 ? 'bg-orange-100 text-orange-700' :
    'bg-gray-50 text-gray-500'

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-3xl font-bold text-gray-900">Vinh danh Cộng tác viên</h1>
          <p className="text-sm text-gray-500 mt-2">
            Xếp hạng theo doanh số giới thiệu (GMV) · Chu kỳ hàng tháng
          </p>
        </div>

        {periods.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {periods.map((p) => (
              <a key={p} href={p === period ? '#' : `/vinh-danh?period=${p}`}
                className={`px-4 py-1.5 text-sm rounded-full border ${
                  p === period
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}>
                Tháng {p}
              </a>
            ))}
          </div>
        )}

        {snapshots.length === 0 ? (
          <p className="text-center text-gray-400 italic py-12">
            Chưa có dữ liệu vinh danh cho kỳ này. Hãy quay lại sau!
          </p>
        ) : (
          <div className="space-y-3">
            {snapshots.map((s) => {
              const badges = badgeMap.get(s.userId) || []
              return (
                <div key={s.id}
                  className={`flex items-center gap-4 bg-white rounded-2xl border px-5 py-4 shadow-sm ${
                    s.rank <= 3 ? 'border-amber-200' : 'border-gray-100'
                  }`}>
                  <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold ${rankStyle(s.rank)}`}>
                    {s.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 truncate">
                      {s.user.showOnLeaderboard ? (s.user.name || `CTV #${s.userId}`) : 'CTV ẩn danh'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Doanh số giới thiệu: <span className="font-semibold text-emerald-600">{fmt(s.gmv)}</span>
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
        )}

        <p className="text-center text-[11px] text-gray-400 mt-10">
          Bảng vinh danh được cập nhật đầu mỗi tháng từ doanh số giới thiệu đã ghi nhận.
        </p>
      </div>
    </main>
  )
}

function currentPrevMonth(): string {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
}
