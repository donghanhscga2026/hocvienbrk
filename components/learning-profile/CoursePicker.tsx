'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

/** Only course labels/URLs reach the browser; learning records stay on the server. */
export default function CoursePicker({ options, value }: { options: { id: number; name: string; href: string }[]; value?: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return <div className="min-w-0 flex-1" aria-busy={pending}>
    <label htmlFor="learning-course" className="sr-only">Chọn khóa học</label>
    <select id="learning-course" value={value ?? ''} disabled={pending || !options.length} onChange={event => {
      const option = options.find(item => item.id === Number(event.target.value))
      if (option) startTransition(() => router.push(option.href, { scroll: false }))
    }} className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 disabled:opacity-60">
      {!value && <option value="">Chọn khóa học</option>}
      {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select>
    <span className="sr-only" role="status">{pending ? 'Đang tải khóa học…' : ''}</span>
  </div>
}
