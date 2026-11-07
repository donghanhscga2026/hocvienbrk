'use client'
import { useEffect, useState } from 'react'
import { BookOpenText, CalendarClock, Dices, Pencil, Plus, RefreshCw, Search, X } from 'lucide-react'

type Scope = 'SYSTEM' | 'COURSE' | 'PERSONAL'
type CareTemplate = {
  id: number; shortcut: string; name: string; body: string; scope: Scope
  courseId: number | null; courseName: string | null; ownerId: number; ownerName: string
  usedCount: number; isActive: boolean; canEdit: boolean; updatedAt: string
}
type CourseOption = { id: number; name: string }
type FollowUp = {
  id: number; studentId: number; studentName: string; courseId: number | null; courseName: string | null
  ruleId: string | null; templateId: number | null; templateName: string | null; note: string | null
  dueAt: string; status: string; createdByName: string; sentAt: string | null
  cancelledAt: string | null; cancelReason: string | null; canCancel: boolean
}
type QueueStudent = { userId: number; userName: string; courseId: number; courseName: string; ruleId: string }

const SCOPE_LABEL: Record<Scope, string> = { SYSTEM: 'Toàn hệ thống', COURSE: 'Theo khóa', PERSONAL: 'Cá nhân giảng viên' }
const SCOPE_BADGE: Record<Scope, string> = {
  SYSTEM: 'bg-sky-50 text-sky-800 ring-sky-200',
  COURSE: 'bg-amber-50 text-amber-800 ring-amber-200',
  PERSONAL: 'bg-teal-50 text-teal-800 ring-teal-200',
}
const FOLLOW_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Đang chờ', cls: 'text-amber-700' },
  SENT: { label: 'Đã gửi nhắc', cls: 'text-emerald-700' },
  CANCELLED_AUTO: { label: 'Tự hủy — học viên đã phản hồi', cls: 'text-violet-700' },
  CANCELLED_MANUAL: { label: 'Đã hủy tay', cls: 'text-slate-400' },
}
const SAMPLE_VARS: Record<string, string> = {
  name: 'Hồng Nhung', course: 'Zalo Mastery K02', lesson: 'Ngày 14', streak: '12', amount: '499.000đ', days: '3', hours: '26',
}

/** Xem trước phía client (chỉ để soạn mẫu): điền biến HV mẫu + tung spintax ngẫu nhiên. */
function previewRender(body: string): string {
  const filled = body.replace(/\{(name|course|lesson|streak|amount|days|hours)\}/g, (m, key: string) => SAMPLE_VARS[key] ?? m)
  return filled.replace(/\{([^{}]*\|[^{}]*)\}/g, (_m, group: string) => {
    const options = group.split('|')
    return options[Math.floor(Math.random() * options.length)]
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function api(path: string, method: string, body?: unknown) {
  const response = await fetch(path, {
    method, cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'Không xử lý được yêu cầu.')
  return data
}

type EditorState = { id: number | null; name: string; shortcut: string; scope: Scope; courseId: number | ''; body: string }

export default function CrmCareTemplates({ revision }: { revision: number }) {
  const [templates, setTemplates] = useState<CareTemplate[] | null>(null)
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [students, setStudents] = useState<QueueStudent[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [query, setQuery] = useState('')
  const [scopeFilter, setScopeFilter] = useState<Scope | 'all'>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [previewTick, setPreviewTick] = useState(0)
  const [busy, setBusy] = useState(false)
  const [fuStudent, setFuStudent] = useState('')
  const [fuDays, setFuDays] = useState(3)
  const [fuTemplate, setFuTemplate] = useState('')
  const [fuNote, setFuNote] = useState('')

  useEffect(() => {
    const abort = new AbortController()
    setError('')
    Promise.all([
      fetch('/api/crm/care-templates' + (showInactive ? '?includeInactive=1' : ''), { cache: 'no-store', signal: abort.signal }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Không tải được thư viện câu mẫu.'); return d }),
      fetch('/api/crm/care-followups?withStudents=1', { cache: 'no-store', signal: abort.signal }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Không tải được hẹn theo dõi.'); return d }),
    ]).then(([tpl, fu]) => {
      if (abort.signal.aborted) return
      setTemplates(tpl.templates); setCourses(tpl.courses); setIsAdmin(Boolean(tpl.isAdmin))
      setFollowUps(fu.followUps || []); setStudents(fu.students || [])
    }).catch(e => { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.') })
    return () => abort.abort()
  }, [revision, refresh, showInactive])

  if (error) return <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}<button className="ml-3 underline" onClick={() => setRefresh(v => v + 1)}>Thử lại</button></div>
  if (!templates) return <p role="status" className="p-4 text-sm text-slate-500">Đang tải thư viện câu mẫu…</p>

  const q = query.trim().toLowerCase()
  const visible = templates.filter(t => (scopeFilter === 'all' || t.scope === scopeFilter) && (!q || t.name.toLowerCase().includes(q) || t.shortcut.includes(q) || t.body.toLowerCase().includes(q)))
  const activeTemplates = templates.filter(t => t.isActive)
  void previewTick

  const openEditor = (t?: CareTemplate) => {
    setNotice('')
    setEditor(t ? { id: t.id, name: t.name, shortcut: t.shortcut, scope: t.scope, courseId: t.courseId ?? '', body: t.body }
      : { id: null, name: '', shortcut: '/', scope: isAdmin ? 'SYSTEM' : 'PERSONAL', courseId: '', body: '' })
  }

  const saveEditor = async () => {
    if (!editor) return
    setBusy(true); setError('')
    try {
      const payload = {
        name: editor.name, shortcut: editor.shortcut, body: editor.body, scope: editor.scope,
        courseId: editor.scope === 'COURSE' ? (editor.courseId === '' ? null : Number(editor.courseId)) : null,
      }
      if (editor.id) await api('/api/crm/care-templates/' + editor.id, 'PATCH', payload)
      else await api('/api/crm/care-templates', 'POST', payload)
      setEditor(null); setNotice('Đã lưu câu mẫu vào thư viện dùng chung.'); setRefresh(v => v + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được câu mẫu.') } finally { setBusy(false) }
  }

  const toggleActive = async (t: CareTemplate) => {
    setBusy(true); setError('')
    try {
      if (t.isActive) await api('/api/crm/care-templates/' + t.id, 'DELETE')
      else await api('/api/crm/care-templates/' + t.id, 'PATCH', { isActive: true })
      setRefresh(v => v + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Không đổi được trạng thái câu mẫu.') } finally { setBusy(false) }
  }

  const insertVar = (token: string) => {
    if (!editor) return
    setEditor({ ...editor, body: editor.body + token })
  }

  const createFollowUp = async () => {
    const picked = students.find(s => `${s.userId}:${s.courseId}` === fuStudent)
    if (!picked) { setError('Hãy chọn 1 học viên trong hàng đợi cần chăm để đặt hẹn.'); return }
    setBusy(true); setError('')
    try {
      await api('/api/crm/care-followups', 'POST', {
        studentId: picked.userId, courseId: picked.courseId, ruleId: picked.ruleId,
        templateId: fuTemplate ? Number(fuTemplate) : null,
        note: fuNote.trim() || null, days: fuDays,
      })
      setFuNote(''); setNotice(`Đã đặt hẹn theo dõi ${picked.userName} sau ${fuDays} ngày — học viên phản hồi là hẹn tự hủy.`); setRefresh(v => v + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Không đặt được hẹn.') } finally { setBusy(false) }
  }

  const cancelFollowUp = async (f: FollowUp) => {
    setBusy(true); setError('')
    try {
      await api('/api/crm/care-followups/' + f.id, 'DELETE')
      setNotice('Đã hủy hẹn theo dõi của ' + f.studentName + '.'); setRefresh(v => v + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Không hủy được hẹn.') } finally { setBusy(false) }
  }

  const inputCls = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const pendingFollowUps = followUps.filter(f => f.status === 'PENDING')

  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-slate-500">Một thư viện duy nhất cho khung gửi nhắc, hẹn giờ theo dõi và các kênh chăm sóc sau này. Biến {'{name} {course} {lesson} {streak} {amount}'} được hệ thống tự điền theo đúng học viên; spintax {'{a|b|c}'} chọn ngẫu nhiên mỗi lượt gửi.</p>
      <button aria-label="Làm mới thư viện câu mẫu" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border bg-white" onClick={() => setRefresh(v => v + 1)}><RefreshCw size={17} /></button>
    </div>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

    <div className="grid gap-5 xl:grid-cols-5">
      <section className="space-y-3 xl:col-span-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><BookOpenText size={16} /> Thư viện câu mẫu · {visible.length}</h2>
          <span className="flex-1" />
          <label className="relative block w-full sm:w-60">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} maxLength={100} placeholder="Tìm câu mẫu" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </label>
          <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value as Scope | 'all')} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="all">Mọi phạm vi</option>
            <option value="SYSTEM">Toàn hệ thống</option>
            <option value="COURSE">Theo khóa</option>
            <option value="PERSONAL">Cá nhân giảng viên</option>
          </select>
          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="h-4 w-4" /> Hiện mẫu đã tắt</label>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800" onClick={() => openEditor()}><Plus size={16} /> Thêm câu mẫu</button>
        </div>

        {editor && <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between"><strong className="text-sm text-slate-900">{editor.id ? 'Sửa câu mẫu' : 'Soạn câu mẫu mới'}</strong><button aria-label="Đóng trình soạn" className="rounded-lg p-1 hover:bg-white" onClick={() => setEditor(null)}><X size={16} /></button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} maxLength={120} placeholder="Tên câu mẫu" className={inputCls} />
            <input value={editor.shortcut} onChange={e => setEditor({ ...editor, shortcut: e.target.value })} maxLength={31} placeholder="Phím tắt, ví dụ /giu-chuoi" className={inputCls} />
            <select value={editor.scope} onChange={e => setEditor({ ...editor, scope: e.target.value as Scope })} className={inputCls}>
              <option value="SYSTEM" disabled={!isAdmin}>Toàn hệ thống (chỉ quản trị)</option>
              <option value="COURSE">Theo khóa</option>
              <option value="PERSONAL">Cá nhân giảng viên</option>
            </select>
            {editor.scope === 'COURSE' && <select value={editor.courseId} onChange={e => setEditor({ ...editor, courseId: e.target.value === '' ? '' : Number(e.target.value) })} className={inputCls}>
              <option value="">— Chọn khóa học —</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['{name}', '{course}', '{lesson}', '{streak}', '{amount}', '{Chào|Xin chào} '].map(token => <button key={token} type="button" className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100" onClick={() => insertVar(token)}>+ {token}</button>)}
          </div>
          <textarea value={editor.body} onChange={e => setEditor({ ...editor, body: e.target.value })} rows={4} maxLength={2000} placeholder="Nội dung câu mẫu…" className={inputCls} />
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <div className="mb-1 flex items-center justify-between"><span className="text-xs font-medium text-slate-500">Xem trước với học viên mẫu (Hồng Nhung · Zalo Mastery K02)</span><button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700" onClick={() => setPreviewTick(v => v + 1)}><Dices size={13} /> Tung lại spintax</button></div>
            <p className="text-sm leading-6 text-slate-700">{editor.body ? previewRender(editor.body) : 'Nội dung xem trước sẽ hiện ở đây.'}</p>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" onClick={() => void saveEditor()}>{busy ? 'Đang lưu…' : 'Lưu câu mẫu'}</button>
            <button className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm" onClick={() => setEditor(null)}>Hủy</button>
          </div>
        </div>}

        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {visible.map(t => <article key={t.id} className={'space-y-1.5 p-4 ' + (t.isActive ? '' : 'opacity-60')}>
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm text-slate-900">{t.name}</strong>
              <span className={'rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ' + SCOPE_BADGE[t.scope]}>{SCOPE_LABEL[t.scope]}{t.courseName ? ' · ' + t.courseName : ''}</span>
              <span className="text-xs text-slate-400">phím tắt <b className="text-slate-600">{t.shortcut}</b> · đã dùng {t.usedCount} lần · của {t.ownerName}</span>
              {!t.isActive && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Đã tắt</span>}
            </div>
            <p className="text-sm leading-6 text-slate-600">{previewRender(t.body)}</p>
            {t.canEdit && <div className="flex gap-2 pt-1">
              <button disabled={busy} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-100 disabled:opacity-50" onClick={() => openEditor(t)}><Pencil size={13} /> Sửa mẫu</button>
              <button disabled={busy} className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-100 disabled:opacity-50" onClick={() => void toggleActive(t)}>{t.isActive ? 'Tắt mẫu' : 'Bật lại'}</button>
            </div>}
          </article>)}
          {visible.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Không có câu mẫu nào khớp bộ lọc.</p>}
        </div>
      </section>

      <section className="space-y-3 xl:col-span-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CalendarClock size={16} /> Hẹn giờ theo dõi đang chờ · {pendingFollowUps.length}</h2>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tạo hẹn mới</p>
          <select value={fuStudent} onChange={e => setFuStudent(e.target.value)} className={inputCls}>
            <option value="">— Chọn học viên trong hàng đợi cần chăm —</option>
            {students.map(s => <option key={`${s.userId}:${s.courseId}`} value={`${s.userId}:${s.courseId}`}>{s.userName} — {s.courseName}</option>)}
          </select>
          <select value={fuDays} onChange={e => setFuDays(Number(e.target.value))} className={inputCls}>
            <option value={1}>Sau 1 ngày nếu chưa phản hồi</option>
            <option value={3}>Sau 3 ngày nếu chưa phản hồi</option>
            <option value={7}>Sau 7 ngày nếu chưa phản hồi</option>
          </select>
          <select value={fuTemplate} onChange={e => setFuTemplate(e.target.value)} className={inputCls}>
            <option value="">— Câu mẫu mặc định khi tới hạn —</option>
            {activeTemplates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.shortcut})</option>)}
          </select>
          <input value={fuNote} onChange={e => setFuNote(e.target.value)} maxLength={500} placeholder="Ghi chú / nội dung nhắc riêng (tùy chọn)" className={inputCls} />
          <button disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" onClick={() => void createFollowUp()}>Đặt hẹn theo dõi</button>
          <p className="text-xs leading-5 text-slate-500">Cơ chế: hẹn nằm ở trạng thái chờ, lượt quét sáng của hệ thống sẽ rà các hẹn tới hạn. Học viên chỉ cần nộp bài / bình luận / gửi yêu cầu mới là hẹn tự hủy — không ai bị nhắc thừa.</p>
        </div>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {followUps.map(f => {
            const st = FOLLOW_STATUS[f.status] || { label: f.status, cls: 'text-slate-500' }
            return <article key={f.id} className="space-y-1 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm text-slate-900">{f.studentName}</strong>
                <span className="text-xs text-slate-400">{f.courseName || 'Không gắn khóa'}{f.ruleId ? ' · ' + f.ruleId : ''}</span>
              </div>
              <p className="text-xs text-slate-500">{f.templateName ? 'Mẫu: ' + f.templateName + ' · ' : ''}Hạn: {formatDateTime(f.dueAt)} · Người đặt: {f.createdByName}</p>
              {f.note && <p className="text-xs text-slate-500">Ghi chú: {f.note}</p>}
              <div className="flex items-center gap-2">
                <span className={'text-xs font-medium ' + st.cls}>{st.label}{f.status === 'CANCELLED_AUTO' && f.cancelReason ? ' · ' + f.cancelReason : ''}{f.status === 'SENT' && f.sentAt ? ' · ' + formatDateTime(f.sentAt) : ''}</span>
                <span className="flex-1" />
                {f.canCancel && <button disabled={busy} className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-100 disabled:opacity-50" onClick={() => void cancelFollowUp(f)}>Hủy hẹn</button>}
              </div>
            </article>
          })}
          {followUps.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Chưa có hẹn theo dõi nào.</p>}
        </div>
      </section>
    </div>
  </div>
}
