import Link from 'next/link'
import MainHeader from '@/components/layout/MainHeader'
import CopyLinkButton from '@/components/booking/CopyLinkButton'
import { getExpertPublicProfile } from '@/lib/booking/service'
import { formatMin } from '@/lib/booking/slots'

export const dynamic = 'force-dynamic'

const MODE_LABELS: Record<string, string> = {
  ZOOM: 'Zoom Meeting',
  MEET: 'Google Meet',
  OFFLINE: 'Gặp trực tiếp',
}

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
}

/**
 * Hồ sơ đặt lịch của giảng viên: /dat-lich/giang-vien/[expertId]?code=<mã phiên riêng tư>
 * Một link duy nhất để giảng viên gửi học viên: học viên xem các phiên đang mở,
 * lịch làm việc hằng tuần, rồi bấm vào từng phiên để đặt. Phiên riêng tư chỉ hiện
 * khi khách đến từ đúng link mời của phiên đó (tham số code).
 */
export default async function ExpertProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ expertId: string }>
  searchParams: Promise<{ code?: string }>
}) {
  const { expertId } = await params
  const query = await searchParams
  const id = Number(expertId)
  const profile = Number.isInteger(id) && id > 0 ? await getExpertPublicProfile(id, query.code) : null

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MainHeader title="Hồ sơ giảng viên" />
        <main className="mx-auto max-w-2xl p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <h1 className="text-lg font-semibold text-slate-800">Không tìm thấy hồ sơ giảng viên</h1>
            <p className="mt-2 text-sm text-slate-500">
              Link hồ sơ không đúng hoặc giảng viên này chưa mở đặt lịch. Vui lòng kiểm tra lại link bạn nhận được.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const { expert, sessions, weekly } = profile
  const weeklyByDay = new Map<number, { startMin: number; endMin: number }[]>()
  for (const rule of weekly) {
    const list = weeklyByDay.get(rule.weekday) || []
    list.push(rule)
    weeklyByDay.set(rule.weekday, list)
  }
  const profilePath = `/dat-lich/giang-vien/${expert.id}`

  return (
    <div className="min-h-screen bg-slate-50">
      <MainHeader title="Hồ sơ giảng viên" />
      <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        {/* Thẻ giảng viên */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-4">
            {expert.image
              ? <img src={expert.image} alt="" className="h-16 w-16 rounded-full object-cover" />
              : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-800">{expert.name.slice(0, 1)}</span>}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Hồ sơ giảng viên</p>
              <h1 className="mt-0.5 text-xl font-bold text-slate-900">{expert.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {expert.role === 'ADMIN' ? 'Quản trị viên · Chuyên gia tư vấn' : 'Giảng viên · Chuyên gia tư vấn'}
              </p>
            </div>
            <CopyLinkButton path={profilePath} label="Sao chép link hồ sơ" />
          </div>
          {sessions.some((s) => s.isViaCode) && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Bạn đang đến từ một link mời riêng tư — phiên được mời nằm trong danh sách bên dưới (đánh dấu “Đang chọn”).
            </p>
          )}
        </section>

        {/* Các phiên đặt lịch */}
        <section>
          <h2 className="mb-2 text-base font-semibold text-slate-800">Các phiên đặt lịch đang mở ({sessions.length})</h2>
          {sessions.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Giảng viên chưa mở phiên đặt lịch công khai. Nếu bạn nhận được link mời riêng của một phiên,
              hãy mở đúng link đó để đặt lịch.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {sessions.map((s) => (
                <article key={s.code} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {s.coverUrl && <img src={s.coverUrl} alt="" className="h-32 w-full object-cover" />}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">{s.title}</h3>
                      {s.isViaCode && (
                        <span className="shrink-0 rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] font-semibold text-white">Đang chọn</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2 py-1">⏱ {s.durationMin} phút</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1">🎥 {MODE_LABELS[s.mode] || s.mode}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1">Chi phí: {s.price === 0 ? 'Miễn phí' : `${s.price.toLocaleString('vi-VN')}đ`}</span>
                    </div>
                    {s.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{s.description}</p>}
                    <Link
                      href={`/dat-lich/${s.code}`}
                      className="mt-3 flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white"
                    >
                      Đặt lịch phiên này →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Lịch làm việc hằng tuần */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800">Lịch làm việc hằng tuần</h2>
          {weekly.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Giảng viên chưa công khai lịch làm việc theo tuần.</p>
          ) : (
            <dl className="mt-3 divide-y divide-slate-100">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const rules = weeklyByDay.get(day)
                if (!rules) return null
                return (
                  <div key={day} className="flex gap-3 py-2 text-sm">
                    <dt className="w-20 shrink-0 font-medium text-slate-700">{WEEKDAY_LABELS[day]}</dt>
                    <dd className="text-slate-600">
                      {rules.map((r) => `${formatMin(r.startMin)}–${formatMin(r.endMin)}`).join(' · ')}
                    </dd>
                  </div>
                )
              })}
            </dl>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Khung giờ thực tế theo từng ngày (trừ ngày nghỉ và lịch đã kín) hiển thị khi bạn vào trang đặt lịch của từng phiên. Múi giờ: Việt Nam (Asia/Saigon).
          </p>
        </section>
      </main>
    </div>
  )
}
