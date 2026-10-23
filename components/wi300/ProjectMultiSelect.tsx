'use client'
import { useEffect, useId, useRef, useState } from 'react'

type Option = { slug: string; name: string; selected: boolean }
export default function ProjectMultiSelect({ options, disabled, onChange }: { options: Option[]; disabled: boolean; onChange: (slug: string, checked: boolean) => void }) {
  const id = useId(), panel = useRef<HTMLDivElement>(null), [search, setSearch] = useState('')
  const selected = options.filter(item => item.selected)
  const filtered = options.filter(item => item.name.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')))
  useEffect(() => {
    const close = (event: Event) => { if (event.type === 'scroll' && event.target instanceof Node && panel.current?.contains(event.target)) return; panel.current?.hidePopover?.() }
    window.addEventListener('resize', close); document.addEventListener('scroll', close, true)
    return () => { window.removeEventListener('resize', close); document.removeEventListener('scroll', close, true) }
  }, [])
  return <div className="min-w-0 space-y-2">
    <button type="button" aria-label="Chọn dự án liên kết" disabled={disabled} popoverTarget={id} onClick={event => {
      setSearch('')
      const rect = event.currentTarget.getBoundingClientRect(), width = Math.min(window.innerWidth - 16, Math.max(240, rect.width))
      if (panel.current) { panel.current.style.width = `${width}px`; panel.current.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`; panel.current.style.top = `${rect.bottom + 350 > window.innerHeight ? Math.max(8, rect.top - 350) : rect.bottom + 6}px` }
    }} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-brk-outline bg-white px-3 text-left text-sm disabled:opacity-50"><span>{selected.length ? `Đã chọn ${selected.length} dự án` : 'Chọn dự án…'}</span><span aria-hidden>▾</span></button>
    {selected.length > 0 && <p className="line-clamp-2 break-words text-xs leading-5 text-brk-muted" title={selected.map(item => item.name).join(', ')}>{selected.map(item => item.name).join(', ')}</p>}
    <div id={id} ref={panel} popover="auto" aria-label="Danh sách dự án liên kết" className="fixed inset-auto m-0 rounded-xl border border-brk-outline bg-white p-3 text-brk-on-surface shadow-xl">
      <input aria-label="Tìm dự án liên kết" value={search} disabled={disabled} onChange={event => setSearch(event.target.value)} placeholder="Tìm dự án…" className="mb-2 min-h-11 w-full rounded-lg border border-brk-outline px-3 text-sm" />
      <div className="max-h-56 overflow-y-auto">{filtered.map(item => <label key={item.slug} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-brk-background"><input type="checkbox" checked={item.selected} disabled={disabled} onChange={event => onChange(item.slug, event.target.checked)} className="h-4 w-4 shrink-0 accent-green-700" /><span className="min-w-0 break-words">{item.name}</span></label>)}{!filtered.length && <p className="p-3 text-sm text-brk-muted">Không có dự án phù hợp.</p>}</div>
      <button type="button" onClick={() => panel.current?.hidePopover?.()} className="mt-2 min-h-11 w-full rounded-lg bg-brk-background text-sm font-semibold text-brk-primary">Xong</button>
    </div>
  </div>
}
