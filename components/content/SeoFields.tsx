'use client'
import type { ContentSeo } from '@/lib/content/seo'
export const contentFieldClass = 'mt-1 min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 py-2 text-sm'
export default function SeoFields({ value, onChange, showSlug = true }: { value: ContentSeo; onChange: (seo: ContentSeo) => void; showSlug?: boolean }) {
  const fields = [...(showSlug ? [{ key: 'slug', label: 'Đường dẫn (chữ thường không dấu)', max: 120 }] : []),
    { key: 'title', label: 'Tiêu đề SEO', max: 160 }, { key: 'description', label: 'Mô tả SEO', max: 500 },
    { key: 'imageUrl', label: 'Ảnh chia sẻ (đường dẫn HTTPS)', max: 1000 }, { key: 'keywords', label: 'Từ khóa', max: 300 }] as { key: keyof ContentSeo; label: string; max: number }[]
  return <div className="space-y-4"><p className="text-sm text-brk-muted">Để trống tiêu đề, mô tả và ảnh để dùng nội dung của bài/trang.</p>{fields.map(({ key, label, max }) => <label key={key} className="block text-sm font-semibold">{label}{key === 'description' ? <textarea rows={3} maxLength={max} className={contentFieldClass} value={String(value[key])} onChange={event => onChange({ ...value, [key]: event.target.value })} /> : <input maxLength={max} className={contentFieldClass} value={String(value[key])} onChange={event => onChange({ ...value, [key]: event.target.value })} />}</label>)}{(['index', 'follow'] as const).map(key => <label key={key} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-brk-primary" checked={value[key]} onChange={event => onChange({ ...value, [key]: event.target.checked })} />{key === 'index' ? 'Cho phép công cụ tìm kiếm lập chỉ mục' : 'Cho phép theo các liên kết'}</label>)}</div>
}
