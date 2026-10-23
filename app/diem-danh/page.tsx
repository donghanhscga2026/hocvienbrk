import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getMyAttendance } from "@/lib/attendance/service"

/**
 * Trang học viên: lịch sử điểm danh các buổi học trực tiếp của mình.
 * GĐ1, kế hoạch nâng cấp từ WIPA OS (23/10/2026).
 */
export default async function DiemDanhPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = Number(session.user.id)
  const rows = await getMyAttendance(userId)
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('/')
  const present = rows.filter((r) => r.status === 'PRESENT').length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Điểm danh của tôi</h1>
      <p className="text-sm text-gray-500 mt-1">
        Các buổi học trực tiếp bạn đã tham gia (điểm danh tự động từ báo cáo Zoom của buổi học).
        {rows.length > 0 && <> Bạn đã có mặt {present}/{rows.length} buổi được điểm danh.</>}
      </p>

      {rows.length === 0 && <p className="mt-6 text-gray-500">Chưa có buổi học nào được điểm danh cho bạn.</p>}

      {rows.length > 0 && (
        <div className="overflow-x-auto mt-5 rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-3 py-2 font-medium">Buổi học</th>
                <th className="px-3 py-2 font-medium">Khóa</th>
                <th className="px-3 py-2 font-medium">Ngày</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
                <th className="px-3 py-2 font-medium">Thời lượng tham dự</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sessionId} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-900">{r.title}</td>
                  <td className="px-3 py-2">{r.courseName}</td>
                  <td className="px-3 py-2">{fmtDate(r.sessionDate)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                      {r.status === 'PRESENT' ? 'Có mặt' : 'Vắng'}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.status === 'PRESENT' ? `${r.minutesAttended} phút` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
