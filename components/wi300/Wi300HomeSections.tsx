import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Sparkles, BriefcaseBusiness, Package, UsersRound, Sprout, Handshake } from 'lucide-react'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import type { WiAppearance } from '@/lib/wi300/appearance'
import Wi300HeroImage from './Wi300HeroImage'

/** Shared public markup keeps editor previews and server-rendered home sections identical. */
export function createHomeSections({ brand, appearance, projects }: { brand: DeploymentBrand; appearance: WiAppearance; projects: ReactNode }) {
  const homeSections = {
    hero: <section key="hero" aria-labelledby="wi300-hero-title" className="wi300-hero relative overflow-hidden border-b border-brk-outline">
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:py-16">
          <div className="min-w-0">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brk-outline bg-brk-background px-3 py-2 text-xs font-semibold text-brk-primary"><Sparkles className="h-4 w-4" aria-hidden="true" />{brand.tagline}</p>
            <h1 id="wi300-hero-title" className="wi300-hero-title break-words mt-5 max-w-2xl text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.4rem] xl:text-6xl">{appearance.home.title.split("\n").map((line, i) => <span key={i} className="block">{line}</span>)}</h1>
            <div aria-hidden="true" className="mt-5 h-1.5 w-16 rounded-full bg-brk-accent" />
            <p className="mt-6 max-w-xl text-base leading-7 text-brk-muted sm:text-lg">{appearance.home.description}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={appearance.home.primaryUrl} className="wi300-hero-primary inline-flex min-h-12 items-center justify-center gap-3 rounded-xl px-5 py-3 font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-accent">{appearance.home.primaryLabel}<ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
              <Link href={appearance.home.secondaryUrl} className="wi300-hero-secondary inline-flex min-h-12 items-center justify-center rounded-xl border px-5 py-3 font-semibold hover:bg-brk-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary">{appearance.home.secondaryLabel}</Link>
            </div>
            {/* Ba thông điệp có icon riêng, tự xuống hàng khi màn hình hẹp. */}
            <ul aria-label="Giá trị hệ sinh thái Wi" className="mt-6 grid gap-3 sm:grid-cols-3">
              {[{ label: 'Kết nối con người', icon: UsersRound }, { label: 'Lan tỏa tri thức', icon: BookOpen }, { label: 'Kiến tạo tương lai', icon: Sprout }].map(({ label, icon: Icon }) => <li key={label} className="flex min-w-0 items-center gap-2 rounded-xl border border-brk-outline bg-brk-surface/80 px-3 py-3">
                <span className="wi300-hero-title flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brk-background"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <span className="text-sm font-semibold leading-5 text-brk-on-surface">{label}</span>
              </li>)}
            </ul>
          </div>
          <figure className="min-w-0">
            {/* Mặt nạ ẩn nền poster, giữ nguyên chữ và biểu tượng từ ảnh gốc. */}
            <a href={appearance.home.imageUrl || "/wi300/ecosystem-banner.webp"} target="_blank" rel="noopener noreferrer" className={`${appearance.home.imageUrl ? "" : "wi300-ecosystem-art"} mx-auto block w-full max-w-[36rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary`} aria-label="Xem ảnh hệ sinh thái Wi đầy đủ (mở tab mới)">
              <Wi300HeroImage imageUrl={appearance.home.imageUrl} />
            </a>
            <figcaption className="wi300-hero-title mx-auto mt-5 max-w-md text-center text-xl font-extrabold uppercase tracking-[0.1em] sm:text-2xl">Hệ sinh thái Wi</figcaption>
          </figure>
        </div>
      </section>,
    discovery: <section key="discovery" id="ban-dang-tim-gi" aria-labelledby="wi300-discovery-title" className="mx-auto max-w-7xl scroll-mt-40 px-4 pt-10 sm:pt-12 lg:scroll-mt-24 lg:px-6">
        <h2 id="wi300-discovery-title" className="text-2xl font-bold sm:text-3xl">Bạn đang tìm gì?</h2>
        <div aria-label="Nội dung khám phá" className="mt-6 grid gap-4 sm:grid-cols-3">
          {[{ href: '/khoa-hoc', title: 'Khóa học', description: 'Khám phá tri thức và kỹ năng', icon: BookOpen }, { href: '/san-pham', title: 'Sản phẩm', description: 'Tìm sản phẩm phù hợp với bạn', icon: Package }, { href: '/dich-vu', title: 'Dịch vụ', description: 'Kết nối giải pháp và người hỗ trợ', icon: BriefcaseBusiness }].map(({ href, title, description, icon: Icon }, index) => <Link key={href} href={href} data-tone={index} className="wi300-discovery-card flex min-h-48 flex-col rounded-3xl border border-brk-outline bg-white p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary sm:p-6">
            <div className="flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brk-primary/10 text-brk-primary"><Icon className="h-6 w-6" aria-hidden="true" /></span><h3 className="text-lg font-bold">{title}</h3></div>
            <p className="mt-3 text-sm leading-6 text-brk-muted">{description}</p><span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-3 text-sm font-semibold text-brk-primary">Xem {title.toLocaleLowerCase('vi')}<ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
          </Link>)}
        </div>
      </section>,
    projects,
    start: <section key="start" className="mx-auto max-w-7xl px-4 pb-12 lg:px-6" aria-labelledby="wi300-start-title">
      <h2 id="wi300-start-title" className="text-2xl font-bold sm:text-3xl">Bắt đầu cùng Wi</h2>
      <p className="mt-2 text-sm leading-6 text-brk-muted">Chọn cách đồng hành phù hợp với bạn.</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="wi300-solution-card flex flex-col rounded-3xl border border-brk-outline bg-white p-6 sm:p-8">
          <span className="wi300-project-action flex h-14 w-14 items-center justify-center rounded-2xl bg-brk-primary/10"><BookOpen className="h-7 w-7" aria-hidden="true" /></span><h3 className="mt-4 text-2xl font-bold">Bạn đang tìm giải pháp phù hợp?</h3>
          <p className="mt-4 leading-7 text-brk-muted">Khám phá khóa học, sản phẩm và dịch vụ phù hợp với nhu cầu của bạn từ các dự án trong hệ sinh thái Wi.</p>
          {/* Ba lối vào rõ ràng, nút rộng dễ bấm trên điện thoại. */}
          <nav aria-label="Tìm giải pháp phù hợp" className="mt-auto grid gap-3 pt-6">{[{ href: '/khoa-hoc', label: 'Khóa học', icon: BookOpen }, { href: '/san-pham', label: 'Sản phẩm', icon: Package }, { href: '/dich-vu', label: 'Dịch vụ', icon: BriefcaseBusiness }].map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="wi300-solution-link flex min-h-14 items-center gap-3 rounded-xl border border-brk-outline bg-brk-surface px-4 py-3 text-sm font-semibold transition-colors hover:bg-brk-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary"><Icon className="wi300-project-action h-6 w-6 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 text-brk-on-surface">{label}</span><ArrowRight className="h-5 w-5 shrink-0 text-brk-accent" aria-hidden="true" /></Link>)}</nav>
        </div>
        <div aria-labelledby="wi300-partner-title" className="wi300-partner-card flex flex-col rounded-3xl bg-brk-primary p-6 text-white sm:p-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/10"><Handshake className="h-7 w-7" aria-hidden="true" /></span>
          <p className="mt-4 text-sm font-semibold text-white/80">Dành cho giảng viên và doanh nghiệp</p>
          <h3 id="wi300-partner-title" className="mt-3 text-2xl font-bold">Trở thành đối tác {brand.name}</h3>
          <p className="mt-4 leading-7 text-white/90">Chia sẻ chuyên môn, giới thiệu giá trị của doanh nghiệp và cùng mở rộng cơ hội hợp tác trong Liên minh 300 doanh nghiệp số.</p>
          <p className="mt-3 text-sm leading-6 text-white/80">Gửi yêu cầu tham gia. Ban điều phối sẽ xem hồ sơ và trao đổi trực tiếp trước khi cấp quyền.</p>
          <div className="mt-auto pt-6"><Link href="/doi-tac" className="wi300-hero-primary inline-flex min-h-14 items-center justify-center gap-3 rounded-xl px-6 py-3 font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Gửi yêu cầu tham gia<ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" /></Link></div>
        </div>
      </div>
    </section>,
  }
  return homeSections
}
