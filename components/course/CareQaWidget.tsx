'use client'
import { useRef, useState } from 'react'
import { LifeBuoy, MessageCircleQuestion, Send, X } from 'lucide-react'

type Citation = { lessonId: string | null; lessonTitle: string; sourceType: string; timestampSec: number | null; label: string }
type Turn =
  | { role: 'student'; text: string }
  | { role: 'assistant'; text: string; sources: Citation[]; outOfScope?: boolean; canEscalate?: boolean }

/**
 * Care Engine GĐ3 — khung hỏi đáp phía học viên trong trang học.
 * Trả lời bám tri thức khóa kèm trích dẫn bài/phút; ngoài phạm vi hoặc
 * khi học viên muốn gặp người thật → tạo CrmRequest qua đúng API sẵn có.
 */
export default function CareQaWidget({ courseId, lessonId }: { courseId: number; lessonId?: string }) {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [escalated, setEscalated] = useState(false)
  const lastQuestion = useRef('')

  const ask = async () => {
    const question = input.trim()
    if (!question || busy) return
    lastQuestion.current = question
    setTurns(prev => [...prev, { role: 'student', text: question }])
    setInput('')
    setBusy(true)
    try {
      const response = await fetch('/api/learn/care-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, lessonId, question }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không hỏi được trợ lý.')
      const text = (data.answer as string) || (data.message as string) || ''
      setTurns(prev => [
        ...prev,
        { role: 'assistant', text, sources: (data.sources as Citation[]) || [], outOfScope: !!data.outOfScope, canEscalate: !!data.outOfScope || !!data.capExceeded },
      ])
    } catch (error) {
      setTurns(prev => [
        ...prev,
        { role: 'assistant', text: error instanceof Error ? error.message : 'Không hỏi được trợ lý.', sources: [], canEscalate: true },
      ])
    } finally {
      setBusy(false)
    }
  }

  const escalate = async () => {
    if (busy || escalated) return
    setBusy(true)
    try {
      const response = await fetch('/api/crm/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: crypto.randomUUID(),
          courseId,
          lessonId,
          category: 'LEARNING',
          content: lastQuestion.current || 'Học viên cần hỗ trợ trực tiếp từ giảng viên.',
          consent: true,
          website: '',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không gửi được yêu cầu.')
      setEscalated(true)
      setTurns(prev => [
        ...prev,
        { role: 'assistant', text: 'Đã gửi yêu cầu tới giảng viên. Giảng viên sẽ trả lời trong mục “Yêu cầu của tôi” của bạn.', sources: [] },
      ])
    } catch (error) {
      setTurns(prev => [
        ...prev,
        { role: 'assistant', text: error instanceof Error ? error.message : 'Không gửi được yêu cầu hỗ trợ.', sources: [], canEscalate: true },
      ])
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-violet-600 px-4 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-500"
      >
        <MessageCircleQuestion size={19} /> Hỏi trợ lý khóa học
      </button>
    )
  }

  return (
    <section
      aria-label="Hỏi đáp trợ lý khóa học"
      className="fixed bottom-5 right-5 z-40 flex max-h-[70vh] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
    >
      <header className="flex items-center justify-between gap-2 bg-violet-600 px-4 py-3 text-white">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircleQuestion size={17} /> Trợ lý khóa học
        </p>
        <button type="button" aria-label="Đóng khung hỏi đáp" onClick={() => setOpen(false)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg hover:bg-violet-500">
          <X size={17} />
        </button>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {turns.length === 0 && (
          <p className="rounded-xl bg-violet-50 p-3 text-sm leading-6 text-slate-600">
            Hỏi bất cứ điều gì trong nội dung khóa — trợ lý trả lời kèm nguồn đúng bài và phút trong video để bạn mở xem lại.
            Ngoài nội dung khóa, trợ lý sẽ nói rõ và gợi ý gửi yêu cầu cho giảng viên.
          </p>
        )}
        {turns.map((turn, index) =>
          turn.role === 'student' ? (
            <div key={index} className="ml-8 rounded-xl bg-slate-100 p-3 text-sm leading-6">{turn.text}</div>
          ) : (
            <div key={index} className="mr-4 space-y-2">
              <div className="whitespace-pre-wrap rounded-xl bg-violet-50 p-3 text-sm leading-6 ring-1 ring-violet-100">{turn.text}</div>
              {turn.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {turn.sources.map((source, i) => (
                    <span key={i} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-violet-800 ring-1 ring-violet-200">
                      Nguồn: {source.label}
                    </span>
                  ))}
                </div>
              )}
              {turn.canEscalate && !escalated && (
                <button type="button" disabled={busy} onClick={() => void escalate()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-50 px-3.5 text-sm font-medium text-emerald-900 disabled:opacity-50">
                  <LifeBuoy size={15} /> Chuyển người thật — gửi yêu cầu hỗ trợ
                </button>
              )}
            </div>
          ),
        )}
        {busy && <p className="text-sm text-slate-500">Đang tìm trong nội dung khóa…</p>}
      </div>
      <form
        className="flex gap-2 border-t border-slate-200 p-3"
        onSubmit={event => {
          event.preventDefault()
          void ask()
        }}
      >
        <input
          value={input}
          onChange={event => setInput(event.target.value)}
          maxLength={1000}
          placeholder="Nhập câu hỏi về bài học…"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-violet-500"
        />
        <button type="submit" disabled={busy || !input.trim()} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-violet-600 text-white disabled:opacity-50" aria-label="Gửi câu hỏi">
          <Send size={17} />
        </button>
      </form>
    </section>
  )
}
