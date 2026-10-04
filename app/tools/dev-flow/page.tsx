'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Clipboard, ExternalLink, GitBranch, Loader2, Plus, RefreshCw, XCircle } from 'lucide-react'

type TaskRow = { issue: number; title: string; meta: { branch: string; status: string }; url: string; createdAt: string }
type Detail = { issue: { number: number; title: string; url: string }; meta: { branch: string; status: string }; changed: boolean; pr: null | { number: number; url: string; state: string; merged: boolean }; ci: null | { status: string; conclusion: string | null; url: string }; vercel: null | { state: string; url: string }; previewUrl: string | null }
type Log = { id: number; at: string; body: string }

const statusLabel: Record<string, string> = {
  DEVELOPING: 'Đang phát triển', CHECKING: 'Đang kiểm tra', PREVIEW: 'Chờ nghiệm thu',
  NEEDS_FIX: 'Cần sửa', DONE: 'Hoàn thành',
}

export default function DevFlowPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', kind: 'feature' })
  const [fixNote, setFixNote] = useState('')

  const loadTasks = useCallback(async () => {
    const res = await fetch('/api/admin/dev-flow')
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    setTasks(data.tasks)
  }, [])

  const loadDetail = useCallback(async (issue: number) => {
    const res = await fetch(`/api/admin/dev-flow?issue=${issue}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    setDetail(data.task); setLogs(data.logs)
  }, [])

  useEffect(() => { loadTasks().catch(e => setError(e.message)) }, [loadTasks])
  useEffect(() => { if (selected) loadDetail(selected).catch(e => setError(e.message)) }, [selected, loadDetail])

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/admin/dev-flow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, issue: selected, ...extra }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (action === 'create') { setShowCreate(false); setForm({ title: '', description: '', kind: 'feature' }); setSelected(data.issue) }
      await loadTasks()
      if (selected || data.issue) await loadDetail(selected || data.issue)
    } catch (e) { setError(e instanceof Error ? e.message : 'Có lỗi xảy ra') } finally { setBusy(false) }
  }

  const prompt = useMemo(() => detail ? `Bạn đang tham gia phát triển dự án MFC trên GitHub.\n\nCông việc: ${detail.issue.title.replace(/^\[MFC Dev\]\s*/, '')}\nBranch duy nhất được phép làm việc: ${detail.meta.branch}\n\nBắt buộc:\n1. Đọc AGENTS.md trước khi thay đổi.\n2. Không sửa trực tiếp master.\n3. Chỉ commit/push vào branch trên.\n4. Đọc code thật trước khi sửa và tuân thủ backup/confirm trong AGENTS.md.\n5. Chạy các kiểm tra bắt buộc trước khi báo hoàn thành.\n6. Không tự ý ghi hoặc sửa dữ liệu Production.\n\nSau khi hoàn thành hãy commit và push vào branch trên. MFC Dev Flow sẽ tự theo dõi PR, CI và Vercel.` : '', [detail])

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900">MFC Dev Flow</h1><p className="text-sm text-gray-500">Tạo việc → AI phát triển → Preview → nghiệm thu</p></div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"><Plus size={16}/> Tạo công việc</button>
        </div>
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <section className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between"><b className="text-sm">Công việc</b><button onClick={() => loadTasks()} className="p-2 text-gray-500"><RefreshCw size={15}/></button></div>
            <div className="space-y-2">
              {tasks.map(t => <button key={t.issue} onClick={() => setSelected(t.issue)} className={`w-full rounded-xl border p-3 text-left ${selected===t.issue?'border-gray-900 bg-gray-50':'border-gray-100'}`}>
                <div className="text-sm font-semibold">MFC-{t.issue} · {t.title}</div><div className="mt-1 text-xs text-gray-500">{statusLabel[t.meta.status] || t.meta.status}</div>
              </button>)}
              {!tasks.length && <p className="p-4 text-center text-sm text-gray-400">Chưa có công việc.</p>}
            </div>
          </section>
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            {!detail ? <div className="py-16 text-center text-gray-400">Chọn một công việc để xem.</div> : <>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs text-gray-400">MFC-{detail.issue.number}</div><h2 className="text-xl font-bold">{detail.issue.title.replace(/^\[MFC Dev\]\s*/, '')}</h2></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{statusLabel[detail.meta.status] || detail.meta.status}</span></div>
              <div className="mt-5 rounded-xl bg-gray-50 p-3 text-sm"><div className="flex items-center gap-2"><GitBranch size={16}/><code>{detail.meta.branch}</code></div></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Status name="Code" ok={detail.changed} text={detail.changed?'Đã có cập nhật':'Đang chờ AI'}/>
                <Status name="CI" ok={detail.ci?.conclusion==='success'} text={detail.ci?.conclusion || detail.ci?.status || 'Chưa chạy'}/>
                <Status name="Vercel" ok={detail.vercel?.state==='success'} text={detail.vercel?.state || 'Chưa chạy'}/>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => act('sync')} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?<Loader2 className="inline animate-spin" size={15}/>:<RefreshCw className="inline" size={15}/>} Đồng bộ</button>
                <button onClick={() => navigator.clipboard.writeText(prompt)} className="rounded-xl border px-4 py-2 text-sm font-semibold"><Clipboard className="mr-1 inline" size={15}/> Copy thông tin giao AI</button>
                <button onClick={() => setShowLogs(!showLogs)} className="rounded-xl border px-4 py-2 text-sm font-semibold"><Activity className="mr-1 inline" size={15}/> Xem log</button>
                {detail.previewUrl && <a href={detail.previewUrl} target="_blank" className="rounded-xl border px-4 py-2 text-sm font-semibold">Mở Preview <ExternalLink className="inline" size={14}/></a>}
              </div>
              {detail.meta.status === 'PREVIEW' && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><b>Preview đã sẵn sàng để nghiệm thu</b><div className="mt-3 flex gap-2"><button onClick={() => act('needs-fix',{note:fixNote})} className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700"><XCircle className="mr-1 inline" size={15}/> Cần sửa</button><button onClick={() => act('merge')} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"><CheckCircle2 className="mr-1 inline" size={15}/> Đã đạt & Merge</button></div><textarea value={fixNote} onChange={e=>setFixNote(e.target.value)} placeholder="Nếu cần sửa, ghi ngắn gọn vấn đề tại đây..." className="mt-3 w-full rounded-xl border bg-white p-3 text-sm"/></div>}
              {showLogs && <div className="mt-5 border-t pt-4"><h3 className="mb-3 font-semibold">Activity Log</h3><div className="space-y-3">{logs.map(l=><div key={l.id} className="text-sm"><div className="text-xs text-gray-400">{new Date(l.at).toLocaleString('vi-VN')}</div><div className="whitespace-pre-wrap text-gray-700">{l.body}</div></div>)}</div></div>}
            </>}
          </section>
        </div>
      </div>
      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"><h2 className="text-lg font-bold">Tạo công việc mới</h2><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Tên công việc" className="mt-4 w-full rounded-xl border p-3"/><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Mô tả yêu cầu..." className="mt-3 min-h-28 w-full rounded-xl border p-3"/><select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})} className="mt-3 w-full rounded-xl border p-3"><option value="feature">Tính năng mới</option><option value="fix">Sửa lỗi</option><option value="chore">Kỹ thuật</option><option value="docs">Tài liệu</option></select><div className="mt-4 flex justify-end gap-2"><button onClick={()=>setShowCreate(false)} className="rounded-xl border px-4 py-2">Hủy</button><button disabled={busy||!form.title.trim()} onClick={()=>act('create',form)} className="rounded-xl bg-gray-900 px-4 py-2 font-semibold text-white disabled:opacity-50">Tạo công việc</button></div></div></div>}
    </main>
  )
}

function Status({name,ok,text}:{name:string;ok:boolean;text:string}) {
  return <div className="rounded-xl border p-3"><div className="text-xs text-gray-400">{name}</div><div className={`mt-1 text-sm font-semibold ${ok?'text-emerald-700':'text-gray-600'}`}>{ok?'✓ ':''}{text}</div></div>
}
