import Link from 'next/link'
import type { CohortLink } from '@/lib/cohort'

/**
 * Mục chọn kỳ của một khóa học có nhiều kỳ (K01, K02, ...).
 * Dùng ở trang chi tiết mẫu chuẩn (trong CourseLandingTemplate) và làm dải
 * hệ thống phía trên các trang bán tự dựng (HTML riêng), nơi không chèn được
 * vào bên trong nội dung trang.
 */
export default function CohortPicker({ cohorts }: { cohorts: CohortLink[] }) {
    if (!cohorts || cohorts.length < 2) return null
    return (
        <div className="my-4 rounded-xl border border-brk-outline bg-white p-3">
            <p className="text-xs font-semibold text-gray-500">Khóa học này có {cohorts.length} kỳ:</p>
            <div className="mt-2 flex flex-wrap gap-2">
                {cohorts.map(item => item.current ? (
                    <span key={item.slug} className="rounded-full bg-brk-primary px-3 py-1.5 text-xs font-bold text-white">{item.label}{item.dateJoin ? ` · ${item.dateJoin}` : ''} · đang xem</span>
                ) : (
                    <Link key={item.slug} href={`/khoa-hoc/${item.slug}`} className="rounded-full border border-brk-outline bg-white px-3 py-1.5 text-xs font-semibold text-brk-primary hover:bg-brk-background">{item.label}{item.dateJoin ? ` · ${item.dateJoin}` : ''}</Link>
                ))}
            </div>
        </div>
    )
}
