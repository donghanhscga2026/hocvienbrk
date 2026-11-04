'use client'
import { useEffect, useState } from 'react'
import { deliveryStateSchema, deliveryPhaseLabels } from '@/lib/offerings/shared'
import type { z } from 'zod'

export default function OfferingDeliveryEditor({ slug }: { slug: string }) {
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([])
  const [selected, setSelected] = useState(''),
    [retry, setRetry] = useState(0)
  const [state, setState] = useState<z.infer<typeof deliveryStateSchema>>(deliveryStateSchema.parse({}))
  const [loadedFor, setLoadedFor] = useState<string | null>(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/offerings/${encodeURIComponent(slug)}/delivery${selected === '' ? '' : '?userId=' + selected}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Không tải được dữ liệu.')
        if (!controller.signal.aborted) {
          setCustomers(data.customers)
          setState(deliveryStateSchema.parse(data.state))
          setLoadedFor(selected)
          setError('')
          setMessage('')
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message)
      })
    return () => controller.abort()
  }, [slug, selected, retry])
  const field = 'mt-2 min-h-12 w-full rounded-xl border bg-white px-3 text-base'
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy || selected === '' || loadedFor !== selected) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const parsed = deliveryStateSchema.parse(state)
      const response = await fetch(`/api/offerings/${encodeURIComponent(slug)}/delivery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: Number(selected), state: parsed }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không lưu được dữ liệu.')
      setState(data.state)
      setMessage('Đã lưu tiến độ và kết quả riêng cho khách này.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không lưu được dữ liệu.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <p className="text-sm leading-7 text-brk-muted">
        Chọn khách đã kích hoạt dịch vụ. Tiến độ, ghi chú và liên kết bàn giao chỉ hiển thị cho đúng khách đó khi bật
        mục Tiến độ & Bàn giao trong cấu hình dịch vụ.
      </p>
      <label className="block font-semibold">
        Khách hàng
        <select
          disabled={busy}
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value)
            setError('')
            setMessage('')
          }}
          className={field}
        >
          <option value="">Chọn khách hàng</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} · #{customer.id}
            </option>
          ))}
        </select>
      </label>
      {!customers.length && loadedFor === '' && <p>Chưa có khách đã kích hoạt.</p>}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-3 min-h-11 underline">
            Tải lại
          </button>
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-green-50 p-4 text-green-900">
          {message}
        </p>
      )}
      {selected !== '' && loadedFor === selected && (
        <form onSubmit={save}>
          <fieldset disabled={busy} className="space-y-5 rounded-2xl border bg-white p-5">
            <label className="block font-semibold">
              Tiến độ
              <select
                className={field}
                value={state.phase}
                onChange={(e) => setState({ ...state, phase: e.target.value as typeof state.phase })}
              >
                {Object.entries(deliveryPhaseLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block font-semibold">
              Ghi chú cho khách
              <textarea
                className={field + ' py-3'}
                rows={5}
                maxLength={4000}
                value={state.note}
                onChange={(e) => setState({ ...state, note: e.target.value })}
              />
            </label>
            <h2 className="text-lg font-bold">Kết quả bàn giao</h2>
            {state.files.map((file, index) => (
              <div key={index} className="space-y-3 rounded-xl border p-4">
                <label className="block text-sm">
                  Tên bản bàn giao
                  <input
                    maxLength={200}
                    className={field}
                    value={file.title}
                    onChange={(e) =>
                      setState({
                        ...state,
                        files: state.files.map((entry, i) =>
                          i === index ? { ...entry, title: e.target.value } : entry,
                        ),
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  Liên kết
                  <input
                    maxLength={2000}
                    className={field}
                    value={file.url}
                    onChange={(e) =>
                      setState({
                        ...state,
                        files: state.files.map((entry, i) => (i === index ? { ...entry, url: e.target.value } : entry)),
                      })
                    }
                    placeholder="https://… hoặc đường dẫn nội bộ"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setState({ ...state, files: state.files.filter((_, i) => i !== index) })}
                  className="min-h-11 text-sm text-red-700"
                >
                  Xóa
                </button>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={state.files.length >= 30}
                onClick={() => setState({ ...state, files: [...state.files, { title: '', url: '' }] })}
                className="min-h-12 rounded-xl border px-4"
              >
                + Thêm bản bàn giao
              </button>
              <button type="submit" className="min-h-12 rounded-xl bg-brk-primary px-5 font-semibold text-white">
                {busy ? 'Đang lưu…' : 'Lưu cho khách này'}
              </button>
            </div>
            <p className="text-sm text-brk-muted">
              Liên kết bên ngoài vẫn chịu cơ chế cấp quyền của nơi lưu trữ. Chưa tự chuyển file sang kho riêng tư.
            </p>
          </fieldset>
        </form>
      )}
    </section>
  )
}
