'use client'

import { useId, useState } from 'react'
import type { ProjectCourseOption } from './WiProjectOverview'

// Giá trị form luôn lấy từ state, không phụ thuộc danh sách đang lọc/mở.
export default function ProjectCoursePicker({ courses, initialIds }: { courses: ProjectCourseOption[]; initialIds: number[] }) {
  const panelId = useId()
  const [chosen, setChosen] = useState(() => new Set(initialIds))
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = courses.filter(course => `${course.name_lop} ${course.id_khoa}`.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')))
  const all = filtered.length > 0 && filtered.every(course => chosen.has(course.id))
  function toggle(id: number) { setChosen(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function toggleAll() { setChosen(current => { const next = new Set(current); filtered.forEach(course => { if (all) next.delete(course.id); else next.add(course.id) }); return next }) }
  const selected = [...chosen]
  return <div className="space-y-3">
    <input type="hidden" name="courseLinksPresent" value="1" />
    {selected.map(id => <input key={id} type="hidden" name="courseIds" value={id} />)}
    <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-brk-outline bg-white px-4 text-left text-sm font-semibold text-brk-primary">
      <span>{selected.length ? `Đã liên kết ${selected.length} khóa học` : 'Chọn khóa học để liên kết'}</span><span aria-hidden="true">{open ? '▴' : '▾'}</span>
    </button>
    {selected.length > 0 && <div className="flex flex-wrap gap-2">{selected.slice(0, 3).map(id => <span key={id} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-brk-background py-1 pl-3 text-xs text-brk-primary"><span className="max-w-56 truncate">{courses.find(course => course.id === id)?.name_lop || `Khóa #${id}`}</span>{courses.some(course => course.id === id) && <button type="button" aria-label={`Gỡ liên kết ${courses.find(course => course.id === id)?.name_lop}`} onClick={() => toggle(id)} className="min-h-9 min-w-9">×</button>}</span>)}{selected.length > 3 && <button type="button" onClick={() => setOpen(true)} className="min-h-9 rounded-lg border border-brk-outline px-3 text-xs">+{selected.length - 3} khóa</button>}</div>}
    <div id={panelId} hidden={!open} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }} className="rounded-xl border border-brk-outline bg-white p-3 shadow-sm">
      <input aria-label="Tìm khóa để liên kết" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên hoặc mã khóa…" className="min-h-11 w-full rounded-lg border border-brk-outline px-3 text-sm" />
      <label className="my-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={all} disabled={!filtered.length} ref={element => { if (element) element.indeterminate = !all && filtered.some(course => chosen.has(course.id)) }} onChange={toggleAll} className="h-4 w-4 accent-green-700" />{all ? 'Bỏ chọn tất cả kết quả' : 'Chọn tất cả kết quả'} ({filtered.length})</label>
      <div className="max-h-72 overflow-y-auto overscroll-contain">{filtered.map(course => <label key={course.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-brk-background"><input type="checkbox" aria-label={`Liên kết ${course.name_lop}`} checked={chosen.has(course.id)} onChange={() => toggle(course.id)} className="h-4 w-4 shrink-0 accent-green-700" /><span className="min-w-0"><span className="block text-sm">{course.name_lop}</span><span className="block break-all text-xs text-brk-muted">{course.id_khoa}</span></span></label>)}{!filtered.length && <p className="p-4 text-sm text-brk-muted">Không tìm thấy khóa học phù hợp.</p>}</div>
      <div className="mt-2 flex items-center justify-between border-t border-brk-outline pt-2"><span className="text-xs text-brk-muted">Đã chọn {selected.length} khóa</span><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg bg-brk-primary px-4 text-sm font-semibold text-white">Xong</button></div>
    </div>
    <p className="text-xs leading-5 text-brk-muted">Bấm Lưu dự án để áp dụng. Gỡ liên kết không xóa khóa học.</p>
  </div>
}
