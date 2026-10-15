'use client'

import { defaultAppearance, gridColumns, slideColumns, type WiAppearance } from '@/lib/wi300/appearance'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Search } from 'lucide-react'
import { teacherHref } from '@/lib/wi300/teacher-profile'
import WiKnowledgeArt from './WiKnowledgeArt'

type Teacher = { id: number | string; name: string; count: number | null; image?: string | null; fields?: string[] }
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')

/** Slide năm thẻ; trang đầy đủ dùng lưới, hero chỉ minh họa tri thức. */
export default function Wi300Teachers({ teachers, catalogError, directory = false, appearance = defaultAppearance }: { appearance?: WiAppearance; teachers: Teacher[]; catalogError: boolean; directory?: boolean }) {
  const unique = new Map(teachers.filter(teacher => teacher.image?.trim()).map(teacher => [teacher.id, teacher]))
  const [query, setQuery] = useState('')
  const [field, setField] = useState('')
  const settings = appearance.teachers
  const slide = appearance.courses
  const fields = [...new Set([...unique.values()].flatMap(teacher => teacher.fields || []))].sort((a,b) => a.localeCompare(b,'vi'))
  const profiles = [...unique.values()]
  const visibleTeachers = directory ? profiles.filter(teacher => (!settings.showSearch || normalize(teacher.name).includes(normalize(query.trim()))) && (!settings.showFields || !field || teacher.fields?.includes(field))) : profiles.slice(0, slide.teacherTotal)
  const track = useRef<HTMLUListElement>(null)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [canScroll, setCanScroll] = useState(false)
  const [position, setPosition] = useState(0)
  const carousel = !directory && slide.teacherLayout === 'slide' && visibleTeachers.length > 1 && !catalogError

  // Dùng cuộn native để vuốt/bàn phím; ẩn thanh cuộn bằng CSS.
  const move = useCallback((direction: number) => {
    const node = track.current
    if (!node) return
    const max = node.scrollWidth - node.clientWidth
    const step = (node.children[0] as HTMLElement | undefined)?.offsetWidth || node.clientWidth
    const gap = parseFloat(getComputedStyle(node).columnGap) || 20
    const next = direction > 0 && node.scrollLeft >= max - 2 ? 0 : direction < 0 && node.scrollLeft <= 2 ? max : Math.max(0, Math.min(max, node.scrollLeft + direction * (step + gap)))
    node.scrollTo({ left: next, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [])

  useEffect(() => {
    const node = track.current
    if (!node || !carousel) return
    const update = () => setCanScroll(node.scrollWidth > node.clientWidth + 2)
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(node)
    window.addEventListener('resize', update)
    return () => { observer?.disconnect(); window.removeEventListener('resize', update) }
  }, [carousel, visibleTeachers.length])

  useEffect(() => {
    if (!carousel || !slide.autoplay || paused || hovered || focused) return
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const timer = window.setInterval(() => { if (!document.hidden && !motion?.matches) move(1) }, slide.interval * 1000)
    return () => window.clearInterval(timer)
  }, [carousel, paused, hovered, focused, move, slide.autoplay, slide.interval])

  if (!directory && !visibleTeachers.length && !catalogError) return null
  return <section id="giang-vien" aria-labelledby="wi300-teachers-title" className={directory ? 'pb-8' : 'mx-auto max-w-7xl scroll-mt-44 px-4 pb-8 lg:scroll-mt-24 lg:px-6'}>
    {directory ? <div hidden={!settings.showHero} className="wi300-hero border-b border-brk-outline">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-10">
        <div><nav aria-label="Đường dẫn" className="mb-5 flex items-center gap-3 text-sm text-brk-muted"><Link href="/" className="inline-flex min-h-11 items-center">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">Giảng viên</span></nav><p className="wi300-project-action mb-3 text-sm font-semibold">Tri thức từ con người</p><h1 id={settings.showHero ? "wi300-teachers-title" : undefined} className="break-words text-3xl font-extrabold leading-tight sm:text-5xl">{settings.title}</h1><p className="mt-4 leading-7 text-brk-muted">{settings.description}</p></div>
        <div className="wi300-teacher-directory-art">{settings.imageUrl ? <Image src={settings.imageUrl} alt="" width={600} height={360} unoptimized className="h-auto w-full" /> : <WiKnowledgeArt />}</div>
      </div>
    </div> : <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 id="wi300-teachers-title" className="text-2xl font-bold">Đội ngũ giảng viên</h2><p className="mt-2 text-sm leading-6 text-brk-muted">Gặp gỡ những người chia sẻ tri thức trong hệ sinh thái Wi.</p></div><Link href="/giang-vien" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brk-accent">Xem tất cả giảng viên<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>}
    {directory && !settings.showHero && <h1 id="wi300-teachers-title" className="mx-auto max-w-7xl break-words px-4 pt-8 text-3xl font-bold sm:px-6">{settings.title}</h1>}
    <div className={directory ? 'mx-auto max-w-7xl px-4 pt-6 sm:px-6' : ''}>
      {directory && !catalogError && <div className="flex flex-col gap-3 sm:flex-row"><label hidden={!settings.showSearch} className="flex min-h-12 flex-1 items-center gap-3 rounded-full border border-brk-outline bg-white px-4 focus-within:ring-2 focus-within:ring-brk-primary"><Search className="h-5 w-5 shrink-0 text-brk-muted" aria-hidden="true" /><span className="sr-only">Tìm giảng viên</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm giảng viên…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></label><div hidden={!settings.showFields || !fields.length} role="group" aria-label="Lĩnh vực giảng dạy" className="flex flex-wrap items-center gap-2">{['', ...fields].map(value => <button key={value} type="button" aria-pressed={field === value} onClick={() => setField(value)} className={`min-h-11 rounded-full border px-4 text-sm ${field === value ? 'wi300-pill-active' : 'wi300-pill'}`}>{value || 'Tất cả'}</button>)}</div></div>}
      {catalogError ? <p role="alert" className="mt-6 rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">Chưa tải được danh sách giảng viên. Vui lòng tải lại trang.</p> : visibleTeachers.length ? <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
        <div className={directory || !carousel || !slide.arrows ? '' : 'relative mt-6 px-6 sm:px-8'}>
          <ul ref={track} id="wi300-teacher-track" aria-label="Đội ngũ giảng viên" onScroll={() => { const node = track.current; if (node) setPosition(Math.round(node.scrollLeft / (((node.children[0] as HTMLElement)?.offsetWidth || 1) + (parseFloat(getComputedStyle(node).columnGap) || 20)))) }} className={directory || slide.teacherLayout === 'grid' ? `mt-6 grid gap-5 ${gridColumns[directory ? settings.columns : slide.teacherPerView]}` : 'wi300-teacher-track mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto py-2'}>
            {visibleTeachers.map(teacher => <li key={teacher.id} className={directory || slide.teacherLayout === 'grid' ? 'min-w-0' : `min-w-0 shrink-0 basis-full snap-start ${slideColumns[slide.teacherPerView]}`}>
              <Link href={teacherHref(teacher.id)} className="wi300-teacher-card wi300-teacher-visual flex h-full flex-col overflow-hidden rounded-2xl border border-brk-outline text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brk-primary">
                <div className="wi300-teacher-media relative flex items-center justify-center px-3 py-4"><div className="wi300-teacher-portrait relative"><div className="relative z-10 aspect-square w-full overflow-hidden rounded-full border-4 border-white shadow-md"><Image src={teacher.image!} alt={teacher.name} width={208} height={208} sizes="(max-width: 639px) 200px, (max-width: 1279px) 220px, 180px" unoptimized className="h-full w-full object-cover" /></div></div></div>
                <div className="flex flex-1 flex-col items-center px-3 pb-3 pt-1"><h3 className="wi300-project-action break-words text-base font-bold leading-6">{teacher.name}</h3><p className="mb-1 mt-1 text-sm text-brk-muted">{teacher.count != null ? `${teacher.count} khóa học` : 'Giảng viên trong hệ sinh thái Wi'}</p><span className="wi300-project-action mt-auto inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold">Xem hồ sơ & khóa học<ArrowRight className="h-4 w-4" aria-hidden="true" /></span></div>
              </Link>
            </li>)}
          </ul>
          {carousel && slide.arrows && <><button type="button" disabled={!canScroll} aria-label="Giảng viên trước" aria-controls="wi300-teacher-track" onClick={() => { setPaused(true); move(-1) }} className="wi300-slider-arrow absolute left-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-sm disabled:opacity-40"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button><button type="button" disabled={!canScroll} aria-label="Giảng viên tiếp theo" aria-controls="wi300-teacher-track" onClick={() => { setPaused(true); move(1) }} className="wi300-slider-arrow absolute right-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-sm disabled:opacity-40"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button></>}
        </div>
        {carousel && canScroll && <div className="mt-3 flex items-center justify-center gap-3" aria-label="Điều khiển slide giảng viên"><span className="wi300-project-action text-sm" aria-live={paused ? 'polite' : 'off'}>{Math.min(position + 1, visibleTeachers.length)} / {visibleTeachers.length}</span><button type="button" aria-label={paused ? 'Chạy slide giảng viên' : 'Tạm dừng slide giảng viên'} aria-controls="wi300-teacher-track" onClick={() => setPaused(value => !value)} className="wi300-slider-arrow flex h-11 w-11 items-center justify-center rounded-full border bg-white">{paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}</button><span className="text-xs text-brk-muted">{paused ? 'Đã tạm dừng' : 'Tự động chuyển'}</span></div>}
      </div> : <p role="status" className="mt-6 rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">{profiles.length ? 'Chưa tìm thấy giảng viên phù hợp với bộ lọc.' : 'Các giảng viên sẽ được cập nhật tại đây.'}</p>}
    </div>
  </section>
}
