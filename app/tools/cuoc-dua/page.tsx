import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import prisma from "@/lib/prisma"
import { getLeaderboard, metricLabel } from "@/lib/race/service"
import { METRIC_KEYS } from "@/lib/race/scoring"
import { CreateRaceForm, RaceControls, LeaveDecision } from "@/components/race/RaceAdminPanel"

/**
 * Quản trị Cuộc đua tăng tốc: tạo cuộc đua, gắn khóa để lấy học viên,
 * mở/kết thúc, tính lại điểm, xem bảng xếp hạng và duyệt ngày nghỉ.
 * Điểm lấy từ các nguồn tự động (sổ cái doanh số, đơn PAID, ghi danh
 * qua ref, kênh YouTube đã liên kết). Chỉ ADMIN. GĐ2B (24/10/2026).
 */
export default async function ToolsCuocDuaPage({
  searchParams
}: {
  searchParams: Promise<{ raceId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  if (session.user.role !== 'ADMIN') {
    return <div className="p-6 max-w-3xl mx-auto"><p className="text-gray-500">Bạn không có quyền xem trang này.</p></div>
  }

  const params = await searchParams
  const [races, courses] = await Promise.all([
    prisma.race.findMany({ orderBy: { startsAt: 'desc' }, take: 50, include: { _count: { select: { enrollments: true } } } }),
    prisma.course.findMany({ orderBy: { id: 'desc' }, take: 200, select: { id: true, name_khoa: true, name_lop: true } }),
  ])
  const race = races.find((r) => r.id === Number(params.raceId)) ?? races[0]
  const leaderboard = race ? await getLeaderboard(race.id) : []
  const pendingLeaves = race
    ? await prisma.raceLeave.findMany({
        where: { raceId: race.id, status: 'PENDING' },
        orderBy: { date: 'asc' },
        include: { user: { select: { name: true, email: true } } },
      })
    : []
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('/')
  const fmtQty = (key: string, q: number) => key === 'REVENUE' ? q.toLocaleString('vi-VN') + 'đ' : q.toLocaleString('vi-VN')
  const statusLabel = (s: string) => s === 'ACTIVE' ? 'Đang chạy' : s === 'FINISHED' ? 'Đã kết thúc' : 'Nháp'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cuộc đua tăng tốc</h1>
      <p className="text-sm text-gray-500 mt-1">
        Thi đua theo kỳ với điểm tính hoàn toàn tự động: doanh thu từ sổ cái, khách mới từ đơn đã thanh toán,
        đăng ký mới qua người giới thiệu, video/lượt xem/người đăng ký từ kênh YouTube đã liên kết.
      </p>

      <div className="mt-6">
        <CreateRaceForm courses={courses.map((c) => ({ id: c.id, label: c.name_khoa || c.name_lop || `Khóa học #${c.id}` }))} />
      </div>

      <div className="flex flex-wrap gap-2 mt-6">
        {races.map((r) => (
          <Link key={r.id} href={`/tools/cuoc-dua?raceId=${r.id}`} className={`rounded-full px-3 py-1.5 text-sm border ${race?.id === r.id ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600'}`}>
            {r.name} · {statusLabel(r.status)} · {r._count.enrollments} người
          </Link>
        ))}
        {races.length === 0 && <p className="text-sm text-gray-400">Chưa có cuộc đua nào — tạo cuộc đua đầu tiên ở phía trên.</p>}
      </div>

      {race && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900">{race.name}</h2>
                <p className="text-sm text-gray-500">{fmtDate(race.startsAt)} → {fmtDate(race.endsAt)} · {statusLabel(race.status)}</p>
              </div>
              <RaceControls raceId={race.id} status={race.status} hasCourse={!!race.courseId} />
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Thành viên</th>
                    <th className="px-3 py-2 font-medium">Đội</th>
                    {METRIC_KEYS.map((k) => <th key={k} className="px-3 py-2 font-medium text-right">{metricLabel(k)}</th>)}
                    <th className="px-3 py-2 font-medium text-right">Tổng điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => (
                    <tr key={row.userId} className="border-t border-gray-100">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-900">{row.userName ?? '(chưa đặt tên)'}</span>
                        <span className="block text-xs text-gray-400">HV {row.userId}</span>
                      </td>
                      <td className="px-3 py-2">Đội {row.team}</td>
                      {METRIC_KEYS.map((k) => (
                        <td key={k} className="px-3 py-2 text-right">
                          {row.byMetric[k] ? <>{fmtQty(k, row.byMetric[k]!.quantity)}<span className="block text-xs text-gray-400">{row.byMetric[k]!.points} điểm</span></> : '—'}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-bold">{row.totalPoints}</td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && <tr><td colSpan={5 + METRIC_KEYS.length} className="px-3 py-6 text-center text-gray-400">Chưa có thành viên. Thêm học viên từ khóa rồi bấm Tính lại điểm.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {pendingLeaves.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="font-bold text-gray-900">Ngày nghỉ chờ duyệt ({pendingLeaves.length})</h3>
              <ul className="mt-3 space-y-2">
                {pendingLeaves.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-gray-100 pb-2">
                    <span>{l.user.name ?? l.user.email} (HV {l.userId}) · nghỉ {fmtDate(l.date)}{l.reason ? ` · ${l.reason}` : ''}</span>
                    <LeaveDecision leaveId={l.id} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
