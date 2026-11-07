'use client'
import { useEffect, useState } from 'react'
import { groupInfo, type OfferingDetails, type ProductGroup } from '@/lib/offerings/shared'

type Option = { id: number; name_lop: string; id_khoa: string; productGroup: ProductGroup; phi_coc: number }
const field = 'mt-2 min-h-12 w-full rounded-xl border border-brk-outline bg-white px-3 text-base'

export default function OfferingSalesFields({
  group,
  value,
  onChange,
  courseId,
  teacherId,
}: {
  group: ProductGroup
  value: OfferingDetails
  onChange: (value: OfferingDetails) => void
  courseId?: string
  teacherId?: string
}) {
  const showTrial = group === 'DIGITAL' && value.kind !== 'COMBO'
  const [items, setItems] = useState<Option[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      setError('')
      fetch(
        `/api/offerings/combo-options?q=${encodeURIComponent(query)}&teacherId=${encodeURIComponent(teacherId || '')}`,
        { signal: controller.signal, cache: 'no-store' },
      )
        .then(async (response) => {
          const data = await response.json()
          if (!response.ok) throw new Error(data.error)
          const list: Option[] = Array.isArray(data?.items) ? data.items : []
          if (!controller.signal.aborted)
            setItems((previous) => [
              ...new Map(
                [
                  ...previous.filter((item) =>
                    (value.relatedItems || []).some((selected) => selected.courseId === item.id),
                  ),
                  ...list,
                ].map((item: Option) => [item.id, item]),
              ).values(),
            ])
        })
        .catch((error) => {
          if (!controller.signal.aborted) setError(error.message || 'Không tải được danh sách.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, teacherId, retry, value.relatedItems])
  const relatedItems = value.relatedItems || []
  const selected = new Set(relatedItems.map((item) => item.courseId))
  const updateRelated = (next: OfferingDetails['relatedItems']) => onChange({ ...value, relatedItems: next })
  return (
    <div className="space-y-6">
      {showTrial && (
        <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-4">
          <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
            Dùng thử miễn phí
            <input
              type="checkbox"
              checked={value.trialEnabled}
              onChange={(event) => onChange({ ...value, trialEnabled: event.target.checked })}
              className="h-5 w-5 shrink-0"
            />
          </label>
          <label className="block font-semibold">
            Thời gian dùng thử (ngày)
            <input
              type="number"
              min={1}
              max={90}
              disabled={!value.trialEnabled}
              value={value.trialDays}
              onChange={(event) => onChange({ ...value, trialDays: Number(event.target.value) })}
              className={field + ' disabled:opacity-50'}
            />
          </label>
          <p className="text-sm leading-7 text-brk-muted">
            Mỗi tài khoản chỉ dùng thử 1 lần. Hết hạn, khách thấy nút nâng cấp để mua tiếp — hệ thống không
            tự thu tiền. Khách đã được tặng miễn phí giữ nguyên quyền, không bị đổi sang diện dùng thử.
          </p>
        </div>
      )}
      <div className="space-y-4">
        <h4 className="font-bold text-green-950">Gợi ý dùng cùng</h4>
        <p className="text-sm leading-7 text-brk-muted">
          Chọn tối đa 8 món liên quan để hiện ở mục “Gợi ý dùng cùng” trên trang chi tiết. Phần này chỉ
          hiển thị để khách xem thêm, không tự thêm vào đơn hàng.
        </p>
        <ol className="space-y-3">
          {relatedItems.map((entry, index) => (
            <li
              key={entry.courseId}
              className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3"
            >
              <strong className="min-w-0 flex-1">
                {index + 1}.{' '}
                {items.find((item) => item.id === entry.courseId)?.name_lop || `Món #${entry.courseId}`}
              </strong>
              <button
                type="button"
                className="min-h-11 px-2 text-red-700"
                onClick={() => updateRelated(relatedItems.filter((item) => item.courseId !== entry.courseId))}
              >
                Xóa
              </button>
            </li>
          ))}
        </ol>
        <label className="block font-semibold">
          Tìm món để gợi ý
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên khóa học, sản phẩm số hoặc dịch vụ…"
            className={field}
          />
        </label>
        {loading && <p role="status">Đang tải…</p>}
        {error && (
          <p role="alert">
            {error}{' '}
            <button type="button" onClick={() => setRetry((value) => value + 1)} className="min-h-11 underline">
              Thử lại
            </button>
          </p>
        )}
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {items
            .filter(
              (item) =>
                !selected.has(item.id) &&
                String(item.id) !== courseId &&
                `${item.name_lop} ${item.id_khoa}`
                  .toLocaleLowerCase('vi')
                  .includes(query.toLocaleLowerCase('vi')),
            )
            .map((item) => (
              <button
                type="button"
                key={item.id}
                disabled={relatedItems.length >= 8}
                onClick={() => updateRelated([...relatedItems, { courseId: item.id }])}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border bg-white p-3 text-left disabled:opacity-40"
              >
                <span>
                  <strong>{item.name_lop}</strong>
                  <span className="mt-1 block text-sm text-brk-muted">
                    {groupInfo[item.productGroup].label} · {item.phi_coc.toLocaleString('vi-VN')}đ
                  </span>
                </span>
                <span className="font-semibold text-brk-primary">+ Thêm</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
