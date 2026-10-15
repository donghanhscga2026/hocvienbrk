'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ManagementWorkspace from '@/components/layout/ManagementWorkspace'

function Editor() {
  const teacher = useSearchParams().get('teacher')
  const endpoint = '/api/wi300/teacher-profile' + (teacher ? `?teacher=${encodeURIComponent(teacher)}` : '')
  const [form, setForm] = useState({ headline: '', introduction: '', fields: '', website: '' })
  const [identity, setIdentity] = useState<{ id: number; name: string } | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch(endpoint, { signal: controller.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setIdentity({ id: data.id, name: data.user.name || 'Giảng viên' }); setForm({ ...data.profile, fields: data.profile.fields.join(', ') }) }).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [endpoint])
  const field = 'mt-2 min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 py-2'
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { const response = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, fields: [...new Set(form.fields.split(',').map(value => value.trim()).filter(Boolean))] }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setMessage('Đã lưu hồ sơ giảng viên.') }
    catch (error) { setError(error instanceof Error ? error.message : 'Chưa lưu được hồ sơ.') }
    finally { setBusy(false) }
  }
  return <ManagementWorkspace active="courses"><div className="mx-auto max-w-3xl space-y-5"><h1 className="text-3xl font-bold">Hồ sơ giảng viên</h1><p className="text-sm text-brk-muted">Ảnh và tên lấy từ tài khoản. Khóa học công khai tự hiển thị theo mã giảng viên, không cần tạo Site Profile.</p>{error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}{identity && <form onSubmit={save}><fieldset disabled={busy} className="space-y-4 rounded-2xl border border-brk-outline bg-white p-5"><h2 className="text-xl font-bold">{identity.name}</h2><label className="block text-sm font-semibold">Chuyên môn / giới thiệu ngắn<input maxLength={160} className={field} value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} /></label><label className="block text-sm font-semibold">Giới thiệu chi tiết<textarea maxLength={3000} rows={7} className={field} value={form.introduction} onChange={e => setForm({ ...form, introduction: e.target.value })} /></label><label className="block text-sm font-semibold">Lĩnh vực (phân cách bằng dấu phẩy)<input className={field} value={form.fields} onChange={e => setForm({ ...form, fields: e.target.value })} /></label><label className="block text-sm font-semibold">Website cá nhân (không bắt buộc)<input className={field} value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></label><p className="text-xs text-brk-muted">Để trống website để tự liên kết Site Profile đang hoạt động của bạn. Hồ sơ chỉ hiện công khai khi có khóa học được hiển thị trên website.</p><div className="flex flex-wrap gap-3"><button type="submit" className="min-h-12 rounded-xl bg-brk-primary px-5 font-semibold text-white">{busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button><Link href={`/giang-vien/${identity.id}`} target="_blank" className="inline-flex min-h-12 items-center rounded-xl border px-5">Xem hồ sơ công khai ↗</Link></div></fieldset></form>}</div></ManagementWorkspace>
}
export default function Page() { return <Suspense fallback={<p className="p-6">Đang mở hồ sơ…</p>}><Editor /></Suspense> }
