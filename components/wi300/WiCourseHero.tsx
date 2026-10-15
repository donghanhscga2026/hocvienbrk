import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, GraduationCap, Sparkles, UsersRound, ChartNoAxesColumnIncreasing } from 'lucide-react'
import type { WiAppearance } from '@/lib/wi300/appearance'
import WiKnowledgeArt from './WiKnowledgeArt'

/** Dùng chung cho trang công khai và xem trước; không cần dữ liệu khóa học. */
export default function WiCourseHero({ settings }: { settings: WiAppearance['courses'] }) {
  if (!settings.showHero) return null
  const illustrated = settings.heroVariant === 'illustrated'
  const dark = settings.heroVariant === 'bold'
  return <section data-course-hero={settings.heroVariant} aria-labelledby="wi300-course-hero-title" className="overflow-hidden border-b border-brk-outline" style={{ background: dark ? '#153b36' : 'linear-gradient(120deg, #fffaf0, var(--color-surface))', color: dark ? '#ffffff' : 'var(--color-on-surface)' }}>
    <div className={`mx-auto grid max-w-7xl items-center gap-7 px-4 py-9 sm:px-6 sm:py-12 ${illustrated ? 'lg:grid-cols-[1.15fr_1fr]' : ''}`}>
      <div className="min-w-0">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold" style={{ borderColor: dark ? '#ffffff40' : 'var(--color-outline)' }}><Sparkles className="h-4 w-4" aria-hidden="true" />Tri thức cho hành trình phát triển</p>
        <h1 id="wi300-course-hero-title" className="max-w-3xl whitespace-pre-line break-words text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{settings.title}</h1>
        <p className="mt-4 max-w-2xl whitespace-pre-line break-words text-base leading-7" style={{ color: dark ? '#e0eeea' : 'var(--color-muted)' }}>{settings.description}</p>
        <Link href={settings.heroUrl} className="mt-6 inline-flex min-h-12 max-w-full items-center justify-center gap-3 rounded-xl px-5 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4" style={{ background: 'var(--color-accent)', color: 'var(--color-on-primary)' }}><span className="min-w-0 break-words">{settings.heroLabel}</span><ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" /></Link>
        {/* Ba lợi ích dùng icon vector sắc nét; xếp dọc khi màn hình hẹp. */}
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {[{ icon: GraduationCap, title: 'Chất lượng thực tiễn', description: 'Kiến thức ứng dụng cao' }, { icon: UsersRound, title: 'Giảng viên giàu kinh nghiệm', description: 'Đồng hành cùng bạn' }, { icon: ChartNoAxesColumnIncreasing, title: 'Học mọi lúc, mọi nơi', description: 'Linh hoạt, hiệu quả' }].map(({ icon: Icon, title, description }) => <li key={title} className="flex min-w-0 items-start gap-3">
            <Icon className="mt-0.5 h-6 w-6 shrink-0" strokeWidth={1.5} aria-hidden="true" style={{ color: dark ? '#ffffff' : 'var(--color-primary)' }} />
            <div className="min-w-0 break-words"><p className="text-sm font-semibold leading-5">{title}</p><p className="mt-1 text-xs leading-5" style={{ color: dark ? '#e0eeea' : 'var(--color-muted)' }}>{description}</p></div>
          </li>)}
        </ul>
      </div>
      {illustrated && <div className="mx-auto w-full max-w-md lg:max-w-xl">
        {/* Minh họa vector có sẵn không phát sinh request ảnh; ảnh riêng giữ tỷ lệ cố định. */}
        {settings.heroImageUrl ? <Image src={settings.heroImageUrl} alt="Minh họa hành trình học tập" width={600} height={360} sizes="(max-width: 1023px) 90vw, 560px" unoptimized className="aspect-[5/3] w-full rounded-2xl object-contain" /> : <WiKnowledgeArt />}
      </div>}
    </div>
  </section>
}

/** Khung chờ chỉ xuất hiện trong lúc danh sách lấy dữ liệu, không giả số lượng khóa học. */
export function WiCourseCatalogSkeleton({ settings }: { settings: WiAppearance['courses'] }) {
  return <section id="khoa-hoc" aria-busy="true" aria-label="Đang tải danh sách khóa học" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-10 sm:px-6">
    {!settings.showHero && <h1 className="mb-5 text-3xl font-bold">{settings.title}</h1>}
    <p role="status" className="mb-5 text-sm text-brk-muted">Đang tải danh sách khóa học…</p>
    <div aria-hidden="true" className="mb-6 h-12 rounded-xl border border-brk-outline bg-white" />
    <div aria-hidden="true" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(index => <div key={index} className="overflow-hidden rounded-2xl border border-brk-outline bg-white motion-safe:animate-pulse"><div className="aspect-video bg-slate-100" /><div className="space-y-3 p-5"><div className="h-5 w-4/5 rounded bg-slate-100" /><div className="h-4 w-1/2 rounded bg-slate-100" /></div></div>)}</div>
  </section>
}
