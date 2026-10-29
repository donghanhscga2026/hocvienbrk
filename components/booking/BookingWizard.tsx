'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDaysVN, formatMin, vnDateString, type DaySlot } from '@/lib/booking/slots'
import type { PublicSession } from '@/lib/booking/service'
import MemberOffer from '@/components/booking/MemberOffer'

interface BookingWizardProps {
  session: PublicSession
  source: string
  tags: string
  prefill: { name: string; email: string; phone: string }
  viewer: { isMember: boolean; hasPhone: boolean }
}

const MODE_LABELS: Record<string, string> = {
  ZOOM: 'Zoom Meeting',
  MEET: 'Google Meet',
  OFFLINE: 'Gặp trực tiếp',
}

const PERIOD_LABELS = { SANG: 'Sáng', CHIEU: 'Chiều', TOI: 'Tối' } as const
type Period = keyof typeof PERIOD_LABELS

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function monthCells(year: number, month: number): (string | null)[] {
  const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  return cells
}

function formatVnLong(dateVN: string): string {
  const [y, m, d] = dateVN.split('-').map(Number)
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Saigon',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)))
}

export default function BookingWizard({ session, source, tags, prefill, viewer }: BookingWizardProps) {
  const todayVN = useMemo(() => vnDateString(new Date()), [])
  const maxDateVN = useMemo(() => addDaysVN(todayVN, session.maxDaysAhead), [todayVN, session.maxDaysAhead])

  const [step, setStep] = useState(1)
  const [viewYear, setViewYear] = useState(() => Number(todayVN.slice(0, 4)))
  const [viewMonth, setViewMonth] = useState(() => Number(todayVN.slice(5, 7)))
  const [selectedDate, setSelectedDate] = useState(todayVN)
  const [slots, setSlots] = useState<DaySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsRefresh, setSlotsRefresh] = useState(0)
  const [period, setPeriod] = useState<'ALL' | Period>('ALL')
  const [selectedSlot, setSelectedSlot] = useState<DaySlot | null>(null)

  const [hold, setHold] = useState<{ bookingCode: string; holdExpiresAt: string | null } | null>(null)
  const [holdLeftSec, setHoldLeftSec] = useState<number | null>(null)

  const [name, setName] = useState(prefill.name)
  const [email, setEmail] = useState(prefill.email)
  const [phone, setPhone] = useState(prefill.phone)
  const [website, setWebsite] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ bookingCode: string; status: string; meetingUrl: string | null } | null>(null)

  // Danh sách chờ (Giai đoạn 2): hiện khi ngày đã kín lịch
  const [wlName, setWlName] = useState(prefill.name)
  const [wlEmail, setWlEmail] = useState(prefill.email)
  const [wlPhone, setWlPhone] = useState('')
  const [wlNote, setWlNote] = useState('')
  const [wlWebsite, setWlWebsite] = useState('')
  const [wlBusy, setWlBusy] = useState(false)
  const [wlMsg, setWlMsg] = useState('')
  const [wlError, setWlError] = useState('')

  // Tải khung giờ mỗi khi đổi ngày
  useEffect(() => {
    let cancelled = false
    setLoadingSlots(true)
    setSelectedSlot(null)
    fetch(`/api/booking/sessions/${encodeURIComponent(session.code)}/slots?date=${selectedDate}`)
      .then(async (res) => {
        const data = await res.json()
        if (!cancelled) setSlots(Array.isArray(data.slots) ? data.slots : [])
      })
      .catch(() => { if (!cancelled) setSlots([]) })
      .finally(() => { if (!cancelled) setLoadingSlots(false) })
    return () => { cancelled = true }
  }, [session.code, selectedDate, slotsRefresh])

  // Đếm ngược giữ chỗ
  useEffect(() => {
    if (!hold?.holdExpiresAt) { setHoldLeftSec(null); return }
    const tick = () => setHoldLeftSec(Math.max(0, Math.round((new Date(hold.holdExpiresAt as string).getTime() - Date.now()) / 1000)))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [hold])

  const cells = useMemo(() => monthCells(viewYear, viewMonth), [viewYear, viewMonth])
  const canPrevMonth = viewYear > Number(todayVN.slice(0, 4)) || viewMonth > Number(todayVN.slice(5, 7))
  const canNextMonth = `${viewYear}-${String(viewMonth).padStart(2, '0')}` < maxDateVN.slice(0, 7)

  const moveMonth = (delta: number) => {
    const next = new Date(Date.UTC(viewYear, viewMonth - 1 + delta, 1))
    setViewYear(next.getUTCFullYear())
    setViewMonth(next.getUTCMonth() + 1)
  }

  const visibleSlots = period === 'ALL' ? slots : slots.filter((s) => s.period === period)
  const countByPeriod = (p: Period) => slots.filter((s) => s.period === p && s.available).length
  const availableCount = slots.filter((s) => s.available).length

  const inputCls = 'w-full min-h-11 rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900'
  const primaryBtn = 'min-h-11 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white disabled:opacity-50'
  const ghostBtn = 'min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-700'

  async function doHold() {
    if (!selectedSlot) return
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/booking/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: session.code, dateVN: selectedDate, startMin: selectedSlot.startMin, source, tags }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không giữ được khung giờ này.')
      setHold({ bookingCode: data.bookingCode, holdExpiresAt: data.holdExpiresAt })
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đã có lỗi xảy ra.')
      // Tải lại slot để khách chọn giờ khác
      setSlotsRefresh((n) => n + 1)
    } finally {
      setBusy(false)
    }
  }

  async function doJoinWaitlist() {
    setWlBusy(true); setWlError(''); setWlMsg('')
    try {
      const res = await fetch('/api/booking/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: session.code, dateVN: selectedDate, name: wlName, email: wlEmail, phone: wlPhone, note: wlNote, website: wlWebsite }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không đăng ký chờ được.')
      setWlMsg(data.alreadyRegistered
        ? 'Bạn đã có tên trong danh sách chờ của ngày này rồi. Hệ thống sẽ gửi email ngay khi có khung giờ trống.'
        : 'Đã ghi danh sách chờ. Khi ngày này có khung giờ trống, hệ thống sẽ gửi email mời bạn đặt lịch ngay.')
    } catch (e) {
      setWlError(e instanceof Error ? e.message : 'Đã có lỗi xảy ra.')
    } finally {
      setWlBusy(false)
    }
  }

  async function doConfirm() {
    if (!hold) return
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/booking/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingCode: hold.bookingCode, name, email, phone, answers, website }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không xác nhận được lịch hẹn.')
      setDone({
        bookingCode: data.bookingCode || hold.bookingCode,
        status: data.status || 'CONFIRMED',
        meetingUrl: data.meetingUrl || null,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đã có lỗi xảy ra.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
        <h1 className="text-xl font-bold text-slate-900">
          {done.status === 'CONFIRMED' ? 'Đặt lịch thành công' : 'Đã ghi nhận đăng ký của bạn'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {selectedSlot && selectedDate
            ? `${session.title} — ${formatVnLong(selectedDate)}, ${formatMin(selectedSlot.startMin)}–${formatMin(selectedSlot.endMin)} (giờ Việt Nam)`
            : session.title}
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Mã đặt lịch của bạn: <span className="rounded bg-slate-100 px-2 py-1 font-mono text-base font-bold text-slate-900">{done.bookingCode}</span>
        </p>
        {done.status === 'CONFIRMED' ? (
          <p className="mt-2 text-sm text-slate-600">Email xác nhận kèm file lịch (.ics) đã được gửi tới {email}. Vui lòng lưu mã đặt lịch để tra cứu hoặc thay đổi lịch hẹn sau này.</p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Chuyên gia sẽ xác nhận lịch hẹn và thông báo cho bạn qua email {email}. Vui lòng lưu mã đặt lịch để tra cứu sau này.</p>
        )}
        {done.meetingUrl && (
          <p className="mt-3 text-sm">Link buổi gặp: <a className="font-semibold text-emerald-800 underline" href={done.meetingUrl} target="_blank" rel="noreferrer">{done.meetingUrl}</a></p>
        )}
        <MemberOffer
          bookingCode={done.bookingCode}
          email={email}
          phone={phone}
          isMemberViewer={viewer.isMember}
          memberHasPhone={viewer.hasPhone}
        />
      </section>
    )
  }

  const steps = ['Đặt lịch', 'Liên hệ', 'Biểu mẫu', 'Xác nhận']

  return (
    <div className="space-y-4">
      {/* Thẻ phiên hẹn */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {session.coverUrl && <img src={session.coverUrl} alt="" className="h-44 w-full object-cover" />}
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Phiên tư vấn chuyên gia</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{session.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-slate-100 px-2 py-1">⏱ {session.durationMin} phút</span>
            <span className="rounded-full bg-slate-100 px-2 py-1">🎥 {MODE_LABELS[session.mode] || session.mode}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1">Chi phí: {session.price === 0 ? 'Miễn phí' : `${session.price.toLocaleString('vi-VN')}đ`}</span>
            {session.courseName && <span className="rounded-full bg-slate-100 px-2 py-1">Khóa: {session.courseName}</span>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            {session.expert.image
              ? <img src={session.expert.image} alt="" className="h-9 w-9 rounded-full object-cover" />
              : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">{session.expert.name.slice(0, 1)}</span>}
            <div>
              <p className="text-sm font-semibold text-slate-800">{session.expert.name}</p>
              <p className="text-xs text-slate-500">Chuyên gia tư vấn</p>
            </div>
            <a
              href={`/dat-lich/giang-vien/${session.expert.id}?code=${session.code}`}
              className="ml-auto text-xs font-semibold text-emerald-800 underline"
            >
              Hồ sơ giảng viên →
            </a>
          </div>
          {session.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{session.description}</p>}
        </div>
      </section>

      {/* Thanh bước */}
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((label, i) => (
          <li key={label} className={`rounded-lg px-2 py-2 text-center text-xs font-semibold sm:text-sm ${step === i + 1 ? 'bg-emerald-700 text-white' : step > i + 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-400 border border-slate-200'}`}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {hold && step >= 2 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
          Đang giữ khung giờ cho bạn — còn {holdLeftSec != null ? `${Math.floor(holdLeftSec / 60)}:${String(holdLeftSec % 60).padStart(2, '0')}` : '…'} để hoàn tất.
        </p>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {step === 1 && (
        <section className="grid gap-4 md:grid-cols-2">
          {/* Lịch tháng */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Tháng {viewMonth}, {viewYear}</h2>
              <div className="flex gap-1">
                <button type="button" disabled={!canPrevMonth} onClick={() => moveMonth(-1)} className="h-9 w-9 rounded-lg border border-slate-200 disabled:opacity-40">‹</button>
                <button type="button" disabled={!canNextMonth} onClick={() => moveMonth(1)} className="h-9 w-9 rounded-lg border border-slate-200 disabled:opacity-40">›</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
              {WEEKDAY_LABELS.map((d) => <span key={d} className="py-1">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((dateVN, i) => {
                if (!dateVN) return <span key={`x-${i}`} />
                const disabled = dateVN < todayVN || dateVN > maxDateVN
                const isSelected = dateVN === selectedDate
                return (
                  <button
                    key={dateVN}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedDate(dateVN)}
                    className={`h-10 rounded-lg text-sm ${isSelected ? 'bg-emerald-700 font-bold text-white' : disabled ? 'text-slate-300' : 'text-slate-700 hover:bg-emerald-50'}`}
                  >
                    {Number(dateVN.slice(8))}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-slate-400">Chọn ngày trong phạm vi {session.maxDaysAhead} ngày tới. Múi giờ: Việt Nam (Asia/Saigon).</p>
          </div>

          {/* Khung giờ */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Khung giờ trống</h2>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{availableCount} slot khả dụng</span>
            </div>
            <p className="mb-3 text-sm text-slate-500">{formatVnLong(selectedDate)}</p>
            <div className="mb-3 flex flex-wrap gap-1">
              {(['ALL', 'SANG', 'CHIEU', 'TOI'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${period === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {p === 'ALL' ? `Tất cả (${availableCount})` : `${PERIOD_LABELS[p]} (${countByPeriod(p)})`}
                </button>
              ))}
            </div>
            {loadingSlots ? (
              <p className="py-8 text-center text-sm text-slate-400">Đang tải khung giờ…</p>
            ) : visibleSlots.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-slate-700">Không có khung giờ rảnh trong ngày này</p>
                <p className="mt-1 text-xs text-slate-400">Chuyên gia chưa mở lịch hoặc lịch đã kín. Bạn hãy chọn ngày khác.</p>
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-emerald-800 underline"
                  onClick={() => {
                    const next = addDaysVN(selectedDate, 1)
                    if (next <= maxDateVN) {
                      setSelectedDate(next)
                      setViewYear(Number(next.slice(0, 4)))
                      setViewMonth(Number(next.slice(5, 7)))
                    }
                  }}
                >
                  Xem ngày tiếp theo →
                </button>
                {availableCount === 0 && (
                  <div className="mx-auto mt-5 max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
                    <h3 className="text-sm font-semibold text-slate-800">Đăng ký danh sách chờ cho ngày này</h3>
                    <p className="mt-1 text-xs text-slate-500">Nếu có người hủy hoặc đổi lịch, hệ thống sẽ gửi email mời bạn đặt ngay.</p>
                    <div className="mt-3 space-y-2">
                      <input className={inputCls} value={wlName} onChange={(e) => setWlName(e.target.value)} placeholder="Họ và tên *" />
                      <input className={inputCls} type="email" value={wlEmail} onChange={(e) => setWlEmail(e.target.value)} placeholder="Địa chỉ email *" />
                      <input className={inputCls} value={wlPhone} onChange={(e) => setWlPhone(e.target.value)} placeholder="Số điện thoại / Zalo" />
                      <input className={inputCls} value={wlNote} onChange={(e) => setWlNote(e.target.value)} placeholder="Khung giờ mong muốn / ghi chú" />
                      <label hidden aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={wlWebsite} onChange={(e) => setWlWebsite(e.target.value)} /></label>
                    </div>
                    {wlError && <p role="alert" className="mt-2 text-xs text-red-700">{wlError}</p>}
                    {wlMsg ? (
                      <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{wlMsg}</p>
                    ) : (
                      <button type="button" className={`${primaryBtn} mt-3 w-full`} disabled={wlBusy || !wlName.trim() || !wlEmail.trim()} onClick={doJoinWaitlist}>
                        {wlBusy ? 'Đang đăng ký…' : 'Vào danh sách chờ'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {visibleSlots.map((slot) => (
                  <button
                    key={slot.startMin}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg px-2 py-2.5 text-sm ${!slot.available ? 'bg-slate-50 text-slate-300 line-through' : selectedSlot?.startMin === slot.startMin ? 'bg-emerald-700 font-bold text-white' : 'bg-emerald-50 font-medium text-emerald-900 hover:bg-emerald-100'}`}
                  >
                    {formatMin(slot.startMin)}
                  </button>
                ))}
              </div>
            )}
            <button type="button" disabled={!selectedSlot || busy} onClick={doHold} className={`${primaryBtn} mt-4 w-full`}>
              {busy ? 'Đang giữ chỗ…' : selectedSlot ? `Tiếp tục với ${formatMin(selectedSlot.startMin)} →` : 'Chọn một khung giờ để tiếp tục'}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 font-semibold text-slate-800">Thông tin liên hệ</h2>
          <p className="mb-4 text-sm text-slate-500">
            Buổi hẹn: {selectedDate && formatVnLong(selectedDate)} — {selectedSlot && `${formatMin(selectedSlot.startMin)}–${formatMin(selectedSlot.endMin)}`}
          </p>
          <div className="space-y-3">
            <label className="block text-sm">Họ và tên *
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Nguyễn Văn An" />
            </label>
            <label className="block text-sm">Địa chỉ email *
              <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
            </label>
            <label className="block text-sm">Số điện thoại / Zalo
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901 234 567" />
            </label>
            <label hidden aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
          </div>
          <div className="mt-5 flex gap-2">
            <button type="button" className={ghostBtn} onClick={() => setStep(1)}>← Quay lại</button>
            <button
              type="button"
              className={primaryBtn}
              disabled={!name.trim() || !email.trim()}
              onClick={() => { setError(''); setStep(session.formFields.length > 0 ? 3 : 4) }}
            >
              Tiếp tục →
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 font-semibold text-slate-800">Thông tin chuẩn bị cho buổi hẹn</h2>
          <p className="mb-4 text-sm text-slate-500">Chuyên gia sẽ đọc trước để buổi hẹn hiệu quả hơn.</p>
          <div className="space-y-3">
            {session.formFields.map((field) => (
              <label key={field.key} className="block text-sm">{field.label}{field.required ? ' *' : ''}
                {field.type === 'textarea' ? (
                  <textarea className={inputCls} rows={3} value={answers[field.key] || ''} onChange={(e) => setAnswers((a) => ({ ...a, [field.key]: e.target.value }))} />
                ) : field.type === 'select' ? (
                  <select className={inputCls} value={answers[field.key] || ''} onChange={(e) => setAnswers((a) => ({ ...a, [field.key]: e.target.value }))}>
                    <option value="">— Chọn —</option>
                    {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input className={inputCls} value={answers[field.key] || ''} onChange={(e) => setAnswers((a) => ({ ...a, [field.key]: e.target.value }))} />
                )}
              </label>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <button type="button" className={ghostBtn} onClick={() => setStep(2)}>← Quay lại</button>
            <button
              type="button"
              className={primaryBtn}
              disabled={session.formFields.some((f) => f.required && !(answers[f.key] || '').trim())}
              onClick={() => { setError(''); setStep(4) }}
            >
              Tiếp tục →
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-800">Xác nhận lịch hẹn</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Phiên hẹn</dt><dd className="font-medium text-slate-800">{session.title}</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Chuyên gia</dt><dd className="font-medium text-slate-800">{session.expert.name}</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Thời gian</dt><dd className="font-medium text-slate-800">{formatVnLong(selectedDate)}, {selectedSlot && `${formatMin(selectedSlot.startMin)}–${formatMin(selectedSlot.endMin)}`} ({session.durationMin} phút)</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Hình thức</dt><dd className="font-medium text-slate-800">{MODE_LABELS[session.mode] || session.mode}</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Khách hẹn</dt><dd className="font-medium text-slate-800">{name} — {email}{phone ? ` — ${phone}` : ''}</dd></div>
            {session.formFields.filter((f) => (answers[f.key] || '').trim()).map((f) => (
              <div key={f.key} className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">{f.label}</dt><dd className="text-slate-800">{answers[f.key]}</dd></div>
            ))}
          </dl>
          <div className="mt-5 flex gap-2">
            <button type="button" className={ghostBtn} onClick={() => setStep(session.formFields.length > 0 ? 3 : 2)}>← Quay lại</button>
            <button type="button" className={primaryBtn} disabled={busy} onClick={doConfirm}>
              {busy ? 'Đang xác nhận…' : 'Xác nhận đặt lịch'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
