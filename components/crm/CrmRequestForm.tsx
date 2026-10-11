'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { REQUEST_CATEGORIES } from '@/lib/crm/shared'

export default function CrmRequestForm({ courseId, lessonId, commentId, initialContent = '', signedIn = false, initiallyOpen = false, hideTrigger = false, defaultCategory }: { courseId?: number; lessonId?: string; commentId?: number; initialContent?: string; signedIn?: boolean; initiallyOpen?: boolean; hideTrigger?: boolean; defaultCategory?: keyof typeof REQUEST_CATEGORIES }) {
  const [open, setOpen] = useState(initiallyOpen); const [content, setContent] = useState(initialContent)
  const [category, setCategory] = useState<keyof typeof REQUEST_CATEGORIES>(defaultCategory || (lessonId ? 'LEARNING' : 'CONSULTATION'))
  const [needsLogin, setNeedsLogin] = useState(false)
  const [feedback, setFeedback] = useState(false)
  const [website, setWebsite] = useState('')
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('')
  const key = useRef<string | null>(null)
  const draftKey = `crm-request-draft:${courseId || 'general'}:${lessonId || ''}:${commentId || ''}`
  const [returnPath, setReturnPath] = useState('/support')
  useEffect(() => {
    const url = new URL(window.location.href); url.searchParams.set('requestOpen', String(courseId || 'general')); setReturnPath(url.pathname + url.search + url.hash)
    try { const raw = sessionStorage.getItem(draftKey); if (!raw) return; const draft = JSON.parse(raw); if (Date.now() - draft.savedAt > 86400000) { sessionStorage.removeItem(draftKey); return }; if (typeof draft.content === 'string') setContent(draft.content.slice(0, 4000)); if (draft.category in REQUEST_CATEGORIES) setCategory(draft.category); setFeedback(draft.feedback === true); if (typeof draft.key === 'string') key.current = draft.key; setOpen(true) } catch { /* Trình duyệt chặn bộ nhớ vẫn cho phép nhập và gửi. */ }
  }, [draftKey, courseId])
  const saveDraft = () => { try { key.current ||= crypto.randomUUID(); sessionStorage.setItem(draftKey, JSON.stringify({ content, category, feedback, key: key.current, savedAt: Date.now() })) } catch { setError('Trình duyệt không cho lưu bản nháp. Bạn hãy sao chép nội dung trước khi đăng nhập.') } }
  const style = 'w-full min-h-11 rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900'
  return <section className="rounded-xl border border-emerald-200 bg-white p-3 text-slate-800">
    {!hideTrigger && <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-11 text-sm font-semibold text-emerald-800">{commentId ? 'Nhờ giáo viên giải đáp bình luận này' : lessonId ? 'Gửi yêu cầu hỗ trợ' : courseId ? 'Yêu cầu tư vấn khóa học' : 'Gửi yêu cầu / góp ý'}</button>}
    {open && (done ? <p role="status" className="text-sm">Đã gửi yêu cầu đến người phụ trách. Bạn sẽ nhận thông báo qua chuông khi có phản hồi; xem lại tại <Link href="/my-requests" className="font-semibold underline">Yêu cầu của tôi</Link>.</p> : <form className="space-y-3" onSubmit={async e => {
      e.preventDefault(); if (busy || !signedIn || needsLogin) return; setBusy(true); setError(''); key.current ||= crypto.randomUUID()
      try {
        const response = await fetch('/api/crm/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: key.current, courseId, lessonId, commentId, category, feedback, content, website, consent }) })
        const data = await response.json(); if (!response.ok) { if (response.status === 401) { saveDraft(); setNeedsLogin(true) }; throw new Error(data.error || 'Chưa gửi được yêu cầu.') }; setDone(true); try { sessionStorage.removeItem(draftKey) } catch {}
      } catch (e) { setError(e instanceof Error ? e.message : 'Chưa gửi được yêu cầu.') } finally { setBusy(false) }
    }}>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <label className="block text-sm">Loại yêu cầu<select className={style} value={feedback ? 'FEEDBACK' : category} onChange={e => { setFeedback(e.target.value === 'FEEDBACK'); if (e.target.value !== 'FEEDBACK') setCategory(e.target.value as keyof typeof REQUEST_CATEGORIES) }}>{Object.entries(REQUEST_CATEGORIES).filter(([value]) => courseId != null || value !== 'LEARNING').map(([value, label]) => <option key={value} value={value}>{label}</option>)}<option value="FEEDBACK">Góp ý</option></select></label>
      <label className="block text-sm">Nội dung cần được giải đáp<textarea required rows={3} maxLength={4000} className={style} value={content} onChange={e => setContent(e.target.value)} /></label>
      <label hidden aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
      {signedIn && !needsLogin ? <><label className="flex gap-2 text-xs"><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Tôi đồng ý lưu yêu cầu và thông tin liên hệ để người phụ trách xử lý.</label><button disabled={busy || !consent} className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button></> : <div className="space-y-2 rounded-xl bg-emerald-50 p-3"><p className="text-sm">Đăng nhập hoặc tạo tài khoản để gửi và theo dõi phản hồi. Nội dung được giữ trong bản nháp của tab này.</p><div className="flex flex-wrap gap-2"><Link onClick={saveDraft} href={'/login?callbackUrl=' + encodeURIComponent(returnPath)} className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">Đăng nhập</Link><Link onClick={saveDraft} href={'/register?callbackUrl=' + encodeURIComponent(returnPath)} className="inline-flex min-h-11 items-center rounded-lg border bg-white px-4 text-sm">Tạo tài khoản</Link></div></div>}
      <p className="text-xs text-slate-500">Yêu cầu được gửi riêng đến người phụ trách. Bình luận thông thường vẫn ở bài học.</p>
    </form>)}
  </section>
}
