import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { getTopBadgeEarners, getTopLearnersThisMonth } from "@/lib/overview/service"
import { titleForBadgeCount } from "@/lib/badges/catalog"

/**
 * Vinh danh học tập — bổ sung cho bảng vinh danh affiliate sẵn có:
 * thành viên nhiều huy hiệu nhất, học chăm nhất tháng này và các quán
 * quân/top cuộc đua đã kết thúc. Mọi số liệu từ dữ liệu thật. GĐ4.
 */
export default async function VinhDanhHocTapPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [topBadges, topLearners, finishedRaces] = await Promise.all([
    getTopBadgeEarners(10),
    getTopLearnersThisMonth(10),
    prisma.race.findMany({ where: { status: 'FINISHED' }, orderBy: { endsAt: 'desc' }, take: 3, select: { id: true, name: true } }),
  ])

  const racePodiums: { raceName: string; winners: { userId: number; name: string; points: number }[] }[] = []
  for (const race of finishedRaces) {
    const totals = await prisma.metricEvent.groupBy({
      by: ['userId'],
      where: { raceId: race.id, periodKey: 'TOTAL' },
      _sum: { points: true },
    })
    const sorted = totals
      .map((t) => ({ userId: t.userId, points: t._sum.points ?? 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
    const users = sorted.length
      ? await prisma.user.findMany({ where: { id: { in: sorted.map((s) => s.userId) } }, select: { id: true, name: true, email: true } })
      : []
    const byId = new Map(users.map((u) => [u.id, u]))
    racePodiums.push({
      raceName: race.name,
      winners: sorted.map((s) => ({ userId: s.userId, name: byId.get(s.userId)?.name ?? byId.get(s.userId)?.email ?? `HV ${s.userId}`, points: s.points })),
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vinh danh học tập</h1>
      <p className="text-sm text-gray-500 mt-1">Những thành viên học tập và thực hành nổi bật nhất — vinh danh affiliate theo doanh số vẫn ở trang Vinh danh cộng tác viên như trước.</p>

      <div className="grid md:grid-cols-2 gap-5 mt-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold text-gray-900">Nhiều huy hiệu nhất</h2>
          <ol className="mt-3 divide-y divide-gray-100">
            {topBadges.map((row, i) => (
              <li key={row.userId} className="flex items-center justify-between py-2 text-sm">
                <span>#{i + 1} · {row.userName ?? row.email} <span className="text-gray-400">· {titleForBadgeCount(row.value)}</span></span>
                <span className="font-semibold">{row.value} huy hiệu</span>
              </li>
            ))}
            {topBadges.length === 0 && <li className="py-3 text-sm text-gray-400">Chưa có huy hiệu nào được trao.</li>}
          </ol>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold text-gray-900">Học chăm nhất tháng này</h2>
          <ol className="mt-3 divide-y divide-gray-100">
            {topLearners.map((row, i) => (
              <li key={row.userId} className="flex items-center justify-between py-2 text-sm">
                <span>#{i + 1} · {row.userName ?? row.email}</span>
                <span className="font-semibold">{row.value} bài hoàn thành</span>
              </li>
            ))}
            {topLearners.length === 0 && <li className="py-3 text-sm text-gray-400">Chưa có bài học nào hoàn thành trong tháng.</li>}
          </ol>
        </section>
      </div>

      {racePodiums.length > 0 && (
        <div className="mt-5 space-y-5">
          {racePodiums.map((podium) => (
            <section key={podium.raceName} className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-bold text-gray-900">Bục vinh quang: {podium.raceName}</h2>
              <ol className="mt-3 space-y-1.5">
                {podium.winners.map((w, i) => (
                  <li key={w.userId} className="text-sm">
                    {i === 0 ? '🏆' : i === 1 ? '🥈' : '🥉'} <b>{w.name}</b> — {w.points} điểm
                  </li>
                ))}
                {podium.winners.length === 0 && <li className="text-sm text-gray-400">Cuộc đua chưa có dữ liệu điểm.</li>}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
