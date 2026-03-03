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
    submitAssignmentAction,
    updateLastLessonAction
} from "@/app/actions/course-actions"
import { ArrowLeft, ListVideo, FileText, X, ClipboardCheck, Loader2, Terminal } from "lucide-react"
import Link from "next/link"

interface CoursePlayerProps {
    course: any
    enrollment: any
    session: any
}

type MobileTab = 'list' | 'content' | 'record'

export default function CoursePlayer({ course, enrollment: initialEnrollment, session }: CoursePlayerProps) {
    const [enrollment, setEnrollment] = useState(initialEnrollment)
    const [debugLogs, setDebugLogs] = useState<{msg: string, time: string}[]>([])
    const [showDebug, setShowDebug] = useState(false)
    const isSubmittingRef = useRef(false)

    // Helper ghi log
    const addLog = useCallback((msg: string) => {
        const time = new Date().toLocaleTimeString('vi-VN', { hour12: false })
        setDebugLogs(prev => [{msg, time}, ...prev].slice(0, 50))
        console.log(`[DEBUG] ${time} - ${msg}`)
    }, [])

    // Lọc progress chỉ lấy các bài học không bị reset
    const filteredLessonProgress = enrollment.lessonProgress.filter((p: any) => p.status !== 'RESET')

    const [currentLessonId, setCurrentLessonId] = useState<string>(() => {
        if (enrollment.lastLessonId) return enrollment.lastLessonId
        const incomplete = filteredLessonProgress
            .filter((p: any) => p.status !== 'COMPLETED')
            .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        return incomplete[0]?.lessonId || course.lessons[0]?.id
    })

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

    const notify = useCallback((text: string, type: 'loading' | 'success' | 'error' = 'success', duration = 3000) => {
        setStatusMsg({ text, type })
        addLog(`[UI] Thông báo: ${text} (${type})`)
        if (type !== 'loading') {
            setTimeout(() => setStatusMsg(null), duration)
        }
    }, [addLog])

    const prevMobileTabRef = useRef(mobileTab)
    const prevShowContentModalRef = useRef(showContentModal)

    const checkIsOnTime = useCallback((startedAt: Date | null, lessonOrder: number): boolean => {
        if (!startedAt) return false
        const deadline = new Date(startedAt)
        deadline.setDate(deadline.getDate() + (lessonOrder - 1))
        deadline.setHours(23, 59, 59, 999)
        return new Date() <= deadline
    }, [])

    const videoProgressRef = useRef<{ maxTime: number; duration: number } | null>(null)

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
                addLog(`[TAB] Chuyển từ ${prevTab} sang ${currentTab}`)
                
                // CHỈ lưu draft nếu chuyển từ record -> content và KHÔNG đang nộp bài
                if (prevTab === 'record' && currentTab === 'content' && assignmentFormRef.current && !isSubmittingRef.current) {
                    addLog(`[DRAFT] Bắt đầu lưu nháp tự động khi chuyển tab...`)
                    await assignmentFormRef.current().catch(e => addLog(`[DRAFT] Lỗi: ${e.message}`))
                    addLog(`[DRAFT] Lưu nháp hoàn tất.`)
                }
            }
            prevMobileTabRef.current = mobileTab
        }
        handleTabChange()
    }, [mobileTab, addLog])

    const handleLessonSelect = async (lessonId: string) => {
        if (isSubmittingRef.current) return
        addLog(`[LESSON] Chọn bài học mới: ${lessonId}`)

        if (assignmentFormRef.current) {
            addLog(`[DRAFT] Đang lưu nháp bài cũ trước khi chuyển...`)
            await assignmentFormRef.current().catch(() => {})
        }

        if (currentLessonId && videoProgressRef.current) {
            addLog(`[VIDEO] Lưu tiến độ bài cũ: ${videoPercent}%`)
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

    const lastSavedPercentRef = useRef<number>(-1)

    const handleVideoProgress = useCallback(async (maxTime: number, duration: number) => {
        if (!currentLessonId || duration === 0) return
        const pct = Math.min(100, Math.round((maxTime / duration) * 100))
        setVideoPercent(pct)
        videoProgressRef.current = { maxTime, duration }
        
        // CHỈ lưu DB nếu bước sang một ngưỡng 10% mới (10, 20, 30...) hoặc 100%
        // Việc này làm giảm 90% số lượng request thừa, giúp server phản hồi nhanh hơn
        const threshold = Math.floor(pct / 10) * 10
        if ((threshold > lastSavedPercentRef.current || pct === 100) && threshold <= 100) {
            lastSavedPercentRef.current = threshold
            addLog(`[VIDEO] Lưu mốc tiến độ: ${threshold}%`)
            saveVideoProgressAction({ enrollmentId: enrollment.id, lessonId: currentLessonId, maxTime, duration }).catch(() => {})
        }
    }, [currentLessonId, enrollment.id, addLog])

    const handleSubmitAssignment = async (data: any, isUpdate: boolean = false) => {
        if (isSubmittingRef.current) {
            addLog(`[WARN] Đang có một tiến trình nộp bài khác, bỏ qua click này.`)
            return
        }

        isSubmittingRef.current = true
        addLog(`[SUBMIT] Bắt đầu Ghi nhận kết quả...`)
        notify(isUpdate ? 'Đang cập nhật bài học...' : 'Đang chấm điểm...', 'loading')
        
        try {
            const currentProg = progressMap[currentLessonId!]
            addLog(`[SUBMIT] Gửi dữ liệu lên Server... (Nội dung: ${data.reflection.length} ký tự)`)
            
            const result = await submitAssignmentAction({
                enrollmentId: enrollment.id,
                lessonId: currentLessonId!,
                reflection: data.reflection,
                links: data.links,
                supports: data.supports,
                isUpdate,
                lessonOrder: currentLesson?.order,
                startedAt: enrollment.startedAt,
                existingVideoScore: currentProg?.scores?.video,
                existingTimingScore: currentProg?.scores?.timing
            })
            
            if (!(result as any)?.success) {
                addLog(`[SUBMIT] Server trả về lỗi: ${(result as any)?.message}`)
                notify((result as any)?.message || 'Lỗi xử lý dữ liệu!', 'error')
                return
            }

            const res = result as any
            addLog(`[SUBMIT] THÀNH CÔNG! Điểm: ${res.totalScore}/10`)
            
            const updatedProgress = {
                ...(progressMap[currentLessonId!] || {}),
                assignment: { reflection: data.reflection, links: data.links, supports: data.supports },
                status: res.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS',
                totalScore: res.totalScore
            }
            setProgressMap(prev => ({ ...prev, [currentLessonId!]: updatedProgress }))

            notify(res.totalScore >= 5 ? `✅ Hoàn thành! Điểm: ${res.totalScore}/10` : `📊 Đã ghi nhận: ${res.totalScore}/10đ`, 'success')

            if (res.totalScore >= 5 && !isUpdate) {
                const currentIndex = course.lessons.findIndex((l: any) => l.id === currentLessonId)
                if (currentIndex < course.lessons.length - 1) {
                    addLog(`[SUBMIT] Tự động chuyển bài sau 2s...`)
                    setTimeout(() => handleLessonSelect(course.lessons[currentIndex + 1].id), 2000)
                }
            }
        } catch (error: any) {
            addLog(`[SUBMIT] LỖI MẠNG/HỆ THỐNG: ${error.message}`)
            notify('Lỗi kết nối máy chủ!', 'error')
        } finally {
            isSubmittingRef.current = false
            setStatusMsg(null)
            addLog(`[SUBMIT] Đã mở khóa nút bấm.`)
        }
    }

    const currentLesson = course.lessons.find((l: any) => l.id === currentLessonId)
    const currentProgress = progressMap[currentLessonId]
    const hasDuration = currentProgress?.duration && currentProgress.duration > 0
    const initialPercent = hasDuration && currentProgress?.maxTime
        ? (currentProgress.maxTime / currentProgress.duration) * 100
        : 0

    const completedCount = Object.values(progressMap).filter((p: any) => p.status === 'COMPLETED').length
    const startedAt = enrollment.startedAt ? new Date(enrollment.startedAt) : null

    return (
        <div className="flex flex-col h-full bg-black text-zinc-300">
            {/* Header */}
            <header className="h-14 shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900 z-50 fixed top-0 left-0 right-0">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/" className="shrink-0 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-bold text-white truncate text-sm sm:text-base">{course.name_lop}</h1>
                </div>
                
                {statusMsg && (
                    <div className={`absolute left-1/2 -translate-x-1/2 top-16 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transition-all duration-300 z-[100] ${
                        statusMsg.type === 'loading' ? 'bg-orange-500 text-white' :
                        statusMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                        {statusMsg.type === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {statusMsg.text}
                    </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setShowDebug(!showDebug)} className="p-2 text-zinc-500 hover:text-orange-400 transition-colors" title="Xem nhật ký hệ thống">
                        <Terminal className="w-4 h-4" />
                    </button>
                    <div className="hidden sm:flex items-center gap-2">
                        <span className="text-xs text-zinc-400">{completedCount}/{course.lessons.length}</span>
                        <div className="relative h-2 w-24 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(completedCount / course.lessons.length) * 100}%` }} />
                        </div>
                    </div>
                </div>
            </header>

            {/* Debug Console Overlay */}
            {showDebug && (
                <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 max-h-[300px] bg-zinc-900/95 border border-zinc-700 rounded-xl shadow-2xl z-[60] flex flex-col overflow-hidden backdrop-blur-md">
                    <div className="bg-zinc-800 px-3 py-2 flex items-center justify-between border-b border-zinc-700">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <Terminal className="w-3 h-3 text-emerald-500" /> Nhật ký hệ thống
                        </span>
                        <button onClick={() => setShowDebug(false)}><X className="w-4 h-4 text-zinc-500" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-1 custom-scrollbar">
                        {debugLogs.length === 0 && <p className="text-zinc-600 italic">Chưa có dữ liệu hoạt động...</p>}
                        {debugLogs.map((log, i) => (
                            <div key={i} className="flex gap-2 leading-relaxed border-b border-zinc-800/50 pb-1">
                                <span className="text-emerald-600 shrink-0">[{log.time}]</span>
                                <span className="text-zinc-300 break-words">{log.msg}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={`flex flex-1 min-h-0 pt-14 ${isMobile ? 'pb-14' : ''}`}>
                {!isMobile && (
                    <LessonSidebar
                        lessons={course.lessons}
                        currentLessonId={currentLessonId}
                        onLessonSelect={handleLessonSelect}
                        progress={progressMap}
                        startedAt={startedAt}
                        resetAt={enrollment.resetAt}
                        onResetStartDate={async (d: Date) => {
                            addLog(`[RESET] Yêu cầu đặt lại ngày bắt đầu: ${d.toLocaleDateString()}`)
                            await confirmStartDateAction(course.id, d)
                            window.location.reload()
                        }}
                    />
                )}

                <main className="flex-1 flex flex-col min-h-0 overflow-hidden items-center bg-zinc-950">
                    <div className={isMobile ? 'shrink-0 w-full' : 'p-5 pb-0 shrink-0 w-full max-w-5xl'}>
                        <div className={isMobile ? '' : 'rounded-2xl overflow-hidden border-2 border-white shadow-2xl bg-black'}>
                            <VideoPlayer
                                key={currentLessonId}
                                videoUrl={currentLesson?.videoUrl || null}
                                lessonContent={currentLesson?.content || null}
                                initialMaxTime={currentProgress?.maxTime || 0}
                                initialPercent={currentProgress?.duration ? (currentProgress.maxTime / currentProgress.duration) * 100 : 0}
                                onProgress={handleVideoProgress}
                                onPercentChange={setVideoPercent}
                            />
                        </div>
                    </div>

                    {!isMobile && (
                        <div className="p-5 flex-1 flex flex-col gap-4 min-h-0 overflow-hidden w-full max-w-5xl">
                            <div className="shrink-0">
                                <h2 className="text-lg font-bold text-white">{currentLesson?.title}</h2>
                                {currentLesson?.content && !currentLesson.content.includes('docs.google.com') && (
                                    <p className="text-zinc-400 mt-1 text-sm leading-relaxed line-clamp-2 hover:line-clamp-none transition-all">{currentLesson.content}</p>
                                )}
                            </div>
                            <div className="flex-1 min-h-0 border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden">
                                <ChatSection lessonId={currentLessonId!} session={session} />
                            </div>
                        </div>
                    )}

                    {isMobile && (
                        <div className="flex-1 min-h-0 w-full flex flex-col">
                            {mobileTab === 'list' && (
                                <div className="flex-1 overflow-y-auto">
                                    <LessonSidebarMobile
                                        lessons={course.lessons}
                                        currentLessonId={currentLessonId}
                                        onLessonSelect={handleLessonSelect}
                                        progress={progressMap}
                                        startedAt={startedAt}
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
                            {mobileTab === 'record' && (
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
                    )}
                </main>

                {!isMobile && (
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

            {/* Mobile Navigation */}
            {isMobile && (
                <nav className="h-14 bg-zinc-900 border-t border-zinc-800 flex fixed bottom-0 left-0 right-0 z-50">
                    {[
                        { id: 'list', icon: ListVideo, label: 'Danh sách' },
                        { id: 'content', icon: FileText, label: 'Nội dung' },
                        { id: 'record', icon: ClipboardCheck, label: 'Ghi nhận' },
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
            )}

            {/* Content Modal */}
            {showContentModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowContentModal(false)}>
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-700 max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                            <h2 className="text-white font-bold text-sm truncate pr-4">{currentLesson?.title}</h2>
                            <button onClick={() => setShowContentModal(false)}><X className="w-5 h-5 text-zinc-400" /></button>
                        </div>
                        <div className="overflow-y-auto p-5 text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {currentLesson?.content}
                        </div>
                    </div>
                </div>
            )}

            <StartDateModal isOpen={!enrollment.startedAt} onConfirm={async (d) => { await confirmStartDateAction(course.id, d); window.location.reload(); }} />
        </div>
    )
}

// Reuse mobile sidebar components
import { CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

function LessonSidebarMobile({ lessons, currentLessonId, onLessonSelect, progress, startedAt, onResetStartDate }: any) {
    const filteredProgress = Object.entries(progress).reduce((acc: any, [id, p]: [string, any]) => { if (p.status !== 'RESET') acc[id] = p; return acc }, {})
    return (
        <div className="flex flex-col bg-zinc-900 h-full">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Lộ trình học tập</span>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{lessons.filter((l:any)=>filteredProgress[l.id]?.status==='COMPLETED').length}/{lessons.length}</span>
            </div>
            {lessons.map((lesson: any) => {
                const prog = filteredProgress[lesson.id]
                const isActive = currentLessonId === lesson.id
                const unlocked = lesson.order === 1 || (filteredProgress[lessons.find((l:any)=>l.order===lesson.order-1)?.id]?.status === 'COMPLETED')
                return (
                    <button
                        key={lesson.id}
                        onClick={() => unlocked && onLessonSelect(lesson.id)}
                        className={cn('w-full flex items-center gap-3 px-4 py-3 text-left border-b border-zinc-800/50', isActive && 'bg-zinc-800/80 border-l-2 border-l-orange-500', !unlocked && 'opacity-40')}
                    >
                        <div className="shrink-0">
                            {prog?.status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : isActive ? <PlayCircle className="w-4 h-4 text-orange-400 animate-pulse" /> : !unlocked ? <Lock className="w-3.5 h-3.5 text-zinc-600" /> : <div className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-[8px] text-zinc-500">{lesson.order}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={cn('text-sm truncate', isActive ? 'text-white font-bold' : 'text-zinc-400')}>{lesson.title}</p>
                            {prog?.totalScore !== undefined && <p className="text-[9px] text-zinc-500 mt-0.5 font-mono">Kết quả: {prog.totalScore}/10đ</p>}
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
