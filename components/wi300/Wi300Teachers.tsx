'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Pause, Play } from 'lucide-react'
import styles from './Wi300Businesses.module.css'

type Teacher = { id: number; name: string; count: number; image?: string | null }

/** Dùng chung chuyển động doanh nghiệp; bản lặp không nhận focus/đọc trùng. */
export default function Wi300Teachers({ teachers, catalogError }: { teachers: Teacher[]; catalogError: boolean }) {
  const [paused, setPaused] = useState(false)
  const moving = teachers.length > 1
  return <section id="giang-vien" aria-labelledby="wi300-teachers-title" className="mx-auto max-w-7xl scroll-mt-44 px-4 pb-8 lg:scroll-mt-24 lg:px-6">
    <div className="flex items-end justify-between gap-4"><div><h2 id="wi300-teachers-title" className="text-2xl font-bold">Giảng viên tiêu biểu</h2><p className="mt-2 text-sm text-brk-muted">Gặp gỡ những người chia sẻ tri thức trong hệ sinh thái Wi.</p></div>
      {moving && <button type="button" aria-pressed={paused} aria-label={paused ? 'Tiếp tục chạy giảng viên' : 'Tạm dừng chạy giảng viên'} onClick={() => setPaused(value => !value)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brk-outline bg-white text-brk-primary">{paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}</button>}
    </div>
    {teachers.length ? <div tabIndex={0} role="region" aria-label="Dãy giảng viên tiêu biểu" className={`mt-6 pb-5 focus-visible:outline-brk-primary ${styles.viewport} ${paused ? styles.paused : ''}`}>
      <div className={moving ? styles.track : ''}>{(moving ? [false, true] : [false]).map(copy => <ul key={String(copy)} aria-label={copy ? undefined : 'Giảng viên tiêu biểu'} aria-hidden={copy || undefined} className={`${styles.group} ${copy ? styles.copy : ''}`}>
        {teachers.map(teacher => <li key={teacher.id} className="w-44 shrink-0 text-center sm:w-52"><Link href={`/khoa-hoc?q=${encodeURIComponent(teacher.name)}`} tabIndex={copy ? -1 : undefined} className="block rounded-2xl p-2 hover:bg-white focus-visible:outline-brk-primary">
          <div className="mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-brk-background shadow-md ring-1 ring-brk-outline sm:h-40 sm:w-40">{teacher.image ? <Image src={teacher.image} alt={copy ? '' : teacher.name} width={160} height={160} unoptimized className="h-full w-full object-cover" /> : <span aria-hidden="true" className="text-3xl font-bold text-brk-primary">{teacher.name.trim().split(/\s+/).map(word => word[0]).slice(-2).join('')}</span>}</div>
          <h3 className="mt-4 break-words text-lg font-bold">{teacher.name}</h3><p className="mt-2 text-sm text-brk-muted">{teacher.count} khóa học</p><span className="mt-2 block text-sm font-semibold text-brk-primary">Xem khóa học →</span>
        </Link></li>)}
      </ul>)}</div>
    </div> : <p className="mt-5 rounded-xl border border-brk-outline bg-white p-5 text-sm text-brk-muted">{catalogError ? 'Chưa tải được danh sách giảng viên.' : 'Giảng viên sẽ xuất hiện khi có khóa học trong danh mục.'}</p>}
  </section>
}
