'use client'
import { useState } from 'react'
import { resourceLabels, type OfferingDetails } from '@/lib/offerings/shared'
import OfferingViewer from './OfferingViewer'
import OfferingInlineContent from './OfferingInlineContent'

export type ExistingOfferingContent = {
  id: string
  title: string
  type?: string
  videoUrl?: string | null
  content?: string | null
  imageUrl?: string | null
}
type Resource = OfferingDetails['resources'][number]
export default function OfferingResourceEditor({
  resources,
  onChange,
  existing = [],
  onEditExisting,
}: {
  resources: Resource[]
  onChange: (resources: Resource[]) => void
  existing?: ExistingOfferingContent[]
  onEditExisting?: (item: ExistingOfferingContent) => void
}) {
  const [selected, setSelected] = useState('')
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState(false)
  const entries = [
    ...resources.map((item, index) => ({
      id: `resource:${index}`,
      title: item.title || `Tài nguyên ${index + 1}`,
      kind: item.kind,
    })),
    ...existing.map((item) => ({
      id: `lesson:${item.id}`,
      title: item.title,
      kind: item.type === 'VIDEO' ? ('VIDEO' as const) : ('GUIDE' as const),
    })),
  ]
  const filtered = entries.filter((item) =>
    item.title.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')),
  )
  const current = filtered.find((item) => item.id === selected) || filtered[0]
  const index = current?.id.startsWith('resource:') ? Number(current.id.slice(9)) : -1
  const resource = resources[index]
  const lesson = current?.id.startsWith('lesson:')
    ? existing.find((item) => `lesson:${item.id}` === current.id)
    : undefined
  const part = lesson?.videoUrl
    ?.split('|')
    .find(Boolean)
    ?.replace(/^(?:\[[^\]]*\]|\([^)]*\))/, '')
    .trim()
  const source = resource?.url || part
  const field = 'mt-2 min-h-12 w-full rounded-xl border bg-white px-3 text-base'
  function update(values: Partial<Resource>) {
    onChange(resources.map((item, i) => (i === index ? { ...item, ...values } : item)))
  }
  function add(kind: Resource['kind']) {
    const next = resources.length
    onChange([
      ...resources,
      { title: '', kind, url: '', viewer: kind === 'EBOOK' ? 'PDF' : 'LINK', instructions: '', guideUrl: '' },
    ])
    setQuery('')
    setSelected(`resource:${next}`)
  }
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-green-950">Nội dung khách sử dụng sau kích hoạt</h3>
          <p className="mt-2 text-sm text-brk-muted">
            Chọn một món để sửa. Xem thử dùng dữ liệu đang nhập; bấm Lưu thay đổi để áp dụng cho khách.
          </p>
        </div>
        <button
          type="button"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
          className="min-h-12 rounded-xl border px-4 font-semibold text-brk-primary"
        >
          {preview ? 'Ẩn xem thử' : 'Xem thử trong web'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['EBOOK', 'VIDEO', 'APP', 'GUIDE', 'TEMPLATE', 'PROMPT'] as const).map((kind) => (
          <button
            type="button"
            key={kind}
            disabled={resources.length >= 100}
            onClick={() => add(kind)}
            className="min-h-11 rounded-xl border bg-white px-3 text-sm font-semibold text-brk-primary disabled:opacity-40"
          >
            + {resourceLabels[kind]}
          </button>
        ))}
      </div>
      <div
        className={`grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)] ${preview ? '2xl:grid-cols-[240px_minmax(0,1fr)_minmax(280px,1fr)]' : ''}`}
      >
        <aside className="min-w-0 space-y-3 rounded-2xl border bg-white p-4">
          <label className="block text-sm font-semibold">
            Thư viện tài nguyên
            <input
              aria-label="Tìm trong thư viện quản trị"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tài nguyên…"
              className={field}
            />
          </label>
          <nav aria-label="Chọn nội dung để chỉnh sửa" className="max-h-[65dvh] space-y-2 overflow-y-auto">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={current?.id === item.id}
                onClick={() => setSelected(item.id)}
                className={`min-h-14 w-full break-words rounded-xl p-3 text-left ${current?.id === item.id ? 'bg-green-50 font-bold text-green-950' : 'hover:bg-stone-50'}`}
              >
                <span className="block">{item.title}</span>
                <span className="mt-1 block text-xs text-brk-muted">{resourceLabels[item.kind]}</span>
              </button>
            ))}
          </nav>
          {!filtered.length && (
            <p className="text-sm text-brk-muted">
              {entries.length ? 'Không tìm thấy nội dung.' : 'Bấm một nút thêm nội dung ở trên để bắt đầu.'}
            </p>
          )}
        </aside>
        <div className="min-w-0 space-y-4 rounded-2xl border bg-white p-5">
          {resource ? (
            <>
              <h4 className="text-lg font-bold">Chỉnh sửa tài nguyên</h4>
              <label className="block font-semibold">
                Tên tài nguyên
                <input
                  aria-label="Tên tài nguyên đang sửa"
                  maxLength={200}
                  value={resource.title}
                  onChange={(event) => update({ title: event.target.value })}
                  className={field}
                />
              </label>
              <label className="block font-semibold">
                Loại nội dung
                <select
                  aria-label="Loại tài nguyên đang sửa"
                  value={resource.kind}
                  onChange={(event) => update({ kind: event.target.value as Resource['kind'] })}
                  className={field}
                >
                  {Object.entries(resourceLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block font-semibold">
                Nguồn nhúng / Liên kết
                <input
                  aria-label="Nguồn tài nguyên đang sửa"
                  maxLength={2000}
                  value={resource.url}
                  onChange={(event) => update({ url: event.target.value })}
                  placeholder="https://… hoặc đường dẫn nội bộ"
                  className={field}
                />
              </label>
              <p className="text-sm leading-6 text-brk-muted">
                Dùng nguồn cho phép xem nhúng. Link này chỉ được gửi đến khách có quyền sử dụng; việc xem thử
                không tự chuyển nguồn sang kho riêng tư.
              </p>
              <label className="block font-semibold">
                Trình xem
                <select
                  value={resource.viewer}
                  onChange={(event) => update({ viewer: event.target.value as Resource['viewer'] })}
                  className={field}
                >
                  <option value="LINK">Tự nhận diện video / tài liệu / App</option>
                  <option value="PDF">Xem PDF bên trong trang</option>
                </select>
              </label>
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-bold">Hướng dẫn đi kèm riêng món này</h4>
                <label className="block text-sm font-semibold">
                  Nội dung hướng dẫn
                  <textarea
                    aria-label="Hướng dẫn riêng tài nguyên"
                    rows={6}
                    maxLength={5000}
                    value={resource.instructions || ''}
                    onChange={(event) => update({ instructions: event.target.value })}
                    className={field + ' py-3'}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Video / tài liệu hướng dẫn
                  <input
                    aria-label="Nguồn hướng dẫn riêng tài nguyên"
                    maxLength={2000}
                    value={resource.guideUrl || ''}
                    onChange={(event) => update({ guideUrl: event.target.value })}
                    placeholder="Để trống nếu chỉ dùng hướng dẫn bằng chữ"
                    className={field}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...resources]
                    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                    onChange(next)
                    setSelected(`resource:${index - 1}`)
                  }}
                  className="min-h-11 rounded-xl border px-3 disabled:opacity-40"
                >
                  Đưa lên
                </button>
                <button
                  type="button"
                  disabled={index === resources.length - 1}
                  onClick={() => {
                    const next = [...resources]
                    ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
                    onChange(next)
                    setSelected(`resource:${index + 1}`)
                  }}
                  className="min-h-11 rounded-xl border px-3 disabled:opacity-40"
                >
                  Đưa xuống
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(resources.filter((_, i) => i !== index))
                    setSelected('')
                  }}
                  className="min-h-11 rounded-xl border px-3 text-red-700"
                >
                  Xóa tài nguyên
                </button>
              </div>
            </>
          ) : lesson ? (
            <>
              <h4 className="text-xl font-bold">{lesson.title}</h4>
              <p className="text-sm leading-7 text-brk-muted">
                Nội dung đã tạo trước đây vẫn được giữ nguyên. Bấm Sửa để dùng trình chỉnh sửa hiện có.
              </p>
              <button
                type="button"
                onClick={() => onEditExisting?.(lesson)}
                className="min-h-12 rounded-xl bg-brk-primary px-4 font-semibold text-white"
              >
                Sửa nội dung này
              </button>
              <OfferingInlineContent text={lesson.content} />
            </>
          ) : (
            <p className="py-8 text-brk-muted">Chọn một nội dung ở bên trái.</p>
          )}
        </div>
        {preview && (
          <aside className="min-w-0 space-y-4 rounded-2xl border bg-white p-4 lg:col-span-2 2xl:col-span-1">
            <h4 className="text-lg font-bold">Xem thử trong web</h4>
            {current && <p className="font-semibold">{current.title}</p>}
            {source ? (
              <OfferingViewer
                key={source}
                url={source}
                title={current?.title || 'Xem thử'}
                kind={current?.kind}
              />
            ) : (
              <p className="rounded-xl bg-stone-50 p-4 text-sm">Chưa có nguồn để xem thử.</p>
            )}
            {lesson?.imageUrl && <img src={lesson.imageUrl} alt="" className="max-w-full rounded-xl" />}
            <OfferingInlineContent text={resource?.instructions || lesson?.content} />
            {resource?.guideUrl && (
              <OfferingViewer key={resource.guideUrl} url={resource.guideUrl} title="Hướng dẫn đi kèm" />
            )}
            <p className="text-sm text-brk-muted">
              Nếu nguồn từ chối hiển thị, hãy cập nhật nguồn cho phép nhúng. Nội dung vẫn ở trong trang.
            </p>
          </aside>
        )}
      </div>
    </section>
  )
}
