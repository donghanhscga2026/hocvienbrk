'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import PushDeviceSettings from './PushDeviceSettings'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Bell, X } from 'lucide-react'
import { formatCrmDate } from '@/lib/crm/shared'

type Row = { id: string; title: string; kind: string; readAt: string | null; createdAt: string; href: string }
type Feed = { notifications: Row[]; total: number; unread: number }
export default function NotificationBell() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const pending = useRef<AbortController | null>(null)
  const [feed, setFeed] = useState<(Feed & { userId: typeof userId }) | null>(null)
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    if (userId == null) return
    pending.current?.abort()
    const abort = new AbortController(); pending.current = abort
    try {
      const response = await fetch('/api/notifications?page=' + page, { signal: abort.signal, cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không tải được thông báo.')
      if (!abort.signal.aborted) { setFeed({ ...data, userId }); setError('') }
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được thông báo.') }
  }, [userId, page])
  // Chỉ kiểm tra khi tab đang hiển thị; hủy request cũ khi đổi trang/tài khoản.
  useEffect(() => {
    const refresh = () => { if (!document.hidden) void load() }
    refresh()
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); pending.current?.abort(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [load])
  useEffect(() => {
    const node = dialog.current
    if (open && !node?.open) node?.showModal()
    if (!open && node?.open) node.close()
  }, [open])
  if (userId == null) return null
  const current = feed?.userId === userId ? feed : null
  const unread = current?.unread || 0
  const mark = async (ids?: string[]) => {
    const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ids ? { ids } : { all: true }) })
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Không lưu được trạng thái đã đọc.') }
  }
  return <>
    <button type="button" aria-label={'Thông báo' + (unread ? ': ' + unread + ' chưa đọc' : '')} aria-haspopup="dialog" onClick={() => { setOpen(true); void load() }} className="relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-emerald-500 hover:bg-emerald-500/10"><Bell size={22} />{unread > 0 && <span className="absolute right-0 top-0 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}</button>
    <dialog ref={dialog} aria-label="Thông báo của bạn" onCancel={e => { e.preventDefault(); setOpen(false) }} className="m-auto max-h-[90dvh] w-[calc(100%_-_1rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-black/60">
      <div className="sticky top-0 flex items-center justify-between border-b bg-white p-4"><h2 className="font-bold">Thông báo <span className="text-sm font-normal">({unread} chưa đọc)</span></h2><button type="button" aria-label="Đóng thông báo" className="min-h-11 min-w-11" onClick={() => setOpen(false)}><X className="mx-auto" size={20} /></button></div>
      <div className="space-y-3 p-4">
        <PushDeviceSettings userId={String(session?.user?.id)} onBeforeInstall={() => setOpen(false)} />
        <div className="flex flex-wrap gap-2"><button disabled={busy || !unread} className="min-h-11 rounded-lg border px-3 text-sm" onClick={async () => { setBusy(true); try { await mark(); await load() } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được.') } finally { setBusy(false) } }}>Đánh dấu tất cả đã đọc</button><button className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => { router.push('/my-requests'); setOpen(false) }}>Yêu cầu của tôi</button></div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {!current ? <p role="status">Đang tải thông báo…</p> : current.notifications.length ? current.notifications.map(row => <button key={row.id} disabled={busy} className={'block w-full rounded-xl border p-3 text-left ' + (row.readAt ? 'bg-white' : 'border-emerald-200 bg-emerald-50')} onClick={async () => {
          setBusy(true)
          try { await mark([row.id]); setOpen(false); router.push(row.href); await load() } catch (e) { setError(e instanceof Error ? e.message : 'Không mở được thông báo.') } finally { setBusy(false) }
        }}><span className="block text-sm font-semibold">{!row.readAt && <span className="mr-1 text-emerald-700">●</span>}{row.title}</span><span className="mt-1 block text-xs text-slate-500">{formatCrmDate(row.createdAt)}</span></button>) : <p className="text-sm text-slate-500">Chưa có thông báo mới.</p>}
        <div className="flex items-center justify-between gap-2 text-xs"><span>Trang {page}/{Math.max(1, Math.ceil((current?.total || 0) / 20))}</span><div className="flex gap-2"><button disabled={page <= 1 || busy} className="min-h-11 rounded-lg border px-3" onClick={() => setPage(page - 1)}>Trước</button><button disabled={page * 20 >= (current?.total || 0) || busy} className="min-h-11 rounded-lg border px-3" onClick={() => setPage(page + 1)}>Sau</button></div></div>
      </div>
    </dialog>
  </>
}
