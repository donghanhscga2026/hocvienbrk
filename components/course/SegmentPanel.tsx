'use client'

import { CheckCircle2, ChevronLeft, ChevronRight, ListVideo, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSegmentTime } from '@/lib/course/segments'

// Thư viện bài giảng thông minh (GĐ1) — panel đoạn của video đang phát.
// Giao diện theo preview đã được duyệt ở Giai đoạn 0, phối theo phong cách
// panel "Danh sách học phần" sẵn có của VideoPlayer (nền trắng dưới khung đen).
// Component chỉ hiển thị: dữ liệu + hành vi seek/tiến độ do CoursePlayer giữ.

export type SegmentPanelItem = {
    id: string
    videoIndex: number
    startSec: number
    endSec: number
    title: string
    summary: string | null
    keywords: string[]
    order: number
    status: string
}

type SegmentPanelProps = {
    segments: SegmentPanelItem[]
    activeSegmentId: string | null
    progressMap: Record<string, { watchedSec: number; completed: boolean }>
    onSeekSegment: (segment: SegmentPanelItem) => void
}

export default function SegmentPanel({ segments, activeSegmentId, progressMap, onSeekSegment }: SegmentPanelProps) {
    if (segments.length === 0) return null

    const activeIndex = segments.findIndex(s => s.id === activeSegmentId)
    const active = activeIndex >= 0 ? segments[activeIndex] : null
    const completedCount = segments.filter(s => progressMap[s.id]?.completed).length
    const prev = activeIndex > 0 ? segments[activeIndex - 1] : null
    const next = activeIndex >= 0 && activeIndex < segments.length - 1 ? segments[activeIndex + 1] : null

    return (
        <div data-testid="segment-panel" className="w-full bg-white text-gray-900 shadow-lg">
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200">
                <h3 className="text-gray-900 font-black text-xs flex items-center gap-1.5 min-w-0">
                    <ListVideo className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="truncate">Mục lục đoạn ({segments.length} đoạn)</span>
                </h3>
                <span className="shrink-0 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
                    Đã xem {completedCount}/{segments.length}
                </span>
            </div>

            {active ? (
                <div className="px-3 py-3 border-b border-gray-200 bg-teal-50/50">
                    <p className="text-[11px] font-bold text-teal-700">
                        {formatSegmentTime(active.startSec)} – {formatSegmentTime(active.endSec)}
                    </p>
                    <h4 className="text-sm font-black text-gray-900 mt-0.5">{active.title}</h4>
                    {active.summary && (
                        <p className="text-[13px] leading-relaxed text-gray-700 mt-1">{active.summary}</p>
                    )}
                    {active.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {active.keywords.map(k => (
                                <span key={k} className="text-[11px] font-semibold text-teal-800 bg-teal-100/80 rounded-full px-2 py-1">{k}</span>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2 mt-3">
                        <button
                            type="button"
                            disabled={!prev}
                            onClick={() => prev && onSeekSegment(prev)}
                            className="min-h-11 flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-bold text-gray-700 disabled:opacity-40 active:scale-[0.98] transition"
                        >
                            <ChevronLeft className="w-4 h-4" /> Đoạn trước
                        </button>
                        <button
                            type="button"
                            disabled={!next}
                            onClick={() => next && onSeekSegment(next)}
                            className="min-h-11 flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-bold text-gray-700 disabled:opacity-40 active:scale-[0.98] transition"
                        >
                            Đoạn sau <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <p className="px-3 py-2.5 text-[12px] text-gray-500 border-b border-gray-200">
                    Bấm vào một đoạn để xem ngay phần đó — video nhảy đúng mốc giờ của đoạn.
                </p>
            )}

            <div className="max-h-[46vh] overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                {segments.map(seg => {
                    const isActive = seg.id === activeSegmentId
                    const done = !!progressMap[seg.id]?.completed
                    return (
                        <button
                            key={seg.id}
                            type="button"
                            data-segment-id={seg.id}
                            onClick={() => onSeekSegment(seg)}
                            className={cn(
                                'w-full flex items-center gap-2.5 min-h-11 py-2 px-2 rounded-lg transition-all border text-left',
                                isActive ? 'bg-orange-50 border-orange-400' : 'bg-white border-transparent hover:bg-gray-50'
                            )}
                        >
                            <span className={cn(
                                'shrink-0 text-[12px] font-black tabular-nums',
                                isActive ? 'text-orange-600' : 'text-teal-700'
                            )}>
                                {formatSegmentTime(seg.startSec)}
                            </span>
                            <span className={cn(
                                'flex-1 text-[13px] font-bold leading-snug',
                                isActive ? 'text-orange-700' : 'text-gray-700'
                            )}>
                                {seg.title}
                            </span>
                            {isActive && <Play className="w-3.5 h-3.5 text-orange-500 fill-current shrink-0" />}
                            {done && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" aria-label="Đã xem" />}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
