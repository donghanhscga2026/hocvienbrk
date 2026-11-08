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
  const [earlyBirdUsed, setEarlyBirdUsed] = useState<number | null>(null)
  const [attachQuery, setAttachQuery] = useState('')
  useEffect(() => {
    if (!courseId || !value.earlyBirdEnabled) return
    const controller = new AbortController()
    fetch(`/api/offerings/early-bird-usage?courseId=${encodeURIComponent(courseId)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json()
        if (response.ok && typeof data?.used === 'number') setEarlyBirdUsed(data.used)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [courseId, value.earlyBirdEnabled])
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
                  ...previous.filter(
                    (item) =>
                      (value.relatedItems || []).some((selected) => selected.courseId === item.id) ||
                      (value.attachItems || []).some((selected) => selected.courseId === item.id),
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
  }, [query, teacherId, retry, value.relatedItems, value.attachItems])
  const relatedItems = value.relatedItems || []
  const selected = new Set(relatedItems.map((item) => item.courseId))
  const updateRelated = (next: OfferingDetails['relatedItems']) => onChange({ ...value, relatedItems: next })
  const attachItems = value.attachItems || []
  const attachSelected = new Set(attachItems.map((item) => item.courseId))
  const updateAttach = (next: OfferingDetails['attachItems']) => onChange({ ...value, attachItems: next })
  const showAttach =
    group !== 'COURSE' && value.kind !== 'COMBO' && !(group === 'SERVICE' && value.service?.saleMode === 'QUOTE')
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
      <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
          Ưu đãi cho những người đầu tiên
          <input
            type="checkbox"
            checked={value.earlyBirdEnabled}
            onChange={(event) => onChange({ ...value, earlyBirdEnabled: event.target.checked })}
            className="h-5 w-5 shrink-0"
          />
        </label>
        <label className="block font-semibold">
          Số suất ưu đãi
          <input
            type="number"
            min={1}
            max={1000}
            disabled={!value.earlyBirdEnabled}
            value={value.earlyBirdSlots}
            onChange={(event) => onChange({ ...value, earlyBirdSlots: Number(event.target.value) })}
            className={field + ' disabled:opacity-50'}
          />
        </label>
        <div className="space-y-2">
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input
              type="radio"
              name="early-bird-mode"
              checked={value.earlyBirdMode === 'FREE'}
              disabled={!value.earlyBirdEnabled}
              onChange={() => onChange({ ...value, earlyBirdMode: 'FREE' })}
              className="h-5 w-5 shrink-0"
            />
            Miễn phí cho những người đầu tiên
          </label>
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input
              type="radio"
              name="early-bird-mode"
              checked={value.earlyBirdMode === 'PRICE'}
              disabled={!value.earlyBirdEnabled}
              onChange={() => onChange({ ...value, earlyBirdMode: 'PRICE' })}
              className="h-5 w-5 shrink-0"
            />
            Giá ưu đãi cho những người đầu tiên
          </label>
        </div>
        {value.earlyBirdMode === 'PRICE' && (
          <label className="block font-semibold">
            Giá ưu đãi (đ)
            <input
              type="number"
              min={0}
              step={1000}
              disabled={!value.earlyBirdEnabled}
              value={value.earlyBirdPrice}
              onChange={(event) => onChange({ ...value, earlyBirdPrice: Number(event.target.value) })}
              className={field + ' disabled:opacity-50'}
            />
          </label>
        )}
        {value.earlyBirdEnabled && (
          <p className="text-sm font-semibold text-green-950">
            {courseId
              ? earlyBirdUsed == null
                ? 'Đang tải số suất đã dùng…'
                : `Đã dùng ${earlyBirdUsed}/${value.earlyBirdSlots} suất · Còn ${Math.max(0, value.earlyBirdSlots - earlyBirdUsed)} suất`
              : `Đã dùng 0/${value.earlyBirdSlots} suất (sản phẩm mới)`}
          </p>
        )}
        <p className="text-sm leading-7 text-brk-muted">
          Hệ thống tự đếm theo số người đã kích hoạt thành công, mỗi tài khoản tối đa 1 suất. Đủ suất là tự
          về giá thường, không cần tắt tay. Chỉ áp dụng khi có giá cố định — dịch vụ báo giá riêng không áp
          dụng ưu đãi này.
        </p>
      </div>
      {showAttach && (
        <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
            Mua kèm ưu đãi
            <input
              type="checkbox"
              checked={value.attachEnabled}
              onChange={(event) => onChange({ ...value, attachEnabled: event.target.checked })}
              className="h-5 w-5 shrink-0"
            />
          </label>
          <p className="text-sm leading-7 text-brk-muted">
            Chọn tối đa 5 món để khách mua kèm ngay tại bước thanh toán của món này, với giá kèm riêng chỉ
            áp dụng cho lần mua đó. Khách tích chọn món nào thì cộng tiền món đó vào cùng một lần chuyển
            khoản. Chỉ chọn được món có giá cố định của cùng người phụ trách — dịch vụ báo giá riêng không
            bán kèm được. Hoa hồng của món kèm tính theo cấu hình hoa hồng của chính món đó.
          </p>
          <ol className="space-y-3">
            {attachItems.map((entry) => {
              const option = items.find((item) => item.id === entry.courseId)
              const regular = option?.phi_coc || 0
              const off = regular > 0 ? Math.max(0, Math.round((1 - entry.price / regular) * 100)) : 0
              return (
                <li key={entry.courseId} className="space-y-2 rounded-xl border bg-white p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <strong className="min-w-0 flex-1">{option?.name_lop || `Món #${entry.courseId}`}</strong>
                    <button
                      type="button"
                      className="min-h-11 px-2 text-red-700"
                      onClick={() => updateAttach(attachItems.filter((item) => item.courseId !== entry.courseId))}
                    >
                      Xóa
                    </button>
                  </div>
                  <p className="text-sm text-brk-muted">Giá lẻ: {regular.toLocaleString('vi-VN')}đ</p>
                  <label className="block font-semibold">
                    Giá bán kèm (đ)
                    <input
                      type="number"
                      min={1}
                      step={1000}
                      disabled={!value.attachEnabled}
                      value={entry.price}
                      onChange={(event) =>
                        updateAttach(
                          attachItems.map((item) =>
                            item.courseId === entry.courseId
                              ? { ...item, price: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                      className={field + ' disabled:opacity-50'}
                    />
                  </label>
                  {regular > 0 && entry.price >= regular && (
                    <p className="text-sm font-semibold text-red-700">
                      Giá kèm phải nhỏ hơn giá lẻ thì mới được áp dụng.
                    </p>
                  )}
                  {regular > 0 && entry.price > 0 && entry.price < regular && (
                    <p className="text-sm text-brk-muted">Khách tiết kiệm {off}% so với mua lẻ.</p>
                  )}
                </li>
              )
            })}
          </ol>
          <label className="block font-semibold">
            Tìm món để bán kèm
            <input
              type="search"
              value={attachQuery}
              onChange={(event) => {
                setAttachQuery(event.target.value)
                setQuery(event.target.value)
              }}
              placeholder="Tên sản phẩm số hoặc dịch vụ…"
              className={field}
            />
          </label>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {items
              .filter(
                (item) =>
                  !attachSelected.has(item.id) &&
                  String(item.id) !== courseId &&
                  ['DIGITAL', 'SERVICE'].includes(item.productGroup) &&
                  item.phi_coc > 0 &&
                  `${item.name_lop} ${item.id_khoa}`
                    .toLocaleLowerCase('vi')
                    .includes(attachQuery.toLocaleLowerCase('vi')),
              )
              .map((item) => (
                <button
                  type="button"
                  key={item.id}
                  disabled={attachItems.length >= 5 || !value.attachEnabled}
                  onClick={() =>
                    updateAttach([
                      ...attachItems,
                      { courseId: item.id, price: Math.max(1000, Math.floor(item.phi_coc / 2)) },
                    ])
                  }
                  className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border bg-white p-3 text-left disabled:opacity-40"
                >
                  <span>
                    <strong>{item.name_lop}</strong>
                    <span className="mt-1 block text-sm text-brk-muted">
                      {groupInfo[item.productGroup].label} · Giá lẻ {item.phi_coc.toLocaleString('vi-VN')}đ
                    </span>
                  </span>
                  <span className="font-semibold text-brk-primary">+ Thêm</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
