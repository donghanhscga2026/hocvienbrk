import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import prisma from "@/lib/prisma"
import { getBaselinePair, getMeasuredTotals } from "@/lib/baseline/service"
import BaselineForm, { GrowthSummary } from "@/components/baseline/BaselineForm"

/**
 * Trang học viên: ghi Điểm A (xuất phát điểm) và Điểm B (kết quả) cho
 * từng khóa đang học — đo biến đổi thật của bản thân qua chương trình.
 * GĐ1, kế hoạch nâng cấp từ WIPA OS (23/10/2026).
 */
export default async function DiemABPage({
  searchParams
}: {
  searchParams: Promise<{ courseId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = Number(session.user.id)

  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { courseId: true, course: { select: { name_khoa: true, name_lop: true } } },
  })

  const params = await searchParams
  const requested = Number(params.courseId)
  const selected = enrollments.find((e) => e.courseId === requested) ?? enrollments[0]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Điểm A → Điểm B của tôi</h1>
      <p className="text-sm text-gray-500 mt-1">
        Ghi lại các chỉ số tại lúc bắt đầu (Điểm A) và khi kết thúc chương trình (Điểm B)
        để thấy rõ mình đã biến đổi bao nhiêu. Số liệu chỉ bạn và đội ngũ vận hành khóa học xem được.
      </p>

      {enrollments.length === 0 && (
        <p className="mt-6 text-gray-500">Bạn chưa có khóa học nào đang kích hoạt.</p>
      )}

      {enrollments.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {enrollments.map((e) => (
            <Link
              key={e.courseId}
              href={`/diem-a-b?courseId=${e.courseId}`}
              className={`rounded-full px-3 py-1.5 text-sm border ${selected?.courseId === e.courseId ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600'}`}
            >
              {e.course.name_khoa || e.course.name_lop || `Khóa học #${e.courseId}`}
            </Link>
          ))}
        </div>
      )}

      {selected && <BaselineSection userId={userId} courseId={selected.courseId} courseTitle={selected.course.name_khoa || selected.course.name_lop || `Khóa học #${selected.courseId}`} />}
    </div>
  )
}

async function BaselineSection({ userId, courseId, courseTitle }: { userId: number; courseId: number; courseTitle: string }) {
  const pair = await getBaselinePair(userId, courseId)
  const measured = await getMeasuredTotals(userId)
  const serialize = (x: typeof pair.a) => x ? { ...x, recordedAt: x.recordedAt.toISOString() } : null
  return (
    <div className="mt-6 space-y-4">
      <h2 className="font-semibold text-gray-800">{courseTitle}</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <BaselineForm courseId={courseId} kind="A" initial={serialize(pair.a)} />
        <BaselineForm courseId={courseId} kind="B" initial={serialize(pair.b)} suggestion={measured} />
      </div>
      {pair.growth && <GrowthSummary growth={pair.growth} />}
      {!pair.a && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
          Hãy ghi Điểm A ngay hôm nay — càng gần ngày bắt đầu, bức tranh biến đổi của bạn càng chính xác.
        </p>
      )}
      {pair.a && !pair.b && (
        <p className="text-sm text-gray-500">Khi chương trình kết thúc, quay lại đây ghi Điểm B để hệ thống tính tăng trưởng cho bạn.</p>
      )}
    </div>
  )
}
