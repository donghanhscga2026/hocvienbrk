import Link from 'next/link'
import { groupInfo, offeringHref, type ProductGroup } from '@/lib/offerings/shared'
export type ProjectLinkedItem = {
  id: number
  id_khoa: string
  name_lop: string
  mo_ta_ngan: string | null
  link_anh_bia: string | null
  productGroup: ProductGroup
  phi_coc: number
  quote?: boolean
  teacher: { name: string | null } | null
}
export default function ProjectLinkedContent({ items }: { items: ProjectLinkedItem[] }) {
  return (
    <>
      {(['COURSE', 'DIGITAL', 'SERVICE'] as const).map((group) => {
        const rows = items.filter((item) => item.productGroup === group)
        return (
          <section key={group}>
            <h2 className="text-2xl font-bold">{groupInfo[group].label} liên kết</h2>
            {rows.length ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((item) => (
                  <Link
                    key={item.id}
                    href={offeringHref(group, item.id_khoa)}
                    className="overflow-hidden rounded-2xl border border-brk-outline bg-white hover:shadow-md"
                  >
                    {item.link_anh_bia && (
                      <img
                        src={item.link_anh_bia}
                        alt=""
                        loading="lazy"
                        className="aspect-video w-full object-cover"
                      />
                    )}
                    <div className="space-y-2 p-5">
                      <h3 className="break-words text-lg font-bold">{item.name_lop}</h3>
                      {item.teacher?.name && <p className="text-sm text-brk-primary">{item.teacher.name}</p>}
                      {item.mo_ta_ngan && (
                        <p className="line-clamp-3 text-sm text-brk-muted">
                          {item.mo_ta_ngan.replace(/<[^>]*>/g, ' ')}
                        </p>
                      )}
                      <p className="font-bold text-red-700">
                        {group === 'SERVICE' && item.quote
                          ? 'Liên hệ báo giá'
                          : item.phi_coc > 0
                            ? item.phi_coc.toLocaleString('vi-VN') + 'đ'
                            : 'Miễn phí'}
                      </p>
                      <p className="min-h-11 py-3 font-semibold text-brk-primary">Xem chi tiết →</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-brk-muted">Chưa có nội dung công khai trong nhóm này.</p>
            )}
          </section>
        )
      })}
    </>
  )
}
