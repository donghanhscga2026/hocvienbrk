'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import MainHeader from '@/components/layout/MainHeader'
import { appFrameOrigin } from '@/lib/wi300/app-frame-domains'

type State = { revision: number; origins: string[]; builtIn: string[] }
export default function AppFrameDomains() {
  const [state, setState] = useState<State | null>(null)
  const [origins, setOrigins] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/app-frame-domains', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Không tải được cấu hình.')
        if (!controller.signal.aborted) {
          setState(data)
          setOrigins(data.origins)
          setError('')
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message)
      })
    return () => controller.abort()
  }, [retry])
  const dirty = !!state && JSON.stringify(origins) !== JSON.stringify(state.origins)
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || input.trim()) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, input])
  function add() {
    try {
      const origin = appFrameOrigin(input)
      if (origins.includes(origin) || state?.builtIn.includes(origin))
        throw new Error('Tên miền này đã có trong danh sách.')
      if (origins.length >= 50) throw new Error('Tối đa 50 tên miền bổ sung.')
      setOrigins([...origins, origin])
      setInput('')
      setError('')
      setMessage('Đã thêm vào bản nháp. Bấm Lưu danh sách để áp dụng.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Tên miền không hợp lệ.')
    }
  }
  async function save() {
    if (!state || busy) return
    if (input.trim()) {
      setError('Bấm Thêm tên miền cho link đang nhập trước khi lưu.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/app-frame-domains', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: state.revision, origins }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không lưu được cấu hình.')
      setState(data)
      setOrigins(data.origins)
      setMessage('Đã lưu. Tải lại trang có App sau tối đa 30 giây để áp dụng, không cần deploy lại.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Mất kết nối. Bản nhập vẫn được giữ.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="min-h-screen bg-stone-50">
      <MainHeader title="Tên miền App" toolSlug="settings" />
      <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <Link href="/tools/settings" className="font-semibold text-brk-primary">
          ← Cài đặt
        </Link>
        <section className="space-y-4 rounded-2xl border bg-white p-5">
          <h1 className="text-2xl font-bold">Tên miền App được phép nhúng</h1>
          <p className="leading-7 text-brk-muted">
            Thêm tên miền một lần để dùng cho nhiều App trên Wi300. Áp dụng sau khi tải lại trang, tối đa 30
            giây. Không cần sửa code hoặc deploy lại cho mỗi tên miền.
          </p>
          <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6">
            Chỉ thêm App bạn tin cậy. Thiết lập này cho Wi300 tải App trong khung; App vẫn phải cho phép
            nhúng. App chặn nhúng có thể dùng tùy chọn Mở ở tab mới.
          </p>
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-green-800">
              {message}
            </p>
          )}
          {!state ? (
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="min-h-12 rounded-xl border px-4"
            >
              {error ? 'Tải lại' : 'Đang tải danh sách…'}
            </button>
          ) : (
            <>
              <label className="block font-semibold">
                Tên miền hoặc link App
                <input
                  aria-label="Tên miền App mới"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="app.example.com hoặc https://app.example.com/tool"
                  maxLength={2000}
                  disabled={busy}
                  className="mt-2 min-h-12 w-full rounded-xl border px-3"
                />
              </label>
              <p className="text-sm text-brk-muted">
                Chỉ lưu phần tên miền HTTPS. Mỗi tên miền phụ được thêm riêng, không dùng dấu *.
              </p>
              <button
                type="button"
                onClick={add}
                disabled={busy}
                className="min-h-12 rounded-xl border px-4 font-semibold text-brk-primary"
              >
                + Thêm tên miền
              </button>
              <h2 className="text-lg font-bold">Tên miền bổ sung ({origins.length}/50)</h2>
              <ul className="space-y-2">
                {origins.map((origin) => (
                  <li
                    key={origin}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                  >
                    <span className="break-all">{origin}</span>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Gỡ ${origin}`}
                      onClick={() => {
                        setOrigins(origins.filter((value) => value !== origin))
                        setMessage('Đã gỡ khỏi bản nháp. Bấm Lưu danh sách để áp dụng.')
                      }}
                      className="min-h-11 rounded-xl border px-3 text-red-700"
                    >
                      Gỡ
                    </button>
                  </li>
                ))}
              </ul>
              {!origins.length && <p className="text-brk-muted">Chưa có tên miền bổ sung.</p>}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!dirty || busy}
                  onClick={save}
                  className="min-h-12 rounded-xl bg-brk-primary px-5 font-semibold text-white disabled:opacity-40"
                >
                  {busy ? 'Đang lưu…' : 'Lưu danh sách'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !(dirty || input.trim()) ||
                      window.confirm('Tải lại sẽ bỏ bản nhập chưa lưu. Tiếp tục?')
                    ) {
                      setState(null)
                      setInput('')
                      setMessage('')
                      setRetry((value) => value + 1)
                    }
                  }}
                  className="min-h-12 rounded-xl border px-4"
                >
                  Tải lại danh sách
                </button>
              </div>
              <details className="border-t pt-4">
                <summary className="min-h-11 cursor-pointer font-semibold">
                  Tên miền có sẵn của hệ thống
                </summary>
                <ul className="space-y-2 text-sm text-brk-muted">
                  {state.builtIn.map((origin) => (
                    <li key={origin}>{origin}</li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
