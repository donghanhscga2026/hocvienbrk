'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Search } from 'lucide-react'
import { defaultAppearance, gridColumns, type WiAppearance } from '@/lib/wi300/appearance'
import WiKnowledgeArt from './WiKnowledgeArt'
import { PROJECT_CATEGORIES, projectCategoryLabels, type PublicWiProject } from '@/lib/wi300/projects'

/** Phương án 3: bốn thẻ dọc, logo gốc và màu nhận diện Wi. */
export default function WiProjectDirectory({ projects, settings = defaultAppearance.projects }: { projects: PublicWiProject[]; settings?: WiAppearance["projects"] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  const words = normalize(query.trim()).split(/\s+/)
  const visible = projects.filter(project => project.published && (!settings.showFilter || !category || (project.category || 'OTHER') === category) && (!settings.showSearch || words.every(word => normalize(`${project.name} ${project.description}`).includes(word))))
  return <main className="bg-brk-background text-brk-on-surface">
    <section hidden={!settings.showHero} className="wi300-hero relative overflow-hidden border-b border-brk-outline">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:py-12">
        <div className="min-w-0">
          <nav aria-label="Đường dẫn" className="mb-6 flex items-center gap-3 text-sm text-brk-muted"><Link href="/" className="inline-flex min-h-11 items-center hover:text-brk-primary">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">Dự án Wi</span></nav>
          <p className="mb-3 flex items-center gap-3 font-semibold text-brk-accent"><span aria-hidden="true" className="h-1 w-7 rounded-full bg-brk-accent" />Hệ sinh thái Wi</p>
          <h1 className="break-words text-4xl font-extrabold tracking-tight sm:text-5xl">{settings.title}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-brk-muted">{settings.description}</p>
          <label hidden={!settings.showSearch} className="mt-6 flex min-h-14 items-center gap-3 rounded-full border border-brk-outline bg-white px-5 focus-within:ring-2 focus-within:ring-brk-primary"><Search aria-hidden="true" className="h-5 w-5 shrink-0 text-brk-muted" /><span className="sr-only">Tìm dự án</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm dự án bạn quan tâm…" className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none" /></label>
        </div>
        <div className="hidden lg:block">{settings.imageUrl ? <Image src={settings.imageUrl} alt="" width={600} height={360} unoptimized className="h-auto w-full object-contain" /> : <WiKnowledgeArt ecosystem />}</div>
      </div>
    </section>
    <section aria-labelledby="wi-project-list-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {!settings.showHero && <><h1 className="mb-4 break-words text-3xl font-bold">{settings.title}</h1>{settings.showSearch && <label className="mb-5 flex min-h-12 items-center gap-3 rounded-xl border border-brk-outline bg-white px-4"><Search className="h-5 w-5" aria-hidden="true" /><span className="sr-only">Tìm dự án</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm dự án…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></label>}</>}
      <h2 id="wi-project-list-title" className="flex items-center gap-3 text-2xl font-bold sm:text-3xl"><span aria-hidden="true" className="h-7 w-1.5 rounded-full bg-brk-accent" />Khám phá các dự án</h2>
      <div hidden={!settings.showFilter} role="group" aria-label="Lĩnh vực dự án" className="mt-5 flex flex-wrap gap-2">{['', ...PROJECT_CATEGORIES].map(value => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)} className={`min-h-11 rounded-full border px-4 text-sm font-medium ${category === value ? 'wi300-pill-active' : 'wi300-pill'}`}>{value ? projectCategoryLabels[value as keyof typeof projectCategoryLabels] : 'Tất cả'}{settings.showCounts && <> ({projects.filter(project => project.published && (!value || (project.category || 'OTHER') === value)).length})</>}</button>)}</div>
      <p role="status" className="mt-3 text-sm text-brk-muted">{visible.length} dự án{query.trim() ? ' phù hợp' : ' trong hệ sinh thái Wi'}</p>
      <ul className={`mt-5 grid gap-5 ${settings.layout === "horizontal" ? "lg:grid-cols-2" : gridColumns[settings.columns]}`}>{visible.map(project => <li key={project.slug} className="min-w-0">
        <Link href={`/du-an/${project.slug}`} className={`wi300-project-card flex h-full min-w-0 rounded-2xl border border-brk-outline bg-white p-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary ${settings.layout === "horizontal" ? "flex-row items-center gap-3" : "flex-col"}`}>
          <div className={`wi300-project-tile-media flex shrink-0 items-center justify-center overflow-hidden rounded-xl p-4 ${settings.layout === "horizontal" ? "h-28 w-28 sm:h-36 sm:w-36" : "h-44 w-full"}`}>{project.logo ? <Image src={project.logo} alt="" width={144} height={144} sizes="160px" className="h-36 w-full object-contain" /> : <span aria-hidden="true" className="break-words text-center text-xl font-bold wi300-project-action">{project.name.slice(0, 2)}</span>}</div>
          <div className="flex min-w-0 flex-1 flex-col px-1 pt-3"><h3 className="break-words text-lg font-bold">{project.name}</h3>{project.featured && <span className="mt-2 inline-block self-start rounded-full bg-brk-background px-2 py-1 text-xs font-semibold wi300-project-action">Tiêu biểu</span>}<p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-brk-muted">{project.description}</p><span className="wi300-project-action mt-auto inline-flex pt-3 min-h-11 items-center gap-2 text-sm font-semibold">Khám phá dự án<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></span></div>
        </Link>
      </li>)}</ul>
      {!visible.length && <p className="mt-5 rounded-2xl border border-brk-outline bg-white p-6 text-brk-muted">{projects.length ? 'Chưa tìm thấy dự án phù hợp. Hãy thử từ khóa khác.' : 'Chưa có dự án công khai.'}</p>}
      <div hidden={!settings.showCTA} className="wi300-branded-cta mt-8 flex flex-col gap-5 rounded-3xl p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between"><div className="relative z-10"><h2 className="break-words text-2xl font-bold">{settings.cta.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/90">{settings.cta.description}</p></div><Link href={settings.cta.url} className="wi300-teacher-register relative z-10 inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 font-semibold">{settings.cta.label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
    </section>
  </main>
}
