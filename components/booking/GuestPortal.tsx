'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDaysVN, formatMin, vnDateString, type DaySlot } from '@/lib/booking/slots'
import type { GuestBookingView } from '@/lib/booking/service'

const STATUS_LABELS: Record<string, string> = {
  HELD: 'Đang giữ chỗ',
  PENDING: 'Chờ chuyên gia xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Đã hoàn thành',
  NO_SHOW: 'Vắng mặt',
}

const MODE_LABELS: Record<string, string> = {
  ZOOM: 'Zoom Meeting',
  MEET: 'Google Meet',
  OFFLINE: 'Gặp trực tiếp',
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Saigon',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

interface GuestPortalProps {
  initialEmail: string
  initialCode: string
}

export default function GuestPortal({ initialEmail, initialCode }: GuestPortalProps) {
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState(initialCode)
  const [booking, setBooking] = useState<GuestBookingView | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Đổi lịch
  const [showReschedule, setShowReschedule] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [slots, setSlots] = useState<DaySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [newSlot, setNewSlot] = useState<DaySlot | null>(null)

  // Hủy lịch
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const todayVN = useMemo(() => vnDateString(new Date()), [])
  const maxDateVN = booking ? addDaysVN(todayVN, booking.session.maxDaysAhead) : ''

  const lookup = useCallback(async (mail: string, bookingCode: string) => {
    setBusy(true); setError(''); setNotice('')
    try {
      const res = await fetch('/api/booking/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, code: bookingCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không tra cứu được lịch hẹn.')
      setBooking(data as GuestBookingView)
      setShowReschedule(false)
      setShowCancel(false)
    } catch (e) {
      setBooking(null)
      setError(e instanceof Error ? e.message : 'Đã có lỗi xảy ra.')
    } finally {
      setBusy(false)
    }
  }, [])

  // Mở từ link có sẵn email + mã (ví dụ trong email nhắc hẹn) thì tra luôn.
  useEffect(() => {
    if (initialEmail && initialCode) void lookup(initialEmail, initialCode)
    // Chỉ chạy một lần khi mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!showReschedule || !booking || !newDate) return
    let cancelled = false
    setLoadingSlots(true)
    setNewSlot(null)
    fetch(`/api/booking/sessions/${encodeURIComponent(booking.session.code)}/slots?date=${newDate}`)
      .then(async (res) => {
        const data = await res.json()
        if (!cancelled) setSlots(Array.isArray(data.slots) ? data.slots : [])
      })
      .catch(() => { if (!cancelled) setSlots([]) })
      .finally(() => { if (!cancelled) setLoadingSlots(false) })
    return () => { cancelled = true }
  }, [showReschedule, booking, newDate])

  async function doReschedule() {
    if (!booking || !newSlot) return
    setBusy(true); setError(''); setNotice('')
    try {
      const res = await fetch('/api/booking/guest-reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, dateVN: newDate, startMin: newSlot.startMin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không đổi được lịch hẹn.')
      setNotice('Đã đổi lịch hẹn thành công. Email xác nhận giờ mới đã được gửi cho bạn.')
      await lookup(email, code)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đã có lỗi xảy ra.')
    } finally {
      setBusy(false)
    }
  }

  async function doCancel() {
    if (!booking) return
    setBusy(true); setError(''); setNotice('')
    try {
      const res = await fetch('/api/booking/guest-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, reason: cancelReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không hủy được lịch hẹn.')
      setNotice('Đã hủy lịch hẹn. Email xác nhận hủy đã được gửi cho bạn.')
      await lookup(email, code)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đã có lỗi xảy ra.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'w-full min-h-11 rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900'
  const primaryBtn = 'min-h-11 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white disabled:opacity-50'
  const ghostBtn = 'min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-700'
  const dangerBtn = 'min-h-11 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white disabled:opacity-50'

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="text-lg font-bold text-slate-900">Tra cứu lịch hẹn của bạn</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhập email đã dùng khi đặt lịch cùng mã đặt lịch (dạng BK-XXXXXX) trong email xác nhận.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Địa chỉ email *
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </label>
          <label className="block text-sm">Mã đặt lịch *
            <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="BK-XXXXXX" />
          </label>
        </div>
        <button type="button" className={`${primaryBtn} mt-4`} disabled={busy || !email.trim() || !code.trim()} onClick={() => lookup(email, code)}>
          {busy ? 'Đang tra cứu…' : 'Tra cứu lịch hẹn'}
        </button>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {notice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      </section>

      {booking && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold text-slate-900">{booking.session.title}</h2>
              <p className="text-sm text-slate-500">Chuyên gia: {booking.expertName} · {MODE_LABELS[booking.session.mode] || booking.session.mode}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${booking.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : booking.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
              {STATUS_LABELS[booking.status] || booking.status}
            </span>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Thời gian</dt><dd className="font-medium text-slate-800">{formatWhen(booking.startsAt)} ({booking.session.durationMin} phút)</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Khách hẹn</dt><dd className="font-medium text-slate-800">{booking.guestName} — {booking.guestEmail}{booking.guestPhone ? ` — ${booking.guestPhone}` : ''}</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Mã đặt lịch</dt><dd className="font-mono font-bold text-slate-900">{booking.code}</dd></div>
            {booking.session.meetingUrl && (
              <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Link buổi gặp</dt><dd><a className="font-semibold text-emerald-800 underline" href={booking.session.meetingUrl} target="_blank" rel="noreferrer">{booking.session.meetingUrl}</a></dd></div>
            )}
            {booking.status === 'CANCELLED' && booking.cancelReason && (
              <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Lý do hủy</dt><dd className="text-slate-800">{booking.cancelReason}</dd></div>
            )}
          </dl>

          {booking.canModify ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className={primaryBtn} onClick={() => { setShowReschedule((v) => !v); setShowCancel(false); setNewDate(vnDateString(new Date(booking.startsAt))) }}>
                Đổi giờ hẹn
              </button>
              <button type="button" className={ghostBtn} onClick={() => { setShowCancel((v) => !v); setShowReschedule(false) }}>
                Hủy lịch hẹn
              </button>
            </div>
          ) : booking.modifyNote && (booking.status === 'CONFIRMED' || booking.status === 'PENDING') ? (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{booking.modifyNote} Vui lòng liên hệ chuyên gia nếu cần hỗ trợ.</p>
          ) : null}

          {showReschedule && booking.canModify && (
            <div className="mt-5 rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800">Chọn giờ hẹn mới</h3>
              <label className="mt-3 block text-sm">Ngày hẹn mới
                <input className={inputCls} type="date" min={todayVN} max={maxDateVN} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </label>
              {loadingSlots ? (
                <p className="py-4 text-sm text-slate-400">Đang tải khung giờ…</p>
              ) : slots.length === 0 ? (
                <p className="py-4 text-sm text-slate-500">Ngày này không có khung giờ nào. Hãy chọn ngày khác.</p>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot.startMin}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setNewSlot(slot)}
                      className={`rounded-lg px-2 py-2.5 text-sm ${!slot.available ? 'bg-slate-50 text-slate-300 line-through' : newSlot?.startMin === slot.startMin ? 'bg-emerald-700 font-bold text-white' : 'bg-emerald-50 font-medium text-emerald-900 hover:bg-emerald-100'}`}
                    >
                      {formatMin(slot.startMin)}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button type="button" className={ghostBtn} onClick={() => setShowReschedule(false)}>Để sau</button>
                <button type="button" className={primaryBtn} disabled={busy || !newSlot} onClick={doReschedule}>
                  {busy ? 'Đang đổi…' : newSlot ? `Xác nhận đổi sang ${formatMin(newSlot.startMin)}` : 'Chọn một khung giờ'}
                </button>
              </div>
            </div>
          )}

          {showCancel && booking.canModify && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="font-semibold text-red-800">Hủy lịch hẹn này?</h3>
              <p className="mt-1 text-sm text-red-700">Sau khi hủy, khung giờ sẽ được mở lại cho người khác. Bạn có thể đặt lại lịch mới bất cứ lúc nào.</p>
              <label className="mt-3 block text-sm text-red-800">Lý do hủy (không bắt buộc)
                <input className={inputCls} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ví dụ: bận việc đột xuất" />
              </label>
              <div className="mt-4 flex gap-2">
                <button type="button" className={ghostBtn} onClick={() => setShowCancel(false)}>Giữ lịch hẹn</button>
                <button type="button" className={dangerBtn} disabled={busy} onClick={doCancel}>
                  {busy ? 'Đang hủy…' : 'Xác nhận hủy lịch'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
