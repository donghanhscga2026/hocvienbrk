
'use client'

import { useState, useCallback, useEffect } from 'react'
import LessonSidebar from "./LessonSidebar"
import VideoPlayer from "./VideoPlayer"
import AssignmentForm from "./AssignmentForm"
import StartDateModal from "./StartDateModal"
import {
    confirmStartDateAction,
    saveVideoProgressAction,
    submitAssignmentAction
} from "@/app/actions/course-actions"
import { ArrowLeft, ListVideo, Play } from "lucide-react"
import Link from "next/link"

interface CoursePlayerProps {
    course: any
    enrollment: any
}

type MobileTab = 'lessons' | 'learn'

export default function CoursePlayer({ course, enrollment: initialEnrollment }: CoursePlayerProps) {
    const [enrollment, setEnrollment] = useState(initialEnrollment)
    const [currentLessonId, setCurrentLessonId] = useState<string>(() => {
        const sorted = [...enrollment.lessonProgress].sort(
            (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        return sorted[0]?.lessonId || course.lessons[0]?.id
    })
    const [videoPercent, setVideoPercent] = useState(0)
    const [mobileTab, setMobileTab] = useState<MobileTab>('learn')
    const [progressMap, setProgressMap] = useState<Record<string, any>>(() =>
        enrollment.lessonProgress.reduce((acc: any, p: any) => {
            acc[p.lessonId] = p
            return acc
        }, {})
    )

    // Detect thiết bị bằng JS — đảm bảo chỉ render 1 VideoPlayer duy nhất
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

    const handleLessonSelect = (lessonId: string) => {
        setCurrentLessonId(lessonId)
        setVideoPercent(0)
        setMobileTab('learn')
    }

    const handleConfirmStartDate = async (date: Date) => {
        await confirmStartDateAction(course.id, date)
        setEnrollment({ ...enrollment, startedAt: date })
    }

    const handleVideoProgress = useCallback(async (maxTime: number, duration: number) => {
        if (!currentLessonId || duration === 0) return
        setVideoPercent(Math.min(100, (maxTime / duration) * 100))
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
            setMobileTab('learn')
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

    // VideoPlayer instance duy nhất — dùng chung cho cả desktop lẫn mobile
    const sharedVideoPlayer = (
        <VideoPlayer
            key={currentLessonId}
            playerId="yt-player-main"
            videoUrl={currentLesson?.videoUrl || null}
            initialMaxTime={currentProgress?.maxTime || 0}
            initialPercent={hasDuration && currentProgress?.maxTime
                ? (currentProgress.maxTime / currentProgress.duration) * 100
                : undefined}
            onProgress={handleVideoProgress}
            onPercentChange={setVideoPercent}
        />
    )

    return (
        <div className="flex flex-col h-full">
            {/* ── Header ── */}
            <header className="h-14 shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900 z-20">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/" className="shrink-0 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-bold text-white truncate text-sm sm:text-base">{course.name_lop}</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-400 hidden sm:block">{completedCount}/{course.lessons.length} bài</span>
                    <div className="h-1.5 w-20 sm:w-28 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                            style={{ width: `${(completedCount / course.lessons.length) * 100}%` }}
                        />
                    </div>
                </div>
            </header>

            {/* ── Desktop Layout (isMobile = false) ── */}
            {!isMobile && (
                <div className="flex flex-1 min-h-0 text-zinc-300">
                    <LessonSidebar
                        lessons={course.lessons}
                        currentLessonId={currentLessonId}
                        onLessonSelect={handleLessonSelect}
                        progress={progressMap}
                        startedAt={startedAt}
                        onResetStartDate={handleResetStartDate}
                    />
                    <div className="flex-1 p-5 overflow-y-auto bg-zinc-950 space-y-4">
                        {sharedVideoPlayer}
                        <div>
                            <h2 className="text-lg font-bold text-white">{currentLesson?.title}</h2>
                            {currentLesson?.content && (
                                <p className="text-zinc-400 mt-1 text-sm leading-relaxed">{currentLesson.content}</p>
                            )}
                        </div>
                    </div>
                    <div className="w-[400px] shrink-0 border-l border-zinc-800 overflow-hidden">
                        <AssignmentForm
                            key={currentLessonId}
                            lessonId={currentLessonId!}
                            lessonOrder={currentLesson?.order ?? 1}
                            startedAt={startedAt}
                            videoPercent={videoPercent}
                            onSubmit={handleSubmitAssignment}
                            initialData={currentProgress}
                        />
                    </div>
                </div>
            )}

            {/* ── Mobile Layout (isMobile = true) ── */}
            {isMobile && (
                <div className="flex flex-col flex-1 min-h-0 text-zinc-300 bg-zinc-950 overflow-hidden">
                    {/* Video luôn hiện ở trên — 1 instance duy nhất */}
                    <div className="w-full shrink-0">
                        {sharedVideoPlayer}
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 overflow-y-auto">
                        {mobileTab === 'lessons' && (
                            <LessonSidebar
                                lessons={course.lessons}
                                currentLessonId={currentLessonId}
                                onLessonSelect={handleLessonSelect}
                                progress={progressMap}
                                startedAt={startedAt}
                                onResetStartDate={handleResetStartDate}
                            />
                        )}
                        {mobileTab === 'learn' && (
                            <div className="flex flex-col">
                                <div className="px-3 pt-3 pb-2">
                                    <h2 className="text-base font-bold text-white">{currentLesson?.title}</h2>
                                    {currentLesson?.content && (
                                        <p className="text-zinc-400 mt-1 text-sm leading-relaxed">{currentLesson.content}</p>
                                    )}
                                </div>
                                <AssignmentForm
                                    key={currentLessonId}
                                    lessonId={currentLessonId!}
                                    lessonOrder={currentLesson?.order ?? 1}
                                    startedAt={startedAt}
                                    videoPercent={videoPercent}
                                    onSubmit={handleSubmitAssignment}
                                    initialData={currentProgress}
                                />
                            </div>
                        )}
                    </div>

                    {/* Tab Bar */}
                    <nav className="shrink-0 h-16 bg-zinc-900 border-t border-zinc-800 flex items-stretch">
                        {([
                            { id: 'lessons', icon: ListVideo, label: 'Bài học' },
                            { id: 'learn', icon: Play, label: 'Bài nộp' },
                        ] as { id: MobileTab; icon: any; label: string }[]).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setMobileTab(tab.id)}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors
                                    ${mobileTab === tab.id ? 'text-orange-400 border-t-2 border-orange-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <tab.icon className="w-5 h-5" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            )}

            <StartDateModal
                isOpen={!enrollment.startedAt}
                onConfirm={handleConfirmStartDate}
            />
        </div>
    )
}
