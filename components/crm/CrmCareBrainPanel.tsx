'use client'
import { useState } from 'react'
import { BookOpenCheck, RefreshCw, Sparkles } from 'lucide-react'

type Citation = { lessonId: string | null; lessonTitle: string; sourceType: string; timestampSec: number | null; label: string }
type BrainStats = { lessons: number; segments: number; transcriptChunks: number; qaPairs: number; chunks: number; version: number; builtAt: string }
type DraftResult = {
  courseId: number | null
  aiConfigured: boolean
  draft: string
  sources: Citation[]
  notice?: string
  brain?: BrainStats
  capExceeded?: boolean
  spentVnd?: number
  capVnd?: number
}

const button =
  'inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Care Engine GĐ3 — panel "AI gợi ý trả lời" trong chi tiết yêu cầu CRM.
 * AI chỉ soạn nháp + trích nguồn từ tri thức khóa; giảng viên bấm
 * "Dùng nháp này" để đổ vào ô trả lời có sẵn rồi tự gửi. AI không tự gửi.
 */
export default function CrmCareBrainPanel({
  requestId,
  onUseDraft,
}: {
  requestId: string
  onUseDraft: (text: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [compiling, setCompiling] = useState(false)
  const [result, setResult] = useState<DraftResult | null>(null)
  const [error, setError] = useState('')

  const runDraft = async () => {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/crm/care-brain/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không soạn được nháp.')
      setResult(data as DraftResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không soạn được nháp.')
    } finally {
      setBusy(false)
    }
  }

  const runCompile = async () => {
    if (!result?.courseId) return
    setCompiling(true); setError('')
    try {
      const response = await fetch('/api/crm/care-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: result.courseId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không biên dịch được tri thức.')
      setResult(prev => (prev ? { ...prev, brain: data.stats as BrainStats } : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không biên dịch được tri thức.')
    } finally {
      setCompiling(false)
    }
  }

  return (
    <section aria-label="AI gợi ý trả lời" className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-semibold text-violet-900">
          <Sparkles size={17} /> AI gợi ý trả lời
        </h4>
        <div className="flex flex-wrap gap-2">
          {result?.brain && result.courseId != null && (
            <button type="button" disabled={compiling} className={button} onClick={() => void runCompile()}>
              <RefreshCw size={15} /> {compiling ? 'Đang biên dịch…' : 'Biên dịch lại tri thức'}
            </button>
          )}
          <button type="button" disabled={busy} className={button + ' border-violet-600 bg-violet-600 text-white hover:bg-violet-500'} onClick={() => void runDraft()}>
            <Sparkles size={15} /> {busy ? 'Đang soạn…' : result?.draft ? 'Soạn lại nháp khác' : 'AI soạn nháp'}
          </button>
        </div>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Nháp được soạn từ tri thức của chính khóa học (bài giảng, transcript, hỏi đáp đã trả lời) và luôn kèm nguồn trích dẫn.
        AI không tự gửi — giảng viên duyệt, bấm “Dùng nháp này” rồi gửi như bình thường.
      </p>
      {result?.brain && (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <BookOpenCheck size={14} /> Tri thức khóa: {result.brain.lessons} bài · {result.brain.segments} đoạn bài giảng ·{' '}
          {result.brain.transcriptChunks} đoạn transcript · {result.brain.qaPairs} hỏi đáp · phiên bản v{result.brain.version}
          {typeof result.spentVnd === 'number' && typeof result.capVnd === 'number' &&
            ` · Chi phí AI tháng này: ${result.spentVnd.toLocaleString('vi-VN')}đ / ${result.capVnd.toLocaleString('vi-VN')}đ`}
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {result?.notice && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{result.notice}</p>}
      {result && result.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.sources.map((source, index) => (
            <span key={index} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-violet-800 ring-1 ring-violet-200">
              Nguồn: {source.label}
            </span>
          ))}
        </div>
      )}
      {result?.draft && (
        <div className="space-y-2">
          <div className="whitespace-pre-wrap break-words rounded-xl bg-white p-3 text-sm leading-6 ring-1 ring-violet-100">{result.draft}</div>
          <button type="button" className={button + ' border-emerald-700 bg-emerald-50 text-emerald-900'} onClick={() => onUseDraft(result.draft)}>
            Dùng nháp này
          </button>
        </div>
      )}
    </section>
  )
}
