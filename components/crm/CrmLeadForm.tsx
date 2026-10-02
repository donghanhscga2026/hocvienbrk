'use client'

import { useState } from 'react'
export async function submitCrmLead(slug: string, data: { name: string; email: string; phone: string; website?: string; message?: string }) {
  const params = new URLSearchParams(window.location.search)
  const response = await fetch('/api/crm/capture', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, slug, consent: true, utmSource: (params.get('utm_source') || '').slice(0, 100), utmCampaign: (params.get('utm_campaign') || '').slice(0, 100), referral: (params.get('ref') || '').slice(0, 100) }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Chưa thể đăng ký. Vui lòng thử lại.')
}
// Added only when the administrator enables CRM capture on a landing page.
export default function CrmLeadForm({ slug }: { slug: string }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState(''); const [website, setWebsite] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('')
  const style = 'w-full rounded-xl border p-3 text-sm'
  return <section className="bg-slate-50 px-4 py-10"><div className="mx-auto max-w-lg rounded-2xl border bg-white p-5 sm:p-8"><h2 className="mb-4 text-2xl font-bold">Đăng ký nhận thông tin</h2>{done ? <p role="status">Đã tiếp nhận đăng ký. Người phụ trách sẽ liên hệ với bạn.</p> : <form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (!consent) return; setBusy(true); setError(''); try { await submitCrmLead(slug, { name, email, phone, website, message }); setDone(true) } catch (e) { setError(e instanceof Error ? e.message : 'Chưa thể đăng ký.') } finally { setBusy(false) } }}>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <label className="block text-sm">Họ tên<input required disabled={busy} maxLength={150} className={style} value={name} onChange={e => setName(e.target.value)} /></label>
    <label className="block text-sm">Email<input type="email" disabled={busy} maxLength={254} className={style} value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label className="block text-sm">Điện thoại<input type="tel" disabled={busy} maxLength={40} className={style} value={phone} onChange={e => setPhone(e.target.value)} /></label>
    <p className="text-xs text-slate-500">Cần ít nhất email hoặc điện thoại.</p>
    <label className="block text-sm">Bạn cần tư vấn điều gì?<textarea rows={3} maxLength={4000} disabled={busy} className={style} value={message} onChange={e => setMessage(e.target.value)} /></label>
    <label className="hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
    <label className="flex items-start gap-2 text-sm"><input required disabled={busy} type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />Tôi đồng ý lưu thông tin và được liên hệ về đăng ký này.</label>
    <button disabled={busy || !consent || (!email && !phone)} className="min-h-11 w-full rounded-xl bg-emerald-700 p-3 font-semibold text-white disabled:opacity-50">{busy ? 'Đang gửi…' : 'Gửi đăng ký'}</button>
  </form>}</div></section>
}
