'use client'
import { useEffect, useState } from 'react'
import { groupInfo, type OfferingDetails, type ProductGroup } from '@/lib/offerings/shared'

type Option = { id: number; name_lop: string; id_khoa: string; productGroup: ProductGroup; phi_coc: number }
export default function OfferingComboFields({
  value,
  onChange,
  courseId,
  teacherId,
}: {
  value: OfferingDetails
  onChange: (value: OfferingDetails) => void
  courseId?: string
  teacherId?: string
}) {
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
          if (!controller.signal.aborted)
            setItems((previous) => [
              ...new Map(
                [
                  ...previous.filter((item) =>
                    value.bundleItems.some((selected) => selected.courseId === item.id),
                  ),
                  ...data.items,
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
  }, [query, teacherId, retry, value.bundleItems])
  const selected = new Set(value.bundleItems.map((item) => item.courseId))
  const update = (bundleItems: OfferingDetails['bundleItems']) => onChange({ ...value, bundleItems })
  return (
    <section className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-5">
      <h3 className="text-xl font-bold text-green-950">Thành phần combo</h3>
      <p className="text-sm leading-7 text-brk-muted">
        Chọn ít nhất 2 món có sẵn thuộc cùng người phụ trách. Giá chung đặt tại Thanh toán & kích hoạt. Mỗi
        món giữ thời hạn và số buổi riêng; món đã có quyền không tự cộng thêm thời hạn. Combo đã có người đăng
        ký sẽ khóa thành phần.
      </p>
      <ol className="space-y-3">
        {value.bundleItems.map((entry, index) => (
          <li
            key={entry.courseId}
            className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3"
          >
            <strong className="min-w-0 flex-1">
              {index + 1}.{' '}
              {items.find((item) => item.id === entry.courseId)?.name_lop || `Món #${entry.courseId}`}
            </strong>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={entry.gift}
                onChange={(event) =>
                  update(
                    value.bundleItems.map((item) =>
                      item.courseId === entry.courseId ? { ...item, gift: event.target.checked } : item,
                    ),
                  )
                }
              />
              Quà tặng kèm
            </label>
            <button
              type="button"
              disabled={!index}
              className="min-h-11 px-2 disabled:opacity-40"
              onClick={() => {
                const next = [...value.bundleItems]
                ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                update(next)
              }}
            >
              Đưa lên
            </button>
            <button
              type="button"
              className="min-h-11 px-2 text-red-700"
              onClick={() => update(value.bundleItems.filter((item) => item.courseId !== entry.courseId))}
            >
              Xóa
            </button>
          </li>
        ))}
      </ol>
      <label className="block font-semibold">
        Tìm món để thêm
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tên khóa học, sản phẩm số hoặc dịch vụ…"
          className="mt-2 min-h-12 w-full rounded-xl border bg-white px-3"
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
              disabled={value.bundleItems.length >= 50}
              onClick={() => update([...value.bundleItems, { courseId: item.id, gift: false }])}
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
    </section>
  )
}
