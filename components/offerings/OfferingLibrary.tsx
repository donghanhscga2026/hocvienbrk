'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Loader2, FileText, PlayCircle, AppWindow } from 'lucide-react'
import { resourceLabels } from '@/lib/offerings/shared'
import type { ResourceSummary, WorkspaceResource } from '@/lib/offerings/workspace'
import OfferingRichText from './OfferingRichText'
import OfferingViewer from './OfferingViewer'
import OfferingInlineContent from './OfferingInlineContent'
import OfferingResourceContent from './OfferingResourceContent'

export default function OfferingLibrary({
  slug,
  resources,
  instructions,
  compact = false,
}: {
  slug: string
  resources: ResourceSummary[]
  instructions?: string
  compact?: boolean
}) {
  const [openedLink, setOpenedLink] = useState<{
    url: string
    title: string
  } | null>(null)
  const [query, setQuery] = useState(''),
    [kind, setKind] = useState('ALL')
  const [selected, setSelected] = useState<string | null>(null),
    [retry, setRetry] = useState(0)
  const [result, setResult] = useState<{
    id: string
    data?: WorkspaceResource
    error?: string
    status?: number
  } | null>(null)
  const visible = resources.filter(
    (item) =>
      (kind === 'ALL' || item.kind === kind) &&
      item.title.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')),
  )
  const current = visible.find((item) => item.id === selected) || visible[0]
  const currentId = current?.id
  useEffect(() => {
    if (!currentId) return
    setOpenedLink(null)
    const controller = new AbortController()
    fetch(`/api/offerings/${encodeURIComponent(slug)}/resources/${encodeURIComponent(currentId)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json()
        if (!controller.signal.aborted)
          setResult(
            response.ok
              ? { id: currentId, data }
              : {
                  id: currentId,
                  error: data.error || 'Không tải được nội dung.',
                  status: response.status,
                },
          )
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({
            id: currentId,
            error: 'Mất kết nối. Vui lòng thử lại.',
          })
      })
    return () => controller.abort()
  }, [slug, currentId, retry])
  const loaded = result?.id === currentId ? result : null
  if (!resources.length)
    return (
      <section id="tai-nguyen" className="space-y-5 rounded-2xl border bg-white p-6">
        <p className="text-brk-muted">
          Tài nguyên đang được đơn vị cung cấp cập nhật. Bạn có thể gửi yêu cầu hỗ trợ ở bên dưới.
        </p>
        {instructions && (
          <section id="huong-dan" className="scroll-mt-28">
            <h3 className="mb-3 text-xl font-bold">Hướng dẫn sử dụng</h3>
            <OfferingInlineContent text={instructions} />
          </section>
        )}
      </section>
    )
  return (
    <section id="tai-nguyen" className="scroll-mt-28">
      <h2 className="mb-5 text-2xl font-bold text-green-950">Tài nguyên của bạn</h2>
      <div
        className={
          compact
            ? 'space-y-4'
            : 'grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]'
        }
      >
        <aside className={`min-w-0 rounded-2xl border bg-white p-4 ${compact ? '' : 'lg:sticky lg:top-28'}`}>
          <label className="flex items-center gap-2 rounded-xl border px-3">
            <Search className="h-4 w-4 shrink-0 text-brk-primary" />
            <input
              aria-label="Tìm tài nguyên"
              type="search"
              className="min-h-12 w-full min-w-0 bg-transparent text-sm outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tài nguyên…"
            />
          </label>
          <nav aria-label="Lọc loại tài nguyên" className="my-4 flex flex-wrap gap-2">
            {['ALL', ...new Set(resources.map((item) => item.kind))].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => {
                  setKind(value)
                  setSelected(null)
                }}
                className={`min-h-10 rounded-xl px-3 text-sm ${kind === value ? 'bg-green-100 font-semibold text-green-900' : 'bg-stone-50 text-brk-muted'}`}
              >
                {value === 'ALL' ? 'Tất cả' : resourceLabels[value as keyof typeof resourceLabels]}
              </button>
            ))}
          </nav>
          <nav aria-label="Chọn tài nguyên" className="max-h-[55dvh] space-y-1 overflow-y-auto">
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={currentId === item.id}
                onClick={() => {
                  setSelected(item.id)
                  setOpenedLink(null)
                }}
                className={`flex min-h-14 w-full items-start gap-3 rounded-xl p-3 text-left text-sm ${currentId === item.id ? 'bg-green-50 font-semibold text-green-950' : 'hover:bg-stone-50'}`}
              >
                {item.kind === 'APP' ? (
                  <AppWindow className="h-5 w-5 shrink-0 text-brk-primary" />
                ) : item.kind === 'VIDEO' ? (
                  <PlayCircle className="h-5 w-5 shrink-0 text-brk-primary" />
                ) : (
                  <FileText className="h-5 w-5 shrink-0 text-brk-primary" />
                )}
                <span className="min-w-0 break-words">{item.title}</span>
              </button>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 rounded-2xl border bg-white p-5 sm:p-6">
          {!current ? (
            <p>Không tìm thấy tài nguyên phù hợp.</p>
          ) : !loaded ? (
            <p role="status" className="flex items-center gap-2 py-10 text-brk-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang tải nội dung được chọn…
            </p>
          ) : loaded.error ? (
            <div role="alert">
              <p>{loaded.error}</p>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                className="mt-3 min-h-11 font-semibold text-brk-primary"
              >
                Thử lại
              </button>
              {loaded.status === 401 && (
                <Link href="/login" className="ml-4 font-semibold text-brk-primary">
                  Đăng nhập lại
                </Link>
              )}
            </div>
          ) : (
            loaded.data && (
              <article>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold sm:text-2xl">{loaded.data.title}</h3>
                    <p className="mt-2 text-sm text-brk-muted">{resourceLabels[loaded.data.kind]}</p>
                  </div>
                </div>
                {loaded.data.url && !openedLink ? (
                  <OfferingResourceContent key={currentId} resource={loaded.data} />
                ) : (
                  (openedLink || loaded.data.links?.[0]) && (
                    <OfferingViewer
                      key={
                        currentId + ':' + (openedLink?.url || loaded.data.url || loaded.data.links?.[0]?.url)
                      }
                      url={openedLink?.url || loaded.data.url || loaded.data.links![0].url}
                      title={openedLink?.title || loaded.data.title}
                      kind={loaded.data.kind}
                    />
                  )
                )}
                {loaded.data.imageUrl && (
                  <img
                    src={loaded.data.imageUrl}
                    alt=""
                    loading="lazy"
                    className="mb-5 max-h-96 max-w-full rounded-xl object-contain"
                  />
                )}
                <OfferingRichText
                  text={loaded.data.content}
                  onOpenLink={(url, title) => setOpenedLink({ url, title })}
                />
                {loaded.data.links?.length ? (
                  <ul className="mt-4 space-y-3">
                    {loaded.data.links.map((link, index) => (
                      <li key={index}>
                        <button
                          type="button"
                          onClick={() => setOpenedLink(link)}
                          className="flex min-h-12 items-center justify-between gap-3 rounded-xl border p-3 font-semibold text-brk-primary"
                        >
                          <span>{link.title}</span>
                          <span className="text-sm">Mở nội dung</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : !loaded.data.url && !loaded.data.content && !loaded.data.imageUrl ? (
                  <p className="text-brk-muted">Nội dung tài nguyên đang được cập nhật.</p>
                ) : null}
              </article>
            )
          )}
        </div>
      </div>
      {instructions && (
        <section
          id="huong-dan"
          className="mt-5 min-w-0 scroll-mt-28 rounded-2xl border bg-white p-5 sm:p-6"
        >
          <h3 className="mb-3 text-xl font-bold">Hướng dẫn sử dụng</h3>
          <OfferingInlineContent text={instructions} />
        </section>
      )}
    </section>
  )
}
