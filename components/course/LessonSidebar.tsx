
'use client'

import { useState } from 'react'
import { cn } from "@/lib/utils"
import { CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw } from "lucide-react"

interface Lesson {
    id: string
    title: string
    order: number
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

// Chuyển Date → string cho input (yyyy-MM-dd)
function toInputValue(date: Date | null): string {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().slice(0, 10)
}

function isLessonUnlocked(lesson: Lesson, lessons: Lesson[], progress: Record<string, any>, courseType?: string) {
    if (courseType === 'LIB') return true
    if (lesson.order === 1) return true
    const prev = lessons.find(l => l.order === lesson.order - 1)
    if (!prev) return true
    const p = progress[prev.id]
    return p?.status === 'COMPLETED' && (p?.totalScore ?? 0) >= 5
}

export default function LessonSidebar({
    lessons, currentLessonId, onLessonSelect, progress, startedAt, resetAt, onResetStartDate, courseType
}: LessonSidebarProps) {
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [dateInput, setDateInput] = useState(toInputValue(startedAt))
    const [saving, setSaving] = useState(false)
    
    // Lọc progress chỉ hiển thị các bài học không bị reset (lộ trình hiện tại)
    const filteredProgress = Object.entries(progress).reduce((acc, [lessonId, p]: [string, any]) => {
        // Chỉ hiển thị progress không có status RESET
        if (p.status !== 'RESET') {
            acc[lessonId] = p
        }
        return acc
    }, {} as Record<string, any>)

    const handleReset = async () => {
        if (!dateInput) return
        
        // Hiển thị cảnh báo trước khi reset
        const confirmReset = window.confirm(
            "⚠️ Cảnh báo: Dữ liệu học tập cũ sẽ không được tính vào lộ trình mới.\n\n" +
            "Bạn sẽ bắt đầu lại từ bài 1. Tiến trình cũ vẫn lưu trong hệ thống để admin xem lại.\n\n" +
            "Nhấn OK để xác nhận đổi ngày bắt đầu mới."
        )
        
        if (!confirmReset) return
        
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
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Ngày bắt đầu lộ trình</p>
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
                        <p className="text-[10px] text-zinc-400">Chọn ngày mới (dd/mm/yyyy):</p>
                        <input
                            type="date"
                            value={dateInput}
                            onChange={e => setDateInput(e.target.value)}
                            className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 border border-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleReset}
                                disabled={!dateInput || saving}
                                className="flex-1 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 disabled:opacity-50 transition-colors"
                            >
                                {saving ? 'Đang lưu...' : 'Xác nhận'}
                            </button>
                            <button
                                onClick={() => setShowDatePicker(false)}
                                className="flex-1 text-xs text-zinc-400 hover:text-white border border-zinc-600 rounded-lg py-1.5 transition-colors"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Tiêu đề danh sách ── */}
            <div className="px-4 py-2 border-b border-zinc-800">
                <h2 className="font-bold text-sm text-zinc-400 uppercase tracking-wide">Nội dung khóa học</h2>
            </div>

            {/* ── Danh sách bài ── */}
            <div className="flex-1 overflow-y-auto">
                {lessons.map((lesson) => {
                    const prog = filteredProgress[lesson.id]
                    const isCompleted = prog?.status === 'COMPLETED'
                    const isActive = currentLessonId === lesson.id
                    const unlocked = isLessonUnlocked(lesson, lessons, filteredProgress, courseType)

                    return (
                        <button
                            key={lesson.id}
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
                                    <Lock className="w-4 h-4 text-zinc-600" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500">
                                        {lesson.order}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn("text-sm font-medium line-clamp-2", isActive ? "text-white" : "text-zinc-400")}>
                                    {lesson.title}
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
        </div>
    )
}
