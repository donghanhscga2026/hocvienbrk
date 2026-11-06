'use client'
import { useEffect, useId, useState, useRef } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
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
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const modal = dialog.current
    if (!open || !modal) return
    modal.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      modal.close()
      document.body.style.overflow = previousOverflow
    }
  }, [open])
  const field = 'mt-2 min-h-12 w-full rounded-xl border bg-white p-3 text-base'
  return (
    <section id="tu-van" className="space-y-4">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="min-h-12 w-full rounded-xl bg-brk-primary px-4 font-semibold text-white"
      >
        Gửi yêu cầu tư vấn
      </button>
      <p className="text-sm text-brk-muted">
        Chưa cần thanh toán hay kích hoạt dịch vụ. Người phụ trách sẽ trao đổi và báo giá riêng.
      </p>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        className="fixed m-auto h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[720px] flex-col overflow-hidden rounded-2xl border border-brk-outline bg-white p-0 text-brk-on-surface shadow-2xl backdrop:bg-black/50 open:flex sm:h-auto sm:max-h-[90dvh]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-brk-outline px-5 py-3 sm:px-6">
          <h2 id={titleId} className="text-xl font-bold">{done ? 'Yêu cầu đã được gửi' : 'Gửi yêu cầu tư vấn'}</h2>
          <button type="button" aria-label="Đóng form tư vấn" onClick={() => setOpen(false)} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </header>
        {done ? (
          <div role="status" className="space-y-5 overflow-y-auto p-6">
            <p>Đã gửi nhu cầu tới người phụ trách. Bạn có thể theo dõi phản hồi và trao đổi thêm trong Yêu cầu của tôi.</p>
            <Link href="/my-requests" className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-4 font-semibold text-white">Xem yêu cầu của tôi</Link>
          </div>
        ) : !signedIn ? (
          <p className="overflow-y-auto p-6">
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
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
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
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
              <p className="text-sm text-brk-muted">Chia sẻ nhu cầu để người phụ trách tư vấn và báo giá phù hợp. Chưa cần thanh toán.</p>
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
            </div>
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-brk-outline bg-white px-5 py-4 sm:px-6">
              <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-xl border border-brk-outline px-4 font-semibold">Để sau</button>
            <button
              disabled={busy || !consent}
              className="min-h-12 rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-40"
            >
              {busy ? 'Đang gửi…' : 'Gửi yêu cầu'}
            </button>
            </footer>
          </form>
        )}
      </dialog>
    </section>
  )
}
