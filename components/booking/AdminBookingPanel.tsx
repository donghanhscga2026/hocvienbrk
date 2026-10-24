'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatMin, type FormField } from '@/lib/booking/slots'
import {
  changeBookingStatus,
  removeBookingException,
  saveBookingAvailability,
  saveBookingException,
  saveBookingSession,
} from '@/app/actions/booking-actions'

export interface SessionRow {
  id: number
  code: string
  expertId: number
  expertName: string
  courseId: number | null
  title: string
  description: string
  coverUrl: string | null
  durationMin: number
  mode: string
  meetingUrl: string | null
  isPrivate: boolean
  autoConfirm: boolean
  cancelBeforeHours: number
  minNoticeHours: number
  maxDaysAhead: number
  bufferMin: number
  status: string
  formFields: FormField[]
}

export interface BookingRow {
  id: number
  code: string
  guestName: string
  guestEmail: string
  guestPhone: string | null
  startsAt: string
  endsAt: string
  status: string
  sessionTitle: string
  expertName: string
  source: string | null
}

export interface ExceptionRow {
  id: number
  dateVN: string
  isOff: boolean
  startMin: number | null
  endMin: number | null
  note: string
}

interface AdminBookingPanelProps {
  meId: number
  role: string
  origin: string
  courses: { id: number; name: string }[]
  initialSessions: SessionRow[]
  initialRules: { weekday: number; startMin: number; endMin: number }[]
  initialExceptions: ExceptionRow[]
  bookings: BookingRow[]
}

const STATUS_LABELS: Record<string, string> = {
  HELD: 'Đang giữ chỗ',
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Đã hoàn thành',
  NO_SHOW: 'Vắng mặt',
}

const WEEKDAY_NAMES = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']

function timeToMin(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function blankSession(): SessionRow {
  return {
    id: 0,
    code: '',
    expertId: 0,
    expertName: '',
    courseId: null,
    title: '',
    description: '',
    coverUrl: '',
    durationMin: 30,
    mode: 'ZOOM',
    meetingUrl: '',
    isPrivate: true,
    autoConfirm: true,
    cancelBeforeHours: 3,
    minNoticeHours: 2,
    maxDaysAhead: 30,
    bufferMin: 0,
    status: 'ACTIVE',
    formFields: [],
  }
}

export default function AdminBookingPanel(props: AdminBookingPanelProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'sessions' | 'availability' | 'bookings'>('sessions')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [editing, setEditing] = useState<SessionRow | null>(null)
  const [rules, setRules] = useState(props.initialRules)
  const [excDate, setExcDate] = useState('')
  const [excIsOff, setExcIsOff] = useState(true)
  const [excStart, setExcStart] = useState('09:00')
  const [excEnd, setExcEnd] = useState('11:00')
  const [excNote, setExcNote] = useState('')

  const inputCls = 'w-full min-h-11 rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900'
  const smallInput = 'min-h-10 rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900'
  const primaryBtn = 'min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50'
  const ghostBtn = 'min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-700'

  const flash = (ok: boolean, text: string) => {
    if (ok) { setMessage(text); setError('') } else { setError(text); setMessage('') }
  }

  async function submitSession() {
    if (!editing) return
    setBusy(true)
    try {
      const result = await saveBookingSession({
        id: editing.id || undefined,
        data: {
          code: editing.id ? undefined : editing.code || undefined,
          title: editing.title,
          description: editing.description,
          coverUrl: editing.coverUrl || null,
          durationMin: editing.durationMin,
          mode: editing.mode as 'ZOOM' | 'MEET' | 'OFFLINE',
          meetingUrl: editing.meetingUrl || null,
          courseId: editing.courseId,
          isPrivate: editing.isPrivate,
          autoConfirm: editing.autoConfirm,
          cancelBeforeHours: editing.cancelBeforeHours,
          minNoticeHours: editing.minNoticeHours,
          maxDaysAhead: editing.maxDaysAhead,
          bufferMin: editing.bufferMin,
          formFields: editing.formFields,
          status: editing.status as 'ACTIVE' | 'PAUSED',
        },
      })
      if (!result.ok) { flash(false, result.error || 'Không lưu được phiên hẹn.'); return }
      flash(true, editing.id ? 'Đã cập nhật phiên hẹn.' : `Đã tạo phiên hẹn — mã: ${result.code}`)
      setEditing(null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function submitAvailability() {
    setBusy(true)
    try {
      const result = await saveBookingAvailability({ rules })
      if (!result.ok) { flash(false, result.error || 'Không lưu được lịch rảnh.'); return }
      flash(true, 'Đã lưu lịch rảnh theo tuần.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function submitException() {
    if (!excDate) { flash(false, 'Vui lòng chọn ngày ngoại lệ.'); return }
    setBusy(true)
    try {
      const result = await saveBookingException({
        dateVN: excDate,
        isOff: excIsOff,
        startMin: excIsOff ? null : timeToMin(excStart),
        endMin: excIsOff ? null : timeToMin(excEnd),
        note: excNote,
      })
      if (!result.ok) { flash(false, result.error || 'Không lưu được ngày ngoại lệ.'); return }
      flash(true, 'Đã lưu ngày ngoại lệ.')
      setExcDate(''); setExcNote('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function onStatus(bookingId: number, next: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW') {
    setBusy(true)
    try {
      const result = await changeBookingStatus({ bookingId, next })
      if (!result.ok) { flash(false, result.error || 'Không đổi được trạng thái.'); return }
      flash(true, 'Đã cập nhật trạng thái lịch hẹn.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const bookingTime = useMemo(
    () => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Saigon', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
    [],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([
          { id: 'sessions', label: 'Phiên hẹn' },
          { id: 'availability', label: 'Lịch rảnh & ngày nghỉ' },
          { id: 'bookings', label: `Lịch đã đặt (${props.bookings.length})` },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`min-h-11 rounded-lg px-4 text-sm font-medium ${tab === item.id ? 'bg-emerald-700 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {tab === 'sessions' && (
        <div className="space-y-4">
          {!editing && (
            <>
              <div className="flex justify-end">
                <button type="button" className={primaryBtn} onClick={() => setEditing(blankSession())}>+ Tạo phiên hẹn mới</button>
              </div>
              {props.initialSessions.length === 0 && (
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  Chưa có phiên hẹn nào. Tạo phiên đầu tiên để lấy link gửi cho khách.
                </p>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {props.initialSessions.map((s) => (
                  <article key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-800">{s.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.status === 'ACTIVE' ? 'Đang mở' : 'Tạm dừng'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {s.durationMin} phút · {s.autoConfirm ? 'Tự động xác nhận' : 'Duyệt tay'} · Chuyên gia: {s.expertName}
                    </p>
                    <p className="mt-2 break-all rounded bg-slate-50 p-2 font-mono text-xs text-slate-600">
                      {props.origin}/dat-lich/{s.code}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" className={ghostBtn} onClick={() => setEditing({ ...s })}>Sửa</button>
                      <button
                        type="button"
                        className={ghostBtn}
                        onClick={() => { navigator.clipboard?.writeText(`${props.origin}/dat-lich/${s.code}`).catch(() => {}); flash(true, 'Đã sao chép link đặt lịch.') }}
                      >
                        Sao chép link
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {editing && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 font-semibold text-slate-800">{editing.id ? 'Sửa phiên hẹn' : 'Tạo phiên hẹn mới'}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm md:col-span-2">Tiêu đề phiên *
                  <input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Ví dụ: Cố vấn 1:1 — rà soát kênh bán hàng" />
                </label>
                {!editing.id && (
                  <label className="block text-sm">Mã phiên trong link (để trống = tự sinh)
                    <input className={inputCls} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="Ví dụ: COVAN-K01" />
                  </label>
                )}
                <label className="block text-sm">Thời lượng (phút)
                  <select className={inputCls} value={editing.durationMin} onChange={(e) => setEditing({ ...editing, durationMin: Number(e.target.value) })}>
                    {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} phút</option>)}
                  </select>
                </label>
                <label className="block text-sm">Hình thức
                  <select className={inputCls} value={editing.mode} onChange={(e) => setEditing({ ...editing, mode: e.target.value })}>
                    <option value="ZOOM">Zoom Meeting</option>
                    <option value="MEET">Google Meet</option>
                    <option value="OFFLINE">Gặp trực tiếp</option>
                  </select>
                </label>
                <label className="block text-sm">Link phòng họp (Zoom/Meet cố định)
                  <input className={inputCls} value={editing.meetingUrl || ''} onChange={(e) => setEditing({ ...editing, meetingUrl: e.target.value })} placeholder="https://zoom.us/j/..." />
                </label>
                <label className="block text-sm md:col-span-2">Ảnh bìa (link ảnh)
                  <input className={inputCls} value={editing.coverUrl || ''} onChange={(e) => setEditing({ ...editing, coverUrl: e.target.value })} placeholder="https://..." />
                </label>
                <label className="block text-sm md:col-span-2">Mô tả phiên
                  <textarea className={inputCls} rows={4} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </label>
                <label className="block text-sm">Gắn với khóa học (không bắt buộc)
                  <select className={inputCls} value={editing.courseId ?? ''} onChange={(e) => setEditing({ ...editing, courseId: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">— Không gắn —</option>
                    {props.courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm">Trạng thái
                  <select className={inputCls} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                    <option value="ACTIVE">Đang mở đặt lịch</option>
                    <option value="PAUSED">Tạm dừng</option>
                  </select>
                </label>
                <label className="block text-sm">Đặt trước tối thiểu (giờ)
                  <input className={inputCls} type="number" min={0} max={168} value={editing.minNoticeHours} onChange={(e) => setEditing({ ...editing, minNoticeHours: Number(e.target.value) })} />
                </label>
                <label className="block text-sm">Mở lịch tối đa (ngày tới)
                  <input className={inputCls} type="number" min={1} max={180} value={editing.maxDaysAhead} onChange={(e) => setEditing({ ...editing, maxDaysAhead: Number(e.target.value) })} />
                </label>
                <label className="block text-sm">Thời gian đệm giữa các buổi (phút)
                  <input className={inputCls} type="number" min={0} max={120} value={editing.bufferMin} onChange={(e) => setEditing({ ...editing, bufferMin: Number(e.target.value) })} />
                </label>
                <label className="block text-sm">Được hủy trước (giờ) — dùng cho giai đoạn tự phục vụ
                  <input className={inputCls} type="number" min={0} max={168} value={editing.cancelBeforeHours} onChange={(e) => setEditing({ ...editing, cancelBeforeHours: Number(e.target.value) })} />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.autoConfirm} onChange={(e) => setEditing({ ...editing, autoConfirm: e.target.checked })} />
                  Tự động xác nhận khi khách đặt
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.isPrivate} onChange={(e) => setEditing({ ...editing, isPrivate: e.target.checked })} />
                  Phiên riêng tư (chỉ đặt qua link có mã)
                </label>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">Câu hỏi biểu mẫu cho khách (bước 3)</h4>
                  <button
                    type="button"
                    className="text-sm font-medium text-emerald-800"
                    onClick={() => setEditing({ ...editing, formFields: [...editing.formFields, { key: `cau_hoi_${editing.formFields.length + 1}`, label: '', type: 'text', required: false, options: [] }] })}
                  >
                    + Thêm câu hỏi
                  </button>
                </div>
                <div className="space-y-2">
                  {editing.formFields.map((field, idx) => (
                    <div key={idx} className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-4">
                      <input className={smallInput} placeholder="Nội dung câu hỏi" value={field.label} onChange={(e) => {
                        const next = [...editing.formFields]; next[idx] = { ...field, label: e.target.value }; setEditing({ ...editing, formFields: next })
                      }} />
                      <input className={smallInput} placeholder="Mã câu hỏi (key)" value={field.key} onChange={(e) => {
                        const next = [...editing.formFields]; next[idx] = { ...field, key: e.target.value }; setEditing({ ...editing, formFields: next })
                      }} />
                      <select className={smallInput} value={field.type} onChange={(e) => {
                        const next = [...editing.formFields]; next[idx] = { ...field, type: e.target.value as FormField['type'] }; setEditing({ ...editing, formFields: next })
                      }}>
                        <option value="text">Trả lời ngắn</option>
                        <option value="textarea">Trả lời dài</option>
                        <option value="select">Lựa chọn</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={field.required} onChange={(e) => {
                            const next = [...editing.formFields]; next[idx] = { ...field, required: e.target.checked }; setEditing({ ...editing, formFields: next })
                          }} /> Bắt buộc
                        </label>
                        <button type="button" className="text-xs text-red-600" onClick={() => setEditing({ ...editing, formFields: editing.formFields.filter((_, i) => i !== idx) })}>Xóa</button>
                      </div>
                      {field.type === 'select' && (
                        <input className={`${smallInput} md:col-span-4`} placeholder="Các lựa chọn, ngăn cách bằng dấu phẩy" value={field.options.join(', ')} onChange={(e) => {
                          const next = [...editing.formFields]; next[idx] = { ...field, options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) }; setEditing({ ...editing, formFields: next })
                        }} />
                      )}
                    </div>
                  ))}
                  {editing.formFields.length === 0 && <p className="text-xs text-slate-400">Chưa có câu hỏi nào — khách sẽ bỏ qua bước biểu mẫu.</p>}
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button type="button" className={ghostBtn} onClick={() => setEditing(null)}>Hủy</button>
                <button type="button" className={primaryBtn} disabled={busy || !editing.title.trim()} onClick={submitSession}>
                  {busy ? 'Đang lưu…' : editing.id ? 'Lưu thay đổi' : 'Tạo phiên hẹn'}
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {tab === 'availability' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-800">Lịch rảnh lặp theo tuần của bạn</h3>
            <p className="mt-1 text-sm text-slate-500">Hệ thống tự sinh khung giờ cho khách từ lịch này, theo đúng thời lượng từng phiên. Giờ tính theo giờ Việt Nam.</p>
            <div className="mt-4 space-y-3">
              {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
                const dayRules = rules.map((r, i) => ({ ...r, index: i })).filter((r) => r.weekday === weekday)
                return (
                  <div key={weekday} className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-24 text-sm font-medium text-slate-700">{WEEKDAY_NAMES[weekday]}</span>
                    {dayRules.length === 0 && <span className="text-sm text-slate-400">Nghỉ</span>}
                    {dayRules.map((rule) => (
                      <span key={rule.index} className="flex items-center gap-1">
                        <input type="time" className={smallInput} value={formatMin(rule.startMin)} onChange={(e) => {
                          const next = [...rules]; next[rule.index] = { ...rule, startMin: timeToMin(e.target.value) }; setRules(next)
                        }} />
                        <span className="text-slate-400">–</span>
                        <input type="time" className={smallInput} value={formatMin(rule.endMin)} onChange={(e) => {
                          const next = [...rules]; next[rule.index] = { ...rule, endMin: timeToMin(e.target.value) }; setRules(next)
                        }} />
                        <button type="button" className="px-1 text-red-600" onClick={() => setRules(rules.filter((_, i) => i !== rule.index))}>×</button>
                      </span>
                    ))}
                    <button
                      type="button"
                      className="text-sm font-medium text-emerald-800"
                      onClick={() => setRules([...rules, { weekday, startMin: 9 * 60, endMin: 11 * 60 }])}
                    >
                      + Thêm khung giờ
                    </button>
                  </div>
                )
              })}
            </div>
            <button type="button" className={`${primaryBtn} mt-4`} disabled={busy} onClick={submitAvailability}>
              {busy ? 'Đang lưu…' : 'Lưu lịch rảnh'}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-800">Ngày ngoại lệ</h3>
            <p className="mt-1 text-sm text-slate-500">Nghỉ một ngày cụ thể, hoặc mở một khung giờ riêng khác lịch tuần.</p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-sm">Ngày
                <input type="date" className={inputCls} value={excDate} onChange={(e) => setExcDate(e.target.value)} />
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" checked={excIsOff} onChange={(e) => setExcIsOff(e.target.checked)} /> Nghỉ cả ngày
              </label>
              {!excIsOff && (
                <>
                  <label className="text-sm">Từ
                    <input type="time" className={inputCls} value={excStart} onChange={(e) => setExcStart(e.target.value)} />
                  </label>
                  <label className="text-sm">Đến
                    <input type="time" className={inputCls} value={excEnd} onChange={(e) => setExcEnd(e.target.value)} />
                  </label>
                </>
              )}
              <label className="min-w-40 flex-1 text-sm">Ghi chú
                <input className={inputCls} value={excNote} onChange={(e) => setExcNote(e.target.value)} placeholder="Ví dụ: đi công tác" />
              </label>
              <button type="button" className={primaryBtn} disabled={busy} onClick={submitException}>Lưu ngoại lệ</button>
            </div>
            <ul className="mt-4 divide-y divide-slate-100">
              {props.initialExceptions.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <b>{ex.dateVN}</b> — {ex.isOff ? 'Nghỉ cả ngày' : `Mở riêng ${ex.startMin != null ? formatMin(ex.startMin) : ''}–${ex.endMin != null ? formatMin(ex.endMin) : ''}`}
                    {ex.note ? ` · ${ex.note}` : ''}
                  </span>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={async () => {
                      const result = await removeBookingException({ dateVN: ex.dateVN })
                      if (result.ok) { flash(true, 'Đã xóa ngày ngoại lệ.'); router.refresh() } else flash(false, result.error || 'Không xóa được.')
                    }}
                  >
                    Xóa
                  </button>
                </li>
              ))}
              {props.initialExceptions.length === 0 && <li className="py-2 text-sm text-slate-400">Chưa có ngày ngoại lệ nào sắp tới.</li>}
            </ul>
          </section>
        </div>
      )}

      {tab === 'bookings' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-slate-800">Lịch đã đặt (30 ngày từ hôm nay)</h3>
          {props.bookings.length === 0 && <p className="text-sm text-slate-400">Chưa có lịch hẹn nào trong khoảng này.</p>}
          <div className="divide-y divide-slate-100">
            {props.bookings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-52">
                  <p className="text-sm font-semibold text-slate-800">{bookingTime.format(new Date(b.startsAt))}</p>
                  <p className="text-xs text-slate-500">{b.sessionTitle} · {b.expertName}</p>
                </div>
                <div className="min-w-52 flex-1">
                  <p className="text-sm text-slate-800">{b.guestName} — {b.guestEmail}{b.guestPhone ? ` — ${b.guestPhone}` : ''}</p>
                  <p className="text-xs text-slate-400">Mã: {b.code}{b.source ? ` · Nguồn: ${b.source}` : ''}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${b.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' : b.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_LABELS[b.status] || b.status}
                </span>
                <div className="flex gap-1">
                  {b.status === 'PENDING' && (
                    <button type="button" className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white" disabled={busy} onClick={() => onStatus(b.id, 'CONFIRMED')}>Xác nhận</button>
                  )}
                  {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" disabled={busy} onClick={() => onStatus(b.id, 'CANCELLED')}>Hủy</button>
                  )}
                  {b.status === 'CONFIRMED' && (
                    <>
                      <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" disabled={busy} onClick={() => onStatus(b.id, 'COMPLETED')}>Hoàn thành</button>
                      <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" disabled={busy} onClick={() => onStatus(b.id, 'NO_SHOW')}>Vắng mặt</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
