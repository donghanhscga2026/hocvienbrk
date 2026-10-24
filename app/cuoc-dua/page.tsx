import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import prisma from "@/lib/prisma"
import { getLeaderboard, getRaceTeamStandings, metricLabel } from "@/lib/race/service"
import { METRIC_KEYS } from "@/lib/race/scoring"
import LeaveForm from "@/components/race/LeaveForm"

/**
 * Trang thành viên Cuộc đua tăng tốc: cuộc đua mình đang tham gia, điểm
 * và số đo từng chỉ số của mình, bảng xếp hạng, xin nghỉ theo ngày.
 * Điểm tính tự động từ dữ liệu thật trên hệ thống. GĐ2B (24/10/2026).
 */
export default async function CuocDuaPage({
  searchParams
}: {
  searchParams: Promise<{ raceId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = Number(session.user.id)
  const params = await searchParams

  const myEnrollments = await prisma.raceEnrollment.findMany({
    where: { userId },
    include: { race: true },
    orderBy: { race: { startsAt: 'desc' } },
  })
  const race = myEnrollments.find((e) => e.raceId === Number(params.raceId))?.race ?? myEnrollments[0]?.race
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('/')
  const fmtQty = (key: string, q: number) => key === 'REVENUE' ? q.toLocaleString('vi-VN') + 'đ' : q.toLocaleString('vi-VN')

  const leaderboard = race ? await getLeaderboard(race.id, 50) : []
  const teamStandings = race ? await getRaceTeamStandings(race.id) : []
  const me = leaderboard.find((r) => r.userId === userId)
  const myRank = me ? leaderboard.indexOf(me) + 1 : null
  const myLeaves = race
    ? await prisma.raceLeave.findMany({ where: { raceId: race.id, userId }, orderBy: { date: 'desc' }, take: 20 })
    : []
  const leaveLabel = (s: string) => s === 'APPROVED' ? 'Đã duyệt' : s === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cuộc đua tăng tốc</h1>
      <p className="text-sm text-gray-500 mt-1">
        Điểm của bạn được tính tự động từ hoạt động thật: doanh thu hệ thống ghi nhận, khách mới, đăng ký qua
        giới thiệu của bạn và số liệu kênh YouTube đã liên kết — không cần khai tay.
      </p>

      {myEnrollments.length === 0 && (
        <p className="mt-6 text-gray-500">Bạn chưa tham gia cuộc đua nào. Khi ban tổ chức mở cuộc đua cho khóa của bạn, cuộc đua sẽ hiện ở đây.</p>
      )}

      {myEnrollments.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {myEnrollments.map((e) => (
            <Link key={e.raceId} href={`/cuoc-dua?raceId=${e.raceId}`} className={`rounded-full px-3 py-1.5 text-sm border ${race?.id === e.raceId ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600'}`}>
              {e.race.name}
            </Link>
          ))}
        </div>
      )}

      {race && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900">{race.name}</h2>
                <p className="text-sm text-gray-500">{fmtDate(race.startsAt)} → {fmtDate(race.endsAt)}</p>
              </div>
              {me && <p className="text-sm">Hạng của bạn: <b className="text-lg">#{myRank}</b> · Tổng điểm: <b className="text-lg">{me.totalPoints}</b></p>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              {METRIC_KEYS.map((k) => (
                <div key={k} className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{metricLabel(k)}</p>
                  <p className="text-lg font-bold text-gray-900">{me?.byMetric[k] ? fmtQty(k, me.byMetric[k]!.quantity) : '0'}</p>
                  <p className="text-xs text-gray-400">{me?.byMetric[k]?.points ?? 0} điểm</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="font-bold text-gray-900">Bảng xếp hạng</h3>
            <ol className="mt-3 divide-y divide-gray-100">
              {leaderboard.map((row, i) => (
                <li key={row.userId} className={`flex items-center justify-between py-2 text-sm ${row.userId === userId ? 'font-bold' : ''}`}>
                  <span>#{i + 1} · {row.userName ?? '(chưa đặt tên)'} <span className="text-gray-400">· Đội {row.team}</span></span>
                  <span>{row.totalPoints} điểm</span>
                </li>
              ))}
              {leaderboard.length === 0 && <li className="py-3 text-sm text-gray-400">Chưa có dữ liệu điểm.</li>}
            </ol>
          </div>

          {teamStandings.length > 1 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="font-bold text-gray-900">Điểm theo đội</h3>
              <ol className="mt-3 divide-y divide-gray-100">
                {teamStandings.map((t, i) => (
                  <li key={t.team} className="flex items-center justify-between py-2 text-sm">
                    <span>#{i + 1} · Đội {t.team} <span className="text-gray-400">· {t.members} thành viên · trung bình {t.avgPoints}</span></span>
                    <span className="font-semibold">{t.totalPoints} điểm</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="font-bold text-gray-900">Xin nghỉ một ngày</h3>
            <p className="text-sm text-gray-500 mt-1">Nếu có việc bận, gửi xin nghỉ trước để ban tổ chức nắm được. Mỗi thành viên có tối đa số ngày nghỉ theo thể lệ của chương trình.</p>
            <div className="mt-3"><LeaveForm raceId={race.id} /></div>
            {myLeaves.length > 0 && (
              <ul className="mt-4 text-sm text-gray-600 space-y-1">
                {myLeaves.map((l) => <li key={l.id}>Nghỉ {fmtDate(l.date)} — {leaveLabel(l.status)}{l.reason ? ` · ${l.reason}` : ''}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
