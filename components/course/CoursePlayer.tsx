'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from "next/link"
import { 
    ArrowLeft, ListVideo, FileText, X, ClipboardCheck, 
    Loader2, CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw 
} from "lucide-react"
import { cn } from "@/lib/utils"

import LessonSidebar from "./LessonSidebar"
import VideoPlayer from "./VideoPlayer"
import AssignmentForm from "./AssignmentForm"
import ChatSection from "./ChatSection"
import StartDateModal from "./StartDateModal"
import {
    confirmStartDateAction,
    saveVideoProgressAction,
    submitAssignmentAction,
    updateLastLessonAction
} from "@/app/actions/course-actions"

// Chuyển URL thành link clickable
const makeLinksClickable = (text: string): string => {
    if (!text) return ''
    const urlRegex = /(\b(https?:\/\/)[^\s<]+)/gi
    return text.replace(urlRegex, (match) => {
        return `<a href="${match}" target="_blank" rel="noopener noreferrer" class="text-orange-400 hover:underline font-bold">${match}</a>`
    })
}

interface CoursePlayerProps {
    course: any
    enrollment: any
    session: any
}

type MobileTab = 'list' | 'content' | 'record'

export default function CoursePlayer({ course, enrollment: initialEnrollment, session }: CoursePlayerProps) {
    const [enrollment, setEnrollment] = useState(initialEnrollment)
    const isSubmittingRef = useRef(false)
    const [isMounted, setIsMounted] = useState(false)

    // Lọc progress chỉ lấy các bài học không bị reset
    const filteredLessonProgress = enrollment.lessonProgress.filter((p: any) => p.status !== 'RESET')

    const [currentLessonId, setCurrentLessonId] = useState<string>(course.lessons[0]?.id)
    const [videoPercent, setVideoPercent] = useState(0)
    const [mobileTab, setMobileTab] = useState<MobileTab>('content')
    const [progressMap, setProgressMap] = useState<Record<string, any>>(() =>
        filteredLessonProgress.reduce((acc: any, p: any) => {
            acc[p.lessonId] = p
            return acc
        }, {})
    )
    const [showContentModal, setShowContentModal] = useState(false)
    const [currentFormData, setCurrentFormData] = useState<{ reflection: string; links: string[]; supports: boolean[] } | null>(null)
    const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'loading' | 'success' | 'error' } | null>(null)
    const assignmentFormRef = useRef<(() => Promise<void>) | undefined>(undefined)
    const lastSavedPercentRef = useRef<number>(-1)
    const videoProgressRef = useRef<{ maxTime: number; duration: number } | null>(null)
    const prevMobileTabRef = useRef(mobileTab)

    // [HYDRATION FIX] Đảm bảo component đã mount trên client mới thực hiện các tính toán logic và render giao diện chính
    useEffect(() => {
        setIsMounted(true)
        
        // Chỉ tìm bài học cũ khi đã ở client
        if (enrollment.lastLessonId) {
            setCurrentLessonId(enrollment.lastLessonId)
        } else {
            const incomplete = filteredLessonProgress
                .filter((p: any) => p.status !== 'COMPLETED')
                .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            if (incomplete[0]?.lessonId) {
                setCurrentLessonId(incomplete[0].lessonId)
            }
        }
    }, [])

    const notify = useCallback((text: string, type: 'loading' | 'success' | 'error' = 'success', duration = 3000) => {
        setStatusMsg({ text, type })
        if (type !== 'loading') {
            setTimeout(() => setStatusMsg(null), duration)
        }
    }, [])

    const checkIsOnTime = useCallback((startedAt: Date | null, lessonOrder: number): boolean => {
        if (!startedAt) return false
        const deadline = new Date(startedAt)
        deadline.setDate(deadline.getDate() + (lessonOrder - 1))
        deadline.setHours(23, 59, 59, 999)
        return new Date() <= deadline
    }, [])

    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        setIsMobile(mq.matches)
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    useEffect(() => {
        const handleTabChange = async () => {
            const prevTab = prevMobileTabRef.current
            const currentTab = mobileTab
            if (currentTab !== prevTab) {
                if (prevTab === 'record' && currentTab === 'content' && assignmentFormRef.current && !isSubmittingRef.current) {
                    await assignmentFormRef.current().catch(() => {})
                }
            }
            prevMobileTabRef.current = mobileTab
        }
        handleTabChange()
    }, [mobileTab])

    const handleLessonSelect = async (lessonId: string) => {
        if (isSubmittingRef.current) return
        
        if (assignmentFormRef.current) {
            await assignmentFormRef.current().catch(() => {})
        }

        if (currentLessonId && videoProgressRef.current) {
            await saveVideoProgressAction({
                enrollmentId: enrollment.id,
                lessonId: currentLessonId,
                maxTime: videoProgressRef.current.maxTime,
                duration: videoProgressRef.current.duration
            }).catch(() => {})
        }

        setCurrentLessonId(lessonId)
        setVideoPercent(0)
        setMobileTab('content')
        setShowContentModal(false)
        updateLastLessonAction(enrollment.id, lessonId).catch(() => {})
    }

    const handleVideoProgress = useCallback(async (maxTime: number, duration: number) => {
        if (!currentLessonId || duration === 0) return
        const pct = Math.min(100, Math.round((maxTime / duration) * 100))
        setVideoPercent(pct)
        videoProgressRef.current = { maxTime, duration }
        
        const threshold = Math.floor(pct / 10) * 10
        if ((threshold > lastSavedPercentRef.current || pct === 100) && threshold <= 100) {
            lastSavedPercentRef.current = threshold
            saveVideoProgressAction({ enrollmentId: enrollment.id, lessonId: currentLessonId, maxTime, duration }).catch(() => {})
        }
    }, [currentLessonId, enrollment.id])

    const handleSubmitAssignment = async (data: any, isUpdate: boolean = false) => {
        if (isSubmittingRef.current) return

        isSubmittingRef.current = true
        notify(isUpdate ? 'Đang cập nhật bài học...' : 'Đang chấm điểm...', 'loading')
        
        try {
            const currentProg = progressMap[currentLessonId!]
            const currentLessonData = course.lessons.find((l: any) => l.id === currentLessonId)
            
            const result = await submitAssignmentAction({
                enrollmentId: enrollment.id,
                lessonId: currentLessonId!,
                reflection: data.reflection,
                links: data.links,
                supports: data.supports,
                isUpdate,
                lessonOrder: currentLessonData?.order,
                startedAt: enrollment.startedAt,
                existingVideoScore: currentProg?.scores?.video,
                existingTimingScore: currentProg?.scores?.timing
            })
            
            if (!(result as any)?.success) {
                notify((result as any)?.message || 'Lỗi xử lý dữ liệu!', 'error')
                return
            }

            const res = result as any
            notify(res.totalScore >= 5 ? `✅ Hoàn thành! Điểm: ${res.totalScore}/10` : `📊 Đã ghi nhận: ${res.totalScore}/10đ`, 'success')
            
            const updatedProgress = {
                ...(progressMap[currentLessonId!] || {}),
                assignment: { reflection: data.reflection, links: data.links, supports: data.supports },
                status: res.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS',
                totalScore: res.totalScore
            }
            setProgressMap(prev => ({ ...prev, [currentLessonId!]: updatedProgress }))

            if (res.totalScore >= 5 && !isUpdate) {
                const currentIndex = course.lessons.findIndex((l: any) => l.id === currentLessonId)
                if (currentIndex < course.lessons.length - 1) {
                    setTimeout(() => handleLessonSelect(course.lessons[currentIndex + 1].id), 2000)
                }
            }
        } catch (error: any) {
            console.error("[SUBMIT-ERROR]", error)
            notify('Lỗi kết nối máy chủ!', 'error')
        } finally {
            isSubmittingRef.current = false
            setStatusMsg(null)
        }
    }

    const currentLesson = course.lessons.find((l: any) => l.id === currentLessonId)
    const currentProgress = progressMap[currentLessonId]
    
    const initialPercent = !currentLesson?.videoUrl ? 100 : (
        currentProgress?.duration ? (currentProgress.maxTime / currentProgress.duration) * 100 : 0
    )

    const completedCount = Object.values(progressMap).filter((p: any) => p.status === 'COMPLETED').length
    const startedAt = enrollment.startedAt ? new Date(enrollment.startedAt) : null

    // [HYDRATION SAFEGUARD] Trả về giao diện trống tối giản trên server
    if (!isMounted) {
        return <div className="h-screen w-full bg-black flex items-center justify-center text-zinc-700 font-mono text-xs">Đang tải ứng dụng...</div>
    }

    return (
        <div className="flex flex-col h-full bg-black text-zinc-300">
            {/* Header */}
            <header className="h-14 shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900 z-50 fixed top-0 left-0 right-0">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/" className="shrink-0 text-brk-muted hover:text-brk-on-surface transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-bold text-brk-on-surface truncate text-sm sm:text-base">{course.name_lop}</h1>
                </div>
                
                {statusMsg && (
                    <div className={`absolute left-1/2 -translate-x-1/2 top-16 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transition-all duration-300 z-[100] ${
                        statusMsg.type === 'loading' ? 'bg-brk-accent text-brk-on-surface' :
                        statusMsg.type === 'success' ? 'bg-brk-accent text-brk-on-primary' : 'bg-brk-accent text-brk-on-primary'
                    }`}>
                        {statusMsg.type === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {statusMsg.text}
                    </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs text-brk-muted font-mono">{completedCount}/{course.lessons.length}</span>
                        <div className="relative h-2 w-16 sm:w-24 bg-brk-background rounded-full overflow-hidden">
                            <div className="h-full bg-brk-accent transition-all duration-500" style={{ width: `${(completedCount / course.lessons.length) * 100}%` }} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-brk-accent min-w-[35px] text-right">
                            {Math.round((completedCount / course.lessons.length) * 100)}%
                        </span>
                    </div>
                </div>
            </header>

            <div className={`flex flex-1 min-h-0 pt-14 ${isMobile ? 'pb-14' : ''}`}>
                {!isMobile && (
                    <LessonSidebar
                        lessons={course.lessons}
                        currentLessonId={currentLessonId}
                        onLessonSelect={handleLessonSelect}
                        progress={progressMap}
                        startedAt={startedAt}
                        resetAt={enrollment.resetAt}
                        courseType={course.type}
                        onResetStartDate={async (d: Date) => {
                            await confirmStartDateAction(course.id, d)
                            window.location.reload()
                        }}
                    />
                )}

                <main className="flex-1 flex flex-col min-h-0 overflow-hidden items-center bg-zinc-950">
                    <div className={isMobile ? 'shrink-0 w-full' : 'p-5 pb-0 shrink-0 w-full max-w-5xl'}>
                        <div className={isMobile ? '' : 'overflow-hidden border-2 border-white shadow-2xl bg-black'}>
                            <VideoPlayer
                                key={currentLessonId}
                                enrollmentId={enrollment.id}
                                lessonId={currentLessonId!}
                                videoUrl={currentLesson?.videoUrl || null}
                                lessonContent={currentLesson?.content || null}
                                initialMaxTime={currentProgress?.maxTime || 0}
                                playlistData={currentProgress?.scores?.playlist}
                                lastVideoIndex={currentProgress?.scores?.lastVideoIndex}
                                serverPlaylist={currentLesson?.playlist} // [OPTIMIZE] Truyền playlist đã parse từ Server
                                onProgress={handleVideoProgress}
                                onPercentChange={setVideoPercent}
                                courseType={course.type}
                            />
                        </div>
                    </div>

                    {!isMobile && (
                        <div className="p-5 flex-1 flex flex-col gap-4 min-h-0 overflow-hidden w-full max-w-5xl">
                            <div className="shrink-0">
                                <h2 className="text-lg font-bold text-white">{currentLesson?.title}</h2>
                                {currentLesson?.content && !currentLesson.content.includes('docs.google.com') && (
                                    <div className="text-zinc-400 mt-1 text-sm leading-relaxed line-clamp-2 hover:line-clamp-none transition-all [&_a]:text-orange-400 [&_a]:hover:underline [&_a]:font-bold" dangerouslySetInnerHTML={{ __html: makeLinksClickable(currentLesson.content) }} />
                                )}
                            </div>
                            <div className="flex-1 min-h-0 border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden">
                                <ChatSection lessonId={currentLessonId!} session={session} />
                            </div>
                        </div>
                    )}

                    {/* [HYDRATION FIX] Chỉ render Mobile logic khi đã Mounted và là Mobile */}
                    {isMounted && isMobile && (
                        <>
                            <div className="flex-1 min-h-0 w-full flex flex-col">
                                {mobileTab === 'list' && (
                                    <div className="flex-1 overflow-y-auto">
                                        <LessonSidebarMobile
                                            lessons={course.lessons}
                                            currentLessonId={currentLessonId}
                                            onLessonSelect={handleLessonSelect}
                                            progress={progressMap}
                                            startedAt={startedAt}
                                            courseType={course.type}
                                            onResetStartDate={async (d: Date) => { await confirmStartDateAction(course.id, d); window.location.reload(); }}
                                        />
                                    </div>
                                )}
                                {mobileTab === 'content' && (
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <div className="px-4 py-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
                                            <p className="text-base font-bold text-white leading-tight">{currentLesson?.title}</p>
                                            <button onClick={() => setShowContentModal(true)} className="text-xs text-orange-400 mt-2">Xem chi tiết nội dung →</button>
                                        </div>
                                        <div className="flex-1 min-h-0">
                                            <ChatSection lessonId={currentLessonId!} session={session} />
                                        </div>
                                    </div>
                                )}
                                {mobileTab === 'record' && course.type !== 'LIB' && (
                                    <div className="flex-1 overflow-hidden">
                                        <AssignmentForm
                                            key={currentLessonId}
                                            lessonId={currentLessonId!}
                                            lessonOrder={currentLesson?.order ?? 1}
                                            startedAt={startedAt}
                                            videoPercent={videoPercent}
                                            videoUrl={currentLesson?.videoUrl || null}
                                            onSubmit={handleSubmitAssignment}
                                            initialData={{ ...currentProgress, enrollmentId: enrollment.id }}
                                            onSaveDraft={assignmentFormRef}
                                            onFormDataChange={setCurrentFormData}
                                            onDraftSaved={(draftData) => {
                                                setProgressMap(prev => ({
                                                    ...prev,
                                                    [currentLessonId!]: { ...prev[currentLessonId!], assignment: { ...prev[currentLessonId!]?.assignment, ...draftData } }
                                                }))
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <nav className="h-14 bg-zinc-900 border-t border-zinc-800 flex fixed bottom-0 left-0 right-0 z-50">
                                {[
                                    { id: 'list', icon: ListVideo, label: 'Danh sách' },
                                    { id: 'content', icon: FileText, label: 'Nội dung' },
                                    ...(course.type !== 'LIB' ? [{ id: 'record', icon: ClipboardCheck, label: 'Ghi nhận' }] : []),
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setMobileTab(tab.id as MobileTab)}
                                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] ${mobileTab === tab.id ? 'text-orange-400 bg-orange-400/5 border-t-2 border-orange-400' : 'text-zinc-500'}`}
                                    >
                                        <tab.icon className="w-5 h-5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </>
                    )}
                </main>

                {!isMobile && course.type !== 'LIB' && (
                    <div className="w-[400px] shrink-0 border-l border-zinc-800 flex flex-col">
                        <AssignmentForm
                            key={currentLessonId}
                            lessonId={currentLessonId!}
                            lessonOrder={currentLesson?.order ?? 1}
                            startedAt={startedAt}
                            videoPercent={videoPercent}
                            videoUrl={currentLesson?.videoUrl || null}
                            onSubmit={handleSubmitAssignment}
                            initialData={{ ...currentProgress, enrollmentId: enrollment.id }}
                            onSaveDraft={assignmentFormRef}
                            onFormDataChange={setCurrentFormData}
                            onDraftSaved={(draftData) => {
                                setProgressMap(prev => ({
                                    ...prev,
                                    [currentLessonId!]: { ...prev[currentLessonId!], assignment: { ...prev[currentLessonId!]?.assignment, ...draftData } }
                                }))
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Content Modal */}
            {showContentModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowContentModal(false)}>
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-700 max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                            <h2 className="text-white font-bold text-sm truncate pr-4">{currentLesson?.title}</h2>
                            <button onClick={() => setShowContentModal(false)}><X className="w-5 h-5 text-zinc-400" /></button>
                        </div>
                        <div className="overflow-y-auto p-5 text-zinc-300 text-sm leading-relaxed [&_a]:text-orange-400 [&_a]:hover:underline [&_a]:font-bold" dangerouslySetInnerHTML={{ __html: makeLinksClickable(currentLesson?.content || '') }} />
                    </div>
                </div>
            )}

            <StartDateModal isOpen={!enrollment.startedAt} onConfirm={async (d) => { await confirmStartDateAction(course.id, d); window.location.reload(); }} />
        </div>
    )
}

function LessonSidebarMobile({ lessons, currentLessonId, onLessonSelect, progress, startedAt, onResetStartDate, courseType }: any) {
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [dateInput, setDateInput] = useState(startedAt ? new Date(startedAt).toISOString().slice(0, 10) : '')
    const [saving, setSaving] = useState(false)

    // Lọc progress chỉ hiển thị các bài học không bị reset
    const filteredProgress = Object.entries(progress).reduce((acc: any, [id, p]: [string, any]) => { 
        if (p.status !== 'RESET') acc[id] = p; 
        return acc 
    }, {})

    const handleReset = async () => {
        if (!dateInput) return
        const confirmReset = window.confirm("⚠️ Cảnh báo: Dữ liệu học tập cũ sẽ không được tính vào lộ trình mới.\n\nNhấn OK để xác nhận đổi ngày bắt đầu mới.")
        if (!confirmReset) return
        setSaving(true)
        try {
            await onResetStartDate(new Date(dateInput))
            setShowDatePicker(false)
        } finally {
            setSaving(false)
        }
    }

    const completedCount = lessons.filter((l: any) => filteredProgress[l.id]?.status === 'COMPLETED').length

    return (
        <div className="flex flex-col h-full w-full bg-zinc-900 overflow-hidden">
            {/* ─ Cố định: ngày bắt đầu ─ */}
            <div className="shrink-0 bg-zinc-900 border-b border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <CalendarDays className="w-4 h-4 text-orange-400 shrink-0" />
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Ngày bắt đầu</p>
                            <p className="text-sm font-bold text-white leading-tight">
                                {startedAt ? new Date(startedAt).toLocaleDateString('vi-VN') : '-- / -- / ----'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center gap-1 text-[11px] text-orange-400 border border-orange-500/30 rounded-lg px-2.5 py-1 font-bold active:scale-95 transition-all"
                    >
                        <RefreshCw className="w-3 h-3" /> Đặt lại
                    </button>
                </div>

                {showDatePicker && (
                    <div className="bg-zinc-800 rounded-xl p-3 space-y-2.5 border border-zinc-700 shadow-xl">
                        <p className="text-[10px] text-zinc-400 font-medium">Chọn ngày mới cho lộ trình:</p>
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
                                className="flex-1 text-xs font-black bg-orange-500 text-white rounded-lg py-2 disabled:opacity-50"
                            >
                                {saving ? 'Đang lưu...' : 'XÁC NHẬN'}
                            </button>
                            <button 
                                onClick={() => setShowDatePicker(false)} 
                                className="flex-1 text-xs font-bold text-zinc-400 border border-zinc-700 rounded-lg py-2"
                            >
                                HỦY
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─ Tiêu đề danh sách ─ */}
            <div className="shrink-0 px-4 py-3 border-b border-brk-outline flex items-center justify-between bg-brk-background/50">
                <span className="text-[10px] font-black text-brk-muted uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>Lộ trình học tập</span>
                <span className="text-[10px] font-black text-brk-accent bg-brk-accent-10 px-2.5 py-0.5 rounded-full border border-brk-accent/20">
                    {completedCount}/{lessons.length} BÀI
                </span>
            </div>

            {/* ─ Danh sách cuộn ─ */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                {lessons.map((lesson: any) => {
                    const prog = filteredProgress[lesson.id]
                    const isActive = currentLessonId === lesson.id
                    const unlocked = courseType === 'LIB' || lesson.order === 1 || (filteredProgress[lessons.find((l:any)=>l.order===lesson.order-1)?.id]?.status === 'COMPLETED')
                    return (
                        <button
                            key={lesson.id}
                            onClick={() => unlocked && onLessonSelect(lesson.id)}
                            className={cn(
                                'w-full flex items-center gap-3 px-4 py-4 text-left border-b transition-all active:bg-brk-background', 
                                'border-brk-outline/50',
                                isActive && 'bg-brk-background border-l-4 border-l-brk-accent', 
                                !unlocked && 'opacity-40 grayscale'
                            )}
                        >
                            <div className="shrink-0">
                                {prog?.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5 text-brk-accent" /> : isActive ? <PlayCircle className="w-5 h-5 text-brk-accent animate-pulse" /> : !unlocked ? <Lock className="w-4 h-4 text-brk-muted" /> : <div className="w-4 h-4 rounded-full border border-brk-outline flex items-center justify-center text-[8px] text-brk-muted">{lesson.order}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn('text-sm leading-snug', isActive ? 'text-brk-on-primary font-black' : 'text-brk-muted font-medium')}>{lesson.title}</p>
                                {prog?.totalScore !== undefined && <p className={cn('text-[10px] mt-1 font-bold', prog.totalScore >= 5 ? 'text-brk-accent' : 'text-brk-accent')}>{prog.totalScore >= 5 ? '✓' : '✗'} Kết quả: {prog.totalScore}/10đ</p>}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
