'use client'

import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { CalendarClock, Check, ChevronLeft, ChevronRight, Loader2, Plus, Search, Users, X } from 'lucide-react'
import CrmDataTools, { CrmWebsitePanel, integrationRequest } from './CrmDataTools'
import {
  ACTIVITY_LABELS, CRM_STAGES, CrmContactView, CrmDetail, CrmOpportunityView, CrmOwner, CrmStageValue,
  CrmTaskView, formatCrmDate, isOpenStage, STAGE_LABELS, vietnamInputToIso,
} from '@/lib/crm/shared'

const input = 'w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50'
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50'
const money = (value: number) => value.toLocaleString('vi-VN') + ' đ'
type Command = Record<string, unknown>
type TasksResult = { tasks: (CrmTaskView & { contact: { id: number; name: string; owner: CrmOwner | null } })[]; total: number; stats: { overdue: number; today: number; unscheduled: number } }

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, cache: 'no-store' })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Không thể xử lý yêu cầu.')
  return data as T
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close() }, [])
  return <dialog ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); onClose() }} className="m-auto max-h-[94dvh] w-[calc(100%_-_1rem)] max-w-3xl overflow-y-auto rounded-2xl bg-slate-50 p-0 shadow-2xl backdrop:bg-black/50">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3"><h2 className="font-bold text-slate-900">{title}</h2><button className={secondary} aria-label="Đóng" onClick={onClose}><X size={18} /></button></div>
    <div className="space-y-4 p-4 sm:p-6">{children}</div>
  </dialog>
}
function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / 20))
  return <div className="flex items-center justify-between gap-2 py-4 text-sm"><span>{total} kết quả · Trang {page}/{pages}</span><div className="flex gap-2"><button aria-label="Trang trước" className={secondary} disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={18} /></button><button aria-label="Trang sau" className={secondary} disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight size={18} /></button></div></div>
}

// Complete contact editor; a caregiver cannot change assignment in the UI or API.
function ContactEditor({ contact, owners, actorId, isAdmin, busy, onSave, onCancel }: {
  contact?: CrmContactView; owners: CrmOwner[]; actorId: number; isAdmin: boolean; busy: boolean;
  onSave: (data: Command) => Promise<boolean>; onCancel: () => void;
}) {
  const [name, setName] = useState(contact?.name || '')
  const [email, setEmail] = useState(contact?.email || '')
  const [phone, setPhone] = useState(contact?.phone || '')
  const [source, setSource] = useState(contact?.source || 'Nhập tay')
  const [needs, setNeeds] = useState(contact?.needs || '')
  const [tags, setTags] = useState(contact?.tags.join(', ') || '')
  const [owner, setOwner] = useState(String(contact ? (contact.ownerId ?? '') : actorId))
  const [archived, setArchived] = useState(contact?.archived || false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await onSave({ name, email, phone, source, needs, tags: tags.split(',').map(tag => tag.trim()).filter(Boolean), ownerId: owner === '' ? null : Number(owner), archived })
  }
  return <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Họ tên *"><input autoFocus required maxLength={150} className={input} value={name} onChange={e => setName(e.target.value)} /></Field>
      <Field label="Nguồn khách *"><input required maxLength={100} className={input} value={source} onChange={e => setSource(e.target.value)} placeholder="Facebook, người giới thiệu…" /></Field>
      <Field label="Email"><input type="email" maxLength={254} className={input} value={email} onChange={e => setEmail(e.target.value)} /></Field>
      <Field label="Điện thoại"><input type="tel" maxLength={40} className={input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="090… hoặc +84…" /></Field>
      <Field label="Nhãn (cách nhau bằng dấu phẩy)"><input maxLength={600} className={input} value={tags} onChange={e => setTags(e.target.value)} placeholder="Quan tâm AI, Cần tư vấn" /></Field>
      <Field label="Người phụ trách"><select disabled={!isAdmin} className={input} value={owner} onChange={e => setOwner(e.target.value)}><option value="">Chưa phân công</option>{owners.map(person => <option key={person.id} value={person.id}>{person.name || person.email} · #{person.id}</option>)}</select></Field>
    </div>
    <Field label="Nhu cầu, mục tiêu, ngân sách, thời điểm dự kiến"><textarea maxLength={4000} rows={4} className={input} value={needs} onChange={e => setNeeds(e.target.value)} /></Field>
    <p className="text-xs text-slate-500">Cần ít nhất email hoặc điện thoại. Khách chưa có tài khoản vẫn được lưu.</p>
    {contact && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)} />Lưu trữ khách (giữ toàn bộ lịch sử)</label>}
    <div className="flex gap-2"><button disabled={busy} className={button} type="submit">{busy ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}Lưu hồ sơ</button><button type="button" disabled={busy} className={secondary} onClick={onCancel}>Hủy</button></div>
  </form>
}
function OpportunityEditor({ opportunity, contactId, busy, onSave, onCancel }: {
  opportunity?: CrmOpportunityView; contactId: number; busy: boolean; onSave: (data: Command) => Promise<boolean>; onCancel: () => void;
}) {
  const [title, setTitle] = useState(opportunity?.title || '')
  const [stage, setStage] = useState<CrmStageValue>(opportunity?.stage || 'NEW')
  const [amount, setAmount] = useState(String(opportunity?.amount || 0))
  const [reason, setReason] = useState(opportunity?.lostReason || '')
  const [courseId, setCourseId] = useState(String(opportunity?.courseId || ''))
  const [courses, setCourses] = useState<{ id: number; title: string }[]>([])
  useEffect(() => {
    let active = true
    integrationRequest<{ enrollments: { course: { id: number; title: string } }[] }>('?view=website&contactId=' + contactId).then(data => { if (active) setCourses(data.enrollments.map(item => item.course)) }).catch(() => {})
    return () => { active = false }
  }, [contactId])
  return <form className="space-y-3 rounded-xl border bg-white p-4" onSubmit={async e => { e.preventDefault(); await onSave({ title, stage, amount: Number(amount), lostReason: stage === 'LOST' ? reason : '', courseId: courseId ? Number(courseId) : null }) }}>
    <Field label="Khóa học / dịch vụ đang tư vấn *"><input required maxLength={200} className={input} value={title} onChange={e => setTitle(e.target.value)} /></Field>
    <Field label="Liên kết khóa đã đăng ký (nếu có)"><select className={input} value={courseId} onChange={e => setCourseId(e.target.value)}><option value="">Chưa liên kết / dịch vụ khác</option>{courseId && !courses.some(course => String(course.id) === courseId) && <option value={courseId}>Khóa #{courseId}</option>}{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></Field>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Bước tư vấn"><select className={input} value={stage} onChange={e => setStage(e.target.value as CrmStageValue)}>{CRM_STAGES.map(key => <option key={key} value={key}>{STAGE_LABELS[key]}</option>)}</select></Field><Field label="Giá trị dự kiến (VNĐ)"><input required type="number" min={0} max={2000000000} step={1} className={input} value={amount} onChange={e => setAmount(e.target.value)} /></Field></div>
    {stage === 'LOST' && <Field label="Lý do chưa thành công *"><textarea required maxLength={1000} className={input} value={reason} onChange={e => setReason(e.target.value)} /></Field>}
    {stage === 'WON' && <p className="text-xs text-slate-500">Đánh dấu chốt thành công thủ công. Đây không phải xác nhận tiền đã thanh toán.</p>}
    <div className="flex gap-2"><button disabled={busy} className={button}>Lưu cơ hội</button><button disabled={busy} type="button" className={secondary} onClick={onCancel}>Hủy</button></div>
  </form>
}
function ActivityForm({ busy, onSave }: { busy: boolean; onSave: (data: Command) => Promise<boolean> }) {
  const [type, setType] = useState('NOTE')
  const [content, setContent] = useState('')
  return <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (await onSave({ type, content })) setContent('') }}>
    <Field label="Kênh / loại trao đổi"><select className={input} value={type} onChange={e => setType(e.target.value)}>{['NOTE', 'CALL', 'ZALO', 'EMAIL', 'MEETING'].map(key => <option key={key} value={key}>{ACTIVITY_LABELS[key]}</option>)}</select></Field>
    <Field label="Đã biết gì, kết quả trao đổi và việc cần làm tiếp? *"><textarea required maxLength={4000} rows={3} className={input} value={content} onChange={e => setContent(e.target.value)} /></Field>
    <button disabled={busy} className={button}>Lưu trao đổi</button>
    <p className="text-xs text-slate-500">Lưu nhật ký trao đổi; thao tác này không gửi email hay tin nhắn.</p>
  </form>
}
function TaskForm({ busy, onSave }: { busy: boolean; onSave: (data: Command) => Promise<boolean> }) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  return <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (await onSave({ title, dueAt: vietnamInputToIso(due) })) { setTitle(''); setDue('') } }}>
    <Field label="Việc tiếp theo *"><input required maxLength={200} className={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Gọi lại, gửi lịch học, hỏi phản hồi…" /></Field>
    <Field label="Ngày giờ hẹn (giờ Việt Nam) *"><input required type="datetime-local" className={input} value={due} onChange={e => setDue(e.target.value)} /></Field>
    <button disabled={busy} className={button}>Tạo lịch chăm sóc</button>
  </form>
}

export default function CrmWorkspace() {
  const [tab, setTab] = useState<'contacts' | 'board' | 'tasks'>('contacts')
  const [contacts, setContacts] = useState<CrmContactView[]>([])
  const [total, setTotal] = useState(0)
  const [owners, setOwners] = useState<CrmOwner[]>([])
  const [actor, setActor] = useState<{ id: number; isAdmin: boolean } | null>(null)
  const [tasks, setTasks] = useState<TasksResult>({ tasks: [], total: 0, stats: { today: 0, overdue: 0, unscheduled: 0 } })
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [source, setSource] = useState('')
  const [tag, setTag] = useState('')
  const [owner, setOwner] = useState('')
  const [archived, setArchived] = useState(false)
  const [unscheduled, setUnscheduled] = useState(false)
  const [due, setDue] = useState('all')
  const [page, setPage] = useState(1)
  const [taskPage, setTaskPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadedAt, setLoadedAt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [create, setCreate] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [detail, setDetail] = useState<CrmDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [opportunity, setOpportunity] = useState<CrmOpportunityView | 'new' | null>(null)
  const [activityPage, setActivityPage] = useState(1)

  useEffect(() => {
    const abort = new AbortController()
    request<{ owners: CrmOwner[]; actor: { id: number; isAdmin: boolean } }>('/api/crm?view=owners', { signal: abort.signal })
      .then(data => { setOwners(data.owners); setActor(data.actor) }).catch(e => { if (!abort.signal.aborted) setError(e.message) })
    return () => abort.abort()
  }, [])
  useEffect(() => {
    const abort = new AbortController()
    const params = new URLSearchParams({ view: 'contacts', page: String(page), q: search, source, tag, archived: String(archived) })
    if (stage) params.set('stage', stage)
    if (owner !== '') params.set('ownerId', owner)
    if (unscheduled) params.set('due', 'unscheduled')
    const load = async () => {
      setLoading(true)
      try {
        const [list, taskList] = await Promise.all([
          request<{ contacts: CrmContactView[]; total: number }>('/api/crm?' + params, { signal: abort.signal }),
          request<TasksResult>('/api/crm?view=tasks&due=' + due + '&page=' + taskPage, { signal: abort.signal }),
        ])
        setContacts(list.contacts); setTotal(list.total); setTasks(taskList); setLoadedAt(Date.now())
      } catch (e) { if (!abort.signal.aborted) { setContacts([]); setTotal(0); setTasks({ tasks: [], total: 0, stats: { today: 0, overdue: 0, unscheduled: 0 } }); setError(e instanceof Error ? e.message : 'Không tải được CRM.') } }
      finally { if (!abort.signal.aborted) setLoading(false) }
    }
    void load()
    return () => abort.abort()
  }, [page, taskPage, search, stage, source, tag, owner, archived, due, unscheduled, revision])
  useEffect(() => {
    if (selected == null) return
    const abort = new AbortController()
    const load = async () => {
      setDetailLoading(true)
      try { const result = await request<{ contact: CrmDetail }>('/api/crm?view=detail&id=' + selected + '&activityPage=' + activityPage, { signal: abort.signal }); setDetail(result.contact) }
      catch (e) { if (!abort.signal.aborted) { setDetail(null); setError(e instanceof Error ? e.message : 'Không tải được hồ sơ.') } }
      finally { if (!abort.signal.aborted) setDetailLoading(false) }
    }
    void load()
    return () => abort.abort()
  }, [selected, revision, activityPage])

  const mutate = useCallback(async (command: Command) => {
    setBusy(true); setError(''); setNotice('')
    try {
      await request('/api/crm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) })
      setRevision(value => value + 1); setNotice('Đã lưu thành công.'); return true
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được dữ liệu.'); return false }
    finally { setBusy(false) }
  }, [])
  const open = (id: number) => { setSelected(id); setDetail(null); setEditing(false); setOpportunity(null); setActivityPage(1); setError(''); setNotice('') }
  const close = () => { if (!busy) { setSelected(null); setCreate(false); setDetail(null); setEditing(false); setOpportunity(null) } }
  const feedback = <>{error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}<button className="ml-3 underline" onClick={() => { setError(''); setRevision(value => value + 1) }}>Tải lại</button></div>}{notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}</>
  const resetPage = () => setPage(1)
  const contactCard = (contact: CrmContactView) => <button key={contact.id} onClick={() => open(contact.id)} className="w-full space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-emerald-500">
    <div className="flex justify-between gap-2"><strong className="break-words text-slate-900">{contact.name}</strong><span className="text-xs text-slate-400">#{contact.id}</span></div>
    <div className="break-all text-sm text-slate-600">{contact.phone || contact.email}</div>
    <div className="flex flex-wrap gap-1">{contact.tags.map(label => <span key={label} className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{label}</span>)}</div>
    <p className="text-xs text-slate-500">{contact.source} · {contact.owner?.name || contact.owner?.email || 'Chưa phân công'}</p>
    <div className="flex flex-wrap gap-1">{contact.opportunities.map(item => <span key={item.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs">{item.title}: {STAGE_LABELS[item.stage]}</span>)}</div>
    <p className="text-xs text-slate-500">{contact.tasks[0] ? 'Hẹn: ' + formatCrmDate(contact.tasks[0].dueAt) + ' · ' + contact.tasks[0].title : 'Chưa có lịch chăm sóc tiếp theo'}</p>
  </button>

  return <main className="mx-auto max-w-7xl space-y-5 p-3 text-slate-800 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Khách hàng & chăm sóc</h1><p className="mt-1 text-sm text-slate-500">Biết khách đang ở đâu và việc cần làm tiếp theo.</p></div><button disabled={!actor || busy} className={button} onClick={() => { setCreate(true); setError(''); setNotice('') }}><Plus size={18} />Thêm khách</button></div>
    {feedback}
    {actor?.isAdmin && <CrmDataTools owners={owners} actorId={actor.id} onChanged={() => setRevision(value => value + 1)} />}
    <div className="grid grid-cols-3 gap-2 sm:gap-4">{[
      { label: 'Việc hôm nay', value: tasks.stats.today, run: () => { setTab('tasks'); setDue('today'); setTaskPage(1) } },
      { label: 'Việc quá hạn', value: tasks.stats.overdue, run: () => { setTab('tasks'); setDue('overdue'); setTaskPage(1) } },
      { label: 'Cần lịch tiếp theo', value: tasks.stats.unscheduled, run: () => { setTab('contacts'); setUnscheduled(true); setArchived(false); setStage(''); setSource(''); setTag(''); setOwner(''); setSearch(''); setQuery(''); setPage(1) } },
    ].map(item => <button key={item.label} className="rounded-2xl border bg-white p-3 text-left sm:p-4" onClick={item.run}><div className="text-2xl font-bold text-emerald-800">{item.value}</div><div className="mt-1 text-xs sm:text-sm">{item.label}</div></button>)}</div>
    <nav aria-label="Chế độ CRM" className="flex flex-wrap gap-2">{([{ key: 'contacts', label: 'Danh sách khách' }, { key: 'board', label: 'Theo bước tư vấn' }, { key: 'tasks', label: 'Công việc' }] as const).map(item => <button key={item.key} aria-pressed={tab === item.key} className={tab === item.key ? button : secondary} onClick={() => setTab(item.key)}>{item.key === 'tasks' ? <CalendarClock size={16} /> : <Users size={16} />}{item.label}</button>)}</nav>
    {tab !== 'tasks' ? <>
      <form className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={e => { e.preventDefault(); setSearch(query); resetPage() }}>
        <Field label="Tìm tên, email hoặc điện thoại"><div className="flex gap-2"><input className={input} value={query} onChange={e => setQuery(e.target.value)} maxLength={150} /><button aria-label="Tìm khách" className={secondary}><Search size={18} /></button></div></Field>
        <Field label="Bước tư vấn"><select className={input} value={stage} onChange={e => { setStage(e.target.value); resetPage() }}><option value="">Tất cả bước</option>{CRM_STAGES.map(key => <option key={key} value={key}>{STAGE_LABELS[key]}</option>)}</select></Field>
        <Field label="Nguồn khách"><input maxLength={100} className={input} value={source} onChange={e => { setSource(e.target.value); resetPage() }} /></Field>
        <Field label="Nhãn chính xác"><input maxLength={40} className={input} value={tag} onChange={e => { setTag(e.target.value); resetPage() }} /></Field>
        {actor?.isAdmin && <Field label="Người phụ trách"><select className={input} value={owner} onChange={e => { setOwner(e.target.value); resetPage() }}><option value="">Tất cả người phụ trách</option>{owners.map(item => <option key={item.id} value={item.id}>{item.name || item.email}</option>)}</select></Field>}
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={archived} onChange={e => { setArchived(e.target.checked); resetPage() }} />Xem khách đã lưu trữ</label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={unscheduled} onChange={e => { setUnscheduled(e.target.checked); resetPage() }} />Đang tư vấn, chưa có lịch tiếp theo</label>
      </form>
      {loading ? <div role="status" className="flex justify-center p-10"><Loader2 className="animate-spin" />Đang tải…</div> : contacts.length === 0 ? <p className="rounded-2xl border bg-white p-8 text-center text-slate-500">Chưa có khách phù hợp. Hãy thêm khách hoặc thay đổi bộ lọc.</p> : tab === 'contacts' ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{contacts.map(contactCard)}</div> : <>
        <p className="text-sm text-slate-500">Bảng hiển thị các cơ hội của khách trên trang hiện tại (20 khách mỗi trang). Một khách có thể có nhiều cơ hội.</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{CRM_STAGES.map(key => {
          const items = contacts.flatMap(contact => contact.opportunities.filter(item => item.stage === key).map(item => ({ contact, item })))
          return <section key={key} className="rounded-2xl bg-slate-100 p-3"><h2 className="mb-3 flex justify-between text-sm font-bold"><span>{STAGE_LABELS[key]}</span><span>{items.length}</span></h2><div className="space-y-2">{items.map(({ contact, item }) => <button key={item.id} onClick={() => open(contact.id)} className="w-full rounded-xl border bg-white p-3 text-left"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs text-slate-500">{contact.name}</span><span className="mt-2 block text-sm text-emerald-800">{money(item.amount)}</span></button>)}{!items.length && <p className="text-xs text-slate-400">Chưa có cơ hội trên trang này</p>}</div></section>
        })}</div>
      </>}
      <Pagination page={page} total={total} onPage={setPage} />
    </> : <>
      <Field label="Lọc công việc"><select className={input + ' max-w-sm'} value={due} onChange={e => { setDue(e.target.value); setTaskPage(1) }}>{[['all', 'Tất cả việc chưa hoàn thành'], ['today', 'Đến hạn hôm nay'], ['overdue', 'Đã quá hạn'], ['done', 'Đã hoàn thành']].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
      {loading ? <p role="status">Đang tải công việc…</p> : <div className="space-y-3">{tasks.tasks.map(task => <article key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4"><button className="min-w-0 flex-1 text-left" onClick={() => open(task.contactId)}><strong className="block break-words">{task.title}</strong><span className="text-sm text-slate-500">{task.contact.name} · {task.contact.owner?.name || 'Chưa phân công'}</span><span className={'mt-1 block text-xs ' + (!task.completedAt && new Date(task.dueAt).getTime() < loadedAt ? 'text-red-700' : 'text-slate-500')}>{formatCrmDate(task.dueAt)} · giờ Việt Nam</span></button><button disabled={busy} className={secondary} onClick={() => void mutate({ action: 'task.toggle', contactId: task.contactId, taskId: task.id, completed: !task.completedAt })}>{task.completedAt ? 'Mở lại' : 'Hoàn thành'}</button></article>)}{tasks.tasks.length === 0 && <p className="rounded-xl bg-white p-6">Không có công việc phù hợp.</p>}</div>}
      <Pagination page={taskPage} total={tasks.total} onPage={setTaskPage} />
    </>}

    {create && actor && <Modal title="Thêm khách mới" onClose={close}>{feedback}<ContactEditor owners={owners} actorId={actor.id} isAdmin={actor.isAdmin} busy={busy} onCancel={close} onSave={async data => { const ok = await mutate({ action: 'contact.create', data }); if (ok) { setCreate(false); setPage(1) } return ok }} /></Modal>}
    {selected != null && <Modal title={detail?.name || 'Hồ sơ khách'} onClose={close}>{feedback}{detailLoading ? <p role="status">Đang tải hồ sơ…</p> : detail && actor ? <>
      <div className="flex flex-wrap justify-between gap-2"><span className="text-sm text-slate-500">#{detail.id} · {detail.archived ? 'Đã lưu trữ' : 'Đang chăm sóc'}</span><button disabled={busy} className={secondary} onClick={() => setEditing(!editing)}>{editing ? 'Đóng chỉnh sửa' : 'Sửa hồ sơ / phân công'}</button></div>
      {editing ? <ContactEditor key={detail.version} contact={detail} owners={owners} actorId={actor.id} isAdmin={actor.isAdmin} busy={busy} onCancel={() => setEditing(false)} onSave={async data => { const ok = await mutate({ action: 'contact.update', contactId: detail.id, version: detail.version, data }); if (ok) setEditing(false); return ok }} /> : <section className="space-y-3 rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap gap-3 text-sm">{detail.phone && <a className="text-emerald-800 underline" href={'tel:' + detail.phone}>{detail.phone}</a>}{detail.email && <a className="break-all text-emerald-800 underline" href={'mailto:' + detail.email}>{detail.email}</a>}</div>
        <p className="text-sm">Nguồn: {detail.source} · Phụ trách: {detail.owner?.name || detail.owner?.email || 'Chưa phân công'}</p>
        <p className="whitespace-pre-wrap break-words text-sm">{detail.needs || 'Chưa ghi nhận nhu cầu.'}</p><div className="flex flex-wrap gap-1">{detail.tags.map(label => <span key={label} className="rounded-md bg-emerald-50 px-2 py-1 text-xs">{label}</span>)}</div>
        <p className="text-xs text-slate-500">Liên hệ gần nhất: {detail.lastContactAt ? formatCrmDate(detail.lastContactAt) : 'Chưa ghi nhận'}</p>
      </section>}
      <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Cơ hội tư vấn</h3>{!detail.archived && <button disabled={busy} className={secondary} onClick={() => setOpportunity('new')}><Plus size={16} />Thêm cơ hội</button>}</div>
        <p className="text-xs text-slate-500">Giá trị đang tư vấn: {money(detail.opportunities.filter(item => isOpenStage(item.stage)).reduce((sum, item) => sum + item.amount, 0))}. Giá trị này chưa phải doanh thu thanh toán.</p>
        {detail.opportunities.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3"><div><strong className="text-sm">{item.title}</strong><p className="text-sm text-slate-500">{STAGE_LABELS[item.stage]} · {money(item.amount)}</p>{item.lostReason && <p className="mt-1 break-words text-xs">Lý do: {item.lostReason}</p>}</div>{!detail.archived && <button disabled={busy} className={secondary} onClick={() => setOpportunity(item)}>Sửa / chuyển bước</button>}</article>)}
        {!detail.opportunities.length && <p className="text-sm text-slate-500">Chưa có cơ hội tư vấn.</p>}
        {opportunity && !detail.archived && <OpportunityEditor key={opportunity === 'new' ? 'new' : opportunity.id} contactId={detail.id} opportunity={opportunity === 'new' ? undefined : opportunity} busy={busy} onCancel={() => setOpportunity(null)} onSave={async data => { const command = opportunity === 'new' ? { action: 'opportunity.create', contactId: detail.id, data } : { action: 'opportunity.update', contactId: detail.id, opportunityId: opportunity.id, version: opportunity.version, data }; const ok = await mutate(command); if (ok) setOpportunity(null); return ok }} />}
      </section>
      <CrmWebsitePanel key={detail.version} contactId={detail.id} version={detail.version} isAdmin={actor.isAdmin && !detail.archived} onChanged={() => setRevision(value => value + 1)} />
      <section className="space-y-3 rounded-2xl border bg-white p-4"><h3 className="font-bold">Lịch chăm sóc & việc tiếp theo</h3>{detail.tasks.map(task => <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-sm"><div><p className={task.completedAt ? 'line-through text-slate-400' : ''}>{task.title}</p><p className="text-xs text-slate-500">{formatCrmDate(task.dueAt)}{task.completedAt ? ' · Hoàn thành ' + formatCrmDate(task.completedAt) : ''}</p></div>{!detail.archived && <button disabled={busy} className={secondary} onClick={() => void mutate({ action: 'task.toggle', contactId: detail.id, taskId: task.id, completed: !task.completedAt })}>{task.completedAt ? 'Mở lại' : 'Hoàn thành'}</button>}</div>)}{!detail.archived && <TaskForm busy={busy} onSave={data => mutate({ action: 'task.create', contactId: detail.id, ...data })} />}</section>
      <section className="space-y-4 rounded-2xl border bg-white p-4"><h3 className="font-bold">Nhật ký chăm sóc</h3>{!detail.archived && <ActivityForm busy={busy} onSave={data => mutate({ action: 'activity.create', contactId: detail.id, ...data })} />}<div className="space-y-3">{detail.activities.map(activity => <article key={activity.id} className="border-l-2 border-emerald-200 pl-3"><p className="text-xs text-slate-500">{ACTIVITY_LABELS[activity.type] || activity.type} · {activity.authorName} · {formatCrmDate(activity.createdAt)}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{activity.content}</p></article>)}</div><div className="flex items-center justify-between text-xs"><button disabled={activityPage === 1} className={secondary} onClick={() => setActivityPage(value => value - 1)}>Mới hơn</button><span>{detail.activityTotal} hoạt động</span><button disabled={activityPage * 30 >= detail.activityTotal} className={secondary} onClick={() => setActivityPage(value => value + 1)}>Cũ hơn</button></div></section>
    </> : <p>Không thể mở hồ sơ này.</p>}</Modal>}
  </main>
}
