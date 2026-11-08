'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Package, BriefcaseBusiness, Search, ArrowRight, Check, UserRound, Users } from 'lucide-react'
import {
  groupInfo,
  offeringKinds,
  offeringHref,
  offeringWorkspaceHref,
  offeringFacts,
  type ProductGroup,
} from '@/lib/offerings/shared'
import { searchText } from '@/lib/wi300/catalog'
import type { getOfferingCatalog } from '@/lib/offerings/server'
import OfferingShare from './OfferingShare'
import { isQuoteService } from '@/lib/offerings/service'

type CatalogItem = Awaited<ReturnType<typeof getOfferingCatalog>>[number]

/**
 * Lưới danh mục bản classic cho Sản phẩm số / Dịch vụ (các site không dùng
 * bản sàn wi300). Khung trung tính: ô tìm kiếm + một hàng chip lọc (theo
 * loại với sản phẩm số, theo chủ đề với dịch vụ) + thẻ gọn. Mọi chữ trên
 * thẻ lấy từ dữ liệu của chính món hàng — không gài câu chữ của riêng
 * nền tảng nào (không nút đối tác, không mục dự án, không "hệ sinh thái").
 */
export default function OfferingCatalog({
  group,
  items,
  ownedIds = [],
  siteName = '',
}: {
  group: Exclude<ProductGroup, 'COURSE'>
  items: CatalogItem[]
  ownedIds?: number[]
  siteName?: string
}) {
  const { data: session } = useSession()
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState('ALL')
  const info = groupInfo[group]
  const Icon = group === 'DIGITAL' ? Package : BriefcaseBusiness
  const owned = useMemo(() => new Set(ownedIds), [ownedIds])

  // Chip lọc: sản phẩm số lọc theo loại (App, Ebook, Template...), dịch vụ
  // lọc theo chủ đề — chỉ hiện những nhóm thật sự có món.
  const chips = useMemo(() => {
    if (group === 'DIGITAL') {
      const present = new Set(items.map((item) => item.details.kind))
      return (['APP', 'EBOOK', 'TEMPLATE', 'RESOURCE', 'COMBO', 'OTHER'] as const)
        .filter((kind) => present.has(kind))
        .map((kind) => ({ value: kind as string, label: offeringKinds[kind] as string }))
    }
    return Array.from(
      new Set(items.map((item) => item.courseCategory?.name || item.category).filter(Boolean)),
    ).map((name) => ({ value: name as string, label: name as string }))
  }, [group, items])

  const indexed = useMemo(
    () =>
      items.map((item) => ({
        item,
        text: searchText(
          [item.name_lop, item.mo_ta_ngan, item.teacher?.name, item.courseCategory?.name || item.category].join(' '),
        ),
      })),
    [items],
  )
  const normalizedQuery = searchText(query)
  const filtered = useMemo(
    () =>
      indexed
        .filter(
          ({ item, text }) =>
            (chip === 'ALL' ||
              (group === 'DIGITAL'
                ? item.details.kind === chip
                : (item.courseCategory?.name || item.category) === chip)) &&
            text.includes(normalizedQuery),
        )
        .map(({ item }) => item),
    [indexed, chip, group, normalizedQuery],
  )

  const ctaLabel = (item: CatalogItem) =>
    group === 'SERVICE' ? (isQuoteService(item.details) ? 'Nhận tư vấn' : 'Đăng ký') : 'Xem chi tiết'

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-brk-outline bg-white p-4 shadow-sm sm:p-5">
        <label className="flex items-center gap-3 rounded-xl border border-brk-outline bg-stone-50 px-4">
          <Search className="h-5 w-5 shrink-0 text-brk-primary" />
          <input
            aria-label={'Tìm ' + info.singular}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              group === 'DIGITAL' ? 'Bạn đang tìm công cụ hay tài nguyên nào?' : 'Bạn cần hỗ trợ điều gì?'
            }
            className="min-h-14 w-full min-w-0 bg-transparent text-base outline-none"
          />
        </label>
        {chips.length > 1 && (
          <nav
            aria-label={group === 'DIGITAL' ? 'Loại sản phẩm' : 'Chủ đề dịch vụ'}
            className="mt-4 flex flex-wrap gap-2"
          >
            {[{ value: 'ALL', label: 'Tất cả' }, ...chips].map((entry) => (
              <button
                key={entry.value}
                type="button"
                aria-pressed={chip === entry.value}
                onClick={() => setChip(entry.value)}
                className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${chip === entry.value ? 'bg-brk-primary text-white' : 'bg-stone-50 text-brk-muted hover:bg-green-50'}`}
              >
                {entry.label}
              </button>
            ))}
          </nav>
        )}
      </div>
      {filtered.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const href = offeringHref(group, item.id_khoa)
            const isOwned = owned.has(item.id)
            return (
              <article
                key={item.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-brk-outline bg-white shadow-sm transition-shadow hover:shadow-lg"
              >
                <Link href={href} aria-label={item.name_lop} className="relative block">
                  {item.link_anh_bia ? (
                    <img src={item.link_anh_bia} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-green-50">
                      <Icon className="h-16 w-16 text-brk-primary" />
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-brk-primary shadow-sm">
                    {offeringKinds[item.details.kind]}
                  </span>
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  {(item.courseCategory?.name || item.category) && (
                    <p className="text-xs font-medium text-brk-muted">{item.courseCategory?.name || item.category}</p>
                  )}
                  <h2 className="text-xl font-bold leading-7">
                    <Link href={href}>{item.name_lop}</Link>
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
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brk-muted">
                    {item.teacher?.name && (
                      <p className="flex items-center gap-2">
                        <UserRound className="h-4 w-4" />
                        {item.teacher.name}
                      </p>
                    )}
                    {item.memberCount > 0 && (
                      <p className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {item.memberCount.toLocaleString('vi-VN')} người đang dùng
                      </p>
                    )}
                  </div>
                  <strong className="mt-auto pt-1 text-2xl text-red-700">
                    {group === 'SERVICE' && isQuoteService(item.details)
                      ? 'Báo giá theo nhu cầu'
                      : item.phi_coc > 0
                        ? item.phi_coc.toLocaleString('vi-VN') + 'đ'
                        : 'Miễn phí'}
                  </strong>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    {isOwned ? (
                      <Link
                        href={offeringWorkspaceHref(group, item.id_khoa)}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white"
                      >
                        Vào sử dụng <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link
                        href={href}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brk-primary px-4 font-semibold text-white"
                      >
                        {ctaLabel(item)} <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                    <OfferingShare
                      compact
                      course={{ ...item, productGroup: group }}
                      userId={session?.user?.id != null ? Number(session.user.id) : null}
                      siteName={siteName}
                    />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <p>{items.length ? 'Không có kết quả phù hợp với bộ lọc.' : 'Nội dung đang được cập nhật.'}</p>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setChip('ALL')
              }}
              className="mt-4 min-h-11 font-semibold text-brk-primary"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}
    </section>
  )
}
