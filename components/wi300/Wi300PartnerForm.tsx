'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

type PartnerRequest = { id: string; content: string; status: string; publicReply: string; createdAt: string }
const field = 'mt-2 min-h-12 w-full rounded-xl border border-brk-outline bg-white px-3 py-3 text-sm focus-visible:outline-brk-primary'
const statusLabels: Record<string, string> = { NEW: 'Đã tiếp nhận', IN_PROGRESS: 'Đang trao đổi', RESOLVED: 'Đã xử lý' }

export default function Wi300PartnerForm({ name, phone }: { name: string; phone: string }) {
  const [kind, setKind] = useState('TEACHER')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [requests, setRequests] = useState<PartnerRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [historyError, setHistoryError] = useState('')
  const [loading, setLoading] = useState(true)
  const requestKey = useRef<string | null>(null)
  const load = useCallback((currentPage: number, signal?: AbortSignal) =>
    fetch(`/api/wi300/partner-requests?page=${currentPage}`, { cache: 'no-store', signal }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Chưa tải được yêu cầu.')
      return data
    }).then(data => {
      if (!signal?.aborted) { setRequests(data.requests); setTotal(data.total); setHistoryError('') }
    }).catch(error => {
      if (!signal?.aborted) setHistoryError(error instanceof Error ? error.message : 'Chưa tải được yêu cầu.')
    }).finally(() => { if (!signal?.aborted) setLoading(false) }), [])
  useEffect(() => {
    const controller = new AbortController()
    void load(page, controller.signal)
    return () => controller.abort()
  }, [page, load])

  function changePage(nextPage: number) { setLoading(true); setHistoryError(''); setPage(nextPage) }
  function refresh() { setLoading(true); setHistoryError(''); void load(page) }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true); setError(''); setSuccess('')
    try {
      requestKey.current ||= crypto.randomUUID()
      const response = await fetch('/api/wi300/partner-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: requestKey.current, kind, phone: values.get('phone'), organization: values.get('organization') || '', expertise: values.get('expertise'), proposal: values.get('proposal'), portfolio: String(values.get('portfolio') || '').trim(), consent: values.get('consent') === 'on' }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không thể gửi yêu cầu.')
      requestKey.current = null
      form.reset(); setKind('TEACHER')
      setSuccess('Đã tiếp nhận yêu cầu. Ban điều phối sẽ xem hồ sơ và liên hệ trực tiếp qua thông tin bạn cung cấp. Việc gửi yêu cầu chưa tự cấp quyền giảng viên hoặc mở bán.')
      if (page === 1) { setLoading(true); await load(1) }
      else changePage(1)
    } catch (error) { setError(error instanceof Error ? error.message : 'Không thể gửi yêu cầu. Vui lòng thử lại.') }
    finally { setBusy(false) }
  }

  return <div className="grid items-start gap-8 lg:grid-cols-2">
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-brk-outline bg-white p-5 sm:p-7">
      <h2 className="text-xl font-bold">Gửi yêu cầu tham gia</h2>
      <p className="text-sm text-brk-muted">Tài khoản: {name}. Thông tin này chỉ phục vụ việc xem xét và liên hệ hợp tác.</p>
      <fieldset disabled={busy} className="space-y-5">
        <label className="block text-sm font-semibold">Vai trò muốn đăng ký<select name="kind" value={kind} onChange={event => setKind(event.target.value)} className={field}><option value="TEACHER">Giảng viên — mở khóa học</option><option value="BUSINESS">Doanh nghiệp — sản phẩm / dịch vụ</option><option value="BOTH">Giảng viên và doanh nghiệp</option></select></label>
        <label className="block text-sm font-semibold">Số điện thoại liên hệ *<input name="phone" type="tel" autoComplete="tel" required maxLength={40} defaultValue={phone} className={field} /></label>
        <label className="block text-sm font-semibold">Tên doanh nghiệp {kind !== 'TEACHER' ? '*' : '(nếu có)'}<input name="organization" autoComplete="organization" required={kind !== 'TEACHER'} maxLength={150} className={field} /></label>
        <label className="block text-sm font-semibold">Chuyên môn / lĩnh vực *<textarea name="expertise" required minLength={3} maxLength={1000} rows={3} placeholder="Lĩnh vực chuyên môn, kinh nghiệm hoặc hoạt động của doanh nghiệp…" className={field} /></label>
        <label className="block text-sm font-semibold">Nội dung dự kiến hợp tác *<textarea name="proposal" required minLength={10} maxLength={2000} rows={4} placeholder="Khóa học muốn mở, đối tượng học viên; hoặc sản phẩm / dịch vụ muốn giới thiệu…" className={field} /></label>
        <label className="block text-sm font-semibold">Đường dẫn hồ sơ tham khảo (không bắt buộc)<input name="portfolio" type="url" maxLength={500} pattern="https://.*" placeholder="https://…" className={field} /><span className="mt-2 block text-xs font-normal leading-5 text-brk-muted">Website, hồ sơ chuyên môn hoặc thư mục tài liệu có quyền xem. Chưa cần tải giấy tờ lên hệ thống.</span></label>
        <label className="flex items-start gap-3 text-sm leading-6"><input name="consent" type="checkbox" required className="mt-1 h-5 w-5 shrink-0 accent-brk-primary" />Tôi đồng ý gửi thông tin cho ban điều phối để xem xét hồ sơ và liên hệ trực tiếp.</label>
        <button type="submit" className="min-h-12 w-full rounded-xl bg-brk-primary px-5 font-semibold text-white disabled:opacity-60">{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button>
      </fieldset>
      {error && <p role="alert" className="text-sm text-brk-accent">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-brk-background p-4 text-sm leading-6">{success}</p>}
      <p className="text-xs leading-6 text-brk-muted">Đăng ký doanh nghiệp hiện là bước tiếp nhận nhu cầu. Danh mục sản phẩm và dịch vụ sẽ được triển khai sau. Quyền giảng viên được quản trị viên cấp riêng sau khi xét hồ sơ.</p>
    </form>
    <section aria-labelledby="partner-history" className="rounded-2xl border border-brk-outline bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="partner-history" className="text-xl font-bold">Yêu cầu của tôi</h2><button type="button" disabled={loading} onClick={refresh} className="min-h-11 px-2 text-sm font-semibold text-brk-primary disabled:opacity-60">Làm mới</button></div>
      <p className="mt-2 text-sm leading-6 text-brk-muted">Theo dõi tiếp nhận và phản hồi tại đây. Trạng thái “Đã xử lý” là kết quả trao đổi, chưa đồng nghĩa với việc được cấp quyền.</p>
      {loading ? <p role="status" className="mt-5 text-sm text-brk-muted">Đang tải yêu cầu…</p> : historyError ? <p role="alert" className="mt-5 text-sm text-brk-accent">{historyError}</p> : requests.length ? <ul className="mt-5 space-y-4">{requests.map(request => <li key={request.id} className="rounded-xl border border-brk-outline p-4"><div className="flex flex-wrap justify-between gap-2 text-xs"><span className="rounded-full bg-brk-background px-3 py-1 font-semibold text-brk-primary">{statusLabels[request.status] || 'Đang cập nhật'}</span><time dateTime={request.createdAt} className="py-1 text-brk-muted">{new Date(request.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time></div><details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">{request.content.split('\n')[0]}</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-brk-muted">{request.content}</p></details>{request.publicReply && <div className="mt-3 rounded-lg bg-brk-background p-3"><p className="text-xs font-semibold">Phản hồi từ ban điều phối</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{request.publicReply}</p></div>}</li>)}</ul> : <p className="mt-5 text-sm text-brk-muted">Bạn chưa gửi yêu cầu đối tác.</p>}
      {!historyError && total > 20 && <nav aria-label="Phân trang yêu cầu" className="mt-5 flex items-center justify-between gap-3 text-sm"><button type="button" disabled={page === 1 || loading} onClick={() => changePage(page - 1)} className="min-h-11 text-brk-primary disabled:opacity-40">Trang trước</button><span>Trang {page} / {Math.ceil(total / 20)}</span><button type="button" disabled={page * 20 >= total || loading} onClick={() => changePage(page + 1)} className="min-h-11 text-brk-primary disabled:opacity-40">Trang sau</button></nav>}
    </section>
  </div>
}
