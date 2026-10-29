'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MemberOfferProps {
  bookingCode: string
  email: string
  phone: string
  /** Người đặt đang đăng nhập bằng tài khoản thành viên. */
  isMemberViewer: boolean
  /** Hồ sơ thành viên đã có số điện thoại hay chưa. */
  memberHasPhone: boolean
}

/**
 * Khối gợi ý sau khi đặt lịch thành công:
 * - Khách (chưa đăng nhập): gợi ý tạo tài khoản bằng đúng thông tin vừa điền;
 *   email đã là thành viên thì đổi thành gợi ý đăng nhập.
 * - Thành viên chưa có SĐT trong hồ sơ: gợi ý lưu số vừa dùng vào hồ sơ.
 */
export default function MemberOffer({ bookingCode, email, phone, isMemberViewer, memberHasPhone }: MemberOfferProps) {
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Nhánh khách: cần biết email đã là thành viên chưa mới chọn nội dung hiển thị.
  const [emailIsMember, setEmailIsMember] = useState<boolean | null>(null)
  const [registered, setRegistered] = useState<{ phoneSkipped: boolean } | null>(null)

  useEffect(() => {
    if (isMemberViewer) return
    let cancelled = false
    fetch('/api/booking/member-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: bookingCode, email }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!cancelled) setEmailIsMember(res.ok ? !!data.isMember : false)
      })
      .catch(() => { if (!cancelled) setEmailIsMember(false) })
    return () => { cancelled = true }
  }, [isMemberViewer, bookingCode, email])

  // Nhánh thành viên: trạng thái lưu SĐT.
  const [phoneSaved, setPhoneSaved] = useState<'saved' | 'taken' | null>(null)

  if (dismissed) return null

  const cardCls = 'mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left'
  const primaryBtn = 'min-h-11 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white disabled:opacity-50'
  const ghostBtn = 'min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-700'

  if (isMemberViewer) {
    if (memberHasPhone || !phone.trim() || phoneSaved === 'saved') return null
    if (phoneSaved === 'taken') {
      return (
        <div className={cardCls}>
          <p className="text-sm text-slate-600">Số điện thoại này đang thuộc một tài khoản khác nên chưa lưu được vào hồ sơ của bạn. Bạn có thể cập nhật số khác trong trang tài khoản.</p>
        </div>
      )
    }
    return (
      <div className={cardCls}>
        <h3 className="font-semibold text-slate-900">Lưu số điện thoại vào hồ sơ của bạn?</h3>
        <p className="mt-1 text-sm text-slate-600">
          Hồ sơ của bạn chưa có số điện thoại. Lưu số {phone} vừa dùng để lần sau đặt lịch hệ thống tự điền sẵn.
        </p>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryBtn}
            disabled={busy}
            onClick={async () => {
              setBusy(true); setError('')
              try {
                const res = await fetch('/api/booking/save-phone', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ phone }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Không lưu được số điện thoại.')
                if (data.saved) setPhoneSaved('saved')
                else if (data.reason === 'PHONE_TAKEN') setPhoneSaved('taken')
                else setDismissed(true)
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Đã có lỗi xảy ra.')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Đang lưu…' : 'Lưu số điện thoại'}
          </button>
          <button type="button" className={ghostBtn} onClick={() => setDismissed(true)}>Để sau</button>
        </div>
      </div>
    )
  }

  // Khách chưa đăng nhập.
  if (emailIsMember === null) return null

  if (registered) {
    return (
      <div className={cardCls}>
        <h3 className="font-semibold text-slate-900">Đã tạo tài khoản thành viên cho bạn</h3>
        <p className="mt-1 text-sm text-slate-600">
          Hãy kiểm tra email <b>{email}</b> để đặt mật khẩu và đăng nhập. Mọi lịch hẹn đặt bằng email này
          (gồm lịch vừa rồi) đã được gắn vào tài khoản — xem tại mục Lịch hẹn của tôi sau khi đăng nhập.
          {registered.phoneSkipped && ' Lưu ý: số điện thoại chưa được lưu vào hồ sơ vì đang thuộc một tài khoản khác.'}
        </p>
      </div>
    )
  }

  if (emailIsMember) {
    return (
      <div className={cardCls}>
        <h3 className="font-semibold text-slate-900">Email này đã có tài khoản thành viên</h3>
        <p className="mt-1 text-sm text-slate-600">
          Lần sau, bạn hãy <Link className="font-semibold text-emerald-800 underline" href="/login">đăng nhập</Link> trước khi đặt lịch
          để hệ thống tự điền thông tin và quản lý mọi lịch hẹn tại mục Lịch hẹn của tôi.
        </p>
      </div>
    )
  }

  return (
    <div className={cardCls}>
      <h3 className="font-semibold text-slate-900">Tạo tài khoản thành viên miễn phí?</h3>
      <p className="mt-1 text-sm text-slate-600">
        Dùng đúng họ tên, email và số điện thoại bạn vừa điền để tạo tài khoản. Lần sau đặt lịch hệ thống sẽ tự
        điền thông tin, và bạn xem, đổi giờ hoặc hủy mọi lịch hẹn tại mục Lịch hẹn của tôi.
      </p>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryBtn}
          disabled={busy}
          onClick={async () => {
            setBusy(true); setError('')
            try {
              const res = await fetch('/api/booking/register-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: bookingCode, email }),
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error || 'Không tạo được tài khoản.')
              if (data.alreadyMember) setEmailIsMember(true)
              else setRegistered({ phoneSkipped: !!data.phoneSkipped })
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Đã có lỗi xảy ra.')
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Đang tạo tài khoản…' : 'Tạo tài khoản cho tôi'}
        </button>
        <button type="button" className={ghostBtn} onClick={() => setDismissed(true)}>Để sau</button>
      </div>
    </div>
  )
}
