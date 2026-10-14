'use client'
import { useEffect, useId, useRef } from 'react'
import Link from 'next/link'

// Popover ở lớp trên cùng của trình duyệt nên không bị khung cuộn bảng cắt.
export default function CourseActionsMenu({ id, slug, name, status, admin, busy, onToggle }: { id: number; slug: string; name: string; status: boolean; admin: boolean; busy: boolean; onToggle: () => void }) {
  const menuId = useId(), menu = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = () => menu.current?.hidePopover?.()
    window.addEventListener('resize', close); document.addEventListener('scroll', close, true)
    return () => { window.removeEventListener('resize', close); document.removeEventListener('scroll', close, true) }
  }, [])
  return <><button type="button" aria-label={`Thao tác với ${name}`} popoverTarget={menuId} className="flex min-h-11 min-w-8 items-center justify-center rounded-lg text-xl hover:bg-brk-background" onClick={event => {
    const rect = event.currentTarget.getBoundingClientRect(), panel = menu.current
    if (panel) { panel.style.left = `${Math.max(8, Math.min(window.innerWidth - 208, rect.right - 200))}px`; panel.style.top = `${rect.bottom + 168 > window.innerHeight ? Math.max(8, rect.top - 168) : rect.bottom + 6}px` }
  }}>⋮</button><div id={menuId} ref={menu} popover="auto" className="fixed inset-auto m-0 w-[200px] rounded-xl border border-brk-outline bg-white p-2 text-brk-on-surface shadow-xl">
    <Link href={`/tools/courses/new?id=${id}&tab=sales`} className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-brk-background">Trang bán khóa học</Link>
    <Link href={`/khoa-hoc/${encodeURIComponent(slug || String(id))}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-brk-background">Xem công khai ↗</Link>
    {admin && <button type="button" disabled={busy} onClick={() => { menu.current?.hidePopover?.(); onToggle() }} className="min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-brk-background disabled:opacity-50">{status ? 'Ẩn khóa học' : 'Hiện khóa học'}</button>}
  </div></>
}
