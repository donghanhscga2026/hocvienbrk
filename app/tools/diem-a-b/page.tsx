import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import prisma from "@/lib/prisma"
import { getCourseGrowth } from "@/lib/baseline/service"
import { METRIC_LABELS, type BaselineMetrics } from "@/lib/baseline/growth"

/**
 * Quản trị: bảng tăng trưởng Điểm A → Điểm B theo khóa học.
 * - ADMIN: mọi khóa. TEACHER: chỉ khóa của mình.
 * - Có tỷ lệ đã ghi A/B để đội vận hành biết tính năng còn "sống" hay
 *   không (bài học WIPA OS: Điểm B bị bỏ quên lặng lẽ, tăng trưởng 0%).
 * - Bảng phân trang 50 dòng/trang.
 * GĐ1, kế hoạch nâng cấp từ WIPA OS (23/10/2026).
 */
export default async function ToolsDiemABPage({
  searchParams
}: {
  searchParams: Promise<{ courseId?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  const userId = Number(session.user.id)
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'TEACHER') {
    return <div className="p-6 max-w-3xl mx-auto"><p className="text-gray-500">Bạn không có quyền xem trang này.</p></div>
  }

  const courses = await prisma.course.findMany({
    where: role === 'ADMIN' ? {} : { teacherId: userId },
    orderBy: { id: 'desc' },
    take: 200,
    select: { id: true, name_khoa: true, name_lop: true },
  })

  const params = await searchParams
  const requested = Number(params.courseId)
  const course = courses.find((c) => c.id === requested) ?? courses[0]
  const page = Math.max(1, Number(params.page) || 1)

  const data = course ? await getCourseGrowth(course.id, page, 50) : null
  const fmt = (n: number) => n.toLocaleString('vi-VN')
  const fields = Object.keys(METRIC_LABELS) as (keyof BaselineMetrics)[]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Đo lường Điểm A → Điểm B</h1>
      <p className="text-sm text-gray-500 mt-1">Tăng trưởng của học viên theo từng khóa học, tính từ số liệu học viên tự ghi tại đầu và cuối chương trình.</p>

      {courses.length === 0 && <p className="mt-6 text-gray-500">Chưa có khóa học nào trong phạm vi của bạn.</p>}

      {courses.length > 0 && (
        <form method="GET" className="flex flex-wrap items-center gap-2 mt-5">
          <label className="text-sm text-gray-600" htmlFor="courseId">Khóa học:</label>
          <select id="courseId" name="courseId" defaultValue={course?.id} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name_khoa || c.name_lop || `Khóa học #${c.id}`}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white">Xem</button>
        </form>
      )}

      {data && course && (
        <>
          <div className="grid grid-cols-3 gap-3 mt-6 max-w-xl">
            <div className="rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Học viên đang học</p><p className="text-xl font-bold">{fmt(data.totalStudents)}</p></div>
            <div className="rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Đã ghi Điểm A</p><p className="text-xl font-bold">{fmt(data.recordedA)}{data.totalStudents > 0 && <span className="text-sm font-medium text-gray-400"> ({Math.round((data.recordedA / data.totalStudents) * 100)}%)</span>}</p></div>
            <div className="rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Đã ghi Điểm B</p><p className="text-xl font-bold">{fmt(data.recordedB)}{data.totalStudents > 0 && <span className="text-sm font-medium text-gray-400"> ({Math.round((data.recordedB / data.totalStudents) * 100)}%)</span>}</p></div>
          </div>

          <div className="overflow-x-auto mt-5 rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-3 py-2 font-medium">Học viên</th>
                  {fields.map((f) => <th key={f} className="px-3 py-2 font-medium">{METRIC_LABELS[f]} (A → B)</th>)}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.userId} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-900">{r.userName ?? '(chưa đặt tên)'}</span>
                      <span className="block text-xs text-gray-400">HV {r.userId} · {r.email}</span>
                    </td>
                    {fields.map((f) => (
                      <td key={f} className="px-3 py-2 whitespace-nowrap">
                        {r.a ? fmt(r.a[f]) : '—'} → {r.b ? fmt(r.b[f]) : '—'}
                        {r.growth && (
                          <span className={`block text-xs ${r.growth[f].delta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {r.growth[f].delta >= 0 ? '+' : ''}{fmt(r.growth[f].delta)}
                            {r.growth[f].pct === null ? ' (từ 0)' : ` (${r.growth[f].pct >= 0 ? '+' : ''}${r.growth[f].pct.toFixed(1)}%)`}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Chưa có học viên đang học trong khóa này.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center gap-3 mt-4 text-sm">
              {data.page > 1 && <Link className="text-gray-700 underline" href={`/tools/diem-a-b?courseId=${course.id}&page=${data.page - 1}`}>← Trang trước</Link>}
              <span className="text-gray-500">Trang {data.page}/{data.totalPages}</span>
              {data.page < data.totalPages && <Link className="text-gray-700 underline" href={`/tools/diem-a-b?courseId=${course.id}&page=${data.page + 1}`}>Trang sau →</Link>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
