'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Pause, Play } from 'lucide-react'
import styles from './Wi300Businesses.module.css'

/** Dùng logo chính thức khi đã có; tên trong hình tròn là đại diện tạm. */
const businesses = [
  { name: 'WiArt', description: 'Nghệ thuật và sáng tạo', logo: '/wi300/businesses/wi-art.webp' },
  { name: 'Wi.Mentor', description: 'Cố vấn và đồng hành', logo: '/wi300/businesses/wi-mentor.webp' },
  { name: 'Wi.Tech', description: 'Công nghệ và giải pháp số', logo: null },
  { name: 'Wi.Grow', description: 'Phát triển cùng doanh nghiệp', logo: '/wi300/businesses/wi-grow.png' },
  { name: 'Wi.Finance', description: 'Tài chính và dòng tiền', logo: '/wi300/businesses/wi-finance.webp' },
  { name: 'Wi.Marketing', description: 'Marketing và kết nối khách hàng', logo: '/wi300/businesses/wi-marketing.webp' },
  { name: 'WiCan', description: 'Kết nối trong hệ sinh thái Wi', logo: null },
]
export const featuredBusinesses = businesses.map(business => business.name)

export default function Wi300Businesses() {
  const [paused, setPaused] = useState(false)
  return <section id="doanh-nghiep-tieu-bieu" aria-labelledby="wi300-businesses-title" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-12 sm:px-6 lg:scroll-mt-24 lg:px-8">
    <div className="flex items-end justify-between gap-4">
      <div><h2 id="wi300-businesses-title" className="text-2xl font-bold text-brk-on-surface sm:text-3xl">Doanh nghiệp tiêu biểu</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-brk-muted">Cùng kết nối và phát triển trong hệ sinh thái Wi.</p></div>
      <button type="button" aria-pressed={paused} aria-label={paused ? 'Tiếp tục chạy doanh nghiệp' : 'Tạm dừng chạy doanh nghiệp'} onClick={() => setPaused(value => !value)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brk-outline bg-white text-brk-primary">{paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}</button>
    </div>
    <div tabIndex={0} role="region" aria-label="Dãy doanh nghiệp chạy từ phải sang trái" className={`mt-8 pb-5 focus-visible:outline-brk-primary ${styles.viewport} ${paused ? styles.paused : ''}`}>
      <div className={styles.track}>
        {/* Bản lặp chỉ phục vụ chuyển động, không đọc trùng bằng trình đọc màn hình. */}
        {[false, true].map(copy => <ul key={String(copy)} aria-label={copy ? undefined : 'Doanh nghiệp tiêu biểu'} aria-hidden={copy || undefined} className={`${styles.group} ${copy ? styles.copy : ''}`}>
          {businesses.map(business => <li key={business.name} className="w-40 shrink-0 text-center sm:w-48">
            <div className="mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white p-3 shadow-md ring-1 ring-brk-outline sm:h-40 sm:w-40">
              {business.logo ? <Image src={business.logo} alt={copy ? '' : business.name} width={160} height={160} className="h-full w-full object-contain" /> : <span role="img" aria-label={`Ảnh đại diện tạm của ${business.name}`} className="flex h-full w-full items-center justify-center rounded-full bg-brk-background px-2 text-lg font-extrabold tracking-tight text-brk-primary">{business.name}</span>}
            </div>
            <h3 className="mt-5 text-lg font-bold text-brk-on-surface">{business.name}</h3>
            <p className="mt-2 text-sm leading-6 text-brk-muted">{business.description}</p>
          </li>)}
        </ul>)}
      </div>
    </div>
  </section>
}
