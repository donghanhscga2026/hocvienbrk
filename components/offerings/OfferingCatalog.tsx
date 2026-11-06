'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Package, BriefcaseBusiness, Search, ArrowRight, Check, UserRound } from 'lucide-react'
import {
  groupInfo,
  offeringKinds,
  offeringHref,
  offeringFacts,
  modeLabels,
  type ProductGroup,
} from '@/lib/offerings/shared'
import { searchText } from '@/lib/wi300/catalog'
import type { getOfferingCatalog } from '@/lib/offerings/server'
import CourseProjectBadges from '@/components/course/CourseProjectBadges'
import OfferingShare from './OfferingShare'
import { isQuoteService } from '@/lib/offerings/service'

export default function OfferingCatalog({
  group,
  items,
}: {
  group: Exclude<ProductGroup, 'COURSE'>
  items: Awaited<ReturnType<typeof getOfferingCatalog>>
}) {
  const { data: session } = useSession()
  const [filters, setFilters] = useState({
    query: '',
    kind: 'ALL',
    project: 'ALL',
    category: 'ALL',
    price: 'ALL',
    mode: 'ALL',
    sort: 'DEFAULT',
  })
  const [page, setPage] = useState(1)
  const update = (key: keyof typeof filters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }))
    setPage(1)
  }
  const info = groupInfo[group]
  const Icon = group === 'DIGITAL' ? Package : BriefcaseBusiness
  const kinds =
    group === 'DIGITAL'
      ? (['COMBO', 'APP', 'EBOOK', 'TEMPLATE', 'RESOURCE', 'OTHER'] as const)
      : (['COACHING', 'CONSULTING', 'IMPLEMENTATION', 'OTHER'] as const)
  const projects = useMemo(() => Array.from(
    new Map(items.flatMap((item) => item.projects.map((value) => [value.slug, value] as const))).values(),
  ), [items])
  const categories = useMemo(() => Array.from(
    new Set(items.map((item) => item.courseCategory?.name || item.category).filter(Boolean)),
  ), [items])
  const indexed = useMemo(() => items.map(item => ({ item, text: searchText([
    item.name_lop, item.mo_ta_ngan, item.teacher?.name,
    item.courseCategory?.name || item.category, ...item.projects.map(value => value.name),
  ].join(' ')) })), [items])
  const query = searchText(filters.query)
  const filtered = useMemo(() => indexed
    .filter(
      ({ item, text }) =>
        (filters.kind === 'ALL' || item.details.kind === filters.kind) &&
        (filters.project === 'ALL' || item.projects.some((value) => value.slug === filters.project)) &&
        (filters.category === 'ALL' || (item.courseCategory?.name || item.category) === filters.category) &&
        (filters.price === 'ALL' ||
          (filters.price === 'QUOTE'
            ? group === 'SERVICE' && isQuoteService(item.details)
            : !(group === 'SERVICE' && isQuoteService(item.details)) &&
              (filters.price === 'FREE' ? item.phi_coc === 0 : item.phi_coc > 0))) &&
        (filters.mode === 'ALL' || item.details.mode === filters.mode) &&
        text.includes(query),
    )
    .map(({ item }) => item)
    .sort((a, b) =>
      filters.sort === 'PRICE_ASC'
        ? a.phi_coc - b.phi_coc
        : filters.sort === 'PRICE_DESC'
          ? b.phi_coc - a.phi_coc
          : filters.sort === 'NAME'
            ? a.name_lop.localeCompare(b.name_lop, 'vi')
            : 0,
    ), [indexed, filters, group, query])
  const pages = Math.max(1, Math.ceil(filtered.length / 9)),
    current = Math.min(page, pages)
  const selectClass = 'min-h-12 min-w-0 rounded-xl border border-brk-outline bg-white px-3 text-sm'
  const pagination = (location: string) => (
    <nav
      aria-label={`Phân trang ${info.singular} ${location}`}
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-brk-muted"
    >
      <p>
        <strong>{filtered.length}</strong> {info.singular} phù hợp
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={current === 1}
          onClick={() => setPage(current - 1)}
          className="min-h-11 rounded-xl border bg-white px-3 disabled:opacity-40"
        >
          Trước
        </button>
        <label>
          Trang{' '}
          <select
            aria-label={`Chọn trang ${location}`}
            value={current}
            onChange={(e) => setPage(Number(e.target.value))}
            className="min-h-11 rounded-xl border bg-white px-3"
          >
            {Array.from({ length: pages }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>{' '}
          / {pages}
        </label>
        <button
          type="button"
          disabled={current === pages}
          onClick={() => setPage(current + 1)}
          className="min-h-11 rounded-xl border bg-white px-3 disabled:opacity-40"
        >
          Sau
        </button>
      </div>
    </nav>
  )
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-brk-outline bg-white p-4 shadow-sm sm:p-5">
        <label className="flex items-center gap-3 rounded-xl border border-brk-outline bg-stone-50 px-4">
          <Search className="h-5 w-5 shrink-0 text-brk-primary" />
          <input
            aria-label={'Tìm ' + info.singular}
            type="search"
            value={filters.query}
            onChange={(e) => update('query', e.target.value)}
            placeholder={
              group === 'DIGITAL'
                ? 'Bạn đang tìm công cụ hay tài nguyên nào?'
                : 'Bạn cần chuyên gia hỗ trợ điều gì?'
            }
            className="min-h-14 w-full min-w-0 bg-transparent text-base outline-none"
          />
        </label>
        <nav aria-label="Loại nội dung" className="my-4 flex flex-wrap gap-2">
          {(['ALL', ...kinds] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filters.kind === value}
              onClick={() => update('kind', value)}
              className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${filters.kind === value ? 'bg-brk-primary text-white' : 'bg-stone-50 text-brk-muted hover:bg-green-50'}`}
            >
              {value === 'ALL' ? 'Tất cả' : offeringKinds[value]}
            </button>
          ))}
        </nav>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            aria-label="Lọc dự án"
            value={filters.project}
            onChange={(e) => update('project', e.target.value)}
            className={selectClass}
          >
            <option value="ALL">Tất cả dự án</option>
            {projects.map((value) => (
              <option key={value.slug} value={value.slug}>
                {value.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc chủ đề"
            value={filters.category}
            onChange={(e) => update('category', e.target.value)}
            className={selectClass}
          >
            <option value="ALL">Tất cả chủ đề</option>
            {categories.map((value) => (
              <option key={value} value={value!}>
                {value}
              </option>
            ))}
          </select>
          <>
            <select
              aria-label="Lọc giá"
              value={filters.price}
              onChange={(e) => update('price', e.target.value)}
              className={selectClass}
            >
              <option value="ALL">Tất cả mức giá</option>
              <option value="FREE">Miễn phí</option>
              {group === 'SERVICE' && <option value="QUOTE">Liên hệ báo giá</option>}
              <option value="PAID">Trả phí</option>
            </select>
            {group === 'SERVICE' && (
              <select
                aria-label="Lọc hình thức"
                value={filters.mode}
                onChange={(e) => update('mode', e.target.value)}
                className={selectClass}
              >
                <option value="ALL">Tất cả hình thức</option>
                {Object.entries(modeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </>
          <select
            aria-label="Sắp xếp"
            value={filters.sort}
            onChange={(e) => update('sort', e.target.value)}
            className={selectClass}
          >
            <option value="DEFAULT">Đề xuất</option>
            <option value="PRICE_ASC">Giá thấp đến cao</option>
            <option value="PRICE_DESC">Giá cao đến thấp</option>
            <option value="NAME">Tên A–Z</option>
          </select>
        </div>
      </div>
      {pagination('trên')}
      {filtered.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice((current - 1) * 9, current * 9).map((item) => (
            <article
              key={item.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-brk-outline bg-white shadow-sm transition-shadow hover:shadow-lg"
            >
              <Link href={offeringHref(group, item.id_khoa)} aria-label={item.name_lop}>
                {item.link_anh_bia ? (
                  <img
                    src={item.link_anh_bia}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-green-50">
                    <Icon className="h-16 w-16 text-brk-primary" />
                  </div>
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <CourseProjectBadges projects={item.projects} compact />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-green-50 px-2 py-1 font-semibold text-brk-primary">
                    {offeringKinds[item.details.kind]}
                  </span>
                  <span className="text-brk-muted">{item.courseCategory?.name || item.category}</span>
                </div>
                <h2 className="text-xl font-bold leading-7">
                  <Link href={offeringHref(group, item.id_khoa)}>{item.name_lop}</Link>
                </h2>
                <p className="line-clamp-2 min-h-12 text-sm leading-6 text-brk-muted">
                  {item.mo_ta_ngan?.replace(/<[^>]+>/g, ' ').replace(/\*\*/g, '')}
                </p>
                <dl className="space-y-2 border-y border-brk-outline py-3 text-sm">
                  {offeringFacts(group, item.details)
                    .slice(0, 3)
                    .map(([label, value]) => (
                      <div key={label} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brk-primary" />
                        <dt className="shrink-0 text-brk-muted">{label}:</dt>
                        <dd className="min-w-0 break-words font-medium">{value}</dd>
                      </div>
                    ))}
                </dl>
                {item.teacher?.name && (
                  <p className="flex items-center gap-2 text-sm text-brk-muted">
                    <UserRound className="h-4 w-4" />
                    {item.teacher.name}
                  </p>
                )}
                <strong className="mt-auto pt-1 text-2xl text-red-700">
                  {group === 'SERVICE' && isQuoteService(item.details)
                    ? 'Liên hệ báo giá'
                    : item.phi_coc > 0
                      ? item.phi_coc.toLocaleString('vi-VN') + 'đ'
                      : 'Miễn phí'}
                </strong>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <Link
                    href={offeringHref(group, item.id_khoa)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brk-primary px-4 font-semibold text-white"
                  >
                    Xem chi tiết <ArrowRight className="h-4 w-4" />
                  </Link>
                  <OfferingShare
                    compact
                    course={{ ...item, productGroup: group }}
                    userId={session?.user?.id != null ? Number(session.user.id) : null}
                    siteName="Wi300"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <p>{items.length ? 'Không có kết quả phù hợp với bộ lọc.' : 'Nội dung đang được cập nhật.'}</p>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilters({
                  query: '',
                  kind: 'ALL',
                  project: 'ALL',
                  category: 'ALL',
                  price: 'ALL',
                  mode: 'ALL',
                  sort: 'DEFAULT',
                })
                setPage(1)
              }}
              className="mt-4 min-h-11 font-semibold text-brk-primary"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}
      {filtered.length > 0 && pagination('dưới')}
      <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-green-100 bg-green-50 p-6">
        <div>
          <h2 className="text-xl font-bold text-green-950">
            {group === 'DIGITAL' ? 'Tài nguyên của bạn, luôn sẵn sàng' : 'Sẵn sàng cho bước tiếp theo?'}
          </h2>
          <p className="mt-1 text-sm text-brk-muted">
            {group === 'DIGITAL'
              ? 'Mở lại các sản phẩm đã kích hoạt trong không gian của bạn.'
              : 'Theo dõi dịch vụ đã đăng ký và lịch đồng hành của bạn.'}
          </p>
        </div>
        <Link
          href={'/my-space?tab=' + (group === 'DIGITAL' ? 'products' : 'services')}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brk-primary px-5 font-semibold text-white"
        >
          {group === 'DIGITAL' ? 'Sản phẩm của tôi' : 'Dịch vụ của tôi'} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
