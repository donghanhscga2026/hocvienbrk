'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2, Lock, Flame, Star, Trophy, ArrowRight, Flag, ChevronRight, RefreshCcw, X, PlayCircle, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface RealityMapProps {
    customPath: number[]
    enrollmentsMap: any
    allCourses: any[]
    userGoal: string
    onReset: () => void
}

// ─── Component Popup Chi tiết Khóa học ─────────────────────────────────────
function CourseDetailModal({ course, enrollment, onClose }: { course: any, enrollment: any, onClose: () => void }) {
    const isCompleted = enrollment?.completedCount === enrollment?.totalLessons && enrollment?.totalLessons > 0
    const isActive = enrollment?.status === 'ACTIVE'

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-zinc-900 w-full max-w-sm rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                {/* Ảnh bìa hoặc Header */}
                <div className="h-32 bg-gradient-to-br from-purple-600 to-indigo-800 relative flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-white/20" />
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {isActive ? 'Đã kích hoạt' : 'Chưa sở hữu'}
                            </span>
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">{course.name_lop}</h3>
                        <p className="text-gray-400 text-sm font-medium line-clamp-3">{course.mo_ta_ngan || 'Khám phá những kiến thức thực chiến cùng Học viện BRK.'}</p>
                    </div>

                    {isActive ? (
                        <Link 
                            href={`/courses/${course.id_khoa}/learn`}
                            className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-500 transition-all active:scale-95 shadow-lg shadow-yellow-400/10"
                        >
                            <PlayCircle className="w-5 h-5" /> Vào học ngay
                        </Link>
                    ) : (
                        <Link 
                            href={`/#khoa-hoc`}
                            onClick={onClose}
                            className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
                        >
                            Tìm hiểu thêm
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function RealityMap({ customPath, enrollmentsMap, allCourses, userGoal, onReset }: RealityMapProps) {
    const [activeStage, setActiveStage] = useState<number | null>(null)
    const [highlightedIds, setHighlightedIds] = useState<number[]>([])
    const [selectedCourse, setSelectedCourse] = useState<any>(null)

    const stages = [
        { id: 1, name: 'Nền tảng số', courseIds: [15] },
        { id: 2, name: 'Video & Traffic', courseIds: [18, 3] },
        { id: 3, name: 'Livestream CB', courseIds: [4] },
        { id: 4, name: 'Kỹ năng NC', courseIds: [19] },
        { id: 5, name: 'Nhân hiệu & Đào tạo', courseIds: [2, 20] },
        { id: 6, name: 'Hệ thống bền vững', courseIds: [21, 22] },
    ]

    const handleStageClick = (stage: any) => {
        if (activeStage === stage.id) {
            setActiveStage(null)
            setHighlightedIds([])
        } else {
            setActiveStage(stage.id)
            setHighlightedIds(stage.courseIds)
        }
    }

    useEffect(() => {
        if (highlightedIds.length > 0) {
            const timer = setTimeout(() => setHighlightedIds([]), 5000)
            return () => clearTimeout(timer)
        }
    }, [highlightedIds])

    return (
        <div className="bg-zinc-950 rounded-[3rem] p-6 md:p-10 text-white border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-yellow-500/10 rounded-full blur-[100px]"></div>
            
            <div className="relative z-10 space-y-10">
                {/* 1. Header & Reset Button */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                    <div className="space-y-2">
                        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">
                            Bức tranh <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 text-glow">hiện thực</span>
                        </h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Mục tiêu: <span className="text-white">{userGoal}</span></p>
                    </div>
                    <button 
                        onClick={onReset}
                        className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-gray-400 active:scale-95"
                    >
                        <RefreshCcw className="w-3.5 h-3.5" /> Thiết lập lại lộ trình
                    </button>
                </div>

                {/* 2. Timeline ngang */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <Flag className="w-4 h-4 text-yellow-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Lộ trình chặng đường</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x">
                        {stages.map((stage, idx) => (
                            <button
                                key={stage.id}
                                onClick={() => handleStageClick(stage)}
                                className={`flex-none w-40 snap-start p-4 rounded-2xl border transition-all duration-300 relative group ${
                                    activeStage === stage.id 
                                    ? 'bg-yellow-400 border-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.3)]' 
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                                }`}
                            >
                                <div className="text-[9px] font-black uppercase opacity-60 mb-1">Chặng {stage.id}</div>
                                <div className="font-black text-[11px] uppercase leading-tight">{stage.name}</div>
                                {idx < stages.length - 1 && (
                                    <ChevronRight className={`absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 z-20 ${activeStage === stage.id ? 'text-yellow-400' : 'text-gray-700'}`} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Ma trận Mảnh ghép */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <Star className="w-4 h-4 text-purple-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ma trận mảnh ghép kiến thức (Nhấn để xem)</span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {customPath.map((courseId) => {
                            const course = allCourses.find(c => c.id === courseId)
                            if (!course) return null
                            
                            const enrollment = enrollmentsMap[courseId]
                            const isCompleted = enrollment?.completedCount === enrollment?.totalLessons && enrollment?.totalLessons > 0
                            const isActive = enrollment?.status === 'ACTIVE'
                            const isHighlighted = highlightedIds.includes(courseId)

                            return (
                                <button 
                                    key={courseId}
                                    onClick={() => setSelectedCourse({ ...course, enrollment })}
                                    className={`relative aspect-square rounded-[2rem] p-4 flex flex-col items-center justify-center text-center border-2 transition-all duration-500 active:scale-90 ${
                                        isHighlighted 
                                        ? 'border-yellow-400 bg-yellow-400/20 animate-pulse scale-105 z-20 shadow-[0_0_30px_rgba(250,204,21,0.5)]' 
                                        : isCompleted
                                        ? 'border-emerald-500/50 bg-emerald-500/10'
                                        : isActive
                                        ? 'border-orange-500/50 bg-orange-500/10'
                                        : 'border-white/5 bg-white/5 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 hover:bg-white/10'
                                    }`}
                                >
                                    <div className="absolute top-3 right-3">
                                        {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : isActive ? <Flame className="w-4 h-4 text-orange-500 animate-bounce" /> : <Lock className="w-3 h-3 text-gray-600" />}
                                    </div>
                                    <div className="text-2xl mb-2 filter drop-shadow-md">{isCompleted ? '🌟' : isActive ? '📖' : '🧩'}</div>
                                    <h4 className="text-[9px] font-black uppercase tracking-tighter leading-tight line-clamp-2 px-1">{course.name_lop}</h4>
                                    {isActive && !isCompleted && (
                                        <div className="mt-2 w-full px-2">
                                            <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                                                <div className="h-full bg-yellow-500 transition-all duration-1000" style={{ width: `${Math.round((enrollment.completedCount / enrollment.totalLessons) * 100)}%` }} />
                                            </div>
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                        
                        <div className={`aspect-square rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center text-center ${activeStage === 6 ? 'border-yellow-400 bg-yellow-400/5 text-yellow-400' : 'border-white/10 text-white/10'}`}>
                            <Trophy className="w-8 h-8 mb-1" />
                            <span className="text-[8px] font-black uppercase tracking-widest">Hero<br/>Status</span>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex flex-wrap gap-4 justify-center border-t border-white/5 text-[8px] font-black uppercase tracking-widest text-gray-500">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Hoàn thành</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Đang học</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-700"></div> Chưa mở</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div> Đang chọn</div>
                </div>
            </div>

            {/* Popup chi tiết mảnh ghép */}
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
