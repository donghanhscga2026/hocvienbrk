'use client'

import { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2, Info, X, Send } from "lucide-react"
import { saveAssignmentDraftAction } from '@/app/actions/course-actions'

interface AssignmentFormProps {
    lessonId: string
    lessonOrder: number
    startedAt: Date | null
    videoPercent: number
    videoUrl: string | null
    onSubmit: (data: any, isUpdate?: boolean) => Promise<{ success: boolean; totalScore: number } | void>
    initialData?: any
    onSaveDraft?: React.MutableRefObject<(() => Promise<void>) | undefined>
    onDraftSaved?: (draftInfo: any) => void
    onFormDataChange?: (data: { reflection: string; links: string[]; supports: boolean[] }) => void
}

function formatDate(date: Date | null) {
    if (!date) return '--/--/----'
    return new Date(date).toLocaleDateString('vi-VN')
}

function calcDeadline(startedAt: Date | null, order: number) {
    if (!startedAt) return null
    const d = new Date(startedAt)
    d.setDate(d.getDate() + (order - 1))
    return d
}

// ─── Popup Quy tắc ─────────────────────────────────────────────────────────
function RulesModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-brk-surface/50" onClick={onClose}>
            <div
                className="mt-16 mr-2 w-80 bg-brk-surface rounded-xl shadow-xl border border-brk-accent/20 text-sm text-brk-on-surface overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-brk-accent text-brk-on-primary px-4 py-3 flex items-center justify-between">
                    <span className="font-bold text-base">📋 Quy tắc chấm điểm (Thang 10)</span>
                    <button onClick={onClose}><X className="w-4 h-4" /></button>
                </div>
                <div className="p-4 space-y-3">
                    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                        <p className="text-brk-accent text-xs font-semibold">✅ Điểm ≥ 5/10: Hoàn thành bài học và mở khóa bài tiếp theo.</p>
                    </div>
                    <div>
                        <p className="font-bold text-brk-accent">1. Học theo Video (Max 2đ)</p>
                        <p className="text-brk-muted mt-1">Xem &gt;50% <span className="text-brk-accent">(+1đ)</span>, Xem hết <span className="text-brk-accent">(+2đ)</span>.</p>
                    </div>
                    <div>
                        <p className="font-bold text-brk-accent">2. Bài tập/Bài học theo yêu cầu (Max 2đ)</p>
                        <p className="text-brk-muted mt-1">Có chia sẻ <span className="text-brk-accent">(+1đ)</span>, Sâu sắc (dài hơn 50 ký tự) <span className="text-brk-accent">(+1đ)</span>.</p>
                    </div>
                    <div>
                        <p className="font-bold text-brk-accent">3. Thực hành nộp link video (Max 3đ)</p>
                        <p className="text-brk-muted mt-1">Mỗi link video <span className="text-brk-accent">(+1đ)</span>.</p>
                    </div>
                    <div>
                        <p className="font-bold text-brk-accent">4. Hỗ trợ (Max 2đ)</p>
                        <p className="text-brk-muted mt-1">
                            Giúp người: Nhắc 2 đồng đội mình nhận hỗ trợ <span className="text-brk-accent">(+1đ)</span>.<br />
                            Giúp người giúp người: Đồng đội mình nhắc 2 người họ nhận hỗ trợ <span className="text-brk-accent">(+1đ)</span>.<br />
                            <span className="text-brk-muted text-xs">Nếu chưa có người để hỗ trợ: Nhắc ngược lên trên được tích vào ô đầu (+1đ).</span>
                        </p>
                    </div>
                    <div>
                        <p className="font-bold text-brk-accent">5. Giữ tín đúng hạn (1đ)</p>
                        <p className="text-brk-muted mt-1">
                            Nộp trước 23:59 <span className="text-brk-accent">(+1đ)</span>.<br />
                            <span className="text-brk-accent">Trừ điểm: Nộp muộn sau 23:59 (-1đ).</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SectionHead({ num, label, max, current }: { num: number; label: string; max: number; current: number }) {
    return (
        <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-brk-on-surface text-sm">{num}. {label}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${current > 0 ? 'bg-brk-accent-20 text-brk-accent' : 'bg-brk-background text-brk-muted'}`}>
                {current}/{max}
            </span>
        </div>
    )
}

function AssignmentForm({
    lessonId,
    lessonOrder,
    startedAt,
    videoPercent = 0,
    videoUrl = null,
    onSubmit,
    initialData,
    onSaveDraft,
    onDraftSaved,
    onFormDataChange,
}: AssignmentFormProps) {
    const [loading, setLoading] = useState(false)
    const [showRules, setShowRules] = useState(false)
    const [reflection, setReflection] = useState<string>(initialData?.assignment?.reflection || "")
    const [links, setLinks] = useState<string[]>(
        initialData?.assignment?.links?.length > 0
            ? [...initialData.assignment.links, "", "", ""].slice(0, 3)
            : ["", "", ""]
    )
    const [supports, setSupports] = useState<boolean[]>(initialData?.assignment?.supports || [false, false])
    // [EXPAND] Ô "Bồi Nhân": chỉ mở rộng khi BẤM/CHẠM vào ô để nhập liệu
    // (focus) — không tự bật khi chỉ rê chuột ngang qua, mất focus thì thu lại.
    const [reflectionFocused, setReflectionFocused] = useState(false)
    const reflectionExpanded = reflectionFocused
    const reflectionTextareaRef = useRef<HTMLTextAreaElement>(null)
    const closeReflectionExpand = useCallback(() => {
        reflectionTextareaRef.current?.blur()
        setReflectionFocused(false)
    }, [])

    // Refs
    const isDirtyRef = useRef(false)
    const initialRenderRef = useRef(true)

    const deadline = calcDeadline(startedAt, lessonOrder)
    const isCompleted = initialData?.status === 'COMPLETED'
    const existingTotalScore = initialData?.totalScore ?? 0
    const existingScores = initialData?.scores ?? {}

    const saveDraft = useCallback(async () => {
        if (isCompleted) return

        const hasData = reflection.trim() || links.some(l => l.trim()) || supports.some(s => s)
        if (hasData) {
            const draftData = { reflection, links, supports }

            try {
                await saveAssignmentDraftAction({
                    enrollmentId: initialData?.enrollmentId,
                    lessonId,
                    ...draftData
                })
                if (onDraftSaved) onDraftSaved(draftData)
                isDirtyRef.current = false
            } catch (error) {
                console.error('Failed to save draft:', error)
            }
        }
    }, [reflection, links, supports, lessonId, initialData?.enrollmentId, onDraftSaved, isCompleted])

    // Track thay đổi để bật flag isDirty
    useEffect(() => {
        if (initialRenderRef.current) {
            initialRenderRef.current = false
            return
        }
        isDirtyRef.current = true
        if (onFormDataChange) {
            onFormDataChange({ reflection, links, supports })
        }
    }, [reflection, links, supports, onFormDataChange])

    // Đăng ký ref để parent ép lưu draft
    useEffect(() => {
        if (onSaveDraft) {
            onSaveDraft.current = async () => {
                if (isDirtyRef.current) {
                    await saveDraft()
                    isDirtyRef.current = false
                }
            }
        }
    }, [onSaveDraft, saveDraft])

    // Lưu draft khi rời trang
    useEffect(() => {
        if (isCompleted) return
        const handleBeforeUnload = () => {
            if (isDirtyRef.current) saveDraft()
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        window.addEventListener('pagehide', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            window.removeEventListener('pagehide', handleBeforeUnload)
        }
    }, [saveDraft, isCompleted])

    // Realtime scoring
    // Rule: Nếu không có link video YouTube -> mặc định 2đ video
    const hasYouTubeVideo = !!videoUrl && /youtu\.be\/|youtube\.com\/|v=|live\//.test(videoUrl)
    const displayPercent = hasYouTubeVideo ? videoPercent : 100

    const vidScore = useMemo(() => {
        if (!hasYouTubeVideo) return 2 // Không có video -> auto 2đ
        if (videoPercent >= 95) return 2
        if (videoPercent >= 50) return 1
        return 0
    }, [videoPercent, hasYouTubeVideo])

    const refScore = useMemo(() => {
        if (reflection.trim().length >= 86) return 2 // Mentor 7 yêu cầu 86 ký tự cho bài học tâm đắc ngộ
        if (reflection.trim().length > 0) return 1
        return 0
    }, [reflection])

    const validLinksCount = useMemo(() => links.filter(l => l.trim().length > 0).length, [links])
    const pracScore = useMemo(() => Math.min(validLinksCount, 3), [validLinksCount])
    const supportScore = useMemo(() => supports.filter(Boolean).length, [supports])

    const currentTimingScore = useMemo(() => {
        if (!deadline) return 0
        const dl = new Date(deadline)
        dl.setHours(23, 59, 59, 999)
        const isNowOnTime = new Date().getTime() <= dl.getTime()

        if (isCompleted) {
            // Nếu đã xong: 
            // - Nếu bây giờ vẫn trong hạn -> auto +1 (để gỡ điểm trễ)
            // - Nếu bây giờ quá hạn -> giữ nguyên điểm cũ (bảo vệ điểm đúng hạn)
            if (isNowOnTime) return 1
            return existingScores.timing ?? -1
        }

        return isNowOnTime ? 1 : -1
    }, [deadline, isCompleted, existingScores.timing])

    const total = Math.max(0, vidScore + refScore + pracScore + supportScore + currentTimingScore)

    const isOverdue = currentTimingScore === -1 && !isCompleted // Chỉ coi là trễ nếu chưa xong bài và hết hạn

    const handleSubmit = async () => {
        if (!startedAt) { alert("Bạn chưa xác nhận ngày bắt đầu lộ trình!"); return }
        if (isCompleted && isOverdue) {
            alert("Bài học đã nộp trễ hạn. Không thể cập nhật.")
            return
        }

        const isUpdate = isCompleted
        setLoading(true)
        try {
            const result = await onSubmit({
                reflection,
                links,
                supports,
            }, isUpdate)

            if (result?.success) {
                isDirtyRef.current = false
                if (onFormDataChange && !isUpdate) {
                    onFormDataChange({ reflection: '', links: ['', '', ''], supports: [false, false] })
                }
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full min-h-0 bg-[#FFFDE7]">
            {showRules && <RulesModal onClose={() => setShowRules(false)} />}

            <div className="shrink-0 z-10 bg-brk-primary/10 border-b border-brk-accent/20 px-4 py-2">
                <div className="flex items-center justify-between">
                    <p className="text-[11px] text-brk-muted leading-tight" suppressHydrationWarning>
                        Hoàn thành trước 23:59 ngày <span className="font-semibold text-brk-on-surface" suppressHydrationWarning>{formatDate(deadline)}</span>
                    </p>
                    <span className="text-sm font-black text-brk-accent">Tổng: {total}/10</span>
                </div>

                <div className="flex gap-1.5 mt-1.5">
                    {!(isCompleted && isOverdue) && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-brk-accent hover:brightness-110 active:scale-[0.98] text-brk-on-primary font-black rounded-xl py-2 transition-all shadow-md disabled:opacity-60 text-sm"
                        >
                            {loading
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <><Send className="w-3.5 h-3.5" /> {isCompleted ? 'Cập nhật' : 'Ghi nhận kết quả'}</>
                            }
                        </button>
                    )}
                    {isCompleted && isOverdue && (
                        <div className="flex-1 flex items-center justify-center gap-1.5 bg-brk-background text-brk-muted font-black rounded-xl py-2 text-sm">
                            Đã hoàn thành cập nhật
                        </div>
                    )}
                    <button
                        onClick={() => setShowRules(true)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl border transition text-xs font-semibold"
                        style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#f97316', borderColor: 'rgba(249,115,22,0.3)' }}
                        title="Xem quy tắc chấm điểm"
                    >
                        <Info className="w-3.5 h-3.5" /> Quy tắc
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 p-3">
                <div className="bg-brk-surface rounded-xl border border-brk-outline px-3 py-2.5 shadow-sm">
                    <SectionHead num={1} label={hasYouTubeVideo ? "Mở Trí = học theo Video (2đ)" : "Mở Trí = Nội dung bài học (2đ)"} max={2} current={vidScore} />
                    <div className="h-1.5 bg-brk-background rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${!hasYouTubeVideo ? 'bg-brk-accent' : 'bg-brk-accent'}`}
                            style={{ width: `${displayPercent}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-brk-muted mt-0.5">
                        {hasYouTubeVideo
                            ? `Đang xem: ${videoPercent.toFixed(0)}%`
                            : '✓ Không có video - Đã hoàn thành nội dung'}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
                    <SectionHead num={2} label="Bồi Nhân = Bài tập/Bài học theo yêu cầu (2đ)" max={2} current={refScore} />
                    {/* [FIX] "relative" giờ chỉ bọc riêng khối bên dưới tiêu đề (không
                        còn ôm chung với SectionHead ở trên) — top:0 của ô mở rộng vì vậy
                        rơi đúng ngay dưới tiêu đề mục 2, không còn che mất chữ tiêu đề
                        như trước. Chiều cao ô mở rộng tăng gấp đôi (max-h-[100vh]). */}
                    <div className="relative">
                        {reflectionExpanded && (
                            <div
                                className="fixed inset-0 z-40 bg-black/50"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={closeReflectionExpand}
                            />
                        )}
                        <div
                            className={reflectionExpanded
                                ? 'absolute inset-x-0 top-0 z-50 max-h-[100vh] overflow-y-auto'
                                : ''
                            }
                        >
                            {reflectionExpanded && (
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={closeReflectionExpand}
                                    className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" /> ĐÓNG
                                </button>
                            )}
                            <textarea
                                ref={reflectionTextareaRef}
                                value={reflection}
                                onChange={e => setReflection(e.target.value)}
                                onFocus={() => setReflectionFocused(true)}
                                onBlur={() => setReflectionFocused(false)}
                                placeholder="Đây là nơi ghi lại nội dung theo yêu cầu trong bài tập hoặc có thể chia sẻ bài học tâm đắc ngộ của bạn..."
                                rows={3}
                                className={reflectionExpanded
                                    ? 'w-full bg-white text-base text-gray-800 border border-gray-200 rounded-lg p-3 pt-12 shadow-2xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-300 text-justify'
                                    : 'w-full bg-white text-base text-gray-800 border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-300 text-justify'
                                }
                                style={reflectionExpanded ? { minHeight: '320px' } : undefined}
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{reflection.length} ký tự {reflection.length >= 86 ? '✓ Sâu sắc' : '(cần ≥ 86 để đạt max)'}</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
                    <SectionHead num={3} label="Hành Lễ = Link thực hành mỗi ngày (3đ)" max={3} current={pracScore} />
                    <div className="flex flex-col gap-1.5">
                        {links.map((link, i) => (
                            <input
                                key={i}
                                type="url"
                                value={link}
                                onChange={e => {
                                    const next = [...links]
                                    next[i] = e.target.value
                                    setLinks(next)
                                }}
                                placeholder={`link video hoặc link bài tập ${i + 1}`}
                                className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-300"
                            />
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
                    <SectionHead num={4} label="Trọng Nghĩa = hỗ trợ đồng đội (2đ)" max={2} current={supportScore} />
                    <div className="flex flex-col gap-1.5">
                        {[
                            'Giúp người (+1đ)',
                            'Giúp người giúp người (+1đ)'
                        ].map((label, i) => (
                            <label key={i} className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={supports[i]}
                                    onChange={e => {
                                        const next = [...supports]
                                        next[i] = e.target.checked
                                        setSupports(next)
                                    }}
                                    className="w-4 h-4 accent-orange-500 cursor-pointer"
                                />
                                <span className={`text-sm ${supports[i] ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>
                                    {label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
                    <SectionHead num={5} label="Giữ Tín = Làm đúng hạn (1đ)" max={1} current={currentTimingScore === 1 ? 1 : 0} />
                    <div className="flex flex-col gap-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Đúng hạn (Trước 23:59):</span>
                            <span className="text-green-600 font-bold">+1đ</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Muộn (Sau 23:59):</span>
                            <span className="text-red-500 font-bold">-1đ</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">* Hệ thống tự động ghi nhận theo thời gian thực.</p>
                </div>

                <div className="h-2" />
            </div>
        </div>
    )
}

export default memo(AssignmentForm)
