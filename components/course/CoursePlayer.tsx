
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import LessonSidebar from "./LessonSidebar"
import VideoPlayer from "./VideoPlayer"
import AssignmentForm from "./AssignmentForm"
import ChatSection from "./ChatSection"
import StartDateModal from "./StartDateModal"
import {
    confirmStartDateAction,
    saveVideoProgressAction,
    submitAssignmentAction
} from "@/app/actions/course-actions"
import { ArrowLeft, ListVideo, FileText, X, ClipboardCheck } from "lucide-react"
import Link from "next/link"

interface CoursePlayerProps {
    course: any
    enrollment: any
    session: any
}

type MobileTab = 'list' | 'content' | 'record'

export default function CoursePlayer({ course, enrollment: initialEnrollment, session }: CoursePlayerProps) {
    const [enrollment, setEnrollment] = useState(initialEnrollment)
    const [currentLessonId, setCurrentLessonId] = useState<string>(() => {
        // Tìm bài học chưa hoàn thành gần nhất (theo updatedAt)
        const incomplete = enrollment.lessonProgress
            .filter((p: any) => p.status !== 'COMPLETED')
            .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        
        // Nếu có bài chưa hoàn thành, lấy bài gần nhất; không thì lấy bài đầu tiên
        return incomplete[0]?.lessonId || course.lessons[0]?.id
    })
    const [videoPercent, setVideoPercent] = useState(0)
    const [mobileTab, setMobileTab] = useState<MobileTab>('content')
    const [progressMap, setProgressMap] = useState<Record<string, any>>(() =>
        enrollment.lessonProgress.reduce((acc: any, p: any) => {
            acc[p.lessonId] = p
            return acc
        }, {})
    )
    const [showContentModal, setShowContentModal] = useState(false)
    const assignmentFormRef = useRef<(() => Promise<void>) | undefined>(undefined)

    // JS media query — kiểm tra thiết bị client-side
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        setIsMobile(mq.matches)
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    const currentLesson = course.lessons.find((l: any) => l.id === currentLessonId)
    const currentProgress = progressMap[currentLessonId]
    const hasDuration = currentProgress?.duration && currentProgress.duration > 0
    const initialPercent = hasDuration && currentProgress?.maxTime
        ? (currentProgress.maxTime / currentProgress.duration) * 100
        : undefined

    const handleLessonSelect = async (lessonId: string) => {
        // Lưu assignment draft trước khi chuyển bài
        if (assignmentFormRef.current) {
            await assignmentFormRef.current()
        }

        // Lưu video progress của bài hiện tại trước khi chuyển
        if (currentLessonId && videoPercent > 0 && currentProgress) {
            const maxTime = (videoPercent / 100) * (currentProgress.duration || 0)
            await saveVideoProgressAction({
                enrollmentId: enrollment.id,
                lessonId: currentLessonId,
                maxTime,
                duration: currentProgress.duration || 0
            })
        }
        
        // Auto-submit assignment nếu đã có dữ liệu nhập nhưng chưa submit
        const currentProg = progressMap[currentLessonId!]
        if (currentProg?.assignment && !currentProg?.submittedAt && currentProgress) {
            const assignmentData = currentProgress.assignment as any
            if (assignmentData?.reflection || assignmentData?.links?.length > 0) {
                await submitAssignmentAction({
                    enrollmentId: enrollment.id,
                    lessonId: currentLessonId!,
                    reflection: assignmentData.reflection || '',
                    links: assignmentData.links || [],
                    supports: assignmentData.supports || []
                })
            }
        }
        
        setCurrentLessonId(lessonId)
        setVideoPercent(0)
        setMobileTab('content')
        setShowContentModal(false)
    }

    const handleConfirmStartDate = async (date: Date) => {
        await confirmStartDateAction(course.id, date)
        setEnrollment({ ...enrollment, startedAt: date })
    }

    const handleVideoProgress = useCallback(async (maxTime: number, duration: number) => {
        if (!currentLessonId || duration === 0) return
        setVideoPercent(Math.min(100, Math.round((maxTime / duration) * 100)))
        await saveVideoProgressAction({
            enrollmentId: enrollment.id,
            lessonId: currentLessonId,
            maxTime,
            duration
        })
    }, [currentLessonId, enrollment.id])

    const handleSubmitAssignment = async (data: any) => {
        const result = await submitAssignmentAction({
            enrollmentId: enrollment.id,
            lessonId: currentLessonId!,
            ...data
        })
        if (!result.success) return

        const updatedProgress = {
            ...(progressMap[currentLessonId!] || {}),
            status: result.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS',
            totalScore: result.totalScore
        }
        setProgressMap(prev => ({ ...prev, [currentLessonId!]: updatedProgress }))

        if (result.totalScore >= 5) {
            const currentIndex = course.lessons.findIndex((l: any) => l.id === currentLessonId)
            const isLast = currentIndex === course.lessons.length - 1
            const nextId = isLast ? course.lessons[0].id : course.lessons[currentIndex + 1].id
            const msg = isLast
                ? `🎉 Hoàn thành bài cuối (${result.totalScore}đ)! Quay về Bài 1.`
                : `✅ Hoàn thành! ${result.totalScore}đ. Chuyển sang bài tiếp theo.`
            alert(msg)
            setCurrentLessonId(nextId)
            setVideoPercent(0)
            setMobileTab('content')
        } else {
            alert(`📊 Đã ghi nhận! Điểm: ${result.totalScore}/10. Cần ≥5đ để hoàn thành.`)
        }
    }

    const handleResetStartDate = async (date: Date) => {
        await confirmStartDateAction(course.id, date)
        setEnrollment((prev: any) => ({ ...prev, startedAt: date }))
    }

    const completedCount = Object.values(progressMap).filter((p: any) => p.status === 'COMPLETED').length
    const startedAt = enrollment.startedAt ? new Date(enrollment.startedAt) : null

    return (
        <div className="flex flex-col h-full">

            {/* ── Header ─────────────────────────────────────────── */}
            <header className="h-14 shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900 z-50 fixed top-0 left-0 right-0">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/" className="shrink-0 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-bold text-white truncate text-sm sm:text-base">{course.name_lop}</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-400">{completedCount}/{course.lessons.length}</span>
                    <div className="relative h-2.5 w-24 sm:w-32 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                            style={{ width: `${(completedCount / course.lessons.length) * 100}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{Math.round((completedCount / course.lessons.length) * 100)}%</span>
                </div>
            </header>

            {/* ── Main area ──────────────────────────────────────── */}
            {/*
                Dùng key="center" trên cột giữa để VideoPlayer KHÔNG bị remount
                khi isMobile thay đổi (sidebar/assignmentform xuất hiện/biến mất).
                VideoPlayer vẫn sống trong cùng vị trí React tree → YouTube player
                không bị phá hủy.
            */}
            <div className={`flex flex-1 min-h-0 text-zinc-300 ${isMobile ? 'pt-14 pb-14' : ''}`}>

                {/* LEFT: sidebar — desktop only */}
                {!isMobile && (
                    <LessonSidebar
                        lessons={course.lessons}
                        currentLessonId={currentLessonId}
                        onLessonSelect={handleLessonSelect}
                        progress={progressMap}
                        startedAt={startedAt}
                        onResetStartDate={handleResetStartDate}
                    />
                )}

                {/* CENTER: video + content — LUÔN TRONG DOM, key ổn định */}
                <div
                    key="center-col"
                    className={
                        isMobile
                            ? 'flex-1 flex flex-col min-h-0 bg-zinc-950 overflow-hidden'
                            : 'flex-1 flex flex-col overflow-y-auto bg-zinc-950'
                    }
                >
                    {/* VIDEO — luôn ở đây, không bao giờ bị unmount khi đổi layout */}
                    <div className={isMobile ? 'shrink-0 w-full bg-black' : 'p-5 pb-0 shrink-0'}>
                        <VideoPlayer
                            key={currentLessonId}
                            playerId="yt-player-main"
                            videoUrl={currentLesson?.videoUrl || null}
                            lessonContent={currentLesson?.content || null}
                            initialMaxTime={currentProgress?.maxTime || 0}
                            initialPercent={initialPercent}
                            onProgress={handleVideoProgress}
                            onPercentChange={setVideoPercent}
                        />
                    </div>

                    {/* Desktop: tiêu đề + nội dung bài học + Tương tác */}
                    {!isMobile && (
                        <div className="p-5 flex-1 flex flex-col gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-white">{currentLesson?.title}</h2>
                                {currentLesson?.content && (
                                    <p className="text-zinc-400 mt-1 text-sm leading-relaxed">{currentLesson.content}</p>
                                )}
                            </div>
                            
                            {/* Phần Tương tác - Chat (Desktop) */}
                            <div className="flex-1 min-h-0 overflow-hidden border border-zinc-700 rounded-xl mt-2">
                                <ChatSection lessonId={currentLessonId!} session={session} />
                            </div>
                        </div>
                    )}

                    {/* Mobile: scrollable content + tab bar */}
                    {isMobile && (
                        <>
                            {/* Nội dung cuộn — chỉ phần này scroll */}
                            <div className="flex-1 min-h-0">

                                {/* Tab: Danh sách */}
                                {mobileTab === 'list' && (
                                    <div className="h-full overflow-y-auto overscroll-contain">
                                        {/* Full-width sidebar (bỏ w-72 fixed) */}
                                        <LessonSidebarMobile
                                            lessons={course.lessons}
                                            currentLessonId={currentLessonId}
                                            onLessonSelect={handleLessonSelect}
                                            progress={progressMap}
                                            startedAt={startedAt}
                                            onResetStartDate={handleResetStartDate}
                                        />
                                    </div>
                                )}

                                {/* Tab: Nội dung */}
                                {mobileTab === 'content' && (
                                    <div className="flex flex-col h-full min-h-0">
                                        {/* Tiêu đề + preview nội dung — mở rộng chiều cao */}
                                        <div className="shrink-0 px-4 py-5 bg-zinc-900 border-b border-zinc-800">
                                            <p className="text-base font-bold text-white leading-snug">
                                                {currentLesson?.title}
                                            </p>
                                            {currentLesson?.content && (
                                                <div className="mt-3">
                                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                                        {currentLesson.content}
                                                    </p>
                                                    <button
                                                        onClick={() => setShowContentModal(true)}
                                                        className="text-sm text-orange-400 hover:text-orange-300 transition-colors mt-2"
                                                    >
                                                        Xem thêm →
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Phần Tương tác - Chat — gọn hơn */}
                                        <div className="flex-1 h-[150px] min-h-0 overflow-hidden">
                                            <ChatSection lessonId={currentLessonId!} session={session} />
                                        </div>
                                    </div>
                                )}

                                {/* Tab: Ghi nhận */}
                                {mobileTab === 'record' && (
                                    <div className="flex flex-col h-full min-h-0">
                                        <AssignmentForm
                                            key={currentLessonId}
                                            lessonId={currentLessonId!}
                                            lessonOrder={currentLesson?.order ?? 1}
                                            startedAt={startedAt}
                                            videoPercent={videoPercent}
                                            onSubmit={handleSubmitAssignment}
                                            initialData={{...currentProgress, enrollmentId: enrollment.id}}
                                            onSaveDraft={assignmentFormRef}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Tab bar — cố định ở dưới cùng */}
                            <nav className="shrink-0 h-14 bg-zinc-900 border-t border-zinc-800 flex items-stretch fixed bottom-0 left-0 right-0 z-50">
                                {([
                                    { id: 'list', icon: ListVideo, label: 'Danh sách' },
                                    { id: 'content', icon: FileText, label: 'Nội dung' },
                                    { id: 'record', icon: ClipboardCheck, label: 'Ghi nhận' },
                                ] as { id: MobileTab; icon: any; label: string }[]).map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setMobileTab(tab.id)}
                                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors
                                            ${mobileTab === tab.id
                                                ? 'text-orange-400 border-t-2 border-orange-400'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                    >
                                        <tab.icon className="w-5 h-5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </>
                    )}
                </div>

                {/* RIGHT: AssignmentForm — desktop only */}
                {!isMobile && (
                    <div className="w-[400px] shrink-0 border-l border-zinc-800 overflow-hidden">
                        <AssignmentForm
                            key={currentLessonId}
                            lessonId={currentLessonId!}
                            lessonOrder={currentLesson?.order ?? 1}
                            startedAt={startedAt}
                            videoPercent={videoPercent}
                            onSubmit={handleSubmitAssignment}
                            initialData={{...currentProgress, enrollmentId: enrollment.id}}
                            onSaveDraft={assignmentFormRef}
                        />
                    </div>
                )}
            </div>

            {/* ── Popup: Nội dung bài học (Phương án B) ─────────── */}
            {showContentModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
                    onClick={() => setShowContentModal(false)}
                >
                    <div
                        className="bg-zinc-900 rounded-2xl border border-zinc-700 max-w-lg w-full max-h-[75vh] flex flex-col shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
                            <h2 className="text-white font-bold text-sm leading-snug pr-4">
                                {currentLesson?.title}
                            </h2>
                            <button
                                onClick={() => setShowContentModal(false)}
                                className="shrink-0 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto px-5 py-4">
                            <p className="text-zinc-300 text-sm leading-relaxed">{currentLesson?.content}</p>
                        </div>
                    </div>
                </div>
            )}

            <StartDateModal
                isOpen={!enrollment.startedAt}
                onConfirm={handleConfirmStartDate}
            />
        </div>
    )
}

// ── LessonSidebar phiên bản mobile: full-width, không fixed w-72 ──────────
import { cn } from "@/lib/utils"
import { CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw } from "lucide-react"

function isLessonUnlockedMobile(lesson: any, lessons: any[], progress: Record<string, any>) {
    if (lesson.order === 1) return true
    const prev = lessons.find((l: any) => l.order === lesson.order - 1)
    if (!prev) return true
    const p = progress[prev.id]
    return p?.status === 'COMPLETED' && (p?.totalScore ?? 0) >= 5
}

function toInputValueMobile(date: Date | null): string {
    if (!date) return ''
    return new Date(date).toISOString().slice(0, 10)
}

function LessonBtn({ lesson, prog, isActive, unlocked, onLessonSelect }: any) {
    const isCompletedLesson = prog?.status === 'COMPLETED'
    return (
        <button
            onClick={() => unlocked && onLessonSelect(lesson.id)}
            disabled={!unlocked}
            className={cn(
                'w-full flex items-center gap-2.5 px-4 py-2 text-left border-b border-zinc-800/50 transition-colors',
                isActive && 'bg-zinc-800 border-l-2 border-l-orange-500',
                unlocked && !isActive && 'hover:bg-zinc-800/50',
                !unlocked && 'opacity-40 cursor-not-allowed'
            )}
        >
            <div className="shrink-0">
                {isCompletedLesson ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : isActive ? (
                    <PlayCircle className="w-4 h-4 text-orange-400" />
                ) : !unlocked ? (
                    <Lock className="w-3.5 h-3.5 text-zinc-600" />
                ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-700 flex items-center justify-center text-[9px] text-zinc-500">
                        {lesson.order}
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn('text-sm leading-snug', isActive ? 'text-white font-medium' : 'text-zinc-400')}>
                    {lesson.title}
                </p>
                {prog?.totalScore !== undefined && (
                    <span className={cn('text-[10px] font-bold', prog.totalScore >= 5 ? 'text-emerald-500' : 'text-orange-400')}>
                        {prog.totalScore >= 5 ? '✓' : '✗'} {prog.totalScore}/10đ
                    </span>
                )}
            </div>
        </button>
    )
}

function LessonSidebarMobile({ lessons, currentLessonId, onLessonSelect, progress, startedAt, onResetStartDate }: any) {
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [dateInput, setDateInput] = useState(toInputValueMobile(startedAt))
    const [saving, setSaving] = useState(false)

    const handleReset = async () => {
        if (!dateInput) return
        setSaving(true)
        try {
            await onResetStartDate(new Date(dateInput))
            setShowDatePicker(false)
        } finally {
            setSaving(false)
        }
    }

    const completedCount = lessons.filter((l: any) => progress[l.id]?.status === 'COMPLETED').length
    const totalCount = lessons.length

    return (
        <div className="flex flex-col h-full w-full bg-zinc-900 overflow-hidden">
            {/* ─ Cố định: ngày bắt đầu + tiêu đề ─ */}
            <div className="shrink-0">
                {/* Ngày bắt đầu — 1 hàng ngang */}
                <div className="px-4 py-2.5 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-orange-400 shrink-0" />
                            <span className="text-xs text-zinc-400">Ngày bắt đầu:</span>
                            <span className="text-xs font-semibold text-white">
                                {startedAt ? startedAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--/--/----'}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className="flex items-center gap-1 text-[11px] text-orange-400 border border-orange-500/40 rounded-lg px-2 py-0.5 shrink-0"
                        >
                            <RefreshCw className="w-3 h-3" /> Đặt lại
                        </button>
                    </div>
                    {showDatePicker && (
                        <div className="bg-zinc-800 rounded-lg p-2.5 space-y-2 border border-zinc-700 mt-2">
                            <input
                                type="date" value={dateInput}
                                onChange={e => setDateInput(e.target.value)}
                                className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-1.5 border border-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            <div className="flex gap-2">
                                <button onClick={handleReset} disabled={!dateInput || saving}
                                    className="flex-1 text-xs font-bold bg-orange-500 text-white rounded-lg py-1.5 disabled:opacity-50">
                                    {saving ? 'Đang lưu...' : 'Xác nhận'}
                                </button>
                                <button onClick={() => setShowDatePicker(false)}
                                    className="flex-1 text-xs text-zinc-400 border border-zinc-600 rounded-lg py-1.5">
                                    Hủy
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tiêu đề + số bài hoàn thành */}
                <div className="px-4 py-1.5 border-b border-zinc-800 flex items-center justify-between">
                    <h2 className="font-bold text-xs text-zinc-400 uppercase tracking-wide">Nội dung khóa học</h2>
                    <span className="text-[11px] font-semibold text-emerald-400">{completedCount}/{totalCount} bài</span>
                </div>
            </div>

            {/* Tất cả bài học — cuộn từ bài 1 */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                {lessons.map((lesson: any) => {
                    const prog = progress[lesson.id]
                    const isActive = currentLessonId === lesson.id
                    const unlocked = isLessonUnlockedMobile(lesson, lessons, progress)
                    return (
                        <LessonBtn key={lesson.id} lesson={lesson} prog={prog} isActive={isActive} unlocked={unlocked} onLessonSelect={onLessonSelect} />
                    )
                })}
            </div>
        </div>
    )
}
