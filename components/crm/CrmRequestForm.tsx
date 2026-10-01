'use client'
import { useRef, useState } from 'react'
import { REQUEST_CATEGORIES } from '@/lib/crm/shared'

export default function CrmRequestForm({ courseId, lessonId, commentId, initialContent = '', signedIn = false }: { courseId?: number; lessonId?: string; commentId?: number; initialContent?: string; signedIn?: boolean }) {
  const [open, setOpen] = useState(false); const [content, setContent] = useState(initialContent)
  const [category, setCategory] = useState<keyof typeof REQUEST_CATEGORIES>(lessonId ? 'LEARNING' : 'CONSULTATION')
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState(''); const [website, setWebsite] = useState('')
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('')
  const key = useRef<string | null>(null)
  const style = 'w-full min-h-11 rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900'
  return <section className="rounded-xl border border-emerald-200 bg-white p-3 text-slate-800">
    <button type="button" onClick={() => setOpen(!open)} className="min-h-11 text-sm font-semibold text-emerald-800">{commentId ? 'Nhờ giáo viên giải đáp bình luận này' : lessonId ? 'Gửi yêu cầu hỗ trợ' : 'Yêu cầu tư vấn khóa học'}</button>
    {open && (done ? <p role="status" className="text-sm">Đã gửi yêu cầu đến người phụ trách. Bạn có thể trao đổi tiếp trong bài học hoặc qua kênh liên hệ của khóa.</p> : <form className="space-y-3" onSubmit={async e => {
      e.preventDefault(); if (busy) return; setBusy(true); setError(''); key.current ||= crypto.randomUUID()
      try {
        const response = await fetch('/api/crm/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: key.current, courseId, lessonId, commentId, category, content, name, email, phone, website, consent }) })
        const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Chưa gửi được yêu cầu.'); setDone(true)
      } catch (e) { setError(e instanceof Error ? e.message : 'Chưa gửi được yêu cầu.') } finally { setBusy(false) }
    }}>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {(lessonId || signedIn) && <label className="block text-sm">Loại yêu cầu<select className={style} value={category} onChange={e => setCategory(e.target.value as keyof typeof REQUEST_CATEGORIES)}>{Object.entries(REQUEST_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      {!signedIn && <><label className="block text-sm">Họ tên<input required className={style} maxLength={150} value={name} onChange={e => setName(e.target.value)} /></label><label className="block text-sm">Email<input type="email" className={style} maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label><label className="block text-sm">Điện thoại<input type="tel" className={style} maxLength={40} value={phone} onChange={e => setPhone(e.target.value)} /></label></>}
      <label className="block text-sm">Nội dung cần được giải đáp<textarea required rows={3} maxLength={4000} className={style} value={content} onChange={e => setContent(e.target.value)} /></label>
      <label hidden aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
      <label className="flex gap-2 text-xs"><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Tôi đồng ý lưu yêu cầu và thông tin liên hệ để người phụ trách xử lý.</label>
      <button disabled={busy || !consent} className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button>
      <p className="text-xs text-slate-500">Bình luận thông thường vẫn được lưu ở bài học. Form này tạo yêu cầu riêng trong CRM.</p>
    </form>)}
  </section>
}
