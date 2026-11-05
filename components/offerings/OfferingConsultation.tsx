'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import type { ServiceConfig } from '@/lib/offerings/service'
export default function OfferingConsultation({
  slug,
  questions,
  signedIn,
}: {
  slug: string
  questions: ServiceConfig['questions']
  signedIn: boolean
}) {
  const [open, setOpen] = useState(false),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [content, setContent] = useState(''),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState('')
  const key = useRef<string>('')
  const field = 'mt-2 min-h-12 w-full rounded-xl border bg-white p-3 text-base'
  return (
    <section id="tu-van" className="space-y-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="min-h-12 w-full rounded-xl bg-brk-primary px-4 font-semibold text-white"
      >
        Gửi yêu cầu tư vấn
      </button>
      <p className="text-sm text-brk-muted">
        Chưa cần thanh toán hay kích hoạt dịch vụ. Người phụ trách sẽ trao đổi và báo giá riêng.
      </p>
      {open &&
        (done ? (
          <p role="status">
            Đã gửi nhu cầu tới người phụ trách. Theo dõi và trao đổi tại{' '}
            <Link href="/my-requests" className="underline">
              Yêu cầu của tôi
            </Link>
            .
          </p>
        ) : !signedIn ? (
          <p>
            Vui lòng{' '}
            <Link
              href={'/login?callbackUrl=' + encodeURIComponent('/dich-vu/' + slug + '#tu-van')}
              className="font-semibold underline"
            >
              đăng nhập
            </Link>{' '}
            để gửi và theo dõi yêu cầu. Không cần đăng ký mua dịch vụ.
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (busy) return
              setBusy(true)
              setError('')
              key.current ||= crypto.randomUUID()
              try {
                const response = await fetch(`/api/offerings/${encodeURIComponent(slug)}/consult`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ key: key.current, answers, content, consent }),
                })
                const data = await response.json()
                if (!response.ok) throw new Error(data.error || 'Chưa gửi được yêu cầu.')
                setDone(true)
              } catch (error) {
                setError(error instanceof Error ? error.message : 'Mất kết nối. Nội dung vẫn được giữ.')
              } finally {
                setBusy(false)
              }
            }}
          >
            {questions.map((q) => (
              <label key={q.id} className="block font-semibold">
                {q.label}
                {q.required ? ' *' : ''}
                {q.type === 'SELECT' ? (
                  <select
                    value={answers[q.id] || ''}
                    required={q.required}
                    onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })}
                    className={field}
                  >
                    <option value="">Chọn câu trả lời</option>
                    {q.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : q.type === 'LINK' ? (
                  <input
                    type="url"
                    required={q.required}
                    maxLength={2000}
                    value={answers[q.id] || ''}
                    onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })}
                    className={field}
                  />
                ) : (
                  <textarea
                    required={q.required}
                    maxLength={2000}
                    rows={3}
                    value={answers[q.id] || ''}
                    onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })}
                    className={field}
                  />
                )}
              </label>
            ))}
            <label className="block font-semibold">
              Nhu cầu / ghi chú thêm
              <textarea
                required={!questions.length}
                rows={3}
                maxLength={2000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className={field}
              />
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              Tôi đồng ý gửi thông tin để người phụ trách tư vấn.
            </label>
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
            <button
              disabled={busy || !consent}
              className="min-h-12 rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-40"
            >
              {busy ? 'Đang gửi…' : 'Gửi nhu cầu'}
            </button>
          </form>
        ))}
    </section>
  )
}
