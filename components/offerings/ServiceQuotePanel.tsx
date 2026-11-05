'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { resolveBankBin } from '@/lib/bank-bin'
import { quoteDraftSchema, quoteMoney, quoteStatusLabels, type ServiceQuote } from '@/lib/offerings/quotes-shared'

type Draft = { title: string; scope: string; total: number; terms: string; installments: { label: string; amount: number }[] }
type Result = { quote: ServiceQuote | null; defaults?: { title: string; scope: string; customerName: string } }
const field = 'mt-2 min-h-12 w-full rounded-xl border border-brk-outline bg-white p-3 text-base'
const button = 'inline-flex min-h-12 items-center justify-center rounded-xl border border-brk-outline px-5 font-semibold disabled:opacity-40'
const primary = button + ' bg-brk-primary text-white'
export default function ServiceQuotePanel({ requestId, staff }: { requestId: string; staff: boolean }) {
  const [data, setData] = useState<Result | null>(null), [draft, setDraft] = useState<Draft>({ title: '', scope: '', total: 0, terms: '', installments: [{ label: 'Thanh toán một lần', amount: 0 }] })
  const [dirty, setDirty] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [consent, setConsent] = useState(false), [receipts, setReceipts] = useState<Record<number, string>>({})
  const sending = useRef(false)
  const url = `/api/service-quotes/${requestId}${staff ? '?staff=1' : ''}`
  async function read(signal?: AbortSignal) {
    const response = await fetch(url, { cache: 'no-store', signal })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Không tải được báo giá.')
    return result as Result
  }
  function apply(result: Result) {
    setData(result)
    setConsent(false)
    if (result.quote) setDraft({ title: result.quote.title, scope: result.quote.scope, total: result.quote.total, terms: result.quote.terms, installments: result.quote.installments.map(({ label, amount }) => ({ label, amount })) })
    else if (result.defaults) setDraft(value => ({ ...value, title: result.defaults!.title }))
  }
  useEffect(() => {
    const controller = new AbortController()
    void read(controller.signal).then(result => { if (!controller.signal.aborted) apply(result) }).catch(error => { if (!controller.signal.aborted) setError(error.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
    // The page is keyed by request; never reload over an unsaved draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])
  const awaitingPayment = data?.quote?.status === 'ACCEPTED' && data.quote.installments.some(part => !part.paidAt)
  useEffect(() => {
    if (!awaitingPayment) return
    const controller = new AbortController()
    const timer = setInterval(() => { void read(controller.signal).then(setData).catch(() => {}) }, 15000)
    return () => { clearInterval(timer); controller.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, awaitingPayment])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (sending.current) return
    if (action === 'SAVE' || action === 'SEND') {
      const valid = quoteDraftSchema.safeParse(draft)
      if (!valid.success) { setError(valid.error.issues[0]?.message || 'Kiểm tra nội dung và tổng các đợt.'); return }
    }
    if (action === 'SEND' && !window.confirm('Gửi báo giá này và thông báo cho khách?')) return
    if (action === 'WITHDRAW' && !window.confirm('Thu hồi báo giá chưa xác nhận để chỉnh sửa?')) return
    if (action === 'CONFIRM' && !window.confirm('Bạn đã đối soát tiền thực nhận và mã giao dịch ngân hàng cho đúng đợt này?')) return
    sending.current = true; setBusy(true); setError(''); setNotice('')
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 25000)
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ action, ...(action !== 'CONFIRM' ? { version: data?.quote?.version || 0 } : {}), ...extra, ...(['SAVE', 'SEND'].includes(action) ? { draft } : {}) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Chưa lưu được báo giá.')
      setDirty(false)
      setNotice(result.commissionPending ? 'Đã xác nhận thanh toán. Hoa hồng chưa xử lý xong, hãy bấm Thử lại hoa hồng.' : action === 'SAVE' ? 'Đã lưu bản nháp.' : action === 'SEND' ? 'Đã gửi báo giá và thông báo cho khách.' : 'Đã cập nhật. Nếu bạn đã thanh toán, chờ đối soát thực tế.')
      apply(await read())
    } catch (error) { setError(error instanceof Error ? error.message : 'Mất kết nối. Bản nhập vẫn được giữ. Tải lại để kiểm tra trước khi thử lại.') }
    finally { clearTimeout(timer); setBusy(false); sending.current = false }
  }
  function update(patch: Partial<Draft>) { setDraft(value => ({ ...value, ...patch })); setDirty(true) }
  const quote = data?.quote, editable = staff && (!quote || quote.status === 'DRAFT')
  if (loading) return <p role="status" className="p-6">Đang tải báo giá…</p>
  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-8 text-brk-on-surface">
    <Link href={staff ? '/tools/crm?view=requests&request=' + requestId : '/my-requests?request=' + requestId} onClick={event => { if (dirty && !window.confirm('Rời trang và bỏ bản nhập chưa lưu?')) event.preventDefault() }} className="inline-flex min-h-11 items-center font-semibold text-brk-primary">← {staff ? 'Về yêu cầu CRM' : 'Yêu cầu của tôi'}</Link>
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-brk-muted">Dịch vụ theo yêu cầu</p><h1 className="mt-2 text-3xl font-bold">{editable ? 'Tạo báo giá cho khách' : 'Báo giá & thanh toán'}</h1></div>{quote && <span className="rounded-full bg-green-50 px-4 py-2 font-semibold">{quoteStatusLabels[quote.status]}</span>}</header>
    <button disabled={busy} className={button} onClick={async () => { if (dirty && !window.confirm('Tải lại sẽ bỏ bản nhập chưa lưu. Tiếp tục?')) return; setBusy(true); try { apply(await read()); setDirty(false); setError('') } catch (error) { setError(error instanceof Error ? error.message : 'Không tải được báo giá.') } finally { setBusy(false) } }}>Tải lại báo giá</button>
    {error && <p role="alert" className="rounded-xl border bg-red-50 p-4 text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl border bg-green-50 p-4">{notice}</p>}
    {!data ? <button className={button} onClick={() => window.location.reload()}>Tải lại</button> : editable ? <form className="space-y-5 rounded-2xl border bg-white p-5 sm:p-7" onSubmit={event => { event.preventDefault(); void act('SAVE') }}>
      <p className="font-semibold">Khách hàng: {quote?.customerName || data.defaults?.customerName}</p>
      {data.defaults?.scope && <details className="rounded-xl bg-slate-50 p-4"><summary className="min-h-11 cursor-pointer font-semibold">Nhu cầu khách đã gửi</summary><p className="whitespace-pre-wrap break-words text-sm leading-7">{data.defaults.scope}</p></details>}
      <label className="block font-semibold">Tên báo giá<input required maxLength={200} className={field} value={draft.title} onChange={event => update({ title: event.target.value })} /></label>
      <label className="block font-semibold">Công việc thực hiện<textarea required rows={5} maxLength={6000} placeholder="Những công việc bạn và khách đã thống nhất…" className={field} value={draft.scope} onChange={event => update({ scope: event.target.value })} /></label>
      <label className="block font-semibold">Tổng giá (VNĐ)<input required type="number" min={1000} max={1000000000} step={1} className={field} value={draft.total || ''} onChange={event => { const total = Number(event.target.value); update({ total, ...(draft.installments.length === 1 ? { installments: [{ ...draft.installments[0], amount: total }] } : {}) }) }} /></label>
      <fieldset className="space-y-3"><legend className="mb-2 font-semibold">Cách thanh toán</legend><div className="flex flex-wrap gap-3"><button type="button" className={button} onClick={() => update({ installments: [{ label: 'Thanh toán một lần', amount: draft.total }] })}>Một lần</button><button type="button" className={button} onClick={() => update({ installments: [{ label: 'Đợt 1 · Khi xác nhận', amount: Math.floor(draft.total / 2) }, { label: 'Đợt 2 · Khi bàn giao', amount: draft.total - Math.floor(draft.total / 2) }] })}>Chia 2 đợt</button></div>
        {draft.installments.map((part, index) => <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_200px]"><label>Tên / điều kiện thanh toán<input required maxLength={120} aria-label={'Tên đợt ' + (index + 1)} className={field} value={part.label} onChange={event => update({ installments: draft.installments.map((item, i) => i === index ? { ...item, label: event.target.value } : item) })} /></label><label>Số tiền (VNĐ)<input required type="number" min={1000} max={1000000000} step={1} aria-label={'Số tiền đợt ' + (index + 1)} className={field} value={part.amount || ''} onChange={event => update({ installments: draft.installments.map((item, i) => i === index ? { ...item, amount: Number(event.target.value) } : item) })} /></label></div>)}
        <p className="text-sm text-brk-muted">Tổng các đợt: {quoteMoney(draft.installments.reduce((sum, part) => sum + part.amount, 0))}. Phải bằng tổng báo giá.</p>
      </fieldset>
      <details className="rounded-xl border p-4"><summary className="min-h-11 cursor-pointer font-semibold">+ Thời gian, bảo hành hoặc điều khoản khác (tùy chọn)</summary><textarea aria-label="Điều khoản bổ sung" rows={4} maxLength={3000} className={field} value={draft.terms} onChange={event => update({ terms: event.target.value })} /><p className="mt-2 text-sm text-brk-muted">Chỉ thêm những gì đã thống nhất với khách.</p></details>
      <p className="rounded-xl bg-green-50 p-4 text-sm">Người giới thiệu được giữ từ yêu cầu ban đầu, không thay theo người đang duyệt. {quote?.affiliateId != null ? `Mã thành viên: #${quote.affiliateId}.` : !quote ? 'Hệ thống lấy thông tin đã lưu cùng yêu cầu khi bạn lưu báo giá.' : 'Yêu cầu không có dữ liệu giới thiệu sẽ không tự gán thêm.'}</p>
      <div className="flex flex-wrap justify-end gap-3"><button disabled={busy} className={button}>Lưu nháp</button><button disabled={busy} type="button" className={primary} onClick={() => void act('SEND')}>Gửi báo giá cho khách</button></div>
    </form> : !quote ? <p className="rounded-xl bg-white p-6">Người phụ trách chưa gửi báo giá. Bạn sẽ nhận được thông báo khi có báo giá.</p> : <section className="space-y-5 rounded-2xl border bg-white p-5 sm:p-7">
      <div><h2 className="text-2xl font-bold">{quote.title}</h2><p className="mt-2 text-sm text-brk-muted">Dành cho {quote.customerName} · Người phụ trách: {quote.ownerName}</p></div>
      <p className="whitespace-pre-wrap break-words leading-8">{quote.scope}</p>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-50 p-5"><span className="font-bold">Tổng chi phí</span><strong className="text-3xl">{quoteMoney(quote.total)}</strong></div>
      {quote.terms && <div><h3 className="font-bold">Điều khoản đã thống nhất</h3><p className="mt-2 whitespace-pre-wrap break-words leading-7">{quote.terms}</p></div>}
      {quote.installments.map((part, index) => <article key={part.orderId || index} className="space-y-3 rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">{part.label}</h3><strong>{quoteMoney(part.amount)}</strong></div>
        {part.paidAt ? <p className="font-semibold text-green-800">Đã xác nhận thanh toán · {new Date(part.paidAt).toLocaleDateString('vi-VN')}</p> : <p className="text-sm text-brk-muted">{part.orderId ? `Đơn #${part.orderId} · Chờ thanh toán` : 'Tạo đơn sau khi bạn đồng ý báo giá'}</p>}
        {quote.status === 'ACCEPTED' && !part.paidAt && quote.bank && !staff && <details><summary className="min-h-11 cursor-pointer font-semibold text-brk-primary">QR & thông tin thanh toán đợt {index + 1}</summary><div className="mt-3 grid items-start gap-5 sm:grid-cols-[200px_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img width={200} height={200} alt={'QR thanh toán ' + part.label} src={`https://img.vietqr.io/image/${encodeURIComponent(resolveBankBin(quote.bank.bankName))}-${encodeURIComponent(quote.bank.accountNumber)}-qr_only.png?amount=${part.amount}&addInfo=${encodeURIComponent(part.code)}&accountName=${encodeURIComponent(quote.bank.accountHolder)}`} />
          <div className="space-y-2 break-words text-sm"><p>{quote.bank.bankName} · {quote.bank.accountNumber}</p><p>Chủ tài khoản: {quote.bank.accountHolder}</p><p>Nội dung chuyển khoản: <strong>{part.code}</strong></p><p>Giữ đúng mã và số tiền của đợt này. Chỉ thanh toán theo thời điểm đã thống nhất.</p><button disabled={busy || !!part.reportedAt} className={button} onClick={() => void act('REPORT', { index })}>{part.reportedAt ? 'Đã báo chuyển khoản · Chờ đối soát' : 'Tôi đã chuyển khoản'}</button></div>
        </div></details>}
        {staff && quote.status === 'ACCEPTED' && <div className="space-y-2">{part.reportedAt && !part.paidAt && <p className="text-amber-800">Khách báo đã chuyển khoản. Kiểm tra tiền thực nhận trước khi duyệt.</p>}{!part.paidAt && <label className="block text-sm">Mã giao dịch trên sao kê ngân hàng<input aria-label={'Mã giao dịch đợt ' + (index + 1)} minLength={6} maxLength={120} className={field} value={receipts[index] || ''} onChange={event => setReceipts(value => ({ ...value, [index]: event.target.value }))} /></label>}<button disabled={busy || (!part.paidAt && (receipts[index]?.trim().length || 0) < 6)} className={button} onClick={() => void act('CONFIRM', { index, consent: true, receipt: part.paidAt ? 'RETRY-COMMISSION' : receipts[index] })}>{part.paidAt ? 'Thử lại hoa hồng' : 'Xác nhận đã nhận tiền'}</button></div>}
      </article>)}
      {quote.status === 'SENT' && !staff && <div className="space-y-4"><p className="rounded-xl bg-green-50 p-4 text-sm">Sau khi đồng ý, hệ thống tạo đơn và QR cho từng đợt. Không trừ tiền tự động.</p><label className="flex gap-3"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />Tôi đã đọc và đồng ý nội dung báo giá</label><button disabled={!consent || busy} className={primary} onClick={() => void act('ACCEPT', { consent: true })}>Đồng ý báo giá</button></div>}
      {quote.status === 'SENT' && staff && <button className={button} disabled={busy} onClick={() => void act('WITHDRAW')}>Thu hồi để chỉnh sửa</button>}
      {quote.status === 'ACCEPTED' && <p className="text-sm text-brk-muted">Báo giá đã xác nhận được giữ nguyên. Không gian dịch vụ mở sau khi đợt đầu được xác nhận thanh toán.</p>}
      {!staff && quote.installments[0]?.paidAt && <Link className={primary} href={'/dich-vu/' + encodeURIComponent(quote.slug) + '/su-dung'}>Theo dõi dịch vụ & bàn giao</Link>}
    </section>}
  </main>
}
