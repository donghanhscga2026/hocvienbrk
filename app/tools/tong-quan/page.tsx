import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { getOpsOverview, getTeamStandings } from "@/lib/overview/service"

/**
 * Tổng quan vận hành chương trình: các thẻ số liệu hợp nhất từ mọi hệ
 * thống con (cuộc đua, điểm danh, sổ cái, huy hiệu, liên kết kênh),
 * bảng theo đội/nhóm của một khóa và hoạt động gần đây. ADMIN xem toàn
 * hệ thống; TEACHER xem trong phạm vi khóa của mình (đội/nhóm).
 * GĐ4 (24/10/2026).
 */
export default async function TongQuanPage({
  searchParams
}: {
  searchParams: Promise<{ courseId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  const userId = Number(session.user.id)
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'TEACHER') {
    return <div className="p-6 max-w-3xl mx-auto"><p className="text-gray-500">Bạn không có quyền xem trang này.</p></div>
  }
  const params = await searchParams

  const overview = role === 'ADMIN' ? await getOpsOverview() : null
  const courses = await prisma.course.findMany({
    where: role === 'ADMIN' ? {} : { teacherId: userId },
    orderBy: { id: 'desc' },
    take: 200,
    select: { id: true, name_khoa: true, name_lop: true },
  })
  const course = courses.find((c) => c.id === Number(params.courseId)) ?? courses[0]
  const teams = course ? await getTeamStandings(course.id) : []
  const activityRaw = role === 'ADMIN'
    ? await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 15 })
    : []
  const activityUsers = activityRaw.length
    ? await prisma.user.findMany({ where: { id: { in: [...new Set(activityRaw.map((a) => a.userId))] } }, select: { id: true, name: true, email: true } })
    : []
  const activityUserById = new Map(activityUsers.map((u) => [u.id, u]))
  const activity = activityRaw.map((a) => ({ ...a, userName: activityUserById.get(a.userId)?.name ?? activityUserById.get(a.userId)?.email ?? `HV ${a.userId}` }))
  const fmtMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tổng quan vận hành</h1>
      <p className="text-sm text-gray-500 mt-1">Một màn hình nhìn toàn bộ chương trình — số liệu lấy trực tiếp từ các hệ thống con, không nhập tay.</p>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Cuộc đua đang chạy</p><p className="text-2xl font-bold mt-1">{overview.activeRaces}</p><p className="text-xs text-gray-400">{overview.raceMembers} thành viên tham gia</p></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Điểm danh</p><p className="text-2xl font-bold mt-1">{overview.attendanceRate === null ? '—' : `${overview.attendanceRate}%`}</p><p className="text-xs text-gray-400">{overview.sessionsRecorded} buổi đã ghi</p></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Doanh thu ghi nhận tháng này</p><p className="text-2xl font-bold mt-1">{fmtMoney(overview.ledgerGmvThisMonth)}</p><p className="text-xs text-gray-400">Từ sổ cái doanh số</p></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Huy hiệu đã trao</p><p className="text-2xl font-bold mt-1">{overview.badgesAwarded}</p><p className="text-xs text-gray-400">{overview.linkedAccounts} kênh đã liên kết · {overview.newMembersThisMonth} ghi danh mới tháng này</p></div>
        </div>
      )}

      {courses.length > 0 && (
        <form method="GET" className="flex flex-wrap items-center gap-2 mt-8">
          <label className="text-sm text-gray-600" htmlFor="courseId">Xem đội/nhóm của khóa:</label>
          <select id="courseId" name="courseId" defaultValue={course?.id} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name_khoa || c.name_lop || `Khóa học #${c.id}`}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white">Xem</button>
        </form>
      )}

      {course && (
        <div className="overflow-x-auto mt-4 rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-3 py-2 font-medium">Đội</th>
                <th className="px-3 py-2 font-medium">Nhóm</th>
                <th className="px-3 py-2 font-medium text-right">Thành viên</th>
                <th className="px-3 py-2 font-medium text-right">Bài học đã hoàn thành</th>
                <th className="px-3 py-2 font-medium text-right">Điểm danh có mặt</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={`${t.team}-${t.group}`} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Đội {t.team}</td>
                  <td className="px-3 py-2">Nhóm {t.group}</td>
                  <td className="px-3 py-2 text-right">{t.members}</td>
                  <td className="px-3 py-2 text-right">{t.lessonsCompleted}</td>
                  <td className="px-3 py-2 text-right">{t.attendanceTotal > 0 ? `${t.attendancePresent}/${t.attendanceTotal}` : '—'}</td>
                </tr>
              ))}
              {teams.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Khóa này chưa có học viên đang học.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activity.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-gray-900">Hoạt động gần đây</h2>
          <ul className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {activity.map((a) => (
              <li key={a.id} className="px-4 py-2.5 text-sm flex items-center justify-between gap-3">
                <span><b>{a.userName}</b> · {a.detail ?? a.action}</span>
                <span className="text-gray-400 whitespace-nowrap">{a.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
