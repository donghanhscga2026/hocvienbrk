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
import { ArrowLeft, ListVideo, FileText, X, ClipboardCheck, Loader2 } from "lucide-react"
import Link from "next/link"

interface CoursePlayerProps {
    course: any
    enrollment: any
    session: any
}

type MobileTab = 'list' | 'content' | 'record'

export default function CoursePlayer({ course, enrollment: initialEnrollment, session }: CoursePlayerProps) {
    const [enrollment, setEnrollment] = useState(initialEnrollment)

    // Lọc progress chỉ lấy các bài học không bị reset (lộ trình hiện tại)
    const filteredLessonProgress = enrollment.lessonProgress.filter((p: any) => {
        return p.status !== 'RESET' // Chỉ hiển thị progress chưa bị reset
    })

    const [currentLessonId, setCurrentLessonId] = useState<string>(() => {
        // Ưu tiên: lastLessonId đã lưu → bài chưa hoàn thành gần nhất → bài đầu tiên
        if (enrollment.lastLessonId) {
            return enrollment.lastLessonId
        }

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

    // Helper tự động tắt thông báo
    const notify = useCallback((text: string, type: 'loading' | 'success' | 'error' = 'success', duration = 3000) => {
        setStatusMsg({ text, type })
        if (type !== 'loading') {
            setTimeout(() => setStatusMsg(null), duration)
        }
    }, [])

    const prevMobileTabRef = useRef(mobileTab)
    const prevShowContentModalRef = useRef(showContentModal)

    // Helper function kiểm tra đúng hạn
    const checkIsOnTime = useCallback((startedAt: Date | null, lessonOrder: number): boolean => {
        if (!startedAt) return false
        const deadline = new Date(startedAt)
        deadline.setDate(deadline.getDate() + (lessonOrder - 1))
        deadline.setHours(23, 59, 59, 999)
        return new Date() <= deadline
    }, [])

    // Lưu video progress để auto-save
    const videoProgressRef = useRef<{ maxTime: number; duration: number } | null>(null)

    // JS media query — kiểm tra thiết bị client-side
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        setIsMobile(mq.matches)
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    // Auto-save draft + video progress khi chuyển tab hoặc mở danh sách bài
    useEffect(() => {
        const handleTabChange = async () => {
            const prevTab = prevMobileTabRef.current
            const currentTab = mobileTab
            const prevModal = prevShowContentModalRef.current

            // tab thay đổi HOẶC modal mở (từ false -> true)
            const tabChanged = currentTab !== prevTab
            const modalOpened = showContentModal && !prevModal

            if (tabChanged || modalOpened) {
                const currentProg = progressMap[currentLessonId!]
                const currentLessonOrder = course.lessons.find((l: any) => l.id === currentLessonId)?.order ?? 1
                const isOnTime = checkIsOnTime(new Date(enrollment.startedAt), currentLessonOrder)

                const hasFormData = currentFormData && (
                    currentFormData.reflection.trim() || 
                    currentFormData.links.some((l: string) => l.trim()) || 
                    currentFormData.supports.some((s: boolean) => s)
                )

                // Nếu đúng hạn và có dữ liệu form → kiểm tra xem có khác DB không
                if (isOnTime && hasFormData) {
                    const dbAssignment = currentProg?.assignment as any
                    const dbReflection = dbAssignment?.reflection?.trim() || ''
                    const dbLinks = dbAssignment?.links || []
                    const dbSupports = dbAssignment?.supports || []

                    const currentLinks = currentFormData.links.filter((l: string) => l.trim())
                    const dbLinksFiltered = dbLinks.map((l: any) => String(l).trim()).filter((l: string) => l)

                    const hasChanges = 
                        currentFormData.reflection.trim() !== dbReflection ||
                        JSON.stringify(currentLinks) !== JSON.stringify(dbLinksFiltered) ||
                        JSON.stringify(currentFormData.supports) !== JSON.stringify(dbSupports)

                    if (hasChanges) {
                        const currentLessonIdToUpdate = currentLessonId
                        if (currentProg?.status === 'COMPLETED') {
                            const shouldUpdate = window.confirm("Bạn có dữ liệu mới chưa cập nhật. Tự động cập nhật ngay?")
                            if (shouldUpdate) {
                                notify('Đang cập nhật bài học...', 'loading')
                                const result = await submitAssignmentAction({
                                    enrollmentId: enrollment.id,
                                    lessonId: currentLessonIdToUpdate!,
                                    reflection: currentFormData.reflection,
                                    links: currentFormData.links,
                                    supports: currentFormData.supports,
                                    isUpdate: true,
                                    lessonOrder: currentLessonOrder,
                                    startedAt: enrollment.startedAt,
                                    existingVideoScore: currentProg?.scores?.videoScore,
                                    existingTimingScore: currentProg?.scores?.timing
                                })
                                if ((result as any)?.success) {
                                    const res = result as any
                                    notify('Đã cập nhật thành công!', 'success')
                                    setProgressMap((prev: any) => ({
                                        ...prev,
                                        [currentLessonIdToUpdate!]: {
                                            ...prev[currentLessonIdToUpdate!],
                                            assignment: {
                                                reflection: currentFormData.reflection,
                                                links: currentFormData.links,
                                                supports: currentFormData.supports
                                            },
                                            status: res.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS',
                                            totalScore: res.totalScore
                                        }
                                    }))
                                    setEnrollment((prev: any) => ({
                                        ...prev,
                                        lessonProgress: prev.lessonProgress.map((p: any) => 
                                            p.lessonId === currentLessonIdToUpdate
                                                ? { ...p, assignment: { reflection: currentFormData.reflection, links: currentFormData.links, supports: currentFormData.supports }, status: res.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS', totalScore: res.totalScore }
                                                : p
                                        )
                                    }))
                                } else {
                                    notify((result as any)?.message || 'Cập nhật thất bại!', 'error')
                                }
                            }
                        } else {
                            const shouldSubmit = window.confirm("Bạn có dữ liệu chưa ghi nhận. Tự động ghi nhận ngay?")
                            if (shouldSubmit) {
                                notify('Đang chấm điểm bài học...', 'loading')
                                const result = await submitAssignmentAction({
                                    enrollmentId: enrollment.id,
                                    lessonId: currentLessonIdToUpdate!,
                                    reflection: currentFormData.reflection,
                                    links: currentFormData.links,
                                    supports: currentFormData.supports,
                                    isUpdate: false,
                                    lessonOrder: currentLessonOrder,
                                    startedAt: enrollment.startedAt,
                                    existingVideoScore: currentProg?.scores?.videoScore,
                                    existingTimingScore: currentProg?.scores?.timing
                                })
                                if ((result as any)?.success) {
                                    const res = result as any
                                    notify(`✅ Hoàn thành! Điểm: ${res.totalScore}/10`, 'success')
                                    setProgressMap((prev: any) => ({
                                        ...prev,
                                        [currentLessonIdToUpdate!]: {
                                            ...prev[currentLessonIdToUpdate!],
                                            assignment: {
                                                reflection: currentFormData.reflection,
                                                links: currentFormData.links,
                                                supports: currentFormData.supports
                                            },
                                            status: res.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS',
                                            totalScore: res.totalScore
                                        }
                                    }))
                                    setEnrollment((prev: any) => ({
                                        ...prev,
                                        lessonProgress: prev.lessonProgress.map((p: any) => 
                                            p.lessonId === currentLessonIdToUpdate
                                                ? { ...p, assignment: { reflection: currentFormData.reflection, links: currentFormData.links, supports: currentFormData.supports }, status: res.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS', totalScore: res.totalScore }
                                                : p
                                        )
                                    }))
                                } else {
                                    notify((result as any)?.message || 'Ghi nhận thất bại!', 'error')
                                }
                            }
                        }
                    }
                }

                // CHỈ lưu draft nếu chuyển từ tab 'record' sang tab 'content' (Nội dung)
                if (prevTab === 'record' && currentTab === 'content' && assignmentFormRef.current) {
                    await assignmentFormRef.current()
                }
                
                // Lưu video progress
                if (videoProgressRef.current && currentLessonId) {
                    const { maxTime, duration } = videoProgressRef.current
                    saveVideoProgressAction({
                        enrollmentId: enrollment.id,
                        lessonId: currentLessonId,
                        maxTime,
                        duration
                    })

                    // Cập nhật state local
                    setProgressMap((prev: any) => {
                        const existing = prev[currentLessonId] || {}
                        return {
                            ...prev,
                            [currentLessonId]: {
                                ...existing,
                                maxTime,
                                duration
                            }
                        }
                    })
                }
            }

            prevMobileTabRef.current = mobileTab
            prevShowContentModalRef.current = showContentModal
        }

        handleTabChange()
    }, [mobileTab, showContentModal, currentLessonId, enrollment.id, currentFormData, progressMap, course.lessons, enrollment.startedAt, checkIsOnTime, notify])

    // Lưu video progress lần cuối khi rời khỏi trang hoặc unmount (chuyển bài)
    useEffect(() => {
        const handleBeforeUnload = async () => {
            // Lưu video progress
            if (videoProgressRef.current && currentLessonId) {
                saveVideoProgressAction({
                    enrollmentId: enrollment.id,
                    lessonId: currentLessonId,
                    maxTime: videoProgressRef.current.maxTime,
                    duration: videoProgressRef.current.duration
                })
            }

            // Tự động submit nếu đúng hạn và có dữ liệu (không notify/alert ở đây vì browser chặn)
            const currentProg = progressMap[currentLessonId!]
            const currentLessonOrder = course.lessons.find((l: any) => l.id === currentLessonId)?.order ?? 1
            const isOnTime = checkIsOnTime(new Date(enrollment.startedAt), currentLessonOrder)
            
            const hasFormData = currentFormData && (
                currentFormData.reflection.trim() || 
                currentFormData.links.some((l: string) => l.trim()) || 
                currentFormData.supports.some((s: boolean) => s)
            )

            if (isOnTime && hasFormData) {
                const isUpdate = currentProg?.status === 'COMPLETED'
                submitAssignmentAction({
                    enrollmentId: enrollment.id,
                    lessonId: currentLessonId!,
                    reflection: currentFormData.reflection,
                    links: currentFormData.links,
                    supports: currentFormData.supports,
                    isUpdate,
                    lessonOrder: currentLessonOrder,
                    startedAt: enrollment.startedAt,
                    existingVideoScore: currentProg?.scores?.videoScore,
                    existingTimingScore: currentProg?.scores?.timing
                })
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        window.addEventListener('pagehide', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            window.removeEventListener('pagehide', handleBeforeUnload)
            handleBeforeUnload()
        }
    }, [currentLessonId, enrollment.id, currentFormData, progressMap, course.lessons, enrollment.startedAt, checkIsOnTime])

    // Lưu bài học hiện tại vào database khi load trang
    useEffect(() => {
        if (currentLessonId && enrollment.id) {
            updateLastLessonAction(enrollment.id, currentLessonId)
        }
    }, [currentLessonId, enrollment.id])

    // Cập nhật progressMap khi enrollment.lessonProgress thay đổi
    useEffect(() => {
        const newFilteredProgress = enrollment.lessonProgress.filter((p: any) => p.status !== 'RESET')
        const newProgressMap = newFilteredProgress.reduce((acc: any, p: any) => {
            acc[p.lessonId] = p
            return acc
        }, {})
        setProgressMap(newProgressMap)
    }, [enrollment.lessonProgress])

    const currentLesson = course.lessons.find((l: any) => l.id === currentLessonId)
    const currentProgress = progressMap[currentLessonId]
    const hasDuration = currentProgress?.duration && currentProgress.duration > 0
    const initialPercent = hasDuration && currentProgress?.maxTime
        ? (currentProgress.maxTime / currentProgress.duration) * 100
        : undefined

    const handleLessonSelect = async (lessonId: string) => {
        if (assignmentFormRef.current) {
            notify('Đang lưu nháp bài cũ...', 'loading')
            assignmentFormRef.current().then(() => setStatusMsg(null))
        }

        if (currentLessonId && videoPercent > 0 && currentProgress) {
            const maxTime = (videoPercent / 100) * (currentProgress.duration || 0)
            notify('Đang lưu tiến độ video...', 'loading')
            saveVideoProgressAction({
                enrollmentId: enrollment.id,
                lessonId: currentLessonId,
                maxTime,
                duration: currentProgress.duration || 0
            }).then(() => setStatusMsg(null))
        }

        // Tự động submit logic
        const currentProg = progressMap[currentLessonId!]
        const currentLessonOrder = currentLesson?.order ?? 1
        const isOnTime = checkIsOnTime(new Date(enrollment.startedAt), currentLessonOrder)
        const currentLessonIdToUpdate = currentLessonId
        
        const hasFormData = currentFormData && (
            currentFormData.reflection.trim() || 
            currentFormData.links.some((l: string) => l.trim()) || 
            currentFormData.supports.some((s: boolean) => s)
        )

        if (isOnTime && hasFormData) {
            const dbAssignment = currentProg?.assignment as any
            const dbReflection = dbAssignment?.reflection?.trim() || ''
            const dbLinks = dbAssignment?.links || []
            const dbSupports = dbAssignment?.supports || []
            
            const currentLinks = currentFormData.links.filter((l: string) => l.trim())
            const dbLinksFiltered = dbLinks.map((l: any) => String(l).trim()).filter((l: string) => l)
            
            const hasChanges = 
                currentFormData.reflection.trim() !== dbReflection ||
                JSON.stringify(currentLinks) !== JSON.stringify(dbLinksFiltered) ||
                JSON.stringify(currentFormData.supports) !== JSON.stringify(dbSupports)

            if (hasChanges) {
                if (currentProg?.status === 'COMPLETED') {
                    const shouldUpdate = window.confirm("Bạn có dữ liệu mới chưa cập nhật. Tự động cập nhật ngay?")
                    if (shouldUpdate) {
                        notify('Đang cập nhật bài học...', 'loading')
                        const result = await submitAssignmentAction({
                            enrollmentId: enrollment.id,
                            lessonId: currentLessonIdToUpdate!,
                            reflection: currentFormData.reflection,
                            links: currentFormData.links,
                            supports: currentFormData.supports,
                            isUpdate: true,
                            lessonOrder: currentLessonOrder,
                            startedAt: enrollment.startedAt,
                            existingVideoScore: currentProg?.scores?.videoScore,
                            existingTimingScore: currentProg?.scores?.timing
                        })
                        if ((result as any)?.success) {
                            const res = result as any
                            notify('Đã cập nhật thành công!', 'success')
                            setProgressMap((prev: any) => ({
                                ...prev,
                                [currentLessonIdToUpdate!]: {
                                    ...prev[currentLessonIdToUpdate!],
                                    assignment: {
                                        reflection: currentFormData.reflection,
                                        links: currentFormData.links,
                                        supports: currentFormData.supports
                                    },
                                    status: res.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS',
                                    totalScore: res.totalScore
                                }
                            }))
                        }
                    }
                } else {
                    const shouldSubmit = window.confirm("Bạn có dữ liệu chưa ghi nhận. Tự động ghi nhận ngay?")
                    if (shouldSubmit) {
                        notify('Đang chấm điểm bài học...', 'loading')
                        const result = await submitAssignmentAction({
                            enrollmentId: enrollment.id,
                            lessonId: currentLessonIdToUpdate!,
                            reflection: currentFormData.reflection,
                            links: currentFormData.links,
                            supports: currentFormData.supports,
                            isUpdate: false,
                            lessonOrder: currentLessonOrder,
                            startedAt: enrollment.startedAt,
                            existingVideoScore: currentProg?.scores?.videoScore,
                            existingTimingScore: currentProg?.scores?.timing
                        })
                        if ((result as any)?.success) {
                            const res = result as any
                            notify(`✅ Hoàn thành! Điểm: ${res.totalScore}/10`, 'success')
                            setProgressMap((prev: any) => ({
                                ...prev,
                                [currentLessonIdToUpdate!]: {
                                    ...prev[currentLessonIdToUpdate!],
                                    assignment: {
                                        reflection: currentFormData.reflection,
                                        links: currentFormData.links,
                                        supports: currentFormData.supports
                                    },
                                    status: res.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS',
                                    totalScore: res.totalScore
                                }
                            }))
                        }
                    }
                }
            }
        }

        setCurrentFormData(null)
        setCurrentLessonId(lessonId)
        setVideoPercent(0)
        setMobileTab('content')
        setShowContentModal(false)
        updateLastLessonAction(enrollment.id, lessonId)
    }

    const handleConfirmStartDate = async (date: Date) => {
        notify('Đang xác nhận ngày bắt đầu...', 'loading')
        await confirmStartDateAction(course.id, date)
        setEnrollment({ ...enrollment, startedAt: date })
        notify('Xác nhận thành công!', 'success')
    }

    const handleVideoProgress = useCallback(async (maxTime: number, duration: number) => {
        if (!currentLessonId || duration === 0) return
        setVideoPercent(Math.min(100, Math.round((maxTime / duration) * 100)))
        videoProgressRef.current = { maxTime, duration }
        await saveVideoProgressAction({
            enrollmentId: enrollment.id,
            lessonId: currentLessonId,
            maxTime,
            duration
        })
    }, [currentLessonId, enrollment.id])

    const handleSubmitAssignment = async (data: any, isUpdate: boolean = false) => {
        notify(isUpdate ? 'Đang cập nhật bài học...' : 'Đang chấm điểm...', 'loading')
        const result = await submitAssignmentAction({
            enrollmentId: enrollment.id,
            lessonId: currentLessonId!,
            ...data,
            isUpdate,
            lessonOrder: currentLesson?.order,
            startedAt: enrollment.startedAt,
            existingVideoScore: currentProgress?.scores?.videoScore,
            existingTimingScore: currentProgress?.scores?.timing
        })
        
        if (!(result as any)?.success) {
            notify((result as any)?.message || 'Lỗi xử lý dữ liệu!', 'error')
            return
        }

        const res = result as any
        const updatedProgress = {
            ...(progressMap[currentLessonId!] || {}),
            assignment: data,
            status: res.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS',
            totalScore: res.totalScore
        }
        setProgressMap(prev => ({ ...prev, [currentLessonId!]: updatedProgress }))

        if (res.totalScore >= 5) {
            notify(`✅ Thành công! Điểm: ${res.totalScore}/10`, 'success')
            if (!isUpdate) {
                const currentIndex = course.lessons.findIndex((l: any) => l.id === currentLessonId)
                const isLast = currentIndex === course.lessons.length - 1
                const nextId = isLast ? course.lessons[0].id : course.lessons[currentIndex + 1].id
                setTimeout(() => {
                    setCurrentLessonId(nextId)
                    setVideoPercent(0)
                    setMobileTab('content')
                }, 1500)
            }
        } else {
            notify(`📊 Đã ghi nhận: ${res.totalScore}/10đ. Cần ≥5đ`, 'success')
        }
    }

    const handleResetStartDate = async (date: Date) => {
        await confirmStartDateAction(course.id, date)
        const now = new Date()
        const newLessonProgress = enrollment.lessonProgress.filter((p: any) => p.status !== 'RESET')
        setEnrollment((prev: any) => ({
            ...prev,
            startedAt: date,
            resetAt: now,
            lessonProgress: newLessonProgress
        }))
        setCurrentLessonId(course.lessons[0]?.id)
    }

    const completedCount = Object.values(progressMap).filter((p: any) => p.status === 'COMPLETED').length
    const startedAt = enrollment.startedAt ? new Date(enrollment.startedAt) : null

    return (
        <div className="flex flex-col h-full">
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

            <div className={`flex flex-1 min-h-0 text-zinc-300 pt-14 ${isMobile ? 'pb-14' : ''}`}>
                {!isMobile && (
                    <LessonSidebar
                        lessons={course.lessons}
                        currentLessonId={currentLessonId}
                        onLessonSelect={handleLessonSelect}
                        progress={progressMap}
                        startedAt={startedAt}
                        resetAt={enrollment.resetAt}
                        onResetStartDate={handleResetStartDate}
                    />
                )}

                <div key="center-col" className="flex-1 flex flex-col min-h-0 bg-zinc-950 overflow-hidden items-center">
                    <div className={isMobile ? 'shrink-0 w-full bg-black' : 'p-5 pb-0 shrink-0 w-full max-w-5xl mx-auto'}>
                        <div className={isMobile ? '' : 'rounded-2xl overflow-hidden border-2 border-white shadow-2xl bg-black'}>
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
                    </div>

                    {!isMobile && (
                        <div className="p-5 flex-1 flex flex-col gap-4 min-h-0 overflow-hidden w-full max-w-5xl mx-auto">
                            <div className="shrink-0">
                                <h2 className="text-lg font-bold text-white">{currentLesson?.title}</h2>
                                {currentLesson?.content && (() => {
                                    const c = currentLesson.content
                                    if (c.includes('docs.google.com')) return null
                                    if (c.startsWith('http')) return (
                                        <a href={c} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 text-sm mt-1 break-all underline block">{c}</a>
                                    )
                                    return <p className="text-zinc-400 mt-1 text-sm leading-relaxed break-words line-clamp-2 hover:line-clamp-none transition-all cursor-default" title={c}>{c}</p>
                                })()}
                            </div>
                            <div className="flex-1 min-h-0 border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden">
                                <ChatSection lessonId={currentLessonId!} session={session} />
                            </div>
                        </div>
                    )}

                    {isMobile && (
                        <>
                            <div className="flex-1 min-h-0 w-full">
                                {mobileTab === 'list' && (
                                    <div className="h-full overflow-y-auto overscroll-contain">
                                        <LessonSidebarMobile
                                            lessons={course.lessons}
                                            currentLessonId={currentLessonId}
                                            onLessonSelect={handleLessonSelect}
                                            progress={progressMap}
                                            startedAt={startedAt}
                                            resetAt={enrollment.resetAt}
                                            onResetStartDate={handleResetStartDate}
                                        />
                                    </div>
                                )}

                                {mobileTab === 'content' && (
                                    <div className="flex flex-col h-full min-h-0">
                                        <div className="shrink-0 px-4 py-5 bg-zinc-900 border-b border-zinc-800">
                                            <p className="text-base font-bold text-white leading-snug">{currentLesson?.title}</p>
                                            {currentLesson?.content && (
                                                <div className="mt-3">
                                                    <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{currentLesson.content}</p>
                                                    <button onClick={() => setShowContentModal(true)} className="text-sm text-orange-400 hover:text-orange-300 transition-colors mt-2">Xem thêm →</button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-h-0 overflow-hidden">
                                            <ChatSection lessonId={currentLessonId!} session={session} />
                                        </div>
                                    </div>
                                )}

                                {mobileTab === 'record' && (
                                    <div className="flex flex-col h-full min-h-0">
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
                                                const targetId = currentLessonId
                                                setCurrentFormData(draftData)
                                                setProgressMap(prev => ({
                                                    ...prev,
                                                    [targetId!]: { ...prev[targetId!], assignment: { ...prev[targetId!]?.assignment, ...draftData } }
                                                }))
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <nav className="shrink-0 h-14 bg-zinc-900 border-t border-zinc-800 flex items-stretch fixed bottom-0 left-0 right-0 z-50">
                                {[
                                    { id: 'list', icon: ListVideo, label: 'Danh sách' },
                                    { id: 'content', icon: FileText, label: 'Nội dung' },
                                    { id: 'record', icon: ClipboardCheck, label: 'Ghi nhận' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setMobileTab(tab.id as MobileTab)}
                                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${mobileTab === tab.id ? 'text-orange-400 border-t-2 border-orange-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        <tab.icon className="w-5 h-5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </>
                    )}
                </div>

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
                                const targetId = currentLessonId
                                setProgressMap(prev => ({
                                    ...prev,
                                    [targetId!]: { ...prev[targetId!], assignment: { ...prev[targetId!]?.assignment, ...draftData } }
                                }))
                            }}
                        />
                    </div>
                )}
            </div>

            {showContentModal && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowContentModal(false)}>
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-700 max-w-lg w-full max-h-[75vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
                            <h2 className="text-white font-bold text-sm leading-snug pr-4">{currentLesson?.title}</h2>
                            <button onClick={() => setShowContentModal(false)} className="shrink-0 text-zinc-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="overflow-y-auto px-5 py-4">
                            <p className="text-zinc-300 text-sm leading-relaxed">{currentLesson?.content}</p>
                        </div>
                    </div>
                </div>
            )}

            <StartDateModal isOpen={!enrollment.startedAt} onConfirm={handleConfirmStartDate} />
        </div>
    )
}

// ── LessonSidebar Mobile ──
function isLessonUnlockedMobile(lesson: any, lessons: any[], progress: Record<string, any>) {
    if (lesson.order === 1) return true
    const prev = lessons.find((l: any) => l.order === lesson.order - 1)
    if (!prev) return true
    const p = progress[prev.id]
    return p?.status === 'COMPLETED' && (p?.totalScore ?? 0) >= 5
}

function LessonBtn({ lesson, prog, isActive, unlocked, onLessonSelect }: any) {
    const isCompletedLesson = prog?.status === 'COMPLETED'
    return (
        <button
            onClick={() => unlocked && onLessonSelect(lesson.id)}
            disabled={!unlocked}
            className={cn('w-full flex items-center gap-2.5 px-4 py-2 text-left border-b border-zinc-800/50 transition-colors', isActive && 'bg-zinc-800 border-l-2 border-l-orange-500', unlocked && !isActive && 'hover:bg-zinc-800/50', !unlocked && 'opacity-40 cursor-not-allowed')}
        >
            <div className="shrink-0">
                {isCompletedLesson ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : isActive ? <PlayCircle className="w-4 h-4 text-orange-400" /> : !unlocked ? <Lock className="w-3.5 h-3.5 text-zinc-600" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-700 flex items-center justify-center text-[9px] text-zinc-500">{lesson.order}</div>}
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn('text-sm leading-snug', isActive ? 'text-white font-medium' : 'text-zinc-400')}>{lesson.title}</p>
                {prog?.totalScore !== undefined && <span className={cn('text-[10px] font-bold', prog.totalScore >= 5 ? 'text-emerald-500' : 'text-orange-400')}>{prog.totalScore >= 5 ? '✓' : '✗'} {prog.totalScore}/10đ</span>}
            </div>
        </button>
    )
}

function LessonSidebarMobile({ lessons, currentLessonId, onLessonSelect, progress, startedAt, resetAt, onResetStartDate }: any) {
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [dateInput, setDateInput] = useState(startedAt ? new Date(startedAt).toISOString().slice(0, 10) : '')
    const [saving, setSaving] = useState(false)
    const filteredProgress = Object.entries(progress).reduce((acc: any, [lessonId, p]: [string, any]) => { if (p.status !== 'RESET') acc[lessonId] = p; return acc }, {})
    const handleReset = async () => {
        if (!dateInput) return
        if (!window.confirm("⚠️ Cảnh báo: Dữ liệu học tập cũ sẽ không được tính vào lộ trình mới.\n\nNhấn OK để xác nhận.")) return
        setSaving(true)
        try { await onResetStartDate(new Date(dateInput)); setShowDatePicker(false) } finally { setSaving(false) }
    }
    const completedCount = lessons.filter((l: any) => filteredProgress[l.id]?.status === 'COMPLETED').length
    return (
        <div className="flex flex-col h-full w-full bg-zinc-900 overflow-hidden">
            <div className="shrink-0">
                <div className="px-4 py-2.5 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-orange-400 shrink-0" />
                            <span className="text-xs text-zinc-400">Bắt đầu:</span>
                            <span className="text-xs font-semibold text-white">{startedAt ? new Date(startedAt).toLocaleDateString('vi-VN') : '--/--/----'}</span>
                        </div>
                        <button onClick={() => setShowDatePicker(!showDatePicker)} className="flex items-center gap-1 text-[11px] text-orange-400 border border-orange-500/40 rounded-lg px-2 py-0.5 shrink-0"><RefreshCw className="w-3 h-3" /> Đặt lại</button>
                    </div>
                    {showDatePicker && (
                        <div className="bg-zinc-800 rounded-lg p-2.5 space-y-2 border border-zinc-700 mt-2">
                            <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-1.5 border border-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                            <div className="flex gap-2"><button onClick={handleReset} disabled={!dateInput || saving} className="flex-1 text-xs font-bold bg-orange-500 text-white rounded-lg py-1.5 disabled:opacity-50">{saving ? 'Đang lưu...' : 'Xác nhận'}</button><button onClick={() => setShowDatePicker(false)} className="flex-1 text-xs text-zinc-400 border border-zinc-600 rounded-lg py-1.5">Hủy</button></div>
                        </div>
                    )}
                </div>
                <div className="px-4 py-1.5 border-b border-zinc-800 flex items-center justify-between">
                    <h2 className="font-bold text-xs text-zinc-400 uppercase tracking-wide">Nội dung</h2>
                    <span className="text-[11px] font-semibold text-emerald-400">{completedCount}/{lessons.length} bài</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">
                {lessons.map((lesson: any) => {
                    const prog = filteredProgress[lesson.id]
                    const isActive = currentLessonId === lesson.id
                    const unlocked = isLessonUnlockedMobile(lesson, lessons, filteredProgress)
                    return <LessonBtn key={lesson.id} lesson={lesson} prog={prog} isActive={isActive} unlocked={unlocked} onLessonSelect={onLessonSelect} />
                })}
            </div>
        </div>
    )
}

// Re-import standard LessonSidebar utils if needed or keep inline
import { CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
