'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

type Teacher = { id: number | string; name: string; count: number | null; image?: string | null }

/** Giữ ảnh nguồn, mỗi giảng viên một thẻ; danh sách đầy đủ không giới hạn tám. */
export default function Wi300Teachers({ teachers, catalogError, directory = false }: { teachers: Teacher[]; catalogError: boolean; directory?: boolean }) {
  const unique = new Map(teachers.filter(teacher => teacher.image?.trim()).map(teacher => [teacher.id, teacher]))
  const visibleTeachers = directory ? [...unique.values()] : [...unique.values()].slice(0, 8)
  const track = useRef<HTMLUListElement>(null)
  const [paused, setPaused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const carousel = !directory && visibleTeachers.length > 1 && !catalogError
  // Cuộn thật hỗ trợ vuốt và bàn phím, không nhân đôi ảnh giảng viên.
  function move(direction: number) {
    const node = track.current
    if (!node) return
    const max = node.scrollWidth - node.clientWidth
    const step = (node.children[0] as HTMLElement | undefined)?.offsetWidth || node.clientWidth
    const gap = parseFloat(getComputedStyle(node).columnGap) || 20
    const next = direction > 0 && node.scrollLeft >= max - 2 ? 0 : direction < 0 && node.scrollLeft <= 2 ? max : Math.max(0, Math.min(max, node.scrollLeft + direction * (step + gap)))
    node.scrollTo({ left: next, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  useEffect(() => {
    if (!carousel || paused || interacting) return
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const timer = window.setInterval(() => { if (!document.hidden && !motion?.matches) move(1) }, 5000)
    return () => window.clearInterval(timer)
  }, [carousel, paused, interacting, visibleTeachers.length])
  if (!directory && !visibleTeachers.length && !catalogError) return null
  const columns = visibleTeachers.length === 1 ? 'max-w-sm' : visibleTeachers.length === 2 ? 'max-w-4xl sm:grid-cols-2' : visibleTeachers.length === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  return <section id="giang-vien" aria-labelledby="wi300-teachers-title" className="mx-auto max-w-7xl scroll-mt-44 px-4 pb-8 lg:scroll-mt-24 lg:px-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {directory ? <h1 id="wi300-teachers-title" className="text-3xl font-bold">Đội ngũ giảng viên</h1> : <h2 id="wi300-teachers-title" className="text-2xl font-bold">Đội ngũ giảng viên</h2>}
        <p className="mt-2 text-sm leading-6 text-brk-muted">Gặp gỡ những người chia sẻ tri thức trong hệ sinh thái Wi.</p>
      </div>
      {!directory && <Link href="/giang-vien" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brk-accent">Xem tất cả giảng viên<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
    </div>
    {catalogError ? <p role="alert" className="mt-6 rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">Chưa tải được danh sách giảng viên. Vui lòng tải lại trang.</p> : visibleTeachers.length ? <div onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false) }}><ul ref={track} id="wi300-teacher-track" aria-label="Đội ngũ giảng viên" className={directory ? `mx-auto mt-6 grid gap-5 ${columns}` : "mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 [scrollbar-width:thin]"}>
      {visibleTeachers.map(teacher => <li key={teacher.id} className={directory ? "min-w-0" : "min-w-0 shrink-0 basis-full snap-start sm:basis-[calc((100%-20px)/2)] lg:basis-[calc((100%-60px)/4)]"}>
        <Link href={`/khoa-hoc?q=${encodeURIComponent(teacher.name)}`} className="wi300-teacher-card flex h-full flex-col items-center rounded-3xl border border-brk-outline bg-brk-surface px-4 py-5 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary">
          <div className="wi300-teacher-portrait relative mb-1">
            <div className="relative z-10 h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-md sm:h-32 sm:w-32">
              <Image src={teacher.image!} alt={teacher.name} width={128} height={128} sizes="128px" unoptimized className="h-full w-full object-cover" />
            </div>
          </div>
          <h3 className="wi300-project-action mt-4 break-words text-lg font-bold">{teacher.name}</h3>
          <p className="mb-2 mt-2 rounded-full bg-brk-background px-3 py-1.5 text-sm text-brk-muted">{teacher.count != null ? `${teacher.count} khóa học` : 'Giảng viên trong hệ sinh thái Wi'}</p>
          <span className="wi300-project-action mt-auto inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold">Xem khóa học<ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
        </Link>
      </li>)}
    </ul>{carousel && <div className="mt-3 flex items-center justify-center gap-3" aria-label="Điều khiển slide giảng viên">
      <button type="button" aria-label="Giảng viên trước" aria-controls="wi300-teacher-track" onClick={() => { setPaused(true); move(-1) }} className="flex h-11 w-11 items-center justify-center rounded-full border border-brk-primary bg-white text-brk-primary"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
      <button type="button" aria-label={paused ? 'Chạy slide giảng viên' : 'Tạm dừng slide giảng viên'} aria-controls="wi300-teacher-track" onClick={() => setPaused(value => !value)} className="flex h-11 w-11 items-center justify-center rounded-full border border-brk-primary bg-white text-brk-primary">{paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}</button>
      <button type="button" aria-label="Giảng viên tiếp theo" aria-controls="wi300-teacher-track" onClick={() => { setPaused(true); move(1) }} className="flex h-11 w-11 items-center justify-center rounded-full border border-brk-primary bg-white text-brk-primary"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
    </div>}</div> : <p className="mt-6 rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">Các giảng viên sẽ được cập nhật tại đây.</p>}
  </section>
}
