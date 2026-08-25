'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, Link2, MessageSquare, PlayCircle } from 'lucide-react'
import MemberDayMatrix from './MemberDayMatrix'
import { DayStatus } from './MemberDayChips'
import { getMemberSubmissionHistoryAction } from '@/app/actions/admin-actions'

function localPhone(phone: string | null | undefined) {
    if (!phone) return null
    return phone.startsWith('+84') ? '0' + phone.slice(3) : phone
}

function formatDateTime(date: Date | string | null) {
    if (!date) return null
    return new Date(date).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDateOnly(date: Date | string | null) {
    if (!date) return null
    return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const STATUS_BADGE: Record<DayStatus, string> = {
    onTime: 'bg-emerald-100 text-emerald-700',
    late: 'bg-purple-100 text-purple-700',
    missing: 'bg-red-100 text-red-600',
}

const STATUS_TEXT: Record<DayStatus, string> = {
    onTime: 'Đúng hạn',
    late: 'Nộp muộn',
    missing: 'Chưa nộp',
}

type HistoryDay = {
    order: number
    lessonTitle: string
    dayDate: string | Date
    status: DayStatus
    submittedAt: string | Date | null
    totalScore: number | null
    scores: { video?: number; reflection?: number; link?: number; support?: number; timing?: number } | null
    assignment: { reflection?: string; links?: string[]; supports?: boolean[] } | null
    watchPercent: number | null
    comments: { id: number; content: string; createdAt: string | Date }[]
}

const SCORE_BREAKDOWN: { key: keyof NonNullable<HistoryDay['scores']>; label: string; max: number }[] = [
    { key: 'video', label: 'Xem video', max: 2 },
    { key: 'reflection', label: 'Nội dung chia sẻ', max: 2 },
    { key: 'link', label: 'Link minh chứng', max: 3 },
    { key: 'support', label: 'Hỗ trợ', max: 2 },
    { key: 'timing', label: 'Đúng hạn', max: 1 },
]

function HistoryEntry({ day, highlighted }: { day: HistoryDay; highlighted: boolean }) {
    const links = (day.assignment?.links || []).filter(Boolean)
    return (
        <div
            id={`day-history-${day.order}`}
            className={`rounded-xl border p-3 space-y-2 transition-colors ${highlighted ? 'border-violet-400 ring-2 ring-violet-200 bg-violet-50/40' : 'border-gray-100 bg-white'}`}
        >
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs font-bold text-gray-700">Ngày {day.order} ({formatDateOnly(day.dayDate)}) — {day.lessonTitle}</div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${STATUS_BADGE[day.status]}`}>{STATUS_TEXT[day.status]}</span>
            </div>

            {/* Tương tác vào bài học: xem video + bình luận — hiện kể cả khi chưa nộp bài */}
            {(day.watchPercent !== null || day.comments.length > 0) && (
                <div className="space-y-1.5 border-b border-dashed border-gray-100 pb-2">
                    {day.watchPercent !== null && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                            <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                            Đã xem video: <span className="font-semibold text-gray-700">{day.watchPercent}%</span>
                        </div>
                    )}
                    {day.comments.length > 0 && (
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                Bình luận trong bài học ({day.comments.length}):
                            </div>
                            {day.comments.map(c => (
                                <div key={c.id} className="text-[11px] text-gray-600 bg-sky-50 rounded-lg p-2 ml-5">
                                    <div>{c.content}</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(c.createdAt)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {day.status === 'missing' ? (
                <div className="text-[11px] text-gray-400">Chưa nộp bài tập.</div>
            ) : (
                <>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                        <span>Nộp lúc: <span className="font-semibold text-gray-700">{formatDateTime(day.submittedAt) || '—'}</span></span>
                        <span>Tổng điểm: <span className="font-semibold text-gray-700">{day.totalScore ?? '—'}/10</span></span>
                    </div>
                    {day.scores && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {SCORE_BREAKDOWN.map(s => {
                                const v = day.scores?.[s.key]
                                if (v === undefined) return null
                                return (
                                    <span key={s.key} className="text-[10px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                                        {s.label}: {s.key === 'timing' ? (v > 0 ? `+${v}` : v) : `${v}/${s.max}`}
                                    </span>
                                )
                            })}
                        </div>
                    )}
                    {day.assignment?.reflection && (
                        <p className="text-[11px] text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-2">{day.assignment.reflection}</p>
                    )}
                    {links.length > 0 && (
                        <div className="flex flex-col gap-0.5">
                            {links.map((l, i) => (
                                <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-sky-600 hover:underline truncate">
                                    <Link2 className="w-3 h-3 shrink-0" /> {l}
                                </a>
                            ))}
                        </div>
                    )}
                    {day.assignment?.supports && day.assignment.supports.length > 0 && (
                        <div className="text-[10px] text-gray-400">
                            Minh chứng hỗ trợ: {day.assignment.supports.filter(Boolean).length}/{day.assignment.supports.length}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default function MemberDetailPanel({ member, onClose }: {
    member: {
        enrollmentId: number
        name: string | null
        code: number
        memberRole: 'TV' | 'PS'
        teamText: string
        groupText: string
        phone?: string | null
        completionPercent: number | null
        days: { order: number; status: DayStatus }[]
        todayOrder?: number
    }
    onClose: () => void
}) {
    const isPS = member.memberRole === 'PS'
    const completedCount = member.days.filter(d => d.status !== 'missing').length

    const [tab, setTab] = useState<'overview' | 'history'>('overview')
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historyError, setHistoryError] = useState<string | null>(null)
    const [history, setHistory] = useState<HistoryDay[] | null>(null)
    const [highlightDay, setHighlightDay] = useState<number | null>(null)
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (tab !== 'history' || history !== null) return
        let cancelled = false
        setHistoryLoading(true)
        getMemberSubmissionHistoryAction(member.enrollmentId).then(res => {
            if (cancelled) return
            if (res.success) setHistory((res.days as HistoryDay[]) || [])
            else setHistoryError(res.error || 'Có lỗi xảy ra khi tải lịch sử làm bài')
            setHistoryLoading(false)
        })
        return () => { cancelled = true }
    }, [tab, history, member.enrollmentId])

    useEffect(() => {
        if (highlightDay == null) return
        const el = document.getElementById(`day-history-${highlightDay}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const t = setTimeout(() => setHighlightDay(null), 2000)
        return () => clearTimeout(t)
    }, [highlightDay, history])

    const goToDayHistory = (order: number) => {
        setTab('history')
        setHighlightDay(order)
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white w-[95vw] max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
                    <div className="min-w-0">
                        <h2 className="font-bold text-sm truncate">{member.name || 'Chưa có tên'}</h2>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-violet-100 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded font-black ${isPS ? 'bg-amber-400 text-amber-900' : 'bg-white/20'}`}>{member.memberRole}</span>
                            <span>#{member.code}</span>
                            <span>{member.teamText}</span>
                            {!isPS && <span>{member.groupText}</span>}
                            {member.phone && <span className="font-mono">{localPhone(member.phone)}</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-3 bg-violet-50 border-b border-violet-100 shrink-0 flex items-center gap-4">
                    <div>
                        <div className="text-2xl font-black text-violet-700">
                            {member.completionPercent === null ? '—' : `${member.completionPercent}%`}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Đúng hạn tính đến hết hôm qua</div>
                    </div>
                    <div className="h-8 w-px bg-violet-200" />
                    <div>
                        <div className="text-2xl font-black text-gray-700">{completedCount}/{member.days.length}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tổng số ngày đã nộp</div>
                    </div>
                </div>

                <div className="flex items-center gap-1 px-6 pt-3 shrink-0 border-b border-gray-100">
                    <button
                        type="button"
                        onClick={() => setTab('overview')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${tab === 'overview' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Lưới tổng quan
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('history')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${tab === 'history' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Lịch sử làm bài
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6" ref={listRef}>
                    {tab === 'overview' ? (
                        <MemberDayMatrix days={member.days} columns={10} onSelectDay={goToDayHistory} todayOrder={member.todayOrder} />
                    ) : historyLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                        </div>
                    ) : historyError ? (
                        <div className="text-center text-gray-400 text-sm py-8">{historyError}</div>
                    ) : (
                        <div className="space-y-2">
                            {(history || []).map(d => (
                                <HistoryEntry key={d.order} day={d} highlighted={highlightDay === d.order} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-3 bg-slate-50 border-t shrink-0 flex items-center gap-3 text-[10px] font-bold text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> Đúng hạn</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500" /> Nộp muộn</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Chưa nộp</span>
                </div>
            </div>
        </div>
    )
}
