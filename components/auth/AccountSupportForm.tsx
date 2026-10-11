'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { LifeBuoy } from 'lucide-react'

export default function AccountSupportForm({ page }: { page: 'login' | 'register' }) {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const key = useRef<string | null>(null)
  const input = 'mt-1 min-h-11 w-full rounded-xl border border-brk-outline bg-white p-3 text-sm text-slate-900'
  return <details className="rounded-xl border border-brk-outline p-3 text-sm"><summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-brk-primary"><LifeBuoy size={18} />Không đăng ký / đăng nhập được?</summary><div className="space-y-3 pt-3"><p>Kiểm tra email, số điện thoại và kết nối mạng. Nếu email đã được sử dụng, hãy <Link className="font-semibold underline" href="/login">đăng nhập</Link> hoặc <Link className="font-semibold underline" href="/forgot-password">lấy lại mật khẩu</Link>. Không thấy mã xác minh? Kiểm tra thư rác và địa chỉ email đã nhập.</p>{done ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-900">Đã tiếp nhận yêu cầu hỗ trợ tài khoản. Người phụ trách sẽ liên hệ qua email hoặc số điện thoại bạn cung cấp.</p> : <form className="space-y-3" onSubmit={async event => {
    event.preventDefault(); if (busy) return
    const data = new FormData(event.currentTarget)
    key.current ||= crypto.randomUUID(); setBusy(true); setError('')
    try { const response = await fetch('/api/account-support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: key.current, page, name: data.get('name'), email: data.get('email'), phone: data.get('phone'), content: data.get('content'), website: data.get('website'), consent: data.get('consent') === 'on' }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Chưa gửi được hỗ trợ.'); setDone(true) } catch (error) { setError(error instanceof Error ? error.message : 'Chưa gửi được hỗ trợ.') } finally { setBusy(false) }
  }}><p className="text-xs text-brk-muted">Bạn có thể gửi hỗ trợ tài khoản mà chưa cần đăng nhập. Không gửi mật khẩu, mã OTP hoặc mã Authenticator.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<label className="block">Họ tên<input name="name" required maxLength={150} autoComplete="name" className={input} /></label><label className="block">Email liên hệ<input name="email" type="email" maxLength={254} autoComplete="email" className={input} /></label><label className="block">Số điện thoại<input name="phone" type="tel" maxLength={40} autoComplete="tel" className={input} /></label><p className="text-xs">Cần ít nhất email hoặc số điện thoại để nhận hỗ trợ.</p><label className="block">Bạn đang gặp lỗi gì?<textarea name="content" required minLength={10} maxLength={4000} rows={3} className={input} /></label><label hidden>Website<input name="website" tabIndex={-1} autoComplete="off" /></label><label className="flex gap-2 text-xs"><input type="checkbox" name="consent" required />Tôi đồng ý lưu yêu cầu và thông tin liên hệ để nhận hỗ trợ.</label><button disabled={busy} className="min-h-11 rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-50">{busy ? 'Đang gửi…' : 'Gửi hỗ trợ tài khoản'}</button></form>}</div></details>
}
