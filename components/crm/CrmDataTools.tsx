'use client'

import { useEffect, useState } from 'react'
import { CRM_CSV_TEMPLATE } from '@/lib/crm/csv'
import { CrmOwner } from '@/lib/crm/shared'

const input = 'w-full rounded-xl border bg-white p-3 text-sm'
const button = 'min-h-11 rounded-xl bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50'
export async function integrationRequest<T>(params: string, body?: unknown): Promise<T> {
  const response = await fetch('/api/crm/integrations' + params, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Không xử lý được dữ liệu.')
  return data as T
}
type Student = { id: number; name: string | null; email: string; phone: string | null; crmIdentityContact: { id: number } | null }
type Preview = { token: string; counts: Record<string, number>; rows: { row: number; status: string; message: string; data?: { name: string; email: string | null; phone: string | null } }[] }
type Landing = { id: number; title: string; slug: string; isActive: boolean; config: { crmCapture?: boolean } | null; updatedAt: string }
type Submission = { id: number; data: Record<string, unknown>; createdAt: string; landing: { title: string } }
export default function CrmDataTools({ owners, actorId, onChanged }: { owners: CrmOwner[]; actorId: number; onChanged: () => void }) {
  const [mode, setMode] = useState<'csv' | 'students' | 'capture'>('csv')
  const [csv, setCsv] = useState(''); const [query, setQuery] = useState('')
  const [ownerId, setOwnerId] = useState(String(actorId)); const [users, setUsers] = useState<Student[]>([])
  const [ids, setIds] = useState<number[]>([]); const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0)
  const [landings, setLandings] = useState<Landing[]>([]); const [submissions, setSubmissions] = useState<Submission[]>([])
  const [capturePage, setCapturePage] = useState(1); const [captureTotal, setCaptureTotal] = useState(0)
  const [inboxPage, setInboxPage] = useState(1); const [inboxTotal, setInboxTotal] = useState(0)
  const [resolveIds, setResolveIds] = useState<Record<number, string>>({})
  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('')
    try { await work() } catch (e) { setError(e instanceof Error ? e.message : 'Không xử lý được.') }
    finally { setBusy(false) }
  }
  const search = async (next = 1) => {
    const result = await integrationRequest<{ users: Student[]; total: number }>('?view=students&q=' + encodeURIComponent(query) + '&page=' + next)
    setUsers(result.users); setTotal(result.total); setPage(next)
  }
  const loadCapture = async (nextCapture = capturePage, nextInbox = inboxPage) => {
    const [forms, inbox] = await Promise.all([
      integrationRequest<{ landings: Landing[]; total: number }>('?view=capture&page=' + nextCapture),
      integrationRequest<{ submissions: Submission[]; total: number }>('?view=submissions&page=' + nextInbox),
    ])
    setLandings(forms.landings); setCaptureTotal(forms.total); setCapturePage(nextCapture)
    setSubmissions(inbox.submissions); setInboxTotal(inbox.total); setInboxPage(nextInbox)
  }
  const payload = { ownerId: ownerId === '' ? null : Number(ownerId), ...(mode === 'csv' ? { csv } : { userIds: ids }) }
  return <details className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer font-semibold">Nhập khách & kết nối website (quản trị)</summary><div className="mt-4 space-y-4">
    <div className="flex flex-wrap gap-2">{[['csv', 'Nhập CSV'], ['students', 'Lấy thành viên website'], ['capture', 'Form & yêu cầu cần kiểm tra']].map(([key, title]) => <button type="button" key={key} disabled={busy} aria-pressed={mode === key} className={button} onClick={() => { setMode(key as typeof mode); setPreview(null); if (key === 'capture') void run(() => loadCapture()) }}>{title}</button>)}</div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}{notice && <p role="status" className="rounded-xl bg-emerald-50 p-3">{notice}</p>}
    {mode !== 'capture' ? <>
      <label className="block text-sm">Người phụ trách cho khách mới<select disabled={busy} className={input} value={ownerId} onChange={e => { setOwnerId(e.target.value); setPreview(null) }}><option value="">Chưa phân công</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name || owner.email}</option>)}</select></label>
      {mode === 'csv' ? <>
        <p className="text-sm">CSV UTF-8, tối đa 100 khách/lần. Các cột: name,email,phone,source,needs,tags. Nhãn cách nhau bằng dấu |. Hồ sơ trùng sẽ được bỏ qua; dữ liệu cũ được giữ nguyên.</p>
        <button type="button" disabled={busy} className={button} onClick={() => { const url = URL.createObjectURL(new Blob(['\uFEFF' + CRM_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'crm-mau.csv'; a.click(); URL.revokeObjectURL(url) }}>Tải CSV mẫu</button>
        <label className="block text-sm">Chọn file CSV<input disabled={busy} type="file" accept=".csv,text/csv" className={input} onChange={e => { const file = e.target.files?.[0]; setPreview(null); if (!file) return; void run(async () => { if (file.size > 128000) throw new Error('File tối đa 128 KB.'); setCsv(await file.text()) }) }} /></label>
        <label className="block text-sm">Hoặc dán nội dung CSV<textarea disabled={busy} rows={6} className={input} value={csv} onChange={e => { setCsv(e.target.value); setPreview(null) }} /></label>
      </> : <>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void run(() => search()) }}><input disabled={busy} aria-label="Tìm thành viên website" placeholder="Tên, email, điện thoại hoặc mã (ít nhất 3 ký tự)" minLength={3} className={input} value={query} onChange={e => setQuery(e.target.value)} /><button className={button} disabled={busy}>Tìm</button></form>
        <p className="text-sm">Đã chọn {ids.length}/100 thành viên. Việc nhập giữ nguyên tài khoản, khóa học và người giới thiệu.</p>
        {users.map(user => <label key={user.id} className="flex items-start gap-3 rounded-xl border p-3 text-sm"><input disabled={busy || (!ids.includes(user.id) && ids.length >= 100)} type="checkbox" checked={ids.includes(user.id)} onChange={e => { setIds(list => e.target.checked ? [...list, user.id] : list.filter(id => id !== user.id)); setPreview(null) }} /><span className="break-all">#{user.id} · {user.name} · {user.email} · {user.phone}{user.crmIdentityContact && <span className="block">Đã liên kết khách #{user.crmIdentityContact.id}</span>}</span></label>)}
        <div className="flex gap-2 text-sm"><button className={button} disabled={busy || page === 1} onClick={() => void run(() => search(page - 1))}>Trước</button><span>{total} kết quả · Trang {page}</span><button className={button} disabled={busy || page * 20 >= total} onClick={() => void run(() => search(page + 1))}>Sau</button></div>
      </>}
      <button disabled={busy || (mode === 'csv' ? !csv : !ids.length)} className={button} onClick={() => void run(async () => { setPreview(null); setPreview(await integrationRequest<Preview>('', { action: mode === 'csv' ? 'import.preview' : 'students.preview', ...payload })) })}>Xem trước — chưa lưu dữ liệu</button>
      {preview && <div className="space-y-3 rounded-xl border p-3"><p className="text-sm">Tạo mới: {preview.counts.CREATE} · Liên kết: {preview.counts.LINK} · Bỏ qua: {preview.counts.SKIP} · Mâu thuẫn: {preview.counts.CONFLICT} · Không hợp lệ: {preview.counts.INVALID}</p>
        <div className="max-h-80 space-y-2 overflow-auto">{preview.rows.map(row => <p key={row.row} className="break-words border-b pb-2 text-sm">Dòng {row.row}: {row.data?.name} · {row.data?.email || row.data?.phone} — {row.message}</p>)}</div>
        <p className="text-sm">Chỉ lưu dòng tạo mới / liên kết. Dòng lỗi hoặc mâu thuẫn không được nhập. Bản xem trước có hiệu lực 15 phút.</p>
        <button disabled={busy || !(preview.counts.CREATE + preview.counts.LINK)} className={button} onClick={() => void run(async () => { const result = await integrationRequest<{ created: number; linked: number; skipped: number }>('', { action: mode === 'csv' ? 'import.execute' : 'students.execute', ...payload, token: preview.token }); setPreview(null); setNotice('Đã tạo ' + result.created + ', liên kết ' + result.linked + ', bỏ qua ' + result.skipped + '.'); onChanged() })}>Xác nhận lưu các dòng hợp lệ</button>
      </div>}
    </> : <>
      <p className="text-sm">Bật thu khách cho từng landing page quà tặng / webinar. Khách mới chưa được phân công; quản trị viên phân công trong hồ sơ. Form không tự gửi email xác nhận hay tự cấp quà.</p>
      {landings.map(landing => <div key={landing.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"><span className="text-sm">{landing.title} · /land/{landing.slug}{!landing.isActive && ' · Đang tắt trang'}</span><button disabled={busy} className={button} onClick={() => void run(async () => { await integrationRequest('', { action: 'capture.toggle', landingId: landing.id, updatedAt: landing.updatedAt, enabled: landing.config?.crmCapture !== true }); await loadCapture() })}>{landing.config?.crmCapture === true ? 'Tắt thu khách' : 'Bật thu khách'}</button></div>)}
      {!landings.length && <p>Chưa có landing page.</p>}
      <div className="flex gap-2"><button disabled={busy || capturePage === 1} className={button} onClick={() => void run(() => loadCapture(capturePage - 1))}>Trang form trước</button><button disabled={busy || capturePage * 20 >= captureTotal} className={button} onClick={() => void run(() => loadCapture(capturePage + 1))}>Trang form sau</button></div>
      <h3 className="font-semibold">Yêu cầu có định danh mâu thuẫn</h3><p className="text-sm">Kiểm tra thông tin trước khi gắn yêu cầu vào hồ sơ đúng. Thao tác này giữ nguyên email, điện thoại và tài khoản liên kết.</p>
      {submissions.map(item => <div key={item.id} className="space-y-2 rounded-xl border p-3 text-sm"><p>Yêu cầu #{item.id} · {item.landing.title}</p><p className="break-all">{String(item.data.name)} · {String(item.data.email)} · {String(item.data.phone)}</p><p>Nguồn: {String(item.data.utmSource || '')} · Chiến dịch: {String(item.data.utmCampaign || '')}</p><label>Mã hồ sơ khách đã kiểm tra<input disabled={busy} className={input} type="number" min={1} value={resolveIds[item.id] || ''} onChange={e => setResolveIds(values => ({ ...values, [item.id]: e.target.value }))} /></label><button disabled={busy || !resolveIds[item.id]} className={button} onClick={() => void run(async () => { await integrationRequest('', { action: 'submission.resolve', id: item.id, contactId: Number(resolveIds[item.id]) }); await loadCapture(); onChanged() })}>Xác nhận gắn yêu cầu vào hồ sơ này</button></div>)}
      {!submissions.length && <p className="text-sm">Không có yêu cầu cần kiểm tra.</p>}
      <div className="flex gap-2"><button disabled={busy || inboxPage === 1} className={button} onClick={() => void run(() => loadCapture(capturePage, inboxPage - 1))}>Yêu cầu trước</button><button disabled={busy || inboxPage * 20 >= inboxTotal} className={button} onClick={() => void run(() => loadCapture(capturePage, inboxPage + 1))}>Yêu cầu sau</button></div>
    </>}
  </div></details>
}

type WebsiteData = { user: { id: number; name: string | null; email: string; phone: string | null } | null; enrollments: { id: number; status: string; course: { id: number; title: string }; payment: { id: number; amount: number; status: string; verifiedAt: string | null } | null; _count: { lessonProgress: number } }[]; total: number; page: number }
export function CrmWebsitePanel({ contactId, version, isAdmin, onChanged }: { contactId: number; version: number; isAdmin: boolean; onChanged: () => void }) {
  const [data, setData] = useState<WebsiteData | null>(null); const [page, setPage] = useState(1)
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState(''); const [users, setUsers] = useState<Student[]>([])
  useEffect(() => {
    let active = true
    integrationRequest<WebsiteData>('?view=website&contactId=' + contactId + '&page=' + page).then(result => { if (active) { setData(result); setError('') } }).catch(e => { if (active) { setData(null); setError(e.message) } })
    return () => { active = false }
  }, [contactId, version, page])
  const run = async (work: () => Promise<void>) => { setBusy(true); setError(''); try { await work() } catch (e) { setError(e instanceof Error ? e.message : 'Không thể liên kết.') } finally { setBusy(false) } }
  return <section className="space-y-3 rounded-2xl border bg-white p-4"><h3 className="font-bold">Tài khoản, khóa học & thanh toán</h3>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {data ? data.user ? <><p className="break-all text-sm">Tài khoản #{data.user.id}: {data.user.name} · {data.user.email}</p>
      {data.enrollments.map(item => <div key={item.id} className="rounded-xl border p-3 text-sm"><strong>{item.course.title} · mã khóa {item.course.id}</strong><p>Đăng ký: {item.status} · {item._count.lessonProgress} bài có ghi nhận tiến độ</p><p>{item.payment ? 'Thanh toán #' + item.payment.id + ': ' + item.payment.amount.toLocaleString('vi-VN') + ' đ · ' + ({ VERIFIED: 'Đã xác minh', PENDING: 'Chờ xác minh', REJECTED: 'Bị từ chối', CANCELLED: 'Đã hủy' }[item.payment.status] || item.payment.status) : 'Chưa có thanh toán'}</p></div>)}
      {!data.enrollments.length && <p className="text-sm">Chưa đăng ký khóa học.</p>}
      <div className="flex gap-2"><button className={button} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</button><button className={button} disabled={page * 100 >= data.total} onClick={() => setPage(p => p + 1)}>Sau</button></div>
      {isAdmin && <button disabled={busy} className={button} onClick={() => void run(async () => { await integrationRequest('', { action: 'identity.link', contactId, version, userId: null }); onChanged() })}>Hủy liên kết tài khoản</button>}
    </> : <p className="text-sm">Chưa liên kết tài khoản. Quản trị viên có thể tìm và xác nhận bên dưới.</p> : <p className="text-sm">Đang tải dữ liệu website…</p>}
    {isAdmin && !data?.user && <><form className="flex gap-2" onSubmit={e => { e.preventDefault(); void run(async () => { const result = await integrationRequest<{ users: Student[] }>('?view=students&q=' + encodeURIComponent(query)); setUsers(result.users) }) }}><input aria-label="Tìm tài khoản liên kết" required minLength={3} className={input} value={query} onChange={e => setQuery(e.target.value)} placeholder="Tên, email hoặc điện thoại" /><button disabled={busy} className={button}>Tìm</button></form>{users.map(user => <div key={user.id} className="space-y-2 rounded-xl border p-3 text-sm"><p className="break-all">#{user.id} · {user.name} · {user.email} · {user.phone}</p><button disabled={busy || !!user.crmIdentityContact} className={button} onClick={() => void run(async () => { await integrationRequest('', { action: 'identity.link', contactId, version, userId: user.id }); setUsers([]); onChanged() })}>Xác nhận liên kết tài khoản này</button></div>)}</>}
    <p className="text-xs text-slate-500">Dữ liệu được đọc từ website. CRM không sửa đăng ký, xác minh thanh toán hoặc tính hoa hồng.</p>
  </section>
}
