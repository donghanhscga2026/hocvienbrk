'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Search, Sprout, UsersRound, BookOpen } from 'lucide-react'
import type { PublicWiProject } from '@/lib/wi300/projects'

/** Phương án 3: thẻ ngang, logo gốc và màu nhận diện Wi. */
export default function WiProjectDirectory({ projects }: { projects: PublicWiProject[] }) {
  const [query, setQuery] = useState('')
  const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  const words = normalize(query.trim()).split(/\s+/)
  const visible = projects.filter(project => project.published && words.every(word => normalize(`${project.name} ${project.description}`).includes(word)))
  return <main className="bg-brk-background text-brk-on-surface">
    <section className="wi300-hero relative overflow-hidden border-b border-brk-outline">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:py-12">
        <div className="min-w-0">
          <nav aria-label="Đường dẫn" className="mb-6 flex items-center gap-3 text-sm text-brk-muted"><Link href="/" className="inline-flex min-h-11 items-center hover:text-brk-primary">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">Dự án Wi</span></nav>
          <p className="mb-3 flex items-center gap-3 font-semibold text-brk-accent"><span aria-hidden="true" className="h-1 w-7 rounded-full bg-brk-accent" />Hệ sinh thái Wi</p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Các dự án Wi</h1>
          <p className="mt-4 max-w-2xl leading-7 text-brk-muted">Khám phá dự án, khóa học, sản phẩm và dịch vụ trong hệ sinh thái Wi.</p>
          <label className="mt-6 flex min-h-14 items-center gap-3 rounded-full border border-brk-outline bg-white px-5 focus-within:ring-2 focus-within:ring-brk-primary"><Search aria-hidden="true" className="h-5 w-5 shrink-0 text-brk-muted" /><span className="sr-only">Tìm dự án</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm dự án bạn quan tâm…" className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none" /></label>
        </div>
        <div className="hidden rounded-[2rem] border border-brk-outline bg-white/40 p-8 lg:block">
          <Sprout aria-hidden="true" className="wi300-project-action mb-6 h-20 w-20 text-brk-primary" strokeWidth={1} />
          <ul className="wi300-project-action space-y-4 text-brk-primary">{[{ text: 'Kết nối con người', icon: UsersRound }, { text: 'Lan tỏa tri thức', icon: BookOpen }, { text: 'Kiến tạo tương lai', icon: Sprout }].map(({ text, icon: Icon }) => <li key={text} className="flex items-center gap-3 font-semibold"><Icon className="h-5 w-5" aria-hidden="true" />{text}</li>)}</ul>
        </div>
      </div>
    </section>
    <section aria-labelledby="wi-project-list-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h2 id="wi-project-list-title" className="flex items-center gap-3 text-2xl font-bold sm:text-3xl"><span aria-hidden="true" className="h-7 w-1.5 rounded-full bg-brk-accent" />Khám phá các dự án</h2>
      <p role="status" className="mt-3 text-sm text-brk-muted">{visible.length} dự án{query.trim() ? ' phù hợp' : ' trong hệ sinh thái Wi'}</p>
      <ul className="mt-5 grid gap-5 lg:grid-cols-2">{visible.map(project => <li key={project.slug} className="min-w-0">
        <Link href={`/du-an/${project.slug}`} className="wi300-project-card flex h-full min-w-0 items-center gap-3 rounded-2xl border border-brk-outline bg-white p-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary sm:gap-6 sm:p-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brk-background p-2 sm:h-36 sm:w-36 sm:p-3">{project.logo ? <Image src={project.logo} alt="" width={144} height={144} sizes="(max-width: 639px) 80px, 144px" className="h-full w-full object-contain" /> : <span aria-hidden="true" className="break-words text-center text-xl font-bold wi300-project-action">{project.name.slice(0, 2)}</span>}</div>
          <div className="min-w-0 flex-1"><h3 className="break-words text-xl font-bold sm:text-2xl">{project.name}</h3>{project.featured && <span className="mt-2 inline-block rounded-full bg-brk-background px-2 py-1 text-xs font-semibold wi300-project-action">Tiêu biểu</span>}<p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-brk-muted">{project.description}</p><span className="wi300-project-action mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brk-primary">Khám phá dự án<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></span></div>
        </Link>
      </li>)}</ul>
      {!visible.length && <p className="mt-5 rounded-2xl border border-brk-outline bg-white p-6 text-brk-muted">{projects.length ? 'Chưa tìm thấy dự án phù hợp. Hãy thử từ khóa khác.' : 'Chưa có dự án công khai.'}</p>}
      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-brk-outline bg-white p-6 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-bold">Cùng kết nối, cùng phát triển</h2><p className="mt-2 max-w-xl text-sm leading-6 text-brk-muted">Tham gia hệ sinh thái Wi để lan tỏa tri thức, kết nối cộng đồng và kiến tạo giá trị bền vững.</p></div><Link href="/doi-tac" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-xl bg-brk-primary px-5 py-3 font-semibold text-white">Đồng hành cùng Wi<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
    </section>
  </main>
}
