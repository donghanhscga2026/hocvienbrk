'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, BriefcaseBusiness } from 'lucide-react'
import { groupInfo, offeringKinds, offeringHref, type ProductGroup } from '@/lib/offerings/shared'
import { searchText } from '@/lib/wi300/catalog'
import type { getOfferingCatalog } from '@/lib/offerings/server'

export default function OfferingCatalog({ group, items }: { group: Exclude<ProductGroup, 'COURSE'>; items: Awaited<ReturnType<typeof getOfferingCatalog>> }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('ALL')
  const [page, setPage] = useState(1)
  const info = groupInfo[group]
  const Icon = group === 'DIGITAL' ? Package : BriefcaseBusiness
  const kinds = group === 'DIGITAL' ? ['APP', 'EBOOK', 'TEMPLATE', 'RESOURCE', 'OTHER'] as const : ['COACHING', 'CONSULTING', 'OTHER'] as const
  const filtered = items.filter(item => (kind === 'ALL' || item.details.kind === kind) && searchText([item.name_lop, item.mo_ta_ngan, item.teacher?.name, item.courseCategory?.name || item.category].join(' ')).includes(searchText(query)))
  const pages = Math.max(1, Math.ceil(filtered.length / 12))
  const current = Math.min(page, pages)
  const pagination = <nav aria-label={'Phân trang ' + info.singular} className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>{filtered.length} {info.singular}</p><div className="flex items-center gap-2"><button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="min-h-11 rounded-xl border px-3 disabled:opacity-40">Trước</button><label>Trang <select aria-label="Chọn trang" value={current} onChange={e => setPage(Number(e.target.value))} className="min-h-11 rounded-xl border bg-white px-3">{Array.from({ length: pages }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select> / {pages}</label><button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} className="min-h-11 rounded-xl border px-3 disabled:opacity-40">Sau</button></div></nav>
  return <section className="space-y-5">
    <nav aria-label="Nhóm sản phẩm" className="flex flex-wrap gap-2">{Object.entries(groupInfo).map(([key, item]) => <Link key={key} href={item.catalog} aria-current={group === key ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold ${group === key ? 'bg-brk-primary text-white' : 'bg-white text-brk-primary'}`}>{item.label}</Link>)}</nav>
    <div className="flex flex-wrap gap-3"><input aria-label={'Tìm ' + info.singular} type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} placeholder={'Tìm ' + info.singular + '…'} className="min-h-12 min-w-0 flex-1 rounded-xl border bg-white px-4 text-base" /><select aria-label="Lọc loại" value={kind} onChange={e => { setKind(e.target.value); setPage(1) }} className="min-h-12 rounded-xl border bg-white px-4"><option value="ALL">Tất cả loại</option>{kinds.map(key => <option key={key} value={key}>{offeringKinds[key]}</option>)}</select></div>
    {pagination}
    {filtered.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.slice((current - 1) * 12, current * 12).map(item => <article key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-brk-outline bg-white shadow-sm">
      <Link href={offeringHref(group, item.id_khoa)}>{item.link_anh_bia ? <img src={item.link_anh_bia} alt="" loading="lazy" className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center bg-brk-background"><Icon className="h-14 w-14 text-brk-primary" /></div>}</Link>
      <div className="flex flex-1 flex-col gap-3 p-5"><p className="text-sm font-semibold text-brk-primary">{offeringKinds[item.details.kind]} · {item.courseCategory?.name || item.category}</p><h2 className="text-xl font-bold"><Link href={offeringHref(group, item.id_khoa)}>{item.name_lop}</Link></h2>{item.teacher?.name && <p className="text-sm text-brk-muted">{item.teacher.name}</p>}<p className="line-clamp-3 text-base leading-7 text-brk-muted">{item.mo_ta_ngan?.replace(/<[^>]+>/g, ' ')}</p><p className="text-sm text-brk-muted">{group === 'DIGITAL' ? item.details.accessDays ? `Sử dụng ${item.details.accessDays} ngày từ khi kích hoạt` : 'Thông tin sử dụng trong trang chi tiết' : `${item.details.sessions} buổi · ${item.details.durationMin} phút/buổi`}</p><strong className="mt-auto text-xl text-brk-primary">{item.phi_coc > 0 ? item.phi_coc.toLocaleString('vi-VN') + 'đ' : 'Miễn phí'}</strong><Link href={offeringHref(group, item.id_khoa)} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brk-primary px-4 font-semibold text-white">{group === 'DIGITAL' ? 'Xem sản phẩm' : 'Xem dịch vụ'} →</Link></div>
    </article>)}</div> : <p className="rounded-2xl border bg-white p-6 text-brk-muted">{items.length ? 'Không có kết quả phù hợp. Hãy đổi bộ lọc.' : 'Nội dung đang được cập nhật.'}</p>}
    {filtered.length > 12 && pagination}
  </section>
}
