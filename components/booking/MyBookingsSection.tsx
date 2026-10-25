import { listMyBookings } from '@/lib/booking/service'
import { formatVnDateTime } from '@/lib/booking/notify'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ chuyên gia xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Đã hoàn thành',
  NO_SHOW: 'Vắng mặt',
}

/**
 * Mục "Lịch hẹn 1:1 của tôi" trong trang yêu cầu của học viên
 * (Giai đoạn 2): liệt kê các lịch hẹn gắn với tài khoản hoặc email của
 * học viên, kèm lối tắt vào cổng tra cứu để tự đổi/hủy lịch.
 */
export default async function MyBookingsSection({
  userId,
  email,
}: {
  userId: number
  email: string | null
}) {
  const bookings = await listMyBookings(userId, email).catch(() => [])
  if (bookings.length === 0) return null

  const now = Date.now()
  const upcoming = bookings.filter(
    (b) => (b.status === 'CONFIRMED' || b.status === 'PENDING') && b.endsAt.getTime() >= now,
  )
  const upcomingIds = new Set(upcoming.map((b) => b.id))
  const past = bookings.filter((b) => !upcomingIds.has(b.id)).slice(0, 5)

  const renderRow = (b: (typeof bookings)[number]) => (
    <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
      <div className="min-w-52 flex-1">
        <p className="text-sm font-semibold text-slate-800">{b.session.title}</p>
        <p className="text-xs text-slate-500">
          {formatVnDateTime(b.startsAt)} · Chuyên gia: {b.expert.name || 'Chuyên gia'} · Mã: {b.code}
        </p>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          b.status === 'CONFIRMED'
            ? 'bg-emerald-50 text-emerald-700'
            : b.status === 'PENDING'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-slate-100 text-slate-500'
        }`}
      >
        {STATUS_LABELS[b.status] || b.status}
      </span>
      {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
        <a
          className="text-sm font-semibold text-emerald-800 underline"
          href={`/tra-cuu-hen?email=${encodeURIComponent(b.guestEmail)}&code=${encodeURIComponent(b.code)}`}
        >
          Đổi / hủy lịch
        </a>
      )}
    </li>
  )

  return (
    <section className="mx-auto w-full max-w-4xl px-3 pb-10 sm:px-6" aria-label="Lịch hẹn 1:1 của tôi">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-3 text-base font-bold text-slate-900 sm:px-5">
          Lịch hẹn 1:1 của tôi
        </h2>
        {upcoming.length > 0 && (
          <>
            <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:px-5">Sắp tới</p>
            <ul className="divide-y divide-slate-100">{upcoming.map(renderRow)}</ul>
          </>
        )}
        {past.length > 0 && (
          <>
            <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:px-5">Đã qua / đã đóng</p>
            <ul className="divide-y divide-slate-100">{past.map(renderRow)}</ul>
          </>
        )}
      </div>
    </section>
  )
}
