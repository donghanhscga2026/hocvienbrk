'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Search, ArrowUpRight, Loader2, FileText } from 'lucide-react'
import { resourceLabels } from '@/lib/offerings/shared'
import type { ResourceSummary, WorkspaceResource } from '@/lib/offerings/workspace'
import OfferingRichText from './OfferingRichText'

export default function OfferingLibrary({ slug, resources }: { slug: string; resources: ResourceSummary[] }) {
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
              : { id: currentId, error: data.error || 'Không tải được nội dung.', status: response.status },
          )
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ id: currentId, error: 'Mất kết nối. Vui lòng thử lại.' })
      })
    return () => controller.abort()
  }, [slug, currentId, retry])
  const loaded = result?.id === currentId ? result : null
  if (!resources.length)
    return (
      <p className="rounded-2xl border bg-white p-6 text-brk-muted">
        Tài nguyên đang được đơn vị cung cấp cập nhật. Bạn có thể gửi yêu cầu hỗ trợ ở bên dưới.
      </p>
    )
  return (
    <section id="tai-nguyen" className="scroll-mt-28">
      <h2 className="mb-5 text-2xl font-bold text-green-950">Tài nguyên của bạn</h2>
      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-2xl border bg-white p-4">
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
                onClick={() => setSelected(item.id)}
                className={`flex min-h-14 w-full items-start gap-3 rounded-xl p-3 text-left text-sm ${currentId === item.id ? 'bg-green-50 font-semibold text-green-950' : 'hover:bg-stone-50'}`}
              >
                <FileText className="h-5 w-5 shrink-0 text-brk-primary" />
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
                  {loaded.data.url && (
                    <a
                      href={loaded.data.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brk-primary px-4 font-semibold text-white"
                    >
                      {loaded.data.kind === 'APP' ? 'Mở ứng dụng' : 'Mở tài nguyên'}
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {loaded.data.viewer === 'PDF' && loaded.data.url && (
                  <>
                    <iframe
                      key={loaded.data.url}
                      src={loaded.data.url}
                      title={loaded.data.title}
                      referrerPolicy="no-referrer"
                      className="mb-4 h-[65dvh] w-full rounded-xl border"
                    />
                    <p className="mb-4 text-sm text-brk-muted">
                      Nếu trình duyệt hoặc nơi lưu file không hỗ trợ xem tại đây, hãy bấm Mở tài nguyên.
                    </p>
                  </>
                )}
                {loaded.data.imageUrl && (
                  <img
                    src={loaded.data.imageUrl}
                    alt=""
                    loading="lazy"
                    className="mb-5 max-h-96 max-w-full rounded-xl object-contain"
                  />
                )}
                <OfferingRichText text={loaded.data.content} />
                {loaded.data.links?.length ? (
                  <ul className="mt-4 space-y-3">
                    {loaded.data.links.map((link, index) => (
                      <li key={index}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-12 items-center justify-between gap-3 rounded-xl border p-3 font-semibold text-brk-primary"
                        >
                          <span>{link.title}</span>
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : !loaded.data.url && !loaded.data.content && !loaded.data.imageUrl ? (
                  <p className="text-brk-muted">Nội dung tài nguyên đang được cập nhật.</p>
                ) : null}
                {loaded.data.url && loaded.data.viewer !== 'PDF' && (
                  <p className="mt-5 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm text-brk-muted">
                    <BookOpen className="h-5 w-5 shrink-0" />
                    Tài nguyên này được mở tại nơi đơn vị cung cấp lưu trữ.
                  </p>
                )}
              </article>
            )
          )}
        </div>
      </div>
    </section>
  )
}
