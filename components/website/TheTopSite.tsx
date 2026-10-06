'use client'

import type { ReactNode } from 'react'
import type { WebsiteData } from './WebsiteView'

const C = {
  navy: '#07101d',
  navy2: '#0b1727',
  navy3: '#0e2034',
  gold: '#d8ab3f',
  gold2: '#f2d16d',
  cream: '#f6ead0',
  ink: '#2a2114',
  green: '#0d4d2d',
  purple: '#4b205c',
  blue: '#0b3d6f',
}

const serif = "Georgia, 'Times New Roman', serif"
const sans = "Arial, Helvetica, sans-serif"

const img = (id: string) => 'https://lh3.googleusercontent.com/d/' + id
const imgs = {
  hero: img('1Z9zDAuvYQ2nhWLbG4wKC1rDgkN_Sd9KI'),
  founder: img('18xXBR6HfEX5mMrJ7xI6YKP0Az01ST5X5'),
  founderAlt: img('1aKE4nzzngUMXpnHXWPgsw_QxCdbyX_PL'),
  fate: img('11jCgpbg3fKfayhKZxfZqYPiVOrik85KQ'),
  fateAlt: img('1LpQ4X1GPPzLvLeHVIsop1UDSUmcK4LbJ'),
  foundations: img('174m80UAa1q3d_vyG8QjTuvx9d_W8Yhp-'),
  community: img('1gExIBj-I7cgD_GJ5q1tUyMUWQsuWeZvJ'),
}

function Lotus({ small = false }: { small?: boolean }) {
  return <svg viewBox="0 0 120 90" aria-hidden="true" className={small ? 'h-9 w-12' : 'h-20 w-28'}>
    <defs><linearGradient id={small ? 'lg-s' : 'lg'} x1="0" x2="1"><stop stopColor="#c89427"/><stop offset=".5" stopColor="#ffe18a"/><stop offset="1" stopColor="#b67718"/></linearGradient></defs>
    <g fill="none" stroke={small ? 'url(#lg-s)' : 'url(#lg)'} strokeWidth="2.3">
      <path d="M60 72C42 57 38 37 60 9c22 28 18 48 0 63Z"/><path d="M58 72C35 67 21 51 23 26c23 9 34 25 35 46Z"/><path d="M62 72c23-5 37-21 35-46-23 9-34 25-35 46Z"/><path d="M48 74C27 76 12 66 7 48c21 0 34 9 41 26Z"/><path d="M72 74c21 2 36-8 41-26-21 0-34 9-41 26Z"/><path d="M26 79h68"/>
    </g>
  </svg>
}

function Flame() {
  return <svg viewBox="0 0 90 110" aria-hidden="true" className="h-20 w-16">
    <defs><linearGradient id="fg" x1="0" x2="1"><stop stopColor="#bb7e1d"/><stop offset=".5" stopColor="#ffe591"/><stop offset="1" stopColor="#c78b24"/></linearGradient></defs>
    <path fill="url(#fg)" d="M46 4c5 26-5 33-13 44-7 10-9 22-1 31 6 7 17 9 25 4 10-7 13-21 7-34 15 9 23 25 18 40-6 18-25 29-44 25C18 110 5 93 9 73c3-16 15-26 24-37 7-8 10-16 13-32Z"/>
  </svg>
}

function Icon({ type }: { type: 'life' | 'peace' | 'wealth' | 'people' | 'book' | 'target' | 'heart' | 'growth' }) {
  const map = { life: '♨', peace: '❀', wealth: '◇', people: '♟', book: '▤', target: '◎', heart: '♥', growth: '⌁' }
  return <span aria-hidden="true">{map[type]}</span>
}

function Ornament() {
  return <div className="my-5 flex items-center justify-center gap-3 opacity-90">
    <i className="h-px w-20 bg-gradient-to-r from-transparent to-[#d8ab3f]"/><span className="text-[#e8c968]">✦</span><i className="h-px w-20 bg-gradient-to-l from-transparent to-[#d8ab3f]"/>
  </div>
}

function SectionTitle({ eyebrow, title, light = false }: { eyebrow?: string; title: string; light?: boolean }) {
  return <div className="mx-auto mb-11 max-w-4xl text-center">
    {eyebrow && <div className="mb-3 text-xs font-bold tracking-[.34em] text-[#c99a32]">{eyebrow}</div>}
    <h2 className={'text-balance text-3xl font-bold leading-tight md:text-5xl ' + (light ? 'text-[#342611]' : 'text-[#efca62]')} style={{ fontFamily: serif }}>{title}</h2>
    <Ornament/>
  </div>
}

function GoldButton({ children, href = '#' }: { children: ReactNode; href?: string }) {
  return <a href={href} className="inline-flex items-center justify-center rounded-full border border-[#f4d36d]/80 bg-gradient-to-r from-[#b67817] via-[#ffe38a] to-[#b67817] px-7 py-3 text-sm font-bold text-[#201400] shadow-[0_0_26px_rgba(218,171,63,.35)] transition hover:scale-[1.02]">{children}</a>
}

function GhostButton({ children, href = '#' }: { children: ReactNode; href?: string }) {
  return <a href={href} className="inline-flex items-center justify-center rounded-full border border-[#d8ab3f]/70 bg-black/20 px-7 py-3 text-sm font-bold text-[#f0cf70] shadow-[inset_0_0_18px_rgba(218,171,63,.08)] transition hover:bg-[#d8ab3f]/10">{children}</a>
}

function TopNav({ slug }: { slug: string }) {
  return <header className="sticky top-0 z-40 border-b border-[#d8ab3f]/30 bg-[#050a12]/95 backdrop-blur-md">
    <div className="mx-auto flex max-w-[1480px] items-center justify-between px-5 py-3">
      <a href={'/page/' + slug} className="flex items-center gap-2 text-[#f1ce68]">
        <Lotus small/><span className="text-lg font-bold" style={{ fontFamily: serif }}>THE TOP 1%</span>
      </a>
      <nav className="hidden items-center gap-7 text-[13px] text-[#f6ead0]/80 lg:flex">
        <a className="hover:text-[#f1ce68]" href={'/page/' + slug}>Trang chủ</a>
        <a className="hover:text-[#f1ce68]" href={'/page/' + slug + '/ve-chung-toi'}>Về chúng tôi</a>
        <a className="hover:text-[#f1ce68]" href={'/page/' + slug + '/khoa-hoc'}>Chương trình</a>
        <a className="hover:text-[#f1ce68]" href="#journey">Doanh nhân</a>
        <a className="hover:text-[#f1ce68]" href="#community">Cộng đồng</a>
      </nav>
      <GoldButton href="#journey">Tham gia ngay</GoldButton>
    </div>
  </header>
}

const pillarData = [
  { tone: C.green, icon: 'life' as const, title: 'TRƯỜNG SINH', subtitle: 'SỨC KHỎE LÀ NỀN TẢNG CỦA MỌI THÀNH CÔNG', items: ['6 bước trường sinh', 'Hơi thở diệu kỳ', 'Cân bằng đường huyết'] },
  { tone: C.purple, icon: 'peace' as const, title: 'AN LẠC', subtitle: 'NÂNG TẦM NỘI LỰC — KIẾN TẠO TƯƠNG LAI', items: ['Nâng tầm người', 'Kiến tạo tương lai', 'Chạm vào nguồn lực', 'Magical Book', 'Đánh thức hiện tại', '90 ngày lòng biết ơn'] },
  { tone: C.blue, icon: 'wealth' as const, title: 'DOANH NHÂN TAM BẢO', subtitle: 'KIẾN TẠO NHÀ KHAI VẤN VÀ DOANH NGHIỆP HẠNH PHÚC', items: ['Doanh nhân Tam Bảo', 'Train The Coach', 'Kinh doanh bền vững', 'Cộng đồng tinh hoa'] },
]

function PillarCard({ tone, icon, title, subtitle, items }: typeof pillarData[number]) {
  return <article className="relative overflow-hidden rounded-t-[120px] rounded-b-[28px] border border-[#d8ab3f]/70 p-3 shadow-[0_24px_70px_rgba(0,0,0,.45)]" style={{ background: 'radial-gradient(circle at 50% 6%,' + tone + ',#07101d 68%)' }}>
    <div className="rounded-t-[108px] rounded-b-[20px] border border-[#f0c85d]/25 px-5 pb-5 pt-12">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-[#f0cf70]/70 bg-black/25 text-4xl text-[#f1d36f] shadow-[0_0_28px_rgba(218,171,63,.25)]"><Icon type={icon}/></div>
      <h3 className="mt-5 text-center text-2xl font-bold text-[#f0cb64]" style={{ fontFamily: serif }}>{title}</h3>
      <p className="mx-auto mt-2 max-w-[290px] text-center text-xs font-bold leading-5 tracking-wide text-[#f6ead0]/85">{subtitle}</p>
      <div className="mt-5 rounded-2xl bg-gradient-to-b from-[#fff3cf] to-[#ecd59b] p-4 text-[#21190d] shadow-inner">
        <ul className="space-y-2.5 text-[14px]">
          {items.map((item, i) => <li key={item} className="flex items-center gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#102218] text-[11px] text-[#f0cb64]">{i + 1}</span><span>{item}</span></li>)}
        </ul>
      </div>
      <a href="#journey" className="mx-auto mt-5 block rounded-full border border-[#d8ab3f]/70 bg-black/35 px-5 py-3 text-center text-xs font-bold text-[#f0cb64]">KHÁM PHÁ NGAY →</a>
    </div>
  </article>
}

function Hero({ slug }: { slug: string }) {
  return <section className="relative overflow-hidden border-b border-[#d8ab3f]/30 bg-[#050911]">
    <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: 'url("' + imgs.hero + '")' }}/>
    <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 8%,rgba(255,200,65,.24),transparent 25%),linear-gradient(180deg,rgba(4,9,17,.18),rgba(4,9,17,.82) 72%,#050911)' }}/>
    <div className="pointer-events-none absolute inset-y-0 left-0 w-[16%] border-r border-[#d8ab3f]/25 bg-gradient-to-r from-black/80 to-transparent"/>
    <div className="pointer-events-none absolute inset-y-0 right-0 w-[16%] border-l border-[#d8ab3f]/25 bg-gradient-to-l from-black/80 to-transparent"/>
    <div className="pointer-events-none absolute left-[5%] top-0 h-full w-px bg-gradient-to-b from-transparent via-[#e9bb4d]/70 to-transparent"/>
    <div className="pointer-events-none absolute right-[5%] top-0 h-full w-px bg-gradient-to-b from-transparent via-[#e9bb4d]/70 to-transparent"/>
    <div className="relative mx-auto max-w-[1480px] px-5 pb-10 pt-14">
      <div className="mx-auto max-w-5xl text-center">
        <div className="mx-auto flex max-w-xl items-end justify-center gap-5">
          <div className="text-center"><Lotus/><div className="-mt-1 text-lg font-bold text-[#f0cb64]" style={{fontFamily:serif}}>THE TOP 1%</div></div>
          <div className="h-24 w-px bg-gradient-to-b from-transparent via-[#d8ab3f]/70 to-transparent"/>
          <div className="text-center"><Flame/><div className="-mt-1 text-sm font-bold text-[#f0cb64]" style={{fontFamily:serif}}>Trường Sinh An Lạc</div></div>
        </div>
        <p className="mt-6 text-xs font-bold tracking-[.36em] text-[#e6b94c]">FAMILY & FRIENDS • PEACE • LOVE</p>
        <h1 className="mt-6 text-balance text-5xl font-bold leading-[1.02] text-[#f2cf68] md:text-7xl xl:text-[78px]" style={{ fontFamily: serif, textShadow: '0 0 34px rgba(218,171,63,.22)' }}>HỌC VIỆN THE TOP 1%</h1>
        <h2 className="mt-5 text-balance text-2xl font-bold leading-[1.25] text-[#ffe5a1] md:text-4xl" style={{ fontFamily: serif }}>THỊNH VƯỢNG VÀ HẠNH PHÚC<br/>TRÊN CON ĐƯỜNG MINH TRIẾT</h2>
        <p className="mx-auto mt-5 max-w-3xl text-[16px] leading-7 text-[#f6ead0]/86">Kết nối tri thức • Rèn luyện thân tâm • Kiến tạo sự nghiệp • Lan tỏa giá trị<br/>Cùng bạn và gia đình vươn tới phiên bản tốt đẹp nhất.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-4"><GoldButton href="#journey">BẮT ĐẦU HÀNH TRÌNH →</GoldButton><GhostButton href="#about">XEM GIỚI THIỆU ▶</GhostButton></div>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">{pillarData.map(p => <PillarCard key={p.title} {...p}/>)}</div>
    </div>
  </section>
}

function AboutBand({ slug }: { slug: string }) {
  return <section id="about" className="bg-[#f4ead6] text-[#2a2114]">
    <div className="mx-auto grid max-w-[1480px] items-center gap-10 px-5 py-10 lg:grid-cols-[.9fr_1.1fr]">
      <div className="relative overflow-hidden rounded-2xl border border-[#b98a2a]/35 bg-[#d7c5a2] shadow-xl">
        <img src={imgs.founderAlt} alt="Học viện The Top 1%" className="aspect-[16/9] h-full w-full object-cover"/>
        <div className="absolute inset-0 grid place-items-center bg-black/10"><span className="grid h-14 w-14 place-items-center rounded-full border border-white/80 bg-black/55 text-2xl text-white">▶</span></div>
      </div>
      <div>
        <div className="text-xs font-bold tracking-[.28em] text-[#8b6220]">VỀ HỌC VIỆN THE TOP 1%</div>
        <h2 className="mt-3 text-balance text-3xl font-bold leading-tight md:text-5xl" style={{ fontFamily: serif }}>KIẾN TẠO CUỘC SỐNG<br/>THỊNH VƯỢNG VÀ HẠNH PHÚC</h2>
        <p className="mt-5 max-w-2xl text-[16px] leading-7 text-[#5b4b34]">Học viện The Top 1% là không gian kết nối những con người tử tế, khát khao phát triển bản thân, xây dựng gia đình hạnh phúc và tạo ra giá trị bền vững cho cộng đồng.</p>
        <div className="mt-6"><GoldButton href={'/page/' + slug + '/ve-chung-toi'}>TÌM HIỂU THÊM →</GoldButton></div>
      </div>
    </div>
    <div className="border-t border-[#c69a3d]/30 bg-[#09111d] text-[#f6ead0]">
      <div className="mx-auto grid max-w-[1480px] grid-cols-2 gap-4 px-5 py-6 text-center md:grid-cols-4">
        {[['10.000+','Học viên'],['100+','Chương trình'],['50+','Chuyên gia'],['95%','Hài lòng']].map(([n,l]) => <div key={l} className="border-[#d8ab3f]/20 md:border-r last:border-0"><div className="text-2xl font-bold text-[#efca62]" style={{fontFamily:serif}}>{n}</div><div className="mt-1 text-sm text-[#f6ead0]/70">{l}</div></div>)}
      </div>
    </div>
  </section>
}

function CauseSection() {
  return <section className="bg-[#08111e] px-5 py-20">
    <SectionTitle eyebrow="GỐC RỄ CỦA SỐ PHẬN" title="ĐIỀU QUAN TRỌNG KHÔNG PHẢI QUẢ — MÀ LÀ NHÂN"/>
    <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-2">
      <div className="rounded-[30px] border border-[#d8ab3f]/30 bg-[#0c1828] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,.3)]">
        <div className="text-2xl font-bold leading-10 text-[#efca62]" style={{fontFamily:serif}}>♡ THÂN TRƯỜNG SINH<br/>♡ TÂM AN LẠC<br/>♡ TRÍ GIÁC NGỘ</div>
        <p className="mt-5 leading-8 text-[#f6ead0]/70">Tiền bạc • Danh vọng • Hạnh phúc gia đình • Các mối quan hệ • Sức khỏe</p>
      </div>
      <div className="rounded-[30px] border border-[#d8ab3f]/30 bg-[#0c1828] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,.3)]">
        <h3 className="text-2xl font-bold text-[#efca62]" style={{fontFamily:serif}}>KHÔNG THỂ ĐỔI QUẢ THÌ ĐỔI NHÂN</h3>
        <p className="mt-6 text-xl italic text-[#fff0bf]">“Muốn thay đổi số phận phải thay đổi TẬP KHÍ.”</p>
        <p className="mt-5 leading-7 text-[#f6ead0]/70">Tập Khí là thói quen phản ứng tự động của Tâm. Khi thấy rõ và chuyển hóa Tập Khí, chúng ta thay đổi cái Nhân — từ đó thay đổi kết quả của cuộc đời.</p>
      </div>
    </div>
  </section>
}

function FounderSection({ slug }: { slug: string }) {
  return <section className="border-y border-[#d8ab3f]/20 bg-[#0a1422] px-5 py-20">
    <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
      <div className="relative mx-auto w-full max-w-xl">
        <div className="absolute -inset-3 rounded-t-[220px] rounded-b-[35px] border border-[#d8ab3f]/45"/>
        <div className="absolute -inset-7 rounded-t-[240px] rounded-b-[40px] border border-[#d8ab3f]/15"/>
        <img src={imgs.founder} alt="Người sáng lập The Top 1%" className="relative aspect-[4/5] w-full rounded-t-[210px] rounded-b-[30px] object-cover shadow-2xl"/>
      </div>
      <div>
        <div className="text-xs font-bold tracking-[.30em] text-[#d8ab3f]">NGƯỜI SÁNG LẬP THE TOP 1%</div>
        <h2 className="mt-4 text-balance text-3xl font-bold leading-tight text-[#efca62] md:text-5xl" style={{fontFamily:serif}}>ỨNG DỤNG GIÁO LÝ ĐẠO PHẬT VÀO CUỘC SỐNG VÀ KINH DOANH</h2>
        <Ornament/>
        <p className="max-w-2xl leading-8 text-[#f6ead0]/75">Hành trình chuyển hóa bắt đầu từ việc thấy rõ Tập Khí, quản trị cái Nhân và kiến tạo đời sống có chánh kiến, an lạc và giá trị.</p>
        <div className="mt-7"><GhostButton href={'/page/' + slug + '/ve-chung-toi'}>TÌM HIỂU THE TOP 1%</GhostButton></div>
      </div>
    </div>
  </section>
}

function FoundationSection() {
  const cards = [
    { no: '1', icon: 'life' as const, tone: C.green, title: 'TRƯỜNG SINH', sub: 'Nền tảng sức khỏe' },
    { no: '2', icon: 'peace' as const, tone: C.purple, title: 'AN LẠC', sub: 'Nuôi dưỡng nội tâm' },
    { no: '3', icon: 'wealth' as const, tone: C.blue, title: 'THỊNH VƯỢNG', sub: 'Kiến tạo sự nghiệp' },
    { no: '4', icon: 'people' as const, tone: '#53390e', title: 'LAN TỎA', sub: 'Vì cộng đồng' },
  ]
  return <section className="bg-[#07101d] px-5 py-20">
    <SectionTitle eyebrow="NỘI LỰC • CỘNG ĐỒNG • HÀNH ĐỘNG" title="KIẾN TẠO TƯƠNG LAI NHƯ Ý"/>
    <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(c => <div key={c.no} className="relative overflow-hidden rounded-t-[90px] rounded-b-3xl border border-[#d8ab3f]/55 p-5 pt-12 text-center shadow-[0_20px_50px_rgba(0,0,0,.35)]" style={{background:'radial-gradient(circle at 50% 12%,'+c.tone+',#09111d 72%)'}}>
        <span className="absolute left-1/2 top-2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border border-[#f0cf70]/70 bg-[#0a1018] font-bold text-[#f0cf70]">{c.no}</span>
        <div className="mx-auto grid h-16 w-16 place-items-center text-4xl text-[#f1d36f]"><Icon type={c.icon}/></div>
        <h3 className="mt-3 text-xl font-bold text-[#f0cb64]" style={{fontFamily:serif}}>{c.title}</h3>
        <p className="mt-2 text-sm text-[#f6ead0]/70">{c.sub}</p>
      </div>)}
    </div>
  </section>
}

function Banner() {
  return <section className="relative overflow-hidden border-y border-[#d8ab3f]/25 px-5 py-20 text-center" style={{backgroundImage:'linear-gradient(rgba(7,16,29,.28),rgba(7,16,29,.78)),url("'+imgs.fateAlt+'")',backgroundSize:'cover',backgroundPosition:'center'}}>
    <div className="mx-auto max-w-4xl">
      <div className="text-xs font-bold tracking-[.35em] text-[#f2c95f]">ĐÁNH THỨC</div>
      <h2 className="mt-4 text-balance text-4xl font-bold text-[#fff0c4] md:text-6xl" style={{fontFamily:serif,textShadow:'0 2px 20px rgba(0,0,0,.55)'}}>PHIÊN BẢN TỐT ĐẸP NHẤT CỦA BẠN</h2>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/85">Hành trình chuyển hóa Thân • Tâm • Trí để kiến tạo cuộc sống thịnh vượng và an lạc.</p>
      <div className="mt-7"><GoldButton href="#journey">THAM GIA NGAY →</GoldButton></div>
    </div>
  </section>
}

function Journey() {
  const steps = ['THÀNH VIÊN','LEADERS PHỤNG SỰ','LEADERS KHỞI XƯỚNG','DOANH NHÂN TAM BẢO','THE TOP 1%']
  return <section id="journey" className="bg-[#0a1422] px-5 py-20">
    <SectionTitle eyebrow="BẢN ĐỒ CHUYỂN HÓA" title="CON ĐƯỜNG VƯƠN TỚI THE TOP 1%"/>
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3">
      {steps.map((x,i) => <div key={x} className="flex items-center gap-3"><span className="rounded-full border border-[#d8ab3f]/50 bg-[#07101d] px-5 py-3 text-sm font-bold text-[#efca62]">{x}</span>{i<steps.length-1&&<span className="text-[#d8ab3f]">→</span>}</div>)}
    </div>
  </section>
}

const staticPrograms = [
  ['TRƯỜNG SINH','6 bước Trường Sinh • Hơi thở diệu kỳ • Cân bằng đường huyết',C.green],
  ['AN LẠC','Nâng tầm người • Kiến tạo tương lai như ý • Magical Book • 90 ngày lòng biết ơn',C.purple],
  ['DOANH NHÂN TAM BẢO','Train The Coach • Kiến tạo Nhà Khai Vấn • Kinh doanh bền vững',C.blue],
  ['AWAKENING RETREAT','Thức tỉnh tâm linh • Chánh niệm • Quán chiếu • Chuyển hóa','#5c481a'],
]

function Programs({ data, slug, preview }: { data: WebsiteData; slug: string; preview: boolean }) {
  const useCourses = data.courses.length >= 2
  return <section id="programs" className="bg-[#050b14] px-5 py-20">
    <SectionTitle eyebrow="HỌC • HÀNH • CHUYỂN HÓA" title="CÁC CHƯƠNG TRÌNH NỔI BẬT"/>
    <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">
      {useCourses ? data.courses.slice(0,4).map(c => <a key={c.id} href={preview?'#':c.href} className="group overflow-hidden rounded-3xl border border-[#d8ab3f]/35 bg-[#0b1727] shadow-[0_20px_60px_rgba(0,0,0,.35)]">
        <div className="aspect-[4/3] overflow-hidden bg-[#101b2d]">{c.image&&<img src={c.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>}</div>
        <div className="p-5"><h3 className="text-xl font-bold text-[#efca62]" style={{fontFamily:serif}}>{c.title}</h3><p className="mt-3 line-clamp-4 text-sm leading-6 text-[#f6ead0]/65">{c.description.replace(/<[^>]*>/g,'')}</p><span className="mt-5 inline-block text-xs font-bold text-[#d8ab3f]">KHÁM PHÁ →</span></div>
      </a>) : staticPrograms.map(([title,desc,tone]) => <a key={String(title)} href={'/page/'+slug+'/khoa-hoc'} className="rounded-3xl border border-[#d8ab3f]/35 p-6 shadow-[0_20px_60px_rgba(0,0,0,.35)]" style={{background:'radial-gradient(circle at 50% 0%,'+tone+',#0b1727 72%)'}}>
        <div className="mb-7 grid h-14 w-14 place-items-center rounded-full border border-[#d8ab3f]/60 text-2xl text-[#f0ca63]">✦</div><h3 className="text-xl font-bold text-[#efca62]" style={{fontFamily:serif}}>{title}</h3><p className="mt-3 text-sm leading-6 text-[#f6ead0]/70">{desc}</p><span className="mt-5 inline-block text-xs font-bold text-[#d8ab3f]">KHÁM PHÁ →</span>
      </a>)}
    </div>
    <div className="mt-10 text-center"><GhostButton href={'/page/'+slug+'/khoa-hoc'}>XEM TẤT CẢ CHƯƠNG TRÌNH</GhostButton></div>
  </section>
}

function Community() {
  return <section id="community" className="border-t border-[#d8ab3f]/20 bg-[#091321] px-5 py-20">
    <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
      <div><SectionTitle eyebrow="CÙNG NHAU PHỤNG SỰ" title="HOẠT ĐỘNG CỘNG ĐỒNG"/><p className="text-center leading-9 text-[#f6ead0]/75">HƠI THỞ DIỆU KỲ • TREKKING & KHÁM PHÁ • QUỸ THIỆN HUỆ • DU LỊCH & DU XUÂN • KẾT NỐI DOANH NHÂN</p></div>
      <div className="overflow-hidden rounded-[36px] border border-[#d8ab3f]/30 bg-[#0c1828] shadow-2xl"><img src={imgs.community} alt="Hoạt động cộng đồng The Top 1%" className="aspect-[16/10] h-full w-full object-cover"/></div>
    </div>
  </section>
}

function Footer() {
  return <footer className="border-t border-[#d8ab3f]/25 bg-[#040810] px-5 py-12 text-center">
    <div className="flex justify-center"><Lotus small/></div>
    <div className="mt-2 text-3xl font-bold text-[#efca62]" style={{fontFamily:serif}}>THE TOP 1%</div>
    <p className="mt-3 text-sm text-[#f6ead0]/55">Thịnh vượng & Hạnh phúc trên con đường minh triết.</p>
  </footer>
}

function AboutPage({ slug }: { slug: string }) {
  return <div className="min-h-screen bg-[#07101d] text-[#f6ead0]" style={{fontFamily:sans}}>
    <TopNav slug={slug}/>
    <section className="relative overflow-hidden px-5 py-24 text-center" style={{backgroundImage:'linear-gradient(rgba(7,16,29,.42),rgba(7,16,29,.85)),url("'+imgs.fate+'")',backgroundSize:'cover',backgroundPosition:'center'}}>
      <SectionTitle eyebrow="FAMILY & FRIENDS • PEACE • LOVE" title="THE TOP 1% LÀ AI?"/>
      <p className="mx-auto max-w-4xl text-xl leading-9 text-white/85">Không phải những người giàu nhất hay có địa vị cao nhất. The Top 1% hướng tới những người sống có <b className="text-[#efca62]">CHÁNH KIẾN</b>, xây dựng <b className="text-[#efca62]">SỰ NGHIỆP CHÂN MẠNG</b> và đi trên <b className="text-[#efca62]">CUỘC ĐỜI CHÁNH ĐẠO</b>.</p>
    </section>
    <FounderSection slug={slug}/><FoundationSection/><Footer/>
  </div>
}

function CoursesPage({ data, slug, preview }: { data: WebsiteData; slug: string; preview: boolean }) {
  return <div className="min-h-screen bg-[#07101d] text-[#f6ead0]" style={{fontFamily:sans}}>
    <TopNav slug={slug}/>
    <section className="px-5 py-20"><SectionTitle eyebrow="THE TOP 1% ACADEMY" title="CÁC KHÓA HỌC & CHƯƠNG TRÌNH"/><Programs data={data} slug={slug} preview={preview}/></section>
    <Journey/><Footer/>
  </div>
}

export default function TheTopSite({ data, slug, pageSlug = '', preview = false }: { data: WebsiteData; slug: string; pageSlug?: string; preview?: boolean }) {
  if (pageSlug === 've-chung-toi') return <AboutPage slug={slug}/>
  if (pageSlug === 'khoa-hoc' || pageSlug === 'chuong-trinh') return <CoursesPage data={data} slug={slug} preview={preview}/>
  return <div className="min-h-screen overflow-hidden bg-[#07101d] text-[#f6ead0]" style={{fontFamily:sans,wordBreak:'normal',overflowWrap:'normal'}}>
    <TopNav slug={slug}/>
    <main>
      <Hero slug={slug}/>
      <AboutBand slug={slug}/>
      <CauseSection/>
      <FounderSection slug={slug}/>
      <FoundationSection/>
      <Banner/>
      <Journey/>
      <Programs data={data} slug={slug} preview={preview}/>
      <Community/>
    </main>
    <Footer/>
  </div>
}
