
'use client'

import React, { useState, useMemo } from 'react'
import { Flag, Lock, CheckCircle2, ChevronRight, Play, Info, Sparkles, Trophy, Target, ArrowRight } from 'lucide-react'
import CourseDetailModal from '../course/CourseDetailModal'

interface RealityMapProps {
    customPath: number[]
    enrollmentsMap: Record<number, any>
    allCourses: any[]
    userGoal: string
    onReset?: () => Promise<any>
}

export default function RealityMap({ customPath, enrollmentsMap, allCourses, userGoal, onReset }: RealityMapProps) {
    const [activeStage, setActiveStage] = useState<number | null>(null)
    const [selectedCourse, setSelectedCourse] = useState<any>(null)

    // ─── BƯỚC 2.1: ĐỘNG HÓA CHẶNG ĐƯỜNG (STAGES) ──────────────────────────
    const stages = useMemo(() => {
        const goal = userGoal?.toLowerCase() || '';
        
        // Logic phân bổ khóa học vào các chặng (Dựa trên ID khóa học thực tế)
        // Đây là bộ khung chặng đường phát triển trọn đời
        const allPossibleStages = [
            { id: 1, name: 'Xác định mục tiêu', icon: '🎯', courseIds: [1] },
            { id: 2, name: 'Nền tảng cơ bản', icon: '🧱', courseIds: [2] },
            { id: 3, name: 'Bán hàng đơn giản', icon: '🛒', courseIds: [4, 5] },
            { id: 4, name: 'Bán trải nghiệm', icon: '🌟', courseIds: [3] },
            { id: 5, name: 'Nhân hiệu chuyên gia', icon: '🦸', courseIds: [6] },
            { id: 6, name: 'Nhà đào tạo', icon: '🎓', courseIds: [7] },
            { id: 7, name: 'Xây dựng cộng đồng', icon: '🌐', courseIds: [8] },
            { id: 8, name: 'Giàu toàn diện', icon: '💎', courseIds: [9] }
        ];

        // Lọc chặng dựa trên mục tiêu của người dùng
        if (goal.includes('bán hàng') && !goal.includes('nâng cao')) {
            return allPossibleStages.slice(0, 3);
        }
        if (goal.includes('nhân hiệu')) {
            return allPossibleStages.slice(0, 5);
        }
        
        // Mặc định hoặc lộ trình dài hạn
        return allPossibleStages;
    }, [userGoal]);

    const highlightedIds = useMemo(() => {
        if (!activeStage) return []
        return stages.find(s => s.id === activeStage)?.courseIds || []
    }, [activeStage, stages])

    const handleStageClick = (stage: any) => {
        setActiveStage(activeStage === stage.id ? null : stage.id)
    }

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* 1. Header Lộ trình */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-black shadow-lg shadow-yellow-400/20">
                            <Target className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Mục tiêu hiện tại</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tight italic leading-none">
                        {userGoal || 'Lộ trình phát triển'}
                    </h2>
                </div>
                
                {onReset && (
                    <button 
                        onClick={() => { if(confirm('Làm lại khảo sát sẽ xóa lộ trình hiện tại?')) onReset() }}
                        className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors border-b border-transparent hover:border-red-500 pb-1"
                    >
                        🔄 Thiết lập lại mục tiêu
                    </button>
                )}
            </div>

            {/* 2. BƯỚC 2.2: UI CHẶNG ĐƯỜNG - S-CURVE TIMELINE (ZIG-ZAG) */}
            <div className="bg-zinc-950 rounded-[3rem] p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#facc1505,transparent_70%)]"></div>
                
                <div className="relative z-10 space-y-10">
                    <div className="flex items-center justify-center gap-3 mb-12">
                        <Flag className="w-5 h-5 text-yellow-400" />
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white italic">Hành trình Zero 2 Hero</h3>
                    </div>

                    <div className="flex flex-wrap justify-center relative w-full max-w-4xl mx-auto">
                        {stages.map((stage, idx) => {
                            const isEvenRow = Math.floor(idx / 3) % 2 !== 0;
                            const isActive = activeStage === stage.id;
                            
                            return (
                                <div 
                                    key={stage.id} 
                                    className={`w-1/3 p-4 flex flex-col items-center relative mb-12 ${isEvenRow ? 'md:flex-row-reverse' : ''}`}
                                >
                                    {/* Đường kẻ nối ngang (Desktop) */}
                                    {idx % 3 !== 2 && idx < stages.length - 1 && (
                                        <div className="hidden md:block absolute top-[40px] left-1/2 w-full h-[2px] bg-zinc-800 -z-10"></div>
                                    )}
                                    
                                    {/* Đường cong xuống dòng (Desktop) */}
                                    {idx % 3 === 2 && idx < stages.length - 1 && (
                                        <div className={`hidden md:block absolute top-[40px] ${isEvenRow ? '-left-1/2' : '-right-1/2'} w-full h-[140px] border-b-2 border-zinc-800 -z-10 ${isEvenRow ? 'border-l-2 rounded-bl-[60px]' : 'border-r-2 rounded-br-[60px]'}`}></div>
                                    )}

                                    <button
                                        onClick={() => handleStageClick(stage)}
                                        className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-500 relative group active:scale-90 ${
                                            isActive
                                            ? 'border-yellow-400 bg-yellow-400 text-black shadow-[0_0_40px_rgba(250,204,21,0.3)]'
                                            : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600'
                                        }`}
                                    >
                                        <span className="text-xl md:text-2xl font-black">{stage.icon}</span>
                                        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${isActive ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                            {stage.id}
                                        </div>
                                    </button>

                                    <div className="mt-4 text-center">
                                        <h4 className={`text-[10px] md:text-xs font-black uppercase tracking-tighter leading-tight transition-colors ${isActive ? 'text-yellow-400' : 'text-zinc-500'}`}>
                                            {stage.name}
                                        </h4>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* 3. BƯỚC 2.3: MA TRẬN MẢNH GHÉP (COMPACT GRID) */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 italic">Bức tranh hiện thực</h3>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{customPath.length} mảnh ghép chặng đầu</span>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                    {customPath.map((courseId, index) => {
                        const course = allCourses.find(c => c.id === courseId)
                        if (!course) return null
                        
                        const enrollment = enrollmentsMap[courseId]
                        const isCompleted = enrollment?.status === 'COMPLETED'
                        const isActive = enrollment?.status === 'ACTIVE'
                        const isPending = enrollment?.status === 'PENDING'
                        const isHighlighted = highlightedIds.includes(courseId)

                        return (
                            <div 
                                key={courseId}
                                onClick={() => setSelectedCourse({ ...course, enrollment })}
                                className={`group relative aspect-square rounded-[1.5rem] md:rounded-[2rem] p-2.5 sm:p-4 border-2 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 ${
                                    isHighlighted 
                                    ? 'border-yellow-400 bg-yellow-50 shadow-xl shadow-yellow-400/20 scale-105 z-10' 
                                    : 'border-gray-100 bg-white hover:border-gray-300'
                                }`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Status Icon */}
                                <div className="absolute top-2 right-2">
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                                    ) : isActive ? (
                                        <Play className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 fill-current animate-pulse" />
                                    ) : isPending ? (
                                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 animate-spin" />
                                    ) : (
                                        <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300" />
                                    )}
                                </div>

                                {/* Emoji Icon */}
                                <span className={`text-base sm:text-2xl mb-1 sm:mb-2 transition-transform group-hover:scale-125 ${!isActive && !isCompleted ? 'grayscale opacity-30' : ''}`}>
                                    {course.icon_emoji || '🧩'}
                                </span>

                                {/* Course Name (Compact) */}
                                <h4 className={`text-[8px] sm:text-[10px] font-black uppercase leading-[1.1] tracking-tighter line-clamp-2 ${!isActive && !isCompleted ? 'text-gray-400' : 'text-black'}`}>
                                    {course.name_lop}
                                </h4>

                                {/* Progress Bar (Mini) */}
                                {(isActive || isCompleted) && (
                                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-100">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                            style={{ width: `${isCompleted ? 100 : (enrollment?.completedCount / enrollment?.totalLessons) * 100 || 0}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Course Detail Modal */}
            {selectedCourse && (
                <CourseDetailModal 
                    course={selectedCourse} 
                    enrollment={selectedCourse.enrollment}
                    onClose={() => setSelectedCourse(null)} 
                />
            )}
        </div>
    )
}
