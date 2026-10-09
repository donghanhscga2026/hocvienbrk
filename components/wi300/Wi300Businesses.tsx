'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Dùng logo chính thức khi đã có; tên trong hình tròn là đại diện tạm. */
const businesses = [
  { name: 'Wi.Mentor', description: 'Cố vấn và đồng hành', logo: null },
  { name: 'Wi.Tech', description: 'Công nghệ và giải pháp số', logo: null },
  { name: 'Wi.Grow', description: 'Phát triển cùng doanh nghiệp', logo: '/wi300/businesses/wi-grow.png' },
  { name: 'Wi.Finance', description: 'Tài chính và dòng tiền', logo: null },
  { name: 'Wi.Marketing', description: 'Marketing và kết nối khách hàng', logo: null },
]
export const featuredBusinesses = businesses.map(business => business.name)

export default function Wi300Businesses() {
  const listRef = useRef<HTMLUListElement>(null)
  const move = (direction: number) => {
    const list = listRef.current
    if (list) list.scrollBy({ left: direction * list.clientWidth * 0.8, behavior: 'smooth' })
  }
  return <section id="doanh-nghiep-tieu-bieu" aria-labelledby="wi300-businesses-title" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-12 sm:px-6 lg:scroll-mt-24 lg:px-8">
    <div className="flex items-end justify-between gap-4">
      <div><h2 id="wi300-businesses-title" className="text-2xl font-bold text-brk-on-surface sm:text-3xl">Doanh nghiệp tiêu biểu</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-brk-muted">Cùng kết nối và phát triển trong hệ sinh thái Wi.</p></div>
      <div className="flex shrink-0 gap-2 lg:hidden">
        <button type="button" aria-label="Doanh nghiệp trước" onClick={() => move(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-brk-outline bg-white text-brk-primary"><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" aria-label="Doanh nghiệp tiếp theo" onClick={() => move(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-brk-outline bg-white text-brk-primary"><ChevronRight className="h-5 w-5" /></button>
      </div>
    </div>
    {/* Vuốt ngang trên điện thoại; năm doanh nghiệp vừa một hàng trên máy tính. */}
    <ul ref={listRef} aria-label="Doanh nghiệp tiêu biểu" tabIndex={0} className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5 focus-visible:outline-brk-primary lg:grid lg:grid-cols-5 lg:gap-6">
      {businesses.map(business => <li key={business.name} className="w-40 shrink-0 snap-start text-center sm:w-48 lg:w-auto">
        <div className="mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white p-3 shadow-md ring-1 ring-brk-outline sm:h-40 sm:w-40">
          {business.logo ? <Image src={business.logo} alt={business.name} width={160} height={160} className="h-full w-full object-contain" /> : <span role="img" aria-label={`Ảnh đại diện tạm của ${business.name}`} className="flex h-full w-full items-center justify-center rounded-full bg-brk-background px-2 text-lg font-extrabold tracking-tight text-brk-primary">{business.name}</span>}
        </div>
        <h3 className="mt-5 text-lg font-bold text-brk-on-surface">{business.name}</h3>
        <p className="mt-2 text-sm leading-6 text-brk-muted">{business.description}</p>
      </li>)}
    </ul>
  </section>
}
