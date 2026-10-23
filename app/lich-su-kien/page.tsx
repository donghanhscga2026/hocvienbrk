import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getMyAgenda } from "@/lib/overview/service"

/**
 * Lịch sự kiện của tôi — tự sinh từ dữ liệu thật: buổi học đã điểm danh
 * của các khóa đang học, mốc cuộc đua mình tham gia, ngày nghỉ đã duyệt.
 * Không có sự kiện nhập tay nên lịch không bao giờ trống/trùng rỗng như
 * lịch nhập tay của WIPA OS. GĐ4 (24/10/2026).
 */
const KIND_LABELS: Record<string, string> = {
  SESSION: 'Buổi học',
  RACE_START: 'Cuộc đua',
  RACE_END: 'Cuộc đua',
  LEAVE: 'Ngày nghỉ',
}

export default async function LichSuKienPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = Number(session.user.id)
  const events = await getMyAgenda(userId)
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('/')

  const byMonth = new Map<string, typeof events>()
  for (const e of events) {
    const key = e.date.toISOString().slice(0, 7)
    byMonth.set(key, [...(byMonth.get(key) ?? []), e])
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lịch sự kiện của tôi</h1>
      <p className="text-sm text-gray-500 mt-1">Lịch được tự tạo từ buổi học, cuộc đua và ngày nghỉ của bạn — luôn khớp dữ liệu thật trên hệ thống.</p>

      {events.length === 0 && <p className="mt-6 text-gray-500">Chưa có sự kiện nào. Khi bạn có buổi học được điểm danh hoặc tham gia cuộc đua, lịch sẽ hiện ở đây.</p>}

      {[...byMonth.entries()].map(([month, list]) => (
        <section key={month} className="mt-7">
          <h2 className="font-bold text-gray-900">Tháng {month.slice(5)}/{month.slice(0, 4)}</h2>
          <ul className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {list.map((e, i) => (
              <li key={i} className="px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{e.title}</p>
                  <p className="text-xs text-gray-400">{e.detail}</p>
                </div>
                <span className="text-right whitespace-nowrap">
                  <span className="block text-sm font-medium">{fmtDate(e.date)}</span>
                  <span className="block text-xs text-gray-400">{KIND_LABELS[e.kind]}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
