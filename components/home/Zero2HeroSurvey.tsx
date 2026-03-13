
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { surveyQuestions } from '@/lib/survey-data'
import { saveSurveyResultAction } from '@/app/actions/survey-actions'
import { getActiveSurvey } from '@/app/actions/roadmap-actions'
import { Target, CheckCircle2, ChevronRight, Loader2, ArrowLeft, Play, Send } from 'lucide-react'

// ─── Component Popup Tư Vấn ────────────────────────────────────────────────
function AdviceModal({ videoUrl, onClose }: { videoUrl?: string, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 w-full max-w-xl rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                <div 
                    className="aspect-video bg-black relative flex items-center justify-center group cursor-pointer"
                    onClick={() => videoUrl && window.open(videoUrl, '_blank')}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <Play className="w-16 h-16 text-yellow-400 fill-current group-hover:scale-110 transition-transform" />
                    <p className="absolute bottom-4 left-6 text-white font-black uppercase tracking-widest text-xs">
                        {videoUrl ? 'Bấm để xem video tư vấn' : 'Video tư vấn lộ trình BRK'}
                    </p>
                </div>
                <div className="p-8 space-y-4">
                    <h3 className="text-2xl font-black text-white uppercase">Cố vấn định hướng</h3>
                    <p className="text-gray-400 text-sm leading-relaxed font-medium">
                        Chúng tôi hiểu bạn đang phân vân. Nội dung tư vấn này sẽ giúp bạn hiểu rõ từng hướng đi tại Học viện. 
                        Sau khi xem xong, hãy quay lại và chọn mục tiêu mà bạn cảm thấy tự tin nhất để bắt đầu.
                    </p>
                    <button 
                        onClick={onClose}
                        className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-yellow-500 transition-all active:scale-95"
                    >
                        Tôi đã hiểu - Quay lại chọn
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function Zero2HeroSurvey({ onComplete }: { onComplete?: () => void }) {
    const router = useRouter()
    
    // State cho Dynamic Flow
    const [flow, setFlow] = useState<any>(null)
    const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
    const [isLoadingFlow, setIsLoadingFlow] = useState(true)

    // [VỊ TRÍ A]: Đổi history từ string[] sang any[]
    const [currentStep, setCurrentStep] = useState('q1')
    const [history, setHistory] = useState<any[]>([])
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [showAdvice, setShowAdvice] = useState<string | null>(null)

    // Form inputs state
    const [input1, setInput1] = useState('')
    const [input2, setInput2] = useState('')
    const [videoPerDay, setVideoPerDay] = useState('1')
    const [days, setDays] = useState('30')
    const [targetVal, setTargetVal] = useState('1000')

    // [VỊ TRÍ B]: Tải bài khảo sát và tự động tìm CÂU HỎI GỐC
    useEffect(() => {
        const loadFlow = async () => {
            try {
                setIsLoadingFlow(true)
                const data = await getActiveSurvey() as any
                if (data && data.nodes && Array.isArray(data.nodes) && data.nodes.length > 0) {
                    setFlow(data)
                    
                    // Thuật toán tìm đúng Node gốc (Không có dây nào trỏ vào)
                    const targetIds = new Set(data.edges.map((e: any) => e.target))
                    let startNode = data.nodes.find((n: any) => n.type === 'questionNode' && !targetIds.has(n.id))
                    
                    // Fallback
                    if (!startNode) startNode = data.nodes.find((n: any) => n.type === 'questionNode')
                    
                    if (startNode) setCurrentNodeId(startNode.id)
                }
            } catch (err) {
                console.error("Failed to load flow:", err)
            } finally {
                setIsLoadingFlow(false)
            }
        }
        loadFlow()
    }, [])

    const getActiveQuestion = () => {
        if (flow && currentNodeId && Array.isArray(flow.nodes)) {
            const node = flow.nodes.find((n: any) => n.id === currentNodeId)
            if (node) {
                const optionEdges = Array.isArray(flow.edges) ? flow.edges.filter((e: any) => e.source === currentNodeId) : []
                const options = optionEdges.map((edge: any) => {
                    const optNode = flow.nodes.find((n: any) => n.id === edge.target)
                    return {
                        id: optNode?.id,
                        label: optNode?.data?.label,
                        edgeId: edge.id
                    }
                }).filter((o: any) => o.id)

                return {
                    id: node.id,
                    question: node.data?.label || 'Câu hỏi không có nội dung',
                    type: node.data?.type || 'CHOICE',
                    options: options,
                    isDynamic: true
                }
            }
        }
        
        const staticQ = (surveyQuestions as any)[currentStep]
        return { 
            ...staticQ, 
            id: currentStep, 
            isDynamic: false,
            question: staticQ?.question || 'Câu hỏi không tìm thấy',
            options: staticQ?.options || []
        }
    }

    const currentQuestion = getActiveQuestion()

    const handleBack = () => {
        if (history.length > 0) {
            const prev = [...history]
            const last = prev.pop()!
            setHistory(prev)
            if (last.isDynamic) {
                setCurrentNodeId(last.id)
            } else {
                setCurrentStep(last.id)
            }
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
            newAnswers['goal_config'] = { videoPerDay, days, targetVal }
        }

        setAnswers(newAnswers)

        // [VỊ TRÍ C]: BẢN VÁ LOGIC DUYỆT SƠ ĐỒ ĐỘNG ĐỆ QUY
        if (currentQuestion.isDynamic && flow) {
            // Hàm tìm node tương tác tiếp theo, tự động đi xuyên qua courseNodes
            const findNextInteractiveNode = (sourceId: string): any => {
                const outEdges = Array.isArray(flow.edges) ? flow.edges.filter((e: any) => e.source === sourceId) : []
                for (const edge of outEdges) {
                    const target = flow.nodes.find((n: any) => n.id === edge.target)
                    if (!target) continue
                    
                    if (target.type === 'questionNode' || target.type === 'adviceNode') {
                        return target
                    }
                    if (target.type === 'courseNode') {
                        // Nếu gặp khóa học, đệ quy tìm tiếp phía sau nó có câu hỏi nào không
                        const next = findNextInteractiveNode(target.id)
                        if (next) return next
                    }
                }
                return null
            }

            // Đối với form Goal, bắt đầu tìm từ chính Node Câu hỏi. Với Choice, tìm từ Node Đáp án.
            const startSearchId = currentQuestion.type === 'INPUT_GOAL' ? currentNodeId : optionId;
            const nextNode = findNextInteractiveNode(startSearchId!)

            if (nextNode) {
                if (nextNode.type === 'adviceNode') {
                    setShowAdvice(nextNode.data?.label || '')
                    return
                }
                if (nextNode.type === 'questionNode') {
                    setHistory([...history, { id: currentNodeId, isDynamic: true }])
                    setCurrentNodeId(nextNode.id)
                    return
                }
            }
            
            // Nếu không còn node tương tác nào -> Kết thúc
            finishSurvey(newAnswers)
        } else {
            // LOGIC TĨNH CŨ (Fallback)
            const staticQData = (surveyQuestions as any)[currentStep]
            const staticOpt = staticQData?.options?.find((o: any) => o.id === optionId)
            if (staticOpt?.isAdvice) {
                setShowAdvice('https://youtube.com')
                return
            }
            if (staticOpt?.nextQuestionId && staticOpt.nextQuestionId !== 'done') {
                setHistory([...history, { id: currentStep, isDynamic: false }])
                setCurrentStep(staticOpt.nextQuestionId)
            } else {
                finishSurvey(newAnswers)
            }
        }

        setInput1('')
        setInput2('')
    }

    const finishSurvey = async (finalAnswers: any) => {
        setIsSubmitting(true)
        try {
            const res = await saveSurveyResultAction(finalAnswers)
            if (res.success) {
                setShowSuccess(true)
                setTimeout(() => {
                    if (onComplete) {
                        onComplete()
                    } else {
                        window.location.href = '/'
                    }
                }, 2500)
            } else {
                alert(res.error)
                setIsSubmitting(false)
            }
        } catch (err) {
            console.error(err)
            setIsSubmitting(false)
        }
    }

    if (isLoadingFlow) return (
        <div className="bg-zinc-950 rounded-[3rem] p-20 flex flex-col items-center justify-center border border-white/10 shadow-2xl">
            <Loader2 className="w-10 h-10 animate-spin text-yellow-400 mb-4" />
            <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest">Đang tải khảo sát...</p>
        </div>
    )

    if (showSuccess) return (
        <div className="bg-zinc-950 rounded-[2.5rem] p-10 text-center text-white border border-white/10 shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20">
                <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Lộ trình đã sẵn sàng!</h2>
            <p className="text-gray-400 text-sm mb-8">AI đã thiết kế xong Bức tranh hiện thực của riêng bạn.</p>
            <Loader2 className="w-6 h-6 animate-spin text-yellow-400 mx-auto" />
        </div>
    )

    return (
        <div className="bg-zinc-950 rounded-[3rem] p-6 md:p-10 text-white border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px]"></div>
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-yellow-400 flex items-center justify-center text-black shadow-lg shadow-yellow-400/20">
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight">Zero 2 Hero</h2>
                            <div className="flex gap-1 mt-1">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className={`h-1 w-4 rounded-full ${i <= history.length ? 'bg-yellow-400' : 'bg-white/10'}`}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {history.length > 0 && (
                        <button onClick={handleBack} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400"><ArrowLeft className="w-5 h-5" /></button>
                    )}
                </div>

                <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                    <h3 className="text-2xl font-black leading-tight mb-2 uppercase tracking-tight">{currentQuestion.question}</h3>
                    <p className="text-gray-400 text-sm mb-8 font-medium">{'Hãy cung cấp thông tin chính xác để AI thiết kế lộ trình.'}</p>

                    {/* CHOICE TYPE */}
                    {currentQuestion.type === 'CHOICE' && (
                        <div className="grid grid-cols-1 gap-3">
                            {currentQuestion.options?.map((opt: any) => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleNext(opt.id, opt.label)}
                                    className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl transition-all flex items-center justify-between group active:scale-[0.98]"
                                >
                                    <span className="font-bold text-gray-200 group-hover:text-white">{opt.label}</span>
                                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-yellow-400" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* INPUT ACCOUNT TYPE */}
                    {currentQuestion.type === 'INPUT_ACCOUNT' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Tên Shop / Kênh / Lĩnh vực</label>
                                    <input type="text" value={input1} onChange={e => setInput1(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500" placeholder="Nhập tên..." />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1">ID TikTok / Link Kênh</label>
                                    <input type="text" value={input2} onChange={e => setInput2(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500" placeholder="@id_cua_ban" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {currentQuestion.options?.map((opt: any) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleNext(opt.id, opt.label)}
                                        className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${opt.id === 'yes' || opt.label?.toLowerCase() === 'tiếp tục' || opt.label?.toLowerCase() === 'xác nhận' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/10' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* INPUT GOAL TYPE */}
                    {currentQuestion.type === 'INPUT_GOAL' && (
                        <div className="space-y-6">
                            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-6">
                                <div className="flex flex-wrap items-center gap-3 text-sm font-bold leading-relaxed">
                                    <span>Tôi sẽ làm</span>
                                    <input type="number" value={videoPerDay} onChange={e => setVideoPerDay(e.target.value)} className="w-16 bg-white/10 border-none rounded-lg px-2 py-1 text-center text-yellow-400 outline-none" />
                                    <span>video/ngày đều đặn trong</span>
                                    <input type="number" value={days} onChange={e => setDays(e.target.value)} className="w-16 bg-white/10 border-none rounded-lg px-2 py-1 text-center text-yellow-400 outline-none" />
                                    <span>ngày để đạt</span>
                                    <input type="number" value={targetVal} onChange={e => setTargetVal(e.target.value)} className="w-24 bg-white/10 border-none rounded-lg px-2 py-1 text-center text-yellow-400 outline-none" />
                                    <span className="text-gray-400 font-medium">Follow / Đơn hàng</span>
                                </div>
                            </div>
                            <button
                                disabled={isSubmitting}
                                onClick={() => handleNext('yes', 'Xác nhận')}
                                className="w-full bg-black text-yellow-400 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Xác nhận lộ trình & Cam kết
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showAdvice && <AdviceModal videoUrl={showAdvice} onClose={() => setShowAdvice(null)} />}
        </div>
    )
}
