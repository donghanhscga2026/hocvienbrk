'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import PushDeviceSettings from './PushDeviceSettings'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Bell, X, CheckCheck, MessageSquare, GraduationCap, BookOpen, ChevronRight, Settings2 } from 'lucide-react'
import { formatCrmDate } from '@/lib/crm/shared'
import { useDomainBrand } from '@/components/website/DomainShell'

type Row = { id: string; title: string; kind: string; readAt: string | null; createdAt: string; href: string }
type Feed = { notifications: Row[]; total: number; unread: number; nextCursor: string | null }
type AccountFeed = Feed & { userId: string | number }
export default function NotificationBell() {
  return useDomainBrand() ? null : <PlatformNotificationBell />
}
function PlatformNotificationBell() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const role = session?.user?.role
  const router = useRouter()
  const dialog = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const pending = useRef<AbortController | null>(null)
  const dataRef = useRef<AccountFeed | null>(null)
  const openRef = useRef(false)
  const [feed, setFeed] = useState<AccountFeed | null>(null)
  const [position, setPosition] = useState({ left: 8, top: 64, width: 400, maxHeight: 560 })
  const [open, setOpen] = useState(false)
  const [deviceOpen, setDeviceOpen] = useState(false)
  const [loading, setLoading] = useState<'initial' | 'more' | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const writeFeed = useCallback((value: AccountFeed | null) => { dataRef.current = value; setFeed(value) }, [])
  const close = () => { openRef.current = false; setOpen(false) }

  const refresh = useCallback(async () => {
    if (userId == null || pending.current) return
    const abort = new AbortController()
    pending.current = abort
    setLoading('initial')
    try {
      const response = await fetch('/api/notifications?stream=1', { signal: abort.signal, cache: 'no-store' })
      const data: Feed & { error?: string } = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không tải được thông báo.')
      if (!abort.signal.aborted) {
        const old = dataRef.current
        // Khi đang xem, giữ danh sách đã tải và vị trí cuộn; làm mới số chưa đọc.
        writeFeed(openRef.current && old?.userId === userId
          ? { ...old, total: data.total, unread: data.unread }
          : { ...data, userId })
        setError('')
      }
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được thông báo.') }
    finally { if (pending.current === abort) { pending.current = null; setLoading(null) } }
  }, [userId, writeFeed])

  const loadMore = useCallback(async () => {
    const old = dataRef.current
    if (userId == null || old?.userId !== userId || !old.nextCursor || pending.current || !openRef.current) return
    const abort = new AbortController()
    pending.current = abort
    setLoading('more'); setError('')
    try {
      const response = await fetch('/api/notifications?stream=1&cursor=' + encodeURIComponent(old.nextCursor), { signal: abort.signal, cache: 'no-store' })
      const data: Feed & { error?: string } = await response.json()
      if (!response.ok) throw new Error(data.error || 'Chưa tải được thông báo tiếp theo.')
      if (!abort.signal.aborted) {
        const current = dataRef.current
        if (current?.userId !== userId) return
        const ids = new Set(current.notifications.map(row => row.id))
        // Chỉ nối cuối, không thay thế hoặc chuyển trang; chống trùng khi có dữ liệu mới.
        writeFeed({ ...data, userId, notifications: [...current.notifications, ...data.notifications.filter(row => !ids.has(row.id))] })
      }
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Chưa tải được thông báo tiếp theo.') }
    finally { if (pending.current === abort) { pending.current = null; setLoading(null) } }
  }, [userId, writeFeed])

  useEffect(() => {
    pending.current?.abort(); pending.current = null
    openRef.current = false
    writeFeed(null); setOpen(false); setLoading(null); setError('')
  }, [userId, role, writeFeed])
  useEffect(() => {
    const check = () => { if (!document.hidden) void refresh() }
    check()
    // [Tối ưu Vercel] 180 giây thay vì 60 giây: giảm 2/3 số lần gọi API thông báo nền mỗi tab.
    const timer = window.setInterval(check, 180000)
    window.addEventListener('focus', check); document.addEventListener('visibilitychange', check)
    return () => { clearInterval(timer); pending.current?.abort(); pending.current = null; window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check) }
  }, [refresh, role])

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
  // Khung cuộn riêng; khi chạm tới cuối không kéo trang phía sau.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    const padding = document.body.style.paddingRight
    const gap = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
    if (gap) document.body.style.paddingRight = (parseFloat(window.getComputedStyle(document.body).paddingRight) || 0) + gap + 'px'
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous; document.body.style.paddingRight = padding }
  }, [open])

  if (userId == null) return null
  const current = feed?.userId === userId ? feed : null
  const unread = current?.unread || 0
  const more = () => { if (!busy && !error) void loadMore() }
  const nearEnd = (node: HTMLDivElement) => node.scrollHeight - node.scrollTop - node.clientHeight < 120
  const mark = async (ids?: string[]) => {
    const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ids ? { ids } : { all: true }) })
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Không lưu được trạng thái đã đọc.') }
    const old = dataRef.current
    if (old?.userId === userId) writeFeed({ ...old, unread: ids ? Math.max(0, old.unread - old.notifications.filter(row => ids.includes(row.id) && !row.readAt).length) : 0, notifications: old.notifications.map(row => !ids || ids.includes(row.id) ? { ...row, readAt: row.readAt || new Date().toISOString() } : row) })
  }

  return <>
    <button type="button" aria-label={'Thông báo' + (unread ? ': ' + unread + ' chưa đọc' : '')} ref={trigger} aria-haspopup="dialog" aria-expanded={open} aria-controls="platform-notification-feed" onClick={() => { const next = !open; openRef.current = next; setOpen(next); void refresh() }} className="relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-emerald-500 hover:bg-emerald-500/10"><Bell size={22} />{unread > 0 && <span className="absolute right-0 top-0 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}</button>
    <div id="platform-notification-feed" ref={dialog} popover="auto" role="dialog" aria-label="Thông báo của bạn" onToggle={event => { openRef.current = event.newState === 'open'; setOpen(openRef.current) }} style={position} className="fixed m-0 overflow-hidden [&:popover-open]:flex [&:popover-open]:flex-col rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3"><div><h2 className="font-bold">Thông báo</h2><p className="mt-0.5 text-xs text-slate-500">{unread ? `${unread} thông báo chưa đọc` : 'Bạn đã đọc hết thông báo'}</p></div><button type="button" aria-label="Đóng thông báo" className="min-h-11 min-w-11" onClick={close}><X className="mx-auto" size={20} /></button></div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <div className="flex shrink-0 flex-wrap gap-2"><button disabled={busy || !unread} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40" onClick={async () => { setBusy(true); try { await mark(); await refresh() } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được.') } finally { setBusy(false) } }}><CheckCheck size={15} />Đọc tất cả</button><button className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50" onClick={() => { router.push('/my-requests'); close() }}><MessageSquare size={15} />Yêu cầu của tôi</button></div>
        <div ref={list} aria-label="Danh sách thông báo" tabIndex={0} style={{ overflowAnchor: 'none' }} className="min-h-0 flex-1 touch-pan-y space-y-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-emerald-600" onScroll={event => { if (nearEnd(event.currentTarget)) more() }} onWheel={event => { if (event.deltaY > 0 && nearEnd(event.currentTarget)) more() }} onTouchMove={event => { if (nearEnd(event.currentTarget)) more() }}>
          {!current ? <p role="status">Đang tải thông báo…</p> : current.notifications.length ? current.notifications.map(row => <button key={row.id} disabled={busy} className={'flex w-full items-start gap-2 rounded-xl p-2.5 text-left transition-colors hover:bg-slate-100 disabled:opacity-50 ' + (row.readAt ? 'bg-white' : 'bg-emerald-50/70')} onClick={async () => {
            setBusy(true)
            try { await mark([row.id]); close(); router.push(row.href); await refresh() } catch (e) { setError(e instanceof Error ? e.message : 'Không mở được thông báo.') } finally { setBusy(false) }
          }}><span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ' + (row.readAt ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700')}>{row.kind.startsWith('REQUEST') ? <MessageSquare size={18} /> : row.kind.includes('ENROLL') ? <GraduationCap size={18} /> : <BookOpen size={18} />}</span><span className="min-w-0 flex-1"><span className="block break-words text-[13px] font-semibold leading-5">{row.title}</span><span className="mt-1 block text-[11px] text-slate-500">{formatCrmDate(row.createdAt)}</span></span>{!row.readAt ? <span aria-label="Chưa đọc" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" /> : <ChevronRight size={14} className="mt-1 shrink-0 text-slate-300" />}</button>) : <p className="text-sm text-slate-500">Chưa có thông báo mới.</p>}
          {loading === 'more' && <p role="status" className="py-3 text-center text-xs text-slate-500">Đang tải thêm…</p>}
          {error && <div role="alert" className="p-3 text-sm text-red-700"><p>{error}</p><button type="button" disabled={!!loading} className="min-h-11 font-semibold" onClick={() => { setError(''); void (current?.nextCursor ? loadMore() : refresh()) }}>Thử lại</button></div>}
          {current?.notifications.length && !current.nextCursor ? <p className="py-3 text-center text-xs text-slate-400">Bạn đã xem hết thông báo.</p> : null}
        </div>
        <details className="max-h-[35dvh] shrink-0 overflow-y-auto border-t border-slate-100 pt-2" onToggle={event => setDeviceOpen(event.currentTarget.open)}><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-slate-500"><Settings2 size={15} />Cài đặt thông báo thiết bị</summary>{open && deviceOpen && <PushDeviceSettings userId={String(userId)} onBeforeInstall={close} />}</details>
      </div>
    </div>
  </>
}
