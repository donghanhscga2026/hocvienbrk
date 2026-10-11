'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { NOTIFICATION_PAGE_SIZE } from '@/lib/notification-pagination'
import PushDeviceSettings from './PushDeviceSettings'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Bell, X, CheckCheck, MessageSquare, GraduationCap, BookOpen, ChevronRight, Settings2 } from 'lucide-react'
import { formatCrmDate } from '@/lib/crm/shared'
import { useDomainBrand } from '@/components/website/DomainShell'

type Row = { id: string; title: string; kind: string; readAt: string | null; createdAt: string; href: string }
type Feed = { notifications: Row[]; total: number; unread: number }
export default function NotificationBell() {
  return useDomainBrand() ? null : <PlatformNotificationBell />
}
function PlatformNotificationBell() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const router = useRouter()
  const dialog = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ left: 8, top: 64, width: 400, maxHeight: 600 })
  const pending = useRef<AbortController | null>(null)
  const [feed, setFeed] = useState<(Feed & { userId: typeof userId; page: number }) | null>(null)
  const [open, setOpen] = useState(false)
  const [deviceOpen, setDeviceOpen] = useState(false)
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
      if (!abort.signal.aborted) { setFeed({ ...data, userId, page }); setError('') }
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
  // Native popover renders above headers/dialogs and closes outside or on Escape.
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(400, window.innerWidth - 16)
      const top = Math.min(rect.bottom + 8, Math.max(8, window.innerHeight - 160))
      setPosition({ left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)), top, width, maxHeight: Math.max(120, Math.min(560, Math.floor(window.innerHeight * 0.7), window.innerHeight - top - 8)) })
    }
    if (open) { place(); if (!node.matches(':popover-open')) node.showPopover() }
    else if (node.matches(':popover-open')) node.hidePopover()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])
  useEffect(() => { setOpen(false); setPage(1) }, [userId])
  if (userId == null) return null
  const accountFeed = feed?.userId === userId ? feed : null
  const current = accountFeed?.page === page ? accountFeed : null
  const unread = accountFeed?.unread || 0
  const mark = async (ids?: string[]) => {
    const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ids ? { ids } : { all: true }) })
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Không lưu được trạng thái đã đọc.') }
  }
  return <>
    <button type="button" aria-label={'Thông báo' + (unread ? ': ' + unread + ' chưa đọc' : '')} ref={trigger} aria-haspopup="dialog" aria-expanded={open} aria-controls="platform-notification-feed" onClick={() => { setOpen(value => !value); void load() }} className="relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-emerald-500 hover:bg-emerald-500/10"><Bell size={22} />{unread > 0 && <span className="absolute right-0 top-0 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}</button>
    <div id="platform-notification-feed" ref={dialog} popover="auto" role="dialog" aria-label="Thông báo của bạn" onToggle={event => setOpen(event.newState === 'open')} style={position} className="fixed m-0 overflow-hidden [&:popover-open]:flex [&:popover-open]:flex-col rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3"><div><h2 className="font-bold">Thông báo</h2><p className="mt-0.5 text-xs text-slate-500">{unread ? `${unread} thông báo chưa đọc` : 'Bạn đã đọc hết thông báo'}</p></div><button type="button" aria-label="Đóng thông báo" className="min-h-11 min-w-11" onClick={() => setOpen(false)}><X className="mx-auto" size={20} /></button></div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <div className="flex shrink-0 flex-wrap gap-2"><button disabled={busy || !unread} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40" onClick={async () => { setBusy(true); try { await mark(); await load() } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được.') } finally { setBusy(false) } }}><CheckCheck size={15} />Đọc tất cả</button><button className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40" onClick={() => { router.push('/my-requests'); setOpen(false) }}><MessageSquare size={15} />Yêu cầu của tôi</button></div>
        {error && <div role="alert" className="shrink-0 text-sm text-red-700"><p>{error}</p><button type="button" className="min-h-11 font-semibold" onClick={() => void load()}>Thử lại</button></div>}
        <div aria-label="Danh sách thông báo" className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
        {!current ? <p role="status">Đang tải thông báo…</p> : current.notifications.length ? current.notifications.map(row => <button key={row.id} disabled={busy} className={'flex w-full items-start gap-2 rounded-xl p-2.5 text-left transition-colors hover:bg-slate-100 disabled:opacity-50 ' + (row.readAt ? 'bg-white' : 'bg-emerald-50/70')} onClick={async () => {
          setBusy(true)
          try { await mark([row.id]); setOpen(false); router.push(row.href); await load() } catch (e) { setError(e instanceof Error ? e.message : 'Không mở được thông báo.') } finally { setBusy(false) }
        }}><span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ' + (row.readAt ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700')}>{row.kind.startsWith('REQUEST') ? <MessageSquare size={18} /> : row.kind.includes('ENROLL') ? <GraduationCap size={18} /> : <BookOpen size={18} />}</span><span className="min-w-0 flex-1"><span className="block break-words text-[13px] font-semibold leading-5">{row.title}</span><span className="mt-1 block text-[11px] text-slate-500">{formatCrmDate(row.createdAt)}</span></span>{!row.readAt ? <span aria-label="Chưa đọc" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" /> : <ChevronRight size={14} className="mt-1 shrink-0 text-slate-300" />}</button>) : <p className="text-sm text-slate-500">Chưa có thông báo mới.</p>}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500"><span>Trang {page}/{Math.max(1, Math.ceil((accountFeed?.total || 0) / NOTIFICATION_PAGE_SIZE))}</span><div className="flex gap-2"><button disabled={page <= 1 || busy} className="min-h-11 rounded-lg border px-3" onClick={() => setPage(page - 1)}>Trước</button><button disabled={!current || page * NOTIFICATION_PAGE_SIZE >= (current?.total || 0) || busy} className="min-h-11 rounded-lg border px-3" onClick={() => setPage(page + 1)}>Sau</button></div></div>
        <details className="max-h-[35dvh] shrink-0 overflow-y-auto border-t border-slate-100 pt-2" onToggle={event => setDeviceOpen(event.currentTarget.open)}><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-slate-500"><Settings2 size={15} />Cài đặt thông báo thiết bị</summary>{open && deviceOpen && <PushDeviceSettings userId={String(userId)} onBeforeInstall={() => setOpen(false)} />}</details>
      </div>
    </div>
  </>
}
