
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { surveyQuestions } from '@/lib/survey-data'
import { saveSurveyResultAction } from '@/app/actions/survey-actions'
import { getActiveSurvey, getCoursesForBuilder } from '@/app/actions/roadmap-actions'
import { notify } from '@/lib/notifications-client'
import { Target, CheckCircle2, ChevronRight, Loader2, ArrowLeft, Play, Send, Sparkles, BookOpen } from 'lucide-react'

function AdviceModal({ videoUrl, onClose }: { videoUrl?: string, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 w-full max-w-xl rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                <div className="aspect-video bg-black relative flex items-center justify-center group cursor-pointer" onClick={() => videoUrl && window.open(videoUrl, '_blank')}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <Play className="w-16 h-16 text-yellow-400 fill-current group-hover:scale-110 transition-transform" />
                    <p className="absolute bottom-4 left-6 text-white font-black uppercase tracking-widest text-xs">{videoUrl ? 'Bấm để xem video tư vấn' : 'Video tư vấn lộ trình BRK'}</p>
                </div>
                <div className="p-8 space-y-4">
                    <h3 className="text-2xl font-black text-white uppercase">Cố vấn định hướng</h3>
                    <p className="text-gray-400 text-sm leading-relaxed font-medium">Chúng tôi hiểu bạn đang phân vân. Nội dung tư vấn này sẽ giúp bạn hiểu rõ từng hướng đi tại Học viện.</p>
                    <button onClick={onClose} className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-yellow-500 transition-all active:scale-95">Tôi đã hiểu - Quay lại chọn</button>
                </div>
            </div>
        </div>
    )
}

export default function Zero2HeroSurvey({ onComplete }: { onComplete?: () => void }) {
    const router = useRouter()
    
    // States
    const [flow, setFlow] = useState<any>(null)
    const [allCourses, setAllCourses] = useState<any[]>([])
    const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const [currentStep, setCurrentStep] = useState('q1')
    const [history, setHistory] = useState<any[]>([])
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [identifiedCourseIds, setIdentifiedCourseIds] = useState<number[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [showAdvice, setShowAdvice] = useState<string | null>(null)

    const [input1, setInput1] = useState('')
    const [input2, setInput2] = useState('')
    const [freeText, setFreeText] = useState('')
    const [moneyGoal, setMoneyGoal] = useState('3.000.000')
    const [videoPerDay, setVideoPerDay] = useState('1')
    const [days, setDays] = useState('30')
    const [livePerDay, setLivePerDay] = useState('60')
    const [liveDays, setLiveDays] = useState('30')
    const [targetVal, setTargetVal] = useState('1000')

    // Tải bài khảo sát
    useEffect(() => {
        const init = async () => {
            try {
                setIsLoading(true)
                const [flowData, courses] = await Promise.all([getActiveSurvey(), getCoursesForBuilder()])
                const data = flowData as any
                setAllCourses(courses)
                
                if (data && data.nodes && Array.isArray(data.nodes)) {
                    setFlow(data)
                    const targetIds = new Set(data.edges?.map((e: any) => e.target) || [])
                    let startNode = data.nodes.find((n: any) => n.type === 'questionNode' && !targetIds.has(n.id))
                    if (!startNode) startNode = data.nodes.find((n: any) => n.type === 'questionNode')
                    if (startNode) {
                        setCurrentNodeId(startNode.id)
                        findInitialCourses(data, startNode.id)
                    }
                }
            } catch (err) {
                console.error(err)
            } finally {
                setIsLoading(false)
            }
        }
        init()
    }, [])

    const findInitialCourses = (data: any, sid: string) => {
        if (!data || !data.edges || !data.nodes) return
        const newIds: number[] = []
        const courseNames: string[] = []
        const traverse = (currentId: string) => {
            const outEdges = data.edges.filter((e: any) => e.source === currentId)
            for (const edge of outEdges) {
                const target = data.nodes.find((n: any) => n.id === edge.target)
                if (target?.type === 'courseNode' && target.data?.courseId) {
                    const cid = Number(target.data.courseId)
                    if (!newIds.includes(cid)) {
                        newIds.push(cid)
                        courseNames.push(target.data.courseName || `Khóa #${cid}`)
                    }
                    traverse(target.id)
                }
            }
        }
        traverse(sid)
        if (newIds.length > 0) {
            setIdentifiedCourseIds(newIds)
            notify(`Đã xác định: ${courseNames.join(', ')}`)
        }
    }

    const findAndAddCourses = (sourceId: string) => {
        if (!flow || !flow.edges || !flow.nodes) return
        const newIds: number[] = []
        const courseNames: string[] = []
        const traverse = (sid: string) => {
            const outEdges = flow.edges.filter((e: any) => e.source === sid)
            for (const edge of outEdges) {
                const target = flow.nodes.find((n: any) => n.id === edge.target)
                if (target?.type === 'courseNode' && target.data?.courseId) {
                    const cid = Number(target.data.courseId)
                    if (!identifiedCourseIds.includes(cid) && !newIds.includes(cid)) {
                        newIds.push(cid)
                        courseNames.push(target.data.courseName || `Khóa #${cid}`)
                    }
                    traverse(target.id)
                }
            }
        }
        traverse(sourceId)
        if (newIds.length > 0) {
            setIdentifiedCourseIds(prev => [...prev, ...newIds])
            notify(`Đã xác định: ${courseNames.join(', ')}`)
        }
    }

    const getActiveQuestion = () => {
        if (flow && currentNodeId && Array.isArray(flow.nodes)) {
            const node = flow.nodes.find((n: any) => n.id === currentNodeId)
            if (node) {
                const options = Array.isArray(flow.edges) ? flow.edges
                    .filter((e: any) => e.source === currentNodeId)
                    .map((edge: any) => {
                        const optNode = flow.nodes.find((n: any) => n.id === edge.target)
                        return { id: optNode?.id, label: optNode?.data?.label, type: optNode?.type }
                    })
                    .filter((o: any) => o.id && o.type === 'optionNode') : []
                return { id: node.id, question: node.data?.label, type: node.data?.type || 'CHOICE', options, isDynamic: true, description: node.data?.description }
            }
        }
        const staticQ = (surveyQuestions as any)[currentStep] || {}
        return { ...staticQ, id: currentStep, isDynamic: false }
    }

    const currentQuestion = getActiveQuestion()

    const handleBack = () => {
        if (history.length > 0) {
            const prevHistory = [...history]
            const lastStep = prevHistory.pop()
            setHistory(prevHistory)
            
            if (lastStep.isDynamic) {
                setCurrentNodeId(lastStep.id)
                setIdentifiedCourseIds(lastStep.courses || [])
            } else {
                setCurrentStep(lastStep.id)
            }
            
            const newAnswers = { ...answers }
            delete newAnswers[currentQuestion.id]
            setAnswers(newAnswers)
        }
    }

    const handleNext = async (optionId: string, label: string) => {
        const newAnswers: Record<string, any> = { ...answers, [currentQuestion.id]: label }
        if (currentQuestion.type === 'INPUT_ACCOUNT') {
            newAnswers[`${currentQuestion.id}_name`] = input1
            newAnswers[`${currentQuestion.id}_id`] = input2
            newAnswers[`${currentQuestion.id}_status`] = label
        }
        if (currentQuestion.type === 'INPUT_GOAL') {
            newAnswers['goal_config'] = { 
                videoPerDay, 
                days, 
                targetVal, 
                moneyGoal, 
                livePerDay, 
                liveDays,
                isSelling: Object.values(answers).some(val => String(val).toLowerCase().includes('bán hàng')),
                isLivestream: Object.values(answers).some(val => String(val).toLowerCase().includes('livestream'))
            }
        }
        setAnswers(newAnswers)

        if (currentQuestion.isDynamic && flow) {
            // Xác định node bắt đầu để tìm kiếm các node tiếp theo (courses, questions, v.v.)
            // Đối với CHOICE, INPUT_ACCOUNT, nó bắt đầu từ Option được chọn
            // Đối với FREE_TEXT, INPUT_GOAL, nó bắt đầu từ chính node Câu hỏi hiện tại
            const startId = (currentQuestion.type === 'INPUT_GOAL' || currentQuestion.type === 'FREE_TEXT') ? currentNodeId : optionId
            
            findAndAddCourses(startId!)

            const findNextNode = (sid: string): any => {
                const outEdges = Array.isArray(flow.edges) ? flow.edges.filter((e: any) => e.source === sid) : []
                for (const edge of outEdges) {
                    const target = flow.nodes.find((n: any) => n.id === edge.target)
                    if (!target) continue
                    if (target.type === 'questionNode' || target.type === 'adviceNode' || target.type === 'finishNode') return target
                    if (target.type === 'courseNode' || target.type === 'optionNode') {
                        const next = findNextNode(target.id)
                        if (next) return next
                    }
                }
                return null
            }

            const nextNode = findNextNode(startId!)

            if (nextNode) {
                // Nếu là Đích đến (FinishNode)
                if (nextNode.type === 'finishNode') {
                    // Nếu Đích đến yêu cầu Form Cam kết (INPUT_GOAL)
                    if (nextNode.data?.type === 'INPUT_GOAL') {
                        setHistory([...history, { id: currentNodeId, isDynamic: true, courses: [...identifiedCourseIds] }])
                        setCurrentNodeId(nextNode.id) // Chuyển sang chính Node Đích này để hiện Form
                        return
                    }
                    // Ngược lại nộp bài ngay
                    finishSurvey(newAnswers)
                    return
                }
                if (nextNode.type === 'adviceNode') {
                    setShowAdvice(nextNode.data?.label || '')
                    return
                }
                setHistory([...history, { id: currentNodeId, isDynamic: true, courses: [...identifiedCourseIds] }])
                setCurrentNodeId(nextNode.id)
                findAndAddCourses(nextNode.id) 
            } else {
                finishSurvey(newAnswers)
            }
        } else {
            finishSurvey(newAnswers)
        }
        setInput1(''); setInput2('')
    }

    const finishSurvey = async (finalAnswers: any) => {
        setIsSubmitting(true)
        try {
            const res = await saveSurveyResultAction(finalAnswers)
            if (res.success) {
                setShowSuccess(true)
                setTimeout(() => {
                    if (onComplete) onComplete()
                    else window.location.href = '/'
                }, 5000) 
            } else {
                alert(res.error); setIsSubmitting(false)
            }
        } catch (err) {
            setIsSubmitting(false)
        }
    }

    if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-yellow-400" /></div>

    if (showSuccess) return (
        <div className="bg-zinc-950 rounded-[2.5rem] p-10 text-center text-white border border-white/10 shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20">
                <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black uppercase mb-4">Lộ trình hoàn tất!</h2>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8 text-left max-w-md mx-auto">
                <p className="text-[10px] font-black uppercase text-yellow-400 mb-4 tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> AI đã xác định {identifiedCourseIds.length} chặng học:
                </p>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {identifiedCourseIds.map((id, idx) => {
                        const c = allCourses.find(item => item.id === id)
                        return (
                            <div key={`${id}-${idx}`} className="flex items-center gap-3 text-sm font-bold text-gray-200 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                                <div className="w-6 h-6 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-[10px]">{id}</div>
                                {c?.name_lop || `Khóa học #${id}`}
                            </div>
                        )
                    })}
                </div>
            </div>
            <p className="text-gray-400 text-xs mb-4 italic">Hệ thống đang lưu dữ liệu và chuyển hướng...</p>
            <Loader2 className="w-6 h-6 animate-spin text-yellow-400 mx-auto" />
        </div>
    )

    return (
        <div className="bg-zinc-950 rounded-[3rem] p-6 md:p-10 text-white border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-yellow-400 flex items-center justify-center text-black shadow-lg shadow-yellow-400/20"><Target className="w-5 h-5" /></div>
                        <div>
                            <h2 className="text-sg font-black text-yellow-400 uppercase tracking-tight italic">Zero 2 Hero</h2>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Thiết kế lộ trình</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {history.length > 0 && (
                            <button 
                                onClick={handleBack}
                                className="py-2 px-2
                             bg-yellow-400 text-black rounded-2xl hover:bg-yellow-500 transition-all active:scale-90 shadow-lg shadow-yellow-400/10 animate-in fade-in zoom-in"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        {identifiedCourseIds.length > 0 && (
                            <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-xl border border-white/10 animate-in zoom-in">
                                <BookOpen className="w-3 h-3 text-yellow-400" />
                                <span className="text-[10px] font-black text-yellow-400">{identifiedCourseIds.length}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                    <h3 className="text-base font-black leading-snug mb-1 tracking-tight">{currentQuestion.question}</h3>
                    <p className="text-gray-400 text-[10px] mb-6 font-medium italic">
                        {currentQuestion.description || 'Hãy chọn đáp án đúng nhất bạn muốn!'}
                    </p>
                    {currentQuestion.type === 'CHOICE' && (
                        <div className="grid grid-cols-1 gap-2"> 
                            {currentQuestion.options?.map((opt: any) => (
                                <button 
                                    key={opt.id} 
                                    onClick={() => handleNext(opt.id, opt.label)} 
                                    className="w-full text-left bg-white hover:bg-gray-100 border border-transparent py-2 px-3 rounded-2xl transition-all duration-300 group active:scale-[0.98] shadow-xl"
                                >
                                    <span className="text-xs font-black text-zinc-900 leading-relaxed transition-colors">
                                        {opt.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {currentQuestion.type === 'FREE_TEXT' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-500 ml-1 italic">Câu trả lời của bạn</label>
                                <textarea 
                                    value={freeText} 
                                    onChange={e => setFreeText(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400 min-h-[120px] transition-all" 
                                    placeholder="Nhập nội dung trả lời tại đây..." 
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    if (!freeText.trim()) return alert('Vui lòng nhập câu trả lời của bạn.');
                                    handleNext('free_text_submit', freeText);
                                    setFreeText(''); // Reset cho câu sau
                                }} 
                                className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-yellow-500 transition-all active:scale-95 shadow-lg shadow-yellow-400/10 flex items-center justify-center gap-2"
                            >
                                <Send className="w-3 h-3" /> Tiếp tục khảo sát
                            </button>
                        </div>
                    )}

                    {currentQuestion.type === 'INPUT_ACCOUNT' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 italic">Tên Kênh / Lĩnh vực</label>
                                    <input type="text" value={input1} onChange={e => setInput1(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Nhập tên..." />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 italic">Link TikTok / Bio</label>
                                    <input type="text" value={input2} onChange={e => setInput2(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400" placeholder="@id_cua_ban" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {currentQuestion.options?.map((opt: any) => (
                                    <button key={opt.id} onClick={() => handleNext(opt.id, opt.label)} className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${opt.label?.toLowerCase() === 'tiếp tục' || opt.label?.toLowerCase() === 'xác nhận' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/10' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}>{opt.label}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    {currentQuestion.type === 'INPUT_GOAL' && (
                        <div className="space-y-4 text-black text-left">
                            <div className="bg-white p-5 md:p-8 rounded-[2.5rem] border-2 border-yellow-400/20 space-y-5 shadow-2xl">
                                {/* PHẦN 1: MỤC TIÊU */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                        <Target className="w-3.5 h-3.5 text-yellow-500" /> 1. Mục tiêu: (QUẢ) Tôi muốn
                                    </h4>

                                    {/* TRƯỜNG HỢP: BÁN HÀNG */}
                                    {Object.values(answers).some(val => String(val).toLowerCase().includes('bán hàng')) && (
                                        <div className="flex flex-wrap items-center gap-2 text-sm font-black leading-tight">
                                            <span>ĐẠT</span>
                                            <input type="text" value={moneyGoal} onChange={e => setMoneyGoal(e.target.value)} className="w-28 bg-gray-100 border-none rounded-lg px-2 py-1 text-center text-emerald-600 outline-none" />
                                            <span className="text-gray-400 font-bold italic text-[10px]">VNĐ/THÁNG</span>
                                        </div>
                                    )}

                                    {/* TRƯỜNG HỢP: NHÂN HIỆU */}
                                    {Object.values(answers).some(val => String(val).toLowerCase().includes('nhân hiệu')) && (
                                        <div className="flex flex-wrap items-center gap-2 text-sm font-black leading-tight">
                                            <span>TÔI MUỐN ĐẠT</span>
                                            <input type="number" value={targetVal} onChange={e => setTargetVal(e.target.value)} className="w-20 bg-gray-100 border-none rounded-lg px-2 py-1 text-center text-yellow-600 outline-none" />
                                            <span className="text-gray-400 font-bold italic text-[10px]">FOLLOW</span>
                                        </div>
                                    )}

                                    {/* TRƯỜNG HỢP: LAN TỎA GIÁ TRỊ */}
                                    {Object.values(answers).some(val => String(val).toLowerCase().includes('lan tỏa')) && (
                                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-700 font-bold text-[11px] italic leading-snug">
                                            🎯 Mục tiêu là lan tỏa giá trị cộng đồng thông qua hành động cụ thể.
                                        </div>
                                    )}
                                </div>

                                {/* PHẦN 2: CAM KẾT HÀNH ĐỘNG */}
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 2. Cam kết (NHÂN) hành động
                                    </h4>

                                    <div className="space-y-4">
                                        {/* Cam kết Video */}
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold leading-tight">
                                            <span className="shrink-0">🎬 Tôi sẽ đăng ít nhất: 
                                            <input type="number" value={videoPerDay} onChange={e => setVideoPerDay(e.target.value)} className="w-7 bg-gray-50 border border-gray-200 rounded-md py-0.5 text-center font-black text-red-600" />
                                            Video mỗi ngày</span>
                                            <span> đều đặn liên tục trong: <input type="number" value={days} onChange={e => setDays(e.target.value)} className="w-10 bg-gray-50 border border-gray-200 rounded-md py-0.5 text-center font-black text-red-600" />
                                            ngày</span>
                                        </div>

                                        {/* Cam kết Livestream */}
                                        {Object.values(answers).some(val => String(val).toLowerCase().includes('livestream')) && (
                                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold leading-tight">
                                                <span className="shrink-0">📡 Tôi sẽ livestream tối thiểu: 
                                                <input type="number" value={livePerDay} onChange={e => setLivePerDay(e.target.value)} className="w-10 bg-gray-50 border border-gray-200 rounded-md py-0.5 text-center font-black text-orange-600" />
                                                phút</span>
                                                <span> mỗi ngày đều đặn trong:<input type="number" value={liveDays} onChange={e => setDays(e.target.value)} className="w-10 bg-gray-50 border border-gray-200 rounded-md py-0.5 text-center font-black text-orange-600" />
                                                ngày</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button disabled={isSubmitting} onClick={() => handleNext('yes', 'Xác nhận')} className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl hover:bg-yellow-500 transition-all active:scale-95 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="w-3 h-3" />} Xác nhận & Cam kết
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {showAdvice && <AdviceModal videoUrl={showAdvice} onClose={() => setShowAdvice(null)} />}
        </div>
    )
}
