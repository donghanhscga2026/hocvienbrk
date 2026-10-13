'use client'

import React, { useEffect, useState } from 'react'
import { X, MousePointerClick } from 'lucide-react'
import type { AssistantGuideStep } from './AssistantProvider'

interface Rect { left: number; top: number; width: number; height: number }

// Chế độ "Dẫn tôi làm": làm mờ nền, khoanh sáng đúng phần tử cần thao tác,
// bấm vào phần tử (hoặc nút Tiếp) để sang bước tiếp theo.
export default function GuideTour({ steps, onDone }: { steps: AssistantGuideStep[]; onDone: () => void }) {
  const tourable = steps.filter(s => s.targetSelector)
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const step = tourable[idx]

  const next = () => {
    if (idx + 1 >= tourable.length) onDone()
    else {
      setRect(null)
      setIdx(idx + 1)
    }
  }

  useEffect(() => {
    if (!step?.targetSelector) return
    const selector = step.targetSelector
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const place = () => {
      const el = document.querySelector(selector) as HTMLElement | null
      // Không tìm thấy hoặc đang ẩn (VD: trong modal chưa mở) -> bỏ qua bước này
      if (!el || el.offsetParent === null) {
        if (!cancelled) next()
        return
      }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      timer = setTimeout(() => {
        if (cancelled) return
        const r = el.getBoundingClientRect()
        el.classList.add('guide-tour-target')
        setRect({ left: r.left, top: r.top, width: r.width, height: r.height })
      }, 400)
    }

    place()
    const el = document.querySelector(selector) as HTMLElement | null
    // Bấm đúng vào phần tử được khoanh sáng cũng sang bước tiếp (đợi handler gốc chạy xong)
    const onClick = () => { timer = setTimeout(() => { if (!cancelled) next() }, 450) }
    el?.addEventListener('click', onClick)
    window.addEventListener('resize', place)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone() }
    window.addEventListener('keydown', onKey)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      el?.removeEventListener('click', onClick)
      el?.classList.remove('guide-tour-target')
      window.removeEventListener('resize', place)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  if (!step) return null

  const tipBelow = rect ? rect.top + rect.height + 200 < window.innerHeight : true
  const tipStyle: React.CSSProperties = rect
    ? {
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 344)),
        top: tipBelow ? rect.top + rect.height + 14 : Math.max(12, rect.top - 210),
      }
    : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <>
      <div className="fixed inset-0 z-[400] bg-slate-900/60" />
      {rect && (
        <div
          className="fixed z-[401] pointer-events-none rounded-xl transition-all duration-300"
          style={{
            left: rect.left - 8,
            top: rect.top - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            border: '3px solid #fbbf24',
            boxShadow: '0 0 0 6px rgba(251,191,36,.25), 0 0 32px rgba(251,191,36,.45)',
          }}
        />
      )}
      <div
        className="fixed z-[402] w-[320px] max-w-[90vw] bg-white rounded-2xl shadow-2xl p-4"
        style={tipStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-slate-800">{step.title}</p>
          <button onClick={onDone} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400" title="Kết thúc tour">
            <X className="w-4 h-4" />
          </button>
        </div>
        {step.body && (
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line line-clamp-4">{step.body}</p>
        )}
        <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
          Bấm vào phần đang khoanh sáng, hoặc bấm Tiếp
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[11px] text-slate-400 font-bold flex-1">
            Bước {idx + 1}/{tourable.length}
          </span>
          <button
            onClick={onDone}
            className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            Kết thúc
          </button>
          <button
            onClick={next}
            className="px-3 py-1.5 text-xs font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700"
          >
            {idx + 1 >= tourable.length ? 'Xong ✓' : 'Tiếp →'}
          </button>
        </div>
      </div>
      <style>{`
        .guide-tour-target { position: relative !important; z-index: 401 !important; }
        .line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </>
  )
}
