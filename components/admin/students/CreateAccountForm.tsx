'use client'

import { useState } from 'react'

export default function CreateAccountForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const input = 'mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900'
  return <section className="rounded-xl border border-gray-200 bg-white p-3 text-sm">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white">{open ? 'Đóng form' : '+ Tạo tài khoản'}</button>
    {message && <p role="status" className="mt-3 break-words">{message}</p>}
    {open && <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={async event => {
      event.preventDefault()
      const form = event.currentTarget
      const values = Object.fromEntries(new FormData(form))
      setBusy(true); setMessage('')
      try {
        const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Không thể tạo tài khoản.')
        setMessage(`Đã tạo #${result.user.id} · ${result.user.email}. ${result.message}`)
        form.reset(); setOpen(false); onCreated()
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Lỗi kết nối.') }
      finally { setBusy(false) }
    }}>
      <label>Họ tên<input className={input} name="name" required minLength={2} maxLength={150} autoComplete="name" /></label>
      <label>Email<input className={input} name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      <label>Số điện thoại (không bắt buộc)<input className={input} name="phone" type="tel" maxLength={30} autoComplete="tel" /></label>
      <label>Vai trò<select name="role" className={input}><option value="STUDENT">Học viên</option><option value="TEACHER">Giảng viên</option></select></label>
      <label>Mật khẩu ban đầu<input className={input} name="password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" /></label>
      <p className="self-center text-xs leading-5 text-gray-600">Dùng ít nhất 10 ký tự. Người dùng đổi mật khẩu trong Cài đặt tài khoản. Việc tạo tài khoản không gửi email hoặc tin nhắn tự động.</p>
      <button disabled={busy} className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50 sm:col-span-2">{busy ? 'Đang tạo…' : 'Tạo tài khoản'}</button>
    </form>}
  </section>
}
