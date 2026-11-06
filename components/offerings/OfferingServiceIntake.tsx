'use client'
import { useEffect, useState } from 'react'
import { intakeStateSchema } from '@/lib/offerings/intake'
import type { ServiceConfig } from '@/lib/offerings/service'
export default function OfferingServiceIntake({ slug, userId }: { slug: string; userId?: string }) {
  const [data, setData] = useState<{
      questions: ServiceConfig['questions']
      state: ReturnType<typeof intakeStateSchema.parse>
    } | null>(null),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0)
  const readOnly = userId != null
  const url = `/api/offerings/${encodeURIComponent(slug)}/intake${readOnly ? '?userId=' + encodeURIComponent(userId) : ''}`
  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    fetch(url, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Không tải được hồ sơ.')
        if (!controller.signal.aborted) {
          setData(result)
          setAnswers(
            Object.fromEntries(
              result.state.answers.map((a: { id: string; value: string }) => [a.id, a.value]),
            ),
          )
          setError('')
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
    return () => controller.abort()
  }, [url, retry])
  const field = 'mt-2 min-h-12 w-full rounded-xl border bg-white p-3'
  return (
    <section className="space-y-4 rounded-2xl border bg-white p-5">
      <h3 className="text-xl font-bold">Hồ sơ & thông tin đầu vào</h3>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!data ? (
        <button type="button" className="min-h-11" onClick={() => setRetry((x) => x + 1)}>
          {error ? 'Thử tải lại' : 'Đang tải…'}
        </button>
      ) : readOnly ? (
        <div className="space-y-3">
          {data.state.answers.length ? (
            data.state.answers.map((a) => (
              <div key={a.id}>
                <h4 className="font-semibold">{a.label}</h4>
                <p className="whitespace-pre-wrap break-words">{a.value || 'Chưa trả lời'}</p>
              </div>
            ))
          ) : (
            <p>Khách chưa gửi hồ sơ.</p>
          )}
        </div>
      ) : data.questions.length ? (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (busy) return
            setBusy(true)
            setError('')
            setMessage('')
            try {
              const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ version: data.state.version, answers }),
              })
              const result = await response.json()
              if (!response.ok) throw new Error(result.error || 'Không lưu được hồ sơ.')
              setData({ ...data, state: result.state })
              setMessage('Đã lưu hồ sơ cho người phụ trách.')
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Không lưu được hồ sơ.')
            } finally {
              setBusy(false)
            }
          }}
        >
          {data.questions.map((q) => (
            <label key={q.id} className="block font-semibold">
              {q.label}
              {q.required ? ' *' : ''}
              {q.type === 'SELECT' ? (
                <select
                  required={q.required}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  className={field}
                >
                  <option value="">Chọn câu trả lời</option>
                  {q.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : q.type === 'LINK' ? (
                <input
                  required={q.required}
                  type="url"
                  maxLength={2000}
                  placeholder="https://…"
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  className={field}
                />
              ) : (
                <textarea
                  required={q.required}
                  maxLength={2000}
                  rows={3}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  className={field}
                />
              )}
            </label>
          ))}
          <button
            disabled={busy}
            className="min-h-12 rounded-xl bg-brk-primary px-5 font-semibold text-white"
          >
            {busy ? 'Đang lưu…' : 'Lưu hồ sơ'}
          </button>
          <button
            type="button"
            disabled={busy}
            className="ml-3 min-h-11 underline"
            onClick={() => {
              if (window.confirm('Tải lại sẽ bỏ các câu trả lời chưa lưu. Tiếp tục?')) setRetry((x) => x + 1)
            }}
          >
            Tải lại
          </button>
        </form>
      ) : (
        <p>Chưa có câu hỏi đầu vào.</p>
      )}
    </section>
  )
}
