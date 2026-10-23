import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { listCourseSessions } from "@/lib/attendance/service"
import ZoomImport from "@/components/attendance/ZoomImport"

/**
 * Quản trị điểm danh buổi học live bằng nhập báo cáo Zoom.
 * - ADMIN: mọi khóa. TEACHER: chỉ khóa của mình.
 * - Luồng 2 bước (xem trước → xác nhận) nằm trong component ZoomImport.
 * GĐ1, kế hoạch nâng cấp từ WIPA OS (23/10/2026).
 */
export default async function ToolsDiemDanhPage({
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

  const courses = await prisma.course.findMany({
    where: role === 'ADMIN' ? {} : { teacherId: userId },
    orderBy: { id: 'desc' },
    take: 200,
    select: { id: true, name_khoa: true, name_lop: true },
  })

  const params = await searchParams
  const requested = Number(params.courseId)
  const course = courses.find((c) => c.id === requested) ?? courses[0]
  const sessions = course ? await listCourseSessions(course.id) : []
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('/')

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Điểm danh buổi học</h1>
      <p className="text-sm text-gray-500 mt-1">Nhập báo cáo người tham dự từ Zoom để điểm danh hàng loạt cho từng buổi học trực tiếp.</p>

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

      {course && (
        <div className="mt-6 space-y-6">
          <ZoomImport courseId={course.id} />

          <div>
            <h2 className="font-bold text-gray-900">Các buổi đã điểm danh</h2>
            {sessions.length === 0 && <p className="text-sm text-gray-400 mt-2">Chưa có buổi nào được điểm danh cho khóa này.</p>}
            {sessions.length > 0 && (
              <div className="overflow-x-auto mt-3 rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-3 py-2 font-medium">Buổi học</th>
                      <th className="px-3 py-2 font-medium">Ngày</th>
                      <th className="px-3 py-2 font-medium">Có mặt</th>
                      <th className="px-3 py-2 font-medium">Vắng</th>
                      <th className="px-3 py-2 font-medium">Tỷ lệ có mặt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-900">{s.title}</td>
                        <td className="px-3 py-2">{fmtDate(s.sessionDate)}</td>
                        <td className="px-3 py-2">{s.present}</td>
                        <td className="px-3 py-2">{s.absent}</td>
                        <td className="px-3 py-2">{s.totalStudents > 0 ? `${Math.round((s.present / s.totalStudents) * 100)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
