'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import OfferingDeliveryEditor from './OfferingDeliveryEditor'
import OfferingServiceReply from './OfferingServiceReply'
import { REQUEST_STATUSES } from '@/lib/crm/shared'
type Data = {
  customers: { id: number; name: string }[]
  total: number
  bookings: { id: string; startsAt: string; status: string; session: { title: string } }[]
  requests: {
    id: string
    category: string
    status: string
    content: string
    publicReply: string
    updatedAt: string
    version: number
    thread: { action: string; content: string; changedAt: string }[]
  }[]
}
const date = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
const bookingLabels: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  NO_SHOW: 'Vắng mặt',
  CANCELLED: 'Đã hủy',
}
export default function OfferingServiceOperations({
  slug,
  courseId,
  onDirtyChange,
  preferBookings = false,
}: {
  slug: string
  courseId: number
  onDirtyChange?: (dirty: boolean) => void
  preferBookings?: boolean
}) {
  const [selected, setSelected] = useState(''),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0)
  const [tab, setTab] = useState<'delivery' | 'bookings' | 'conversation'>(
    preferBookings ? 'bookings' : 'delivery',
  )
  const [dirty, setDirty] = useState(false)
  const [replies, setReplies] = useState<Record<string, string>>({}),
    [notice, setNotice] = useState('')
  const hasReplies = Object.values(replies).some((value) => value.trim())
  useEffect(() => {
    onDirtyChange?.(dirty || hasReplies)
  }, [dirty, hasReplies, onDirtyChange])
  const [result, setResult] = useState<{ key: string; data?: Data; error?: string } | null>(null)
  const key = `${slug}:${selected}:${query}:${page}:${retry}`
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(
        `/api/offerings/${encodeURIComponent(slug)}/operations?q=${encodeURIComponent(query)}&page=${page}${selected === '' ? '' : '&userId=' + selected}`,
        { signal: controller.signal, cache: 'no-store' },
      )
        .then(async (response) => {
          const data = await response.json()
          if (!response.ok) throw new Error(data.error)
          if (!controller.signal.aborted) setResult({ key, data })
        })
        .catch((error) => {
          if (!controller.signal.aborted) setResult({ key, error: error.message || 'Mất kết nối.' })
        })
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [key, slug, selected, query, page])
  const current = result?.key === key ? result : null
  const data = current?.data
  function markDirty(value: boolean) {
    setDirty(value)
  }
  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-green-950">Vận hành dịch vụ theo khách</h2>
        <p className="mt-2 text-sm text-brk-muted">
          Chọn khách đã kích hoạt để cập nhật đầu vào, tiến độ và kết quả riêng; xem lịch hẹn và trao đổi tại
          cùng khu vực.
        </p>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border bg-white p-4">
          <label className="block font-semibold">
            Khách hàng
            <input
              aria-label="Tìm khách dịch vụ"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Tìm theo tên…"
              className="mt-2 min-h-12 w-full rounded-xl border px-3"
            />
          </label>
          {!current && <p role="status">Đang tải…</p>}
          {current?.error && (
            <p role="alert">
              {current.error}{' '}
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                className="min-h-11 underline"
              >
                Thử lại
              </button>
            </p>
          )}
          <nav aria-label="Chọn khách vận hành" className="space-y-2">
            {data?.customers.map((customer) => (
              <button
                type="button"
                key={customer.id}
                aria-pressed={selected === String(customer.id)}
                onClick={() => {
                  if (selected === String(customer.id)) return
                  if (
                    (dirty || hasReplies) &&
                    !window.confirm('Cập nhật cho khách hiện tại chưa được lưu. Chuyển khách?')
                  )
                    return
                  markDirty(false)
                  setReplies({})
                  setNotice('')
                  setSelected(String(customer.id))
                }}
                className={`min-h-14 w-full rounded-xl p-3 text-left ${selected === String(customer.id) ? 'bg-green-50 font-bold text-green-950' : 'hover:bg-stone-50'}`}
              >
                {customer.name}
                <span className="mt-1 block text-xs text-brk-muted">#{customer.id} · Đã kích hoạt</span>
              </button>
            ))}
          </nav>
          {data && !data.customers.length && (
            <p className="text-sm text-brk-muted">Không có khách phù hợp.</p>
          )}
          {data && (
            <div className="flex items-center justify-between gap-2 border-t pt-3 text-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="min-h-11 disabled:opacity-40"
              >
                Trước
              </button>
              <span>
                {page} / {Math.max(1, Math.ceil(data.total / 25))}
              </span>
              <button
                type="button"
                disabled={page * 25 >= data.total}
                onClick={() => setPage(page + 1)}
                className="min-h-11 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          )}
        </aside>
        <div className="min-w-0 space-y-4">
          {selected === '' ? (
            <p className="rounded-2xl border bg-white p-8">Chọn khách ở bên trái để bắt đầu.</p>
          ) : (
            <>
              <nav
                aria-label="Các mục vận hành khách"
                className="flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2"
              >
                {(
                  [
                    ['delivery', 'Đầu vào, Tiến độ & Bàn giao'],
                    ['bookings', 'Lịch hẹn'],
                    ['conversation', 'Trao đổi'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={tab === id}
                    onClick={() => setTab(id)}
                    className={`min-h-12 shrink-0 rounded-xl px-4 text-sm font-semibold ${tab === id ? 'bg-green-50 text-green-950' : 'text-brk-muted'}`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <div hidden={tab !== 'delivery'}>
                <OfferingDeliveryEditor
                  key={selected}
                  slug={slug}
                  embedded
                  selectedUserId={selected}
                  onDirtyChange={markDirty}
                />
              </div>
              {tab === 'bookings' && (
                <section className="space-y-4 rounded-2xl border bg-white p-5">
                  <h3 className="text-xl font-bold">Lịch hẹn của khách #{selected}</h3>
                  <p className="text-sm text-brk-muted">
                    Hiển thị tối đa 20 lịch gần nhất. Mở quản lý lịch hẹn để xem đầy đủ.
                  </p>
                  {!current ? (
                    <p role="status">Đang tải…</p>
                  ) : current.error ? (
                    <p role="alert">{current.error}</p>
                  ) : data?.bookings.length ? (
                    <ul className="divide-y">
                      {data.bookings.map((booking) => (
                        <li key={booking.id} className="py-4">
                          <strong>{booking.session.title}</strong>
                          <p className="mt-2 text-sm text-brk-muted">
                            {date(booking.startsAt)} · {bookingLabels[booking.status] || booking.status}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Chưa có lịch hẹn.</p>
                  )}
                  <Link
                    href="/tools/dat-lich"
                    className="inline-flex min-h-11 items-center font-semibold text-brk-primary"
                  >
                    Mở quản lý lịch hẹn →
                  </Link>
                </section>
              )}
              {tab === 'conversation' && (
                <section className="space-y-4 rounded-2xl border bg-white p-5">
                  <h3 className="text-xl font-bold">Trao đổi của khách #{selected}</h3>
                  <p className="text-sm text-brk-muted">
                    Hiển thị tối đa 20 yêu cầu gần nhất; lịch sử đầy đủ của từng yêu cầu được giữ trong CRM.
                  </p>
                  {notice && (
                    <p role="status" className="rounded-xl bg-green-50 p-3 text-green-950">
                      {notice}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setRetry((value) => value + 1)}
                    className="min-h-11 font-semibold text-brk-primary"
                  >
                    Tải lại trao đổi
                  </button>
                  {!current ? (
                    <p role="status">Đang tải…</p>
                  ) : current.error ? (
                    <p role="alert">{current.error}</p>
                  ) : data?.requests.length ? (
                    data.requests.map((request) => (
                      <article key={request.id} className="space-y-3 rounded-xl border p-4">
                        <p className="whitespace-pre-wrap break-words">{request.content}</p>
                        {request.thread?.length
                          ? request.thread.map((entry, index) => (
                              <div
                                key={index}
                                className={
                                  entry.action === 'SEND_REPLY'
                                    ? 'rounded-xl bg-green-50 p-3'
                                    : 'rounded-xl bg-stone-50 p-3'
                                }
                              >
                                <p className="text-xs font-semibold text-brk-muted">
                                  {entry.action === 'SEND_REPLY' ? 'Người phụ trách' : 'Khách hàng'} ·{' '}
                                  {date(entry.changedAt)}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap break-words">{entry.content}</p>
                              </div>
                            ))
                          : request.publicReply && (
                              <p className="whitespace-pre-wrap rounded-xl bg-green-50 p-3">
                                {request.publicReply}
                              </p>
                            )}
                        <p className="text-sm text-brk-muted">
                          {REQUEST_STATUSES[request.status as keyof typeof REQUEST_STATUSES] ||
                            request.status}{' '}
                          · {date(request.updatedAt)}
                        </p>
                        <OfferingServiceReply
                          key={request.id + ':' + request.version}
                          id={request.id}
                          version={request.version}
                          value={replies[request.id] || ''}
                          onChange={(value) =>
                            setReplies((previous) => ({ ...previous, [request.id]: value }))
                          }
                          onSaved={() => {
                            setNotice('Đã gửi phản hồi cho khách.')
                            setRetry((value) => value + 1)
                          }}
                        />
                      </article>
                    ))
                  ) : (
                    <p>Chưa có trao đổi gắn với dịch vụ này.</p>
                  )}
                  <Link
                    href={`/tools/crm/course/${courseId}`}
                    className="inline-flex min-h-11 items-center font-semibold text-brk-primary"
                  >
                    Mở CRM chi tiết →
                  </Link>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
