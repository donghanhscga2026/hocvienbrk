'use client'
import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
type Data = {
  total: number
  rows: {
    id: number
    userId: number
    name: string
    state: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'INACTIVE'
    activatedAt: string | null
    expiresAt: string | null
  }[]
}
const labels = {
  ALL: 'Tất cả',
  PENDING: 'Chờ kích hoạt',
  ACTIVE: 'Đang có quyền',
  EXPIRED: 'Hết hạn',
  INACTIVE: 'Đã hủy / Từ chối',
}
export default function OfferingCustomers({ slug, legacyPanel }: { slug: string; legacyPanel: ReactNode }) {
  const [query, setQuery] = useState(''),
    [state, setState] = useState('ALL'),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0),
    [advanced, setAdvanced] = useState(false)
  const [result, setResult] = useState<{ key: string; data?: Data; error?: string } | null>(null)
  const key = `${slug}:${query}:${state}:${page}:${retry}`
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(
        `/api/offerings/${encodeURIComponent(slug)}/customers?q=${encodeURIComponent(query)}&state=${state}&page=${page}`,
        { signal: controller.signal, cache: 'no-store' },
      )
        .then(async (response) => {
          const data = await response.json()
          if (!response.ok) throw new Error(data.error)
          if (!controller.signal.aborted) setResult({ key, data })
        })
        .catch((error) => {
          if (!controller.signal.aborted) setResult({ key, error: error.message || 'Mất kết nối.' })
        })
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [key, slug, query, state, page])
  const current = result?.key === key ? result : null
  const date = (value: string) =>
    new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short' }).format(
      new Date(value),
    )
  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-bold text-green-950">Khách hàng & Quyền sử dụng</h2>
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          aria-label="Tìm khách hàng đã đăng ký"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setPage(1)
          }}
          placeholder="Tìm theo tên khách…"
          className="min-h-12 rounded-xl border bg-white px-3"
        />
        <select
          aria-label="Lọc quyền khách hàng"
          value={state}
          onChange={(event) => {
            setState(event.target.value)
            setPage(1)
          }}
          className="min-h-12 rounded-xl border bg-white px-3"
        >
          {Object.entries(labels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="min-h-12 rounded-xl border bg-white px-4"
        >
          Tải lại
        </button>
      </div>
      {!current ? (
        <p role="status">Đang tải khách hàng…</p>
      ) : current.error ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-900">
          {current.error}
        </p>
      ) : (
        <>
          <p className="text-sm text-brk-muted">{current.data?.total || 0} đăng ký phù hợp</p>
          <div className="space-y-3">
            {current.data?.rows.map((row) => (
              <article
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5"
              >
                <div>
                  <h3 className="text-lg font-bold">{row.name}</h3>
                  <p className="mt-2 text-sm text-brk-muted">
                    Tài khoản #{row.userId} · Đăng ký #{row.id}
                  </p>
                  {row.activatedAt && (
                    <p className="mt-2 text-sm text-brk-muted">
                      Kích hoạt: {date(row.activatedAt)}
                      {row.expiresAt ? ' · Hết hạn: ' + date(row.expiresAt) : ''}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${row.state === 'ACTIVE' ? 'bg-green-50 text-green-950' : 'bg-amber-50 text-amber-950'}`}
                >
                  {labels[row.state]}
                </span>
              </article>
            ))}
          </div>
          {!current.data?.rows.length && (
            <p className="rounded-xl border bg-white p-5">Không có khách phù hợp.</p>
          )}
          <nav aria-label="Phân trang khách hàng" className="flex items-center gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="min-h-11 disabled:opacity-40"
            >
              Trước
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil((current.data?.total || 0) / 25))}
            </span>
            <button
              type="button"
              disabled={page * 25 >= (current.data?.total || 0)}
              onClick={() => setPage(page + 1)}
              className="min-h-11 disabled:opacity-40"
            >
              Sau
            </button>
          </nav>
        </>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          aria-expanded={advanced}
          onClick={() => setAdvanced(!advanced)}
          className="min-h-12 rounded-xl border bg-white px-4 font-semibold text-brk-primary"
        >
          {advanced ? 'Thu gọn quản lý đăng ký' : 'Mở quản lý đăng ký hiện có'}
        </button>
        <Link
          href="/tools/payments"
          className="inline-flex min-h-12 items-center rounded-xl border bg-white px-4 font-semibold text-brk-primary"
        >
          Quản lý thanh toán
        </Link>
      </div>
      {advanced && <div className="rounded-2xl border bg-white p-4">{legacyPanel}</div>}
    </section>
  )
}
