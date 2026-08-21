'use client'

import { useState, memo, useMemo, useRef, useEffect } from 'react'
import { cn } from "@/lib/utils"
import { CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw, AlertTriangle, X, ArrowUpDown } from "lucide-react"

interface Lesson {
    id: string
    title: string
    order: number
    isDailyChallenge?: boolean
}

interface LessonSidebarProps {
    lessons: Lesson[]
    currentLessonId: string
    onLessonSelect: (lessonId: string) => void
    progress: Record<string, any>
    startedAt: Date | null
    resetAt: Date | null
    onResetStartDate: (date: Date) => Promise<void>
    courseType?: string
}

function formatDateVN(date: Date | null) {
    if (!date) return ''
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function toInputValue(date: Date | null): string {
    if (!date) return ''
    return new Date(date).toISOString().slice(0, 10)
}

// Ngày hôm nay theo VN (UTC+7) định dạng yyyy-MM-dd
function todayVN(): string {
    const now = new Date()
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    return vnNow.toISOString().slice(0, 10)
}

function isLessonUnlocked(lesson: Lesson, lessons: Lesson[], progress: Record<string, any>, courseType?: string) {
    if (courseType === 'LIB' || courseType === 'NORMAL' || courseType === 'SYS') return true
    if (lesson.order === 1) return true
    const prev = lessons.find(l => l.order === lesson.order - 1)
    if (!prev) return true
    const p = progress[prev.id]
    return p?.status === 'COMPLETED' && (p?.totalScore ?? 0) >= 5
}

function LessonSidebar({
    lessons, currentLessonId, onLessonSelect, progress, startedAt, resetAt, onResetStartDate, courseType
}: LessonSidebarProps) {
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [dateInput, setDateInput] = useState(toInputValue(startedAt))
    const [saving, setSaving] = useState(false)
    const [showWarning, setShowWarning] = useState(false)
    const [sortDesc, setSortDesc] = useState(true)
    const listContainerRef = useRef<HTMLDivElement>(null)
    const hasAutoScrolledRef = useRef(false)

    const filteredProgress = Object.entries(progress).reduce((acc, [lessonId, p]: [string, any]) => {
        if (p.status !== 'RESET') acc[lessonId] = p
        return acc
    }, {} as Record<string, any>)

    const completedLessons = useMemo(() =>
        lessons.filter(l => filteredProgress[l.id]?.status === 'COMPLETED'),
        [lessons, filteredProgress]
    )

    const displayLessons = useMemo(() => sortDesc ? [...lessons].reverse() : lessons, [lessons, sortDesc])

    // Tự động cuộn tới bài học hiện tại khi vừa vào trang
    useEffect(() => {
        if (hasAutoScrolledRef.current || !currentLessonId) return
        const el = listContainerRef.current?.querySelector(`[data-lesson-id="${CSS.escape(currentLessonId)}"]`)
        if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'auto' })
            hasAutoScrolledRef.current = true
        }
    }, [currentLessonId])

    const today = todayVN()
    const isPastDate = dateInput < today

    const handleOpenWarning = () => {
        if (!dateInput || isPastDate) return
        setShowWarning(true)
    }

    const handleConfirmReset = async () => {
        setShowWarning(false)
        setSaving(true)
        try {
            await onResetStartDate(new Date(dateInput))
            setShowDatePicker(false)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-80 shrink-0">
            {/* ── Ngày bắt đầu block ── */}
            <div className="p-4 border-b border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-300">
                        <CalendarDays className="w-4 h-4 text-orange-400 shrink-0" />
                        <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Ngày bắt đầu lộ trình</p>
                            <p className="text-sm font-semibold text-white leading-tight">
                                {startedAt ? formatDateVN(startedAt) : '-- / -- / ----'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center gap-1 text-[11px] text-orange-400 border border-orange-500/40 hover:border-orange-400 rounded-lg px-2 py-1 transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Đặt lại
                    </button>
                </div>

                {showDatePicker && (
                    <div className="bg-zinc-800 rounded-lg p-3 space-y-2 border border-zinc-700">
                        <p className="text-[10px] text-zinc-300">Chọn ngày mới (từ hôm nay trở đi):</p>
                        <input
                            type="date"
                            value={dateInput}
                            min={today}
                            onChange={e => setDateInput(e.target.value)}
                            className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 border border-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        {isPastDate && dateInput && (
                            <p className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Không được chọn ngày trong quá khứ
                            </p>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={handleOpenWarning}
                                disabled={!dateInput || saving || isPastDate}
                                className="flex-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg py-1.5 disabled:opacity-40 transition-colors"
                            >
                                {saving ? 'Đang lưu...' : 'Đặt lại lộ trình'}
                            </button>
                            <button
                                onClick={() => { setShowDatePicker(false); setShowWarning(false) }}
                                className="flex-1 text-xs text-zinc-200 hover:text-white border border-zinc-600 rounded-lg py-1.5 transition-colors"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Tiêu đề danh sách ── */}
            <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between gap-2">
                <h2 className="font-bold text-sm text-zinc-200 uppercase tracking-wide">Nội dung khóa học</h2>
                <button
                    onClick={() => setSortDesc(v => !v)}
                    title={sortDesc ? 'Đang sắp xếp: Cuối → Đầu' : 'Đang sắp xếp: Đầu → Cuối'}
                    className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full px-2 py-1 transition-colors"
                >
                    <ArrowUpDown className="w-3 h-3" />
                    {sortDesc ? 'Cuối → Đầu' : 'Đầu → Cuối'}
                </button>
            </div>

            {/* ── Danh sách bài ── */}
            <div ref={listContainerRef} className="flex-1 overflow-y-auto">
                {displayLessons.map((lesson) => {
                    const prog = filteredProgress[lesson.id]
                    const isCompleted = prog?.status === 'COMPLETED'
                    const isActive = currentLessonId === lesson.id
                    const unlocked = isLessonUnlocked(lesson, lessons, filteredProgress, courseType)

                    return (
                        <button
                            key={lesson.id}
                            data-lesson-id={lesson.id}
                            onClick={() => unlocked && onLessonSelect(lesson.id)}
                            disabled={!unlocked}
                            title={!unlocked ? 'Hoàn thành bài trước ≥5đ để mở khóa' : undefined}
                            className={cn(
                                "w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-zinc-800/50",
                                isActive && "bg-zinc-800 border-l-2 border-l-orange-500",
                                unlocked && !isActive && "hover:bg-zinc-800/50",
                                !unlocked && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            <div className="shrink-0">
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : isActive ? (
                                    <PlayCircle className="w-5 h-5 text-orange-400" />
                                ) : !unlocked ? (
                                    <Lock className="w-4 h-4 text-zinc-400" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-zinc-600 flex items-center justify-center text-[10px] text-zinc-200">
                                        {lesson.order}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn("text-sm font-medium line-clamp-2", isActive ? "text-white" : "text-zinc-100")}>
                                    {lesson.title}
                                    {lesson.isDailyChallenge && (
                                        <span className="ml-1.5 text-[9px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full align-middle">📝 Bài tập</span>
                                    )}
                                </p>
                                {prog?.totalScore !== undefined && (
                                    <span className={cn("text-[10px] font-bold", prog.totalScore >= 5 ? "text-emerald-500" : "text-orange-400")}>
                                        {prog.totalScore >= 5 ? '✓' : '✗'} {prog.totalScore}/10đ
                                    </span>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* ── Modal cảnh báo reset ── */}
            {showWarning && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border-2 border-red-500/60 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
                        {/* Header đỏ */}
                        <div className="bg-red-600 px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-white shrink-0" />
                                <span className="text-white font-black text-base">Cảnh báo — Đặt lại lộ trình</span>
                            </div>
                            <button onClick={() => setShowWarning(false)} className="text-white/70 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Nội dung */}
                        <div className="p-5 space-y-4">
                            <p className="text-white text-sm leading-relaxed">
                                Bạn đang đặt lại ngày bắt đầu lộ trình về{' '}
                                <span className="font-black text-orange-400">
                                    {new Date(dateInput + 'T00:00:00').toLocaleDateString('vi-VN')}
                                </span>.
                            </p>

                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2">
                                <p className="text-red-400 font-bold text-sm flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    Hành động này có nghĩa là:
                                </p>
                                <ul className="text-red-300 text-xs space-y-1.5 ml-1">
                                    <li className="flex gap-2">
                                        <span className="shrink-0 mt-0.5">•</span>
                                        <span>Toàn bộ tiến trình và điểm số hiện tại <strong className="text-red-200">sẽ bị hủy</strong>, không được tính vào lộ trình mới</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="shrink-0 mt-0.5">•</span>
                                        <span>Bạn <strong className="text-red-200">phải làm lại tất cả bài học từ Bài 1</strong> theo đúng thứ tự từ đầu</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="shrink-0 mt-0.5">•</span>
                                        <span>Deadline các bài sẽ tính lại từ ngày mới — <strong className="text-red-200">không thể hoàn tác</strong></span>
                                    </li>
                                </ul>
                            </div>

                            {completedLessons.length > 0 && (
                                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3">
                                    <p className="text-zinc-300 text-xs font-semibold mb-2">
                                        🗑 {completedLessons.length} bài đã hoàn thành sẽ bị reset:
                                    </p>
                                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                                        {completedLessons.map(l => (
                                            <div key={l.id} className="flex items-center gap-2 text-xs text-zinc-300">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/50 shrink-0" />
                                                <span className="truncate">{l.title}</span>
                                                <span className="shrink-0 text-zinc-400 ml-auto">({filteredProgress[l.id]?.totalScore}/10đ)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {completedLessons.length === 0 && (
                                <p className="text-zinc-400 text-xs text-center italic">Chưa có bài nào hoàn thành trong lộ trình hiện tại.</p>
                            )}

                            <p className="text-zinc-400 text-[10px] text-center">
                                Dữ liệu cũ vẫn được lưu trong hệ thống để admin kiểm tra khi cần.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="px-5 pb-5 flex gap-3">
                            <button
                                onClick={() => setShowWarning(false)}
                                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmReset}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm transition-all active:scale-95"
                            >
                                Tôi hiểu, xác nhận đặt lại
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(LessonSidebar)
