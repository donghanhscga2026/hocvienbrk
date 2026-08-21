'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
    ArrowLeft, ListVideo, FileText, X, ClipboardCheck,
    Loader2, CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw, ArrowUpDown
} from "lucide-react"
import { cn } from "@/lib/utils"

import LessonSidebar from "./LessonSidebar"
import VideoPlayer, { VideoPlayerHandle } from "./VideoPlayer"
import AssignmentForm from "./AssignmentForm"
import ChatSection from "./ChatSection"
// [OPTIMIZE] StartDateModal kéo theo react-day-picker + CSS riêng, nhưng chỉ
// hiện với học viên CHƯA chọn ngày bắt đầu học (thiểu số) — dynamic-import để
// không tải thư viện này cho mọi học viên vào trang học.
const StartDateModal = dynamic(() => import("./StartDateModal"), { ssr: false })
import {
    confirmStartDateAction,
    submitAssignmentAction,
    updateLastLessonAction
} from "@/app/actions/course-actions"
import { hasUserCommentedOnLesson } from "@/app/actions/comment-actions"

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
    const router = useRouter()
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
    const videoPlayerRef = useRef<VideoPlayerHandle>(null)
    const prevMobileTabRef = useRef(mobileTab)
    const [showCommentReminder, setShowCommentReminder] = useState(false)
    const [showDailyChallengeReminder, setShowDailyChallengeReminder] = useState(false)
    const [pendingLessonId, setPendingLessonId] = useState<string | null>(null)
    const [videoHidden, setVideoHidden] = useState(false)
    // [HOVER-HIDE] Desktop: hover vào khung bình luận sẽ tạm thu gọn video (không unmount)
    // để nhường chỗ cho khung chat, rời chuột ra thì video hiện lại. Chỉ ảnh hưởng hiển
    // thị (CSS), không đụng tới trạng thái mount của VideoPlayer — nút Ẩn/Hiện vẫn hoạt
    // động độc lập như cũ (unmount thật khi bấm).
    const [chatHovered, setChatHovered] = useState(false)

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
                    await assignmentFormRef.current().catch(() => { })
                }
            }
            prevMobileTabRef.current = mobileTab
        }
        handleTabChange()
    }, [mobileTab])

    const handleLessonSelect = useCallback(async (lessonId: string, skipCommentCheck = false) => {
        if (isSubmittingRef.current) return

        const currentLessonData = course.lessons.find((l: any) => l.id === currentLessonId)

        // isDailyChallenge check — mandatory assignment before switching (đồng bộ, không cần chờ mạng)
        if (course.type !== 'LIB' && course.type !== 'SYS' && currentLessonData?.isDailyChallenge && currentLessonId && currentLessonId !== lessonId) {
            const currentProg = progressMap[currentLessonId]
            if (!currentProg || currentProg.status !== 'COMPLETED') {
                setPendingLessonId(lessonId)
                setShowDailyChallengeReminder(true)
                return
            }
        }

        const needsCommentCheck = course.type !== 'LIB' && !skipCommentCheck && !!currentLessonId && currentLessonId !== lessonId

        // [PERF] Lưu draft bài tập + kiểm tra bình luận là 2 việc độc lập — chạy
        // song song thay vì tuần tự để UI không phải đợi tổng thời gian của cả 2.
        const [, hasComment] = await Promise.all([
            assignmentFormRef.current ? assignmentFormRef.current().catch(() => { }) : Promise.resolve(),
            needsCommentCheck ? hasUserCommentedOnLesson(currentLessonId!) : Promise.resolve(true)
        ])

        if (needsCommentCheck && !hasComment) {
            setPendingLessonId(lessonId)
            setShowCommentReminder(true)
            return
        }

        setCurrentLessonId(lessonId)
        setVideoPercent(0)
        setMobileTab('content')
        setShowContentModal(false)
        updateLastLessonAction(enrollment.id, lessonId).catch(() => { })
    }, [course, currentLessonId, progressMap, enrollment.id])

    const handleVideoProgress = useCallback((maxTime: number, duration: number) => {
        if (!currentLessonId || duration === 0) return
        const pct = Math.min(100, Math.round((maxTime / duration) * 100))
        setVideoPercent(pct)
    }, [currentLessonId])

    const handleSubmitAssignment = useCallback(async (data: any, isUpdate: boolean = false) => {
        if (isSubmittingRef.current) return

        isSubmittingRef.current = true
        notify(isUpdate ? 'Đang cập nhật bài học...' : 'Đang chấm điểm...', 'loading')

        try {
            const currentProg = progressMap[currentLessonId!]
            const currentLessonData = course.lessons.find((l: any) => l.id === currentLessonId)

            // Đọc vị trí phát video NGAY LÚC bấm "Ghi nhận kết quả" — điểm video
            // được tính trực tiếp từ đây, không cần lưu tiến độ liên tục nữa.
            const liveProgress = videoPlayerRef.current?.getLiveProgress()

            const result = await submitAssignmentAction({
                enrollmentId: enrollment.id,
                lessonId: currentLessonId!,
                reflection: data.reflection,
                links: data.links,
                supports: data.supports,
                isUpdate,
                lessonOrder: currentLessonData?.order,
                currentMaxTime: liveProgress?.maxTime,
                currentDuration: liveProgress?.duration,
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
                    setTimeout(() => handleLessonSelect(course.lessons[currentIndex + 1].id, true), 2000)
                }
            }
        } catch (error: any) {
            console.error("[SUBMIT-ERROR]", error)
            notify('Lỗi kết nối máy chủ!', 'error')
        } finally {
            isSubmittingRef.current = false
            setStatusMsg(null)
        }
    }, [progressMap, course, currentLessonId, enrollment.id, enrollment.startedAt, notify, handleLessonSelect])

    const currentLesson = course.lessons.find((l: any) => l.id === currentLessonId)
    const currentProgress = progressMap[currentLessonId]

    const initialPercent = !currentLesson?.videoUrl ? 100 : (
        currentProgress?.duration ? (currentProgress.maxTime / currentProgress.duration) * 100 : 0
    )

    // [PERF] Memo hóa để LessonSidebar (React.memo) không render lại mỗi khi
    // component cha đổi state không liên quan (ví dụ videoPercent mỗi ~5s).
    const startedAt = useMemo(() => enrollment.startedAt ? new Date(enrollment.startedAt) : null, [enrollment.startedAt])
    const isAuditor = enrollment.studyMode === 'AUDITOR'

    const handleResetStartDate = useCallback(async (d: Date) => {
        await confirmStartDateAction(course.id, d)
        window.location.reload()
    }, [course.id])

    const handleDraftSaved = useCallback((draftData: any) => {
        setProgressMap(prev => ({
            ...prev,
            [currentLessonId!]: { ...prev[currentLessonId!], assignment: { ...prev[currentLessonId!]?.assignment, ...draftData } }
        }))
    }, [currentLessonId])

    const assignmentInitialData = useMemo(() => ({ ...currentProgress, enrollmentId: enrollment.id }), [currentProgress, enrollment.id])

    // [HYDRATION SAFEGUARD] Trả về giao diện trống tối giản trên server
    if (!isMounted) {
        return <div className="h-screen w-full bg-black flex items-center justify-center text-zinc-700 font-mono text-xs">Đang tải ứng dụng...</div>
    }

    return (
        <div className="flex flex-col h-full bg-black text-zinc-300">
            {isAuditor && (
                <div className="bg-yellow-500/15 border border-yellow-500 text-yellow-900 px-4 py-3 text-sm font-bold text-center">
                    ⚠️ Bạn đang học ở chế độ DỰ THÍNH. Bạn vẫn xem được video, nhưng không được nhận link Zoom/live trực tiếp và quyền lợi đồng hành đầy đủ.
                </div>
            )}
            {/* Header */}
            <header className="h-14 shrink-0 border-b border-zinc-800 flex items-center justify-between gap-3 px-4 bg-zinc-900 z-50 fixed top-0 left-0 right-0">
                <button
                    onClick={() => router.back()}
                    aria-label="Quay lại"
                    className="shrink-0 flex items-center gap-1.5 pl-2.5 pr-3.5 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all"
                >
                    <ArrowLeft className="w-5 h-5" strokeWidth={2.75} />
                    <span className="text-xs font-black tracking-wide">QUAY RA</span>
                </button>

                {statusMsg && (
                    <div className={`absolute left-1/2 -translate-x-1/2 top-16 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transition-all duration-300 z-[100] ${statusMsg.type === 'loading' ? 'bg-brk-accent text-brk-on-surface' :
                        statusMsg.type === 'success' ? 'bg-brk-accent text-brk-on-primary' : 'bg-brk-accent text-brk-on-primary'
                        }`}>
                        {statusMsg.type === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {statusMsg.text}
                    </div>
                )}

                <h1 className="font-bold text-white truncate text-sm sm:text-base text-right">{course.name_lop}</h1>
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
                        onResetStartDate={handleResetStartDate}
                    />
                )}

                <main className="flex-1 flex flex-col min-h-0 overflow-hidden items-center bg-zinc-950">
                    <div className={isMobile ? 'shrink-0 w-full' : 'p-5 pb-0 shrink-0 w-full max-w-5xl'}>
                        <div
                            className={isMobile ? '' : 'grid transition-[grid-template-rows] duration-300 ease-in-out'}
                            style={!isMobile ? { gridTemplateRows: chatHovered ? '0fr' : '1fr' } : undefined}
                        >
                            <div className={isMobile ? '' : 'overflow-hidden border-2 border-white shadow-2xl bg-black min-h-0'}>
                                {!videoHidden && (
                                    <VideoPlayer
                                        key={currentLessonId}
                                        ref={videoPlayerRef}
                                        videoUrl={currentLesson?.videoUrl || null}
                                        lessonContent={currentLesson?.content || null}
                                        initialMaxTime={currentProgress?.maxTime || 0}
                                        playlistData={currentProgress?.scores?.playlist}
                                        lastVideoIndex={currentProgress?.scores?.lastVideoIndex}
                                        onProgress={handleVideoProgress}
                                        onPercentChange={setVideoPercent}
                                        courseType={course.type}
                                        lessonType={currentLesson?.type}
                                        serverPlaylist={
                                            currentLesson?.type === 'TEXT'
                                                ? [{ type: 'text', title: currentLesson.title, url: '', content: currentLesson.content || '' }]
                                                : undefined
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {!isMobile && (
                        <div className="p-5 flex-1 flex flex-col gap-4 min-h-0 overflow-hidden w-full max-w-5xl">
                            <div className="shrink-0 flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-lg font-bold text-white truncate">{currentLesson?.title}</h2>
                                    <button
                                        onClick={() => setVideoHidden(v => !v)}
                                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
                                        style={videoHidden
                                            ? { backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316', borderColor: 'rgba(249,115,22,0.4)' }
                                            : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#a1a1aa', borderColor: 'rgba(255,255,255,0.1)' }
                                        }
                                        title={videoHidden ? 'Hiện khung video' : 'Ẩn khung video'}
                                    >
                                        {videoHidden ? '▶ Hiện video' : '⊟ Ẩn video'}
                                    </button>
                                </div>
                                {/* [FIX] Ẩn HOÀN TOÀN mô tả bên dưới khi là bài TEXT (đã hiển thị trong Player) */}
                                {currentLesson?.type === 'ALL' ? (
                                    <div className="text-zinc-300 text-sm leading-relaxed transition-all italic">Xem hết các học phần của bài học</div>
                                ) : currentLesson?.content && currentLesson?.type !== 'TEXT' && !currentLesson.content.includes('docs.google.com') && currentLesson?.videoUrl && (
                                    <div className="text-zinc-300 text-sm leading-relaxed line-clamp-2 hover:line-clamp-none transition-all [&_a]:text-orange-400 [&_a]:hover:underline [&_a]:font-bold" dangerouslySetInnerHTML={{ __html: makeLinksClickable(currentLesson.content) }} />
                                )}
                            </div>
                            <div
                                className="flex-1 min-h-0 border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden"
                                onMouseEnter={() => setChatHovered(true)}
                                onMouseLeave={() => setChatHovered(false)}
                            >
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
                                            onResetStartDate={handleResetStartDate}
                                        />
                                    </div>
                                )}
                                {mobileTab === 'content' && (
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <div className="px-4 py-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
                                            <p className="text-base font-bold text-white leading-tight">{currentLesson?.title}</p>
                                            {currentLesson?.type !== 'TEXT' && currentLesson?.type !== 'ALL' && (
                                                <button onClick={() => setShowContentModal(true)} className="text-xs text-orange-400 mt-2">Xem chi tiết nội dung &rarr;</button>
                                            )}
                                            {currentLesson?.type === 'ALL' && (
                                                <p className="text-xs text-zinc-300 mt-2 italic">H&atilde;y xem c&aacute;c ph&acirc;̀n trong playlist b&agrave;i h&ocirc;̣c.</p>
                                            )}
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
                                            initialData={assignmentInitialData}
                                            onSaveDraft={assignmentFormRef}
                                            onFormDataChange={setCurrentFormData}
                                            onDraftSaved={handleDraftSaved}
                                        />
                                    </div>
                                )}
                            </div>

                            <style jsx>{`
                                @keyframes tabAttention {
                                    0%, 100% { background-color: rgba(56,189,248,0.08); box-shadow: none; }
                                    50% { background-color: rgba(56,189,248,0.55); box-shadow: 0 0 24px 4px rgba(56,189,248,0.75) inset, 0 0 16px rgba(56,189,248,0.5); }
                                }
                                @keyframes tabAttentionText {
                                    0%, 100% { color: rgba(186,230,253,0.85); }
                                    50% { color: #ffffff; }
                                }
                                @keyframes tabAttentionIcon {
                                    0%, 100% { transform: scale(1); }
                                    50% { transform: scale(1.25); }
                                }
                                .tab-attention { animation: tabAttention 0.9s ease-in-out infinite, tabAttentionText 0.9s ease-in-out infinite; }
                                .tab-attention-icon { animation: tabAttentionIcon 0.9s ease-in-out infinite; }
                            `}</style>
                            <nav className="h-14 bg-zinc-900 border-t border-zinc-800 flex fixed bottom-0 left-0 right-0 z-50">
                                {[
                                    { id: 'list', icon: ListVideo, label: 'Danh sách' },
                                    { id: 'content', icon: FileText, label: 'Nội dung' },
                                    ...(course.type !== 'LIB' ? [{ id: 'record', icon: ClipboardCheck, label: 'Ghi nhận' }] : []),
                                ].map(tab => {
                                    const isActive = mobileTab === tab.id
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setMobileTab(tab.id as MobileTab)}
                                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isActive ? 'text-orange-400 bg-orange-400/5 border-t-2 border-orange-400' : 'tab-attention'}`}
                                        >
                                            <tab.icon className={`w-5 h-5 ${!isActive ? 'tab-attention-icon' : ''}`} />
                                            {tab.label}
                                        </button>
                                    )
                                })}
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
                            initialData={assignmentInitialData}
                            onSaveDraft={assignmentFormRef}
                            onFormDataChange={setCurrentFormData}
                            onDraftSaved={handleDraftSaved}
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
                            <button onClick={() => setShowContentModal(false)}><X className="w-5 h-5 text-zinc-300" /></button>
                        </div>
                        {/* [FIX] Ẩn content trong modal khi là TEXT (đã hiển thị trong Player) */}
                        {currentLesson?.type !== 'TEXT' && (
                            <div className="overflow-y-auto p-5 text-zinc-300 text-sm leading-relaxed [&_a]:text-orange-400 [&_a]:hover:underline [&_a]:font-bold" dangerouslySetInnerHTML={{ __html: makeLinksClickable(currentLesson?.content || '') }} />
                        )}
                    </div>
                </div>
            )}

            {showCommentReminder && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowCommentReminder(false); setPendingLessonId(null) }}>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-2 text-3xl">🙏</div>
                        <p className="text-white text-sm leading-relaxed text-center">
                            Rất là biết ơn tương tác của <span className="font-bold text-orange-400">{session?.user?.name || 'bạn'}</span> với ít nhất 1 bình luận chia sẻ cảm nhận hoặc bài học của bạn cho nội dung vừa học trước khi sang bài học khác
                        </p>
                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={() => { setShowCommentReminder(false); setPendingLessonId(null) }}
                                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
                            >
                                ✍️ Viết bình luận
                            </button>
                            <button
                                onClick={async () => { setShowCommentReminder(false); if (pendingLessonId) await handleLessonSelect(pendingLessonId, true) }}
                                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm transition-colors"
                            >
                                Bỏ qua
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDailyChallengeReminder && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowDailyChallengeReminder(false); setPendingLessonId(null) }}>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-2 text-3xl">📝</div>
                        <p className="text-white text-sm leading-relaxed text-center">
                            Bài <span className="font-bold text-orange-400">{currentLesson?.title}</span> yêu cầu hoàn thành bài tập trước khi chuyển sang bài học khác
                        </p>
                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={() => { setShowDailyChallengeReminder(false); setPendingLessonId(null); if (isMobile) setMobileTab('record') }}
                                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
                            >
                                📝 Làm bài tập
                            </button>
                        </div>
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
    const [showWarning, setShowWarning] = useState(false)
    const [sortDesc, setSortDesc] = useState(true)
    const listContainerRef = useRef<HTMLDivElement>(null)
    const hasAutoScrolledRef = useRef(false)

    const filteredProgress = Object.entries(progress).reduce((acc: any, [id, p]: [string, any]) => {
        if (p.status !== 'RESET') acc[id] = p
        return acc
    }, {})

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

    // Ngày hôm nay VN (UTC+7)
    const today = (() => {
        const now = new Date()
        const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)
        return vnNow.toISOString().slice(0, 10)
    })()

    const isPastDate = dateInput < today

    const completedLessons = lessons.filter((l: any) => filteredProgress[l.id]?.status === 'COMPLETED')
    const completedCount = completedLessons.length

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
        <div className="flex flex-col h-full w-full bg-zinc-900 overflow-hidden">
            {/* ─ Cố định: ngày bắt đầu ─ */}
            <div className="shrink-0 bg-zinc-900 border-b border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <CalendarDays className="w-4 h-4 text-orange-400 shrink-0" />
                        <div>
                            <p className="text-[10px] text-zinc-300 uppercase tracking-wider font-bold">Ngày bắt đầu</p>
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
                        <p className="text-[10px] text-zinc-300 font-medium">Chọn ngày mới (từ hôm nay trở đi):</p>
                        <input
                            type="date"
                            value={dateInput}
                            min={today}
                            onChange={e => setDateInput(e.target.value)}
                            className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 border border-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        {isPastDate && dateInput && (
                            <p className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                                ⚠ Không được chọn ngày trong quá khứ
                            </p>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={() => { if (!isPastDate && dateInput) setShowWarning(true) }}
                                disabled={!dateInput || saving || isPastDate}
                                className="flex-1 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 disabled:opacity-40 transition-colors"
                            >
                                {saving ? 'Đang lưu...' : 'Đặt lại lộ trình'}
                            </button>
                            <button
                                onClick={() => { setShowDatePicker(false); setShowWarning(false) }}
                                className="flex-1 text-xs font-bold text-zinc-100 border border-zinc-700 rounded-lg py-2"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─ Tiêu đề danh sách ─ */}
            <div className="shrink-0 px-4 py-3 border-b border-brk-outline flex items-center justify-between bg-brk-background/50">
                <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">Lộ trình học tập</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSortDesc(v => !v)}
                        title={sortDesc ? 'Đang sắp xếp: Cuối → Đầu' : 'Đang sắp xếp: Đầu → Cuối'}
                        className="flex items-center gap-1 text-[10px] font-bold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-2 py-1 transition-colors"
                    >
                        <ArrowUpDown className="w-3 h-3" />
                        {sortDesc ? 'Cuối → Đầu' : 'Đầu → Cuối'}
                    </button>
                    <span className="text-[10px] font-black text-brk-accent bg-brk-accent-10 px-2.5 py-0.5 rounded-full border border-brk-accent/20">
                        {completedCount}/{lessons.length} BÀI
                    </span>
                </div>
            </div>

            {/* ─ Danh sách cuộn ─ */}
            <div ref={listContainerRef} className="flex-1 overflow-y-auto overscroll-contain">
                {displayLessons.map((lesson: any) => {
                    const prog = filteredProgress[lesson.id]
                    const isActive = currentLessonId === lesson.id
                    const prevProg = filteredProgress[lessons.find((l: any) => l.order === lesson.order - 1)?.id]
                    const unlocked = courseType === 'LIB' || courseType === 'NORMAL' || courseType === 'SYS' || lesson.order === 1 || (prevProg?.status === 'COMPLETED' && (prevProg?.totalScore ?? 0) >= 5)
                    return (
                        <button
                            key={lesson.id}
                            data-lesson-id={lesson.id}
                            onClick={() => unlocked && onLessonSelect(lesson.id)}
                            className={cn(
                                'w-full flex items-center gap-3 px-4 py-4 text-left border-b transition-all',
                                'border-brk-outline/50',
                                isActive ? 'bg-white border-l-4 border-l-orange-500' : 'active:bg-white/5',
                                !unlocked && 'opacity-40 grayscale'
                            )}
                        >
                            <div className="shrink-0">
                                {prog?.status === 'COMPLETED' ? <CheckCircle2 className={cn('w-5 h-5', isActive ? 'text-emerald-600' : 'text-emerald-500')} /> : isActive ? <PlayCircle className="w-5 h-5 text-orange-500 animate-pulse" /> : !unlocked ? <Lock className="w-4 h-4 text-zinc-400" /> : <div className="w-4 h-4 rounded-full border border-zinc-500 flex items-center justify-center text-[8px] text-zinc-200">{lesson.order}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn('text-sm leading-snug', isActive ? 'text-black font-black' : 'text-white font-medium')}>{lesson.title}
                                    {lesson.isDailyChallenge && (
                                        <span className="ml-1.5 text-[9px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full align-middle">📝 Bài tập</span>
                                    )}
                                </p>
                                {prog?.totalScore !== undefined && <p className={cn('text-[10px] mt-1 font-bold', isActive ? 'text-blue-950' : 'text-orange-400')}>{prog.totalScore >= 5 ? '✓' : '✗'} Kết quả: {prog.totalScore}/10đ</p>}
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* ─ Modal cảnh báo reset ─ */}
            {showWarning && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border-2 border-red-500/60 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
                        <div className="bg-red-600 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-white font-black text-sm">⚠️ Cảnh báo — Đặt lại lộ trình</span>
                            </div>
                            <button onClick={() => setShowWarning(false)} className="text-white/70 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            <p className="text-white text-sm">
                                Đặt lại về ngày{' '}
                                <span className="font-black text-orange-400">
                                    {new Date(dateInput + 'T00:00:00').toLocaleDateString('vi-VN')}
                                </span>
                            </p>

                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-1.5">
                                <p className="text-red-400 font-bold text-xs">Hành động này có nghĩa là:</p>
                                <ul className="text-red-300 text-xs space-y-1 ml-1">
                                    <li>• Toàn bộ tiến trình và điểm số hiện tại <strong>sẽ bị hủy</strong></li>
                                    <li>• Bạn <strong>phải làm lại tất cả từ Bài 1</strong></li>
                                    <li>• Deadline tính lại từ ngày mới — <strong>không thể hoàn tác</strong></li>
                                </ul>
                            </div>

                            {completedLessons.length > 0 && (
                                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3">
                                    <p className="text-zinc-300 text-xs font-semibold mb-1.5">
                                        🗑 {completedLessons.length} bài sẽ bị reset:
                                    </p>
                                    <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                                        {completedLessons.map((l: any) => (
                                            <div key={l.id} className="flex items-center gap-1.5 text-xs text-zinc-300">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500/50 shrink-0" />
                                                <span className="truncate">{l.title}</span>
                                                <span className="shrink-0 text-zinc-400 ml-auto">({filteredProgress[l.id]?.totalScore}/10đ)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-4 pb-4 flex gap-2">
                            <button
                                onClick={() => setShowWarning(false)}
                                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmReset}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all active:scale-95"
                            >
                                Tôi hiểu, xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}


