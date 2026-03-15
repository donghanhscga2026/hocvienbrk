
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
                return { id: node.id, question: node.data?.label, type: node.data?.type || 'CHOICE', options, isDynamic: true }
            }
        }
        const staticQ = (surveyQuestions as any)[currentStep] || {}
        return { ...staticQ, id: currentStep, isDynamic: false }
    }

    const currentQuestion = getActiveQuestion()

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
            findAndAddCourses(optionId)

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

            const startId = currentQuestion.type === 'INPUT_GOAL' ? currentNodeId : optionId
            const nextNode = findNextNode(startId!)

            if (nextNode) {
                // Nếu là Đích đến (FinishNode) -> Nộp bài ngay
                if (nextNode.type === 'finishNode') {
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
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-yellow-400 flex items-center justify-center text-black shadow-lg shadow-yellow-400/20"><Target className="w-5 h-5" /></div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight italic">Zero 2 Hero</h2>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Live Roadmap Building</p>
                        </div>
                    </div>
                    {identifiedCourseIds.length > 0 && (
                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 animate-in zoom-in">
                            <BookOpen className="w-3 h-3 text-yellow-400" />
                            <span className="text-[10px] font-black text-yellow-400">{identifiedCourseIds.length}</span>
                        </div>
                    )}
                </div>
                <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                    <h3 className="text-base font-black leading-snug mb-2  tracking-tight">{currentQuestion.question}</h3>
                    <p className="text-gray-400 text-xs mb-8 font-medium italic">
                        {currentQuestion.description || 'Chọn đáp án đúng nhất hiện tại của bạn'}
                    </p>
                    {currentQuestion.type === 'CHOICE' && (
    <div className="grid grid-cols-1 gap-1"> 
        {/* Tăng gap từ 3 lên 4 để các nút có khoảng thở */}
        {currentQuestion.options?.map((opt: any) => (
            <button 
                key={opt.id} 
                onClick={() => handleNext(opt.id, opt.label)} 
                className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 py-3 px-4 rounded-2xl transition-all duration-300 flex items-center justify-between group active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
            >
                <div className="flex flex-col gap-1">
                    {/* text-lg (18px) giúp nội dung nổi bật, leading-relaxed (1.625) cực kỳ thoáng cho tiếng Việt */}
                    <span className="text-xs font-bold text-gray-200 group-hover:text-white leading-relaxed transition-colors">
                        {opt.label}
                    </span>
                    
                    {/* Nếu sau này ní muốn thêm mô tả ngắn cho mỗi option thì có thể để ở đây */}
                </div>

                {/* Icon được cố định kích thước và có hiệu ứng đổi màu khi hover vào cả nút */}
                <div className="ml-4 p-2 rounded-full bg-white/5 group-hover:bg-yellow-400/10 transition-colors shrink-0">
                    <ChevronRight className="w-6 h-6 text-gray-600 group-hover:text-yellow-400 transition-transform group-hover:translate-x-1" />
                </div>
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
                        <div className="space-y-6 text-black text-left">
                            <div className="bg-white p-8 rounded-[3rem] border-2 border-yellow-400/20 space-y-8 shadow-2xl">
                                {/* PHẦN 1: MỤC TIÊU (Phân nhánh dựa trên lựa chọn trước đó) */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                        <Target className="w-4 h-4 text-yellow-500" /> 1. Xác định mục tiêu của bạn
                                    </h4>
                                    
                                    {/* TRƯỜNG HỢP: BÁN HÀNG */}
                                    {Object.values(answers).some(val => String(val).toLowerCase().includes('bán hàng')) && (
                                        <div className="flex flex-wrap items-center gap-3 text-base font-black leading-relaxed">
                                            <span>TÔI MUỐN KIẾM ĐƯỢC</span>
                                            <input type="text" value={moneyGoal} onChange={e => setMoneyGoal(e.target.value)} className="min-w-[150px] bg-gray-100 border-none rounded-xl px-4 py-2 text-center text-emerald-600 outline-none" />
                                            <span className="text-gray-400 font-bold italic">VNĐ / THÁNG</span>
                                        </div>
                                    )}

                                    {/* TRƯỜNG HỢP: NHÂN HIỆU */}
                                    {Object.values(answers).some(val => String(val).toLowerCase().includes('nhân hiệu')) && (
                                        <div className="flex flex-wrap items-center gap-3 text-base font-black leading-relaxed">
                                            <span>TÔI MUỐN ĐẠT ĐƯỢC</span>
                                            <input type="number" value={targetVal} onChange={e => setTargetVal(e.target.value)} className="w-24 bg-gray-100 border-none rounded-xl px-4 py-2 text-center text-yellow-600 outline-none" />
                                            <span className="text-gray-400 font-bold italic">FOLLOW / TƯƠNG TÁC</span>
                                        </div>
                                    )}

                                    {/* TRƯỜNG HỢP: LAN TỎA GIÁ TRỊ (Mục tiêu = Cam kết hành động) */}
                                    {Object.values(answers).some(val => String(val).toLowerCase().includes('lan tỏa')) && (
                                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-blue-700 font-bold text-sm italic">
                                            🎯 Mục tiêu của bạn là lan tỏa giá trị và cống hiến cho cộng đồng thông qua các hành động cụ thể dưới đây.
                                        </div>
                                    )}
                                </div>

                                {/* PHẦN 2: CAM KẾT HÀNH ĐỘNG */}
                                <div className="space-y-6 pt-6 border-t border-gray-100">
                                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 2. Cam kết thực hiện
                                    </h4>
                                    
                                    <div className="space-y-6">
                                        {/* Cam kết Video - Mặc định hiện */}
                                        <div className="flex flex-wrap items-center gap-3 text-sm font-bold leading-relaxed">
                                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">🎬</div>
                                            <span>LÀM ĐỀU ĐẶN</span>
                                            <input type="number" value={videoPerDay} onChange={e => setVideoPerDay(e.target.value)} className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-center font-black text-red-600" />
                                            <span>VIDEO / NGÀY TRONG</span>
                                            <input type="number" value={days} onChange={e => setDays(e.target.value)} className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-center font-black text-red-600" />
                                            <span>NGÀY</span>
                                        </div>

                                        {/* Cam kết Livestream - Chỉ hiện nếu có chọn */}
                                        {Object.values(answers).some(val => String(val).toLowerCase().includes('livestream')) && (
                                            <div className="flex flex-wrap items-center gap-3 text-sm font-bold leading-relaxed animate-in slide-in-from-left duration-500">
                                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">📡</div>
                                                <span>LÊN SÓNG</span>
                                                <input type="number" value={livePerDay} onChange={e => setLivePerDay(e.target.value)} className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-center font-black text-orange-600" />
                                                <span>PHÚT / NGÀY TRONG</span>
                                                <input type="number" value={liveDays} onChange={e => setLiveDays(e.target.value)} className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-center font-black text-orange-600" />
                                                <span>NGÀY</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button disabled={isSubmitting} onClick={() => handleNext('yes', 'Xác nhận')} className="w-full bg-yellow-400 text-black py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 shadow-2xl hover:bg-yellow-500 transition-all active:scale-95 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="w-4 h-4" />} Xác nhận lộ trình & Cam kết thực hiện
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {showAdvice && <AdviceModal videoUrl={showAdvice} onClose={() => setShowAdvice(null)} />}
        </div>
    )
}
