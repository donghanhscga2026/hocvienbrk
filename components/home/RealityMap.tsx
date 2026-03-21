
'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Flag, Lock, CheckCircle2, ChevronRight, Play, Info, Sparkles, Trophy, Target, ArrowRight, X, PlayCircle, BookOpen, RefreshCw, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface RealityMapProps {
    customPath: number[]
    enrollmentsMap: Record<number, any>
    allCourses: any[]
    userGoal: string | any
    targetPointId?: number
    roadmapPoints?: any[]
    onReset?: () => Promise<any>
}

// ─── Icons mapping for stages ──────────────────────────────────────────
const STAGE_ICONS: Record<number, string> = {
    1: '🎯', 2: '🧱', 3: '🛒', 4: '🌟', 5: '🦸', 6: '🎓', 7: '🌐', 8: '💎', 9: '🚀'
};

// ─── Component Popup Chi tiết Khóa học ─────────────────────────────────────
function CourseDetailModal({ course, enrollment, onClose }: { course: any, enrollment: any, onClose: () => void }) {
    const isActive = enrollment?.status === 'ACTIVE'
    const isCompleted = enrollment?.status === 'COMPLETED'

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-zinc-900 w-full max-w-sm rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="h-32 bg-gradient-to-br from-purple-600 to-indigo-800 relative flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-white/20" />
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2 text-white">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isActive || isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {isCompleted ? 'Hoàn thành' : isActive ? 'Đã kích hoạt' : 'Chưa sở hữu'}
                            </span>
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight leading-tight">{course.name_lop}</h3>
                        <p className="text-gray-400 text-sm font-medium line-clamp-3">{course.mo_ta_ngan || 'Khám phá những kiến thức thực chiến cùng Học viện BRK.'}</p>
                    </div>
                    {isActive || isCompleted ? (
                        <Link href={`/courses/${course.id_khoa}/learn`} className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-500 transition-all active:scale-95 shadow-lg shadow-yellow-400/10">
                            <PlayCircle className="w-5 h-5" /> Vào học ngay
                        </Link>
                    ) : (
                        <Link href={`/#khoa-hoc`} onClick={onClose} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95">
                            Tìm hiểu thêm
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Component Popup Xác nhận Nâng cấp Lộ trình ──────────────────────────
function UpgradeRoadmapModal({ onClose, onConfirm }: { onClose: () => void, onConfirm: () => void }) {
    const [isReseting, setIsReseting] = useState(false)

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 w-full max-w-sm rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl p-8 space-y-6 text-center">
                <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 text-yellow-400" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-white uppercase italic">Nâng cấp lộ trình?</h3>
                    <p className="text-gray-400 text-xs font-medium leading-relaxed">Chặng đường này đang bị khóa. Bạn có muốn thực hiện lại khảo sát để thiết lập lộ trình xa hơn không?</p>
                </div>
                <div className="space-y-3">
                    <button
                        disabled={isReseting}
                        onClick={async () => {
                            setIsReseting(true)
                            await onConfirm()
                        }}
                        className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-yellow-500 transition-all flex items-center justify-center gap-2"
                    >
                        {isReseting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Sẵn sàng nâng cấp'}
                    </button>
                    <button onClick={onClose} className="w-full bg-white/5 text-gray-400 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">Để sau</button>
                </div>
            </div>
        </div>
    )
}

export default function RealityMap({ customPath, enrollmentsMap, allCourses, userGoal, targetPointId = 1, roadmapPoints = [], onReset }: RealityMapProps) {
    const [activeStage, setActiveStage] = useState<number | null>(null)
    const [selectedCourse, setSelectedCourse] = useState<any>(null)
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // ─── ĐỘNG HÓA CHẶNG ĐƯỜNG (STAGES) ──────────────────────────
    const stages = useMemo(() => {
        if (roadmapPoints && roadmapPoints.length > 0) {
            return roadmapPoints.map(p => ({
                id: p.pointId,
                name: p.name,
                icon: STAGE_ICONS[p.pointId] || '✨',
                courseIds: p.courseIds ? p.courseIds.split(',').map((id: string) => parseInt(id.trim())) : []
            }));
        }

        // Fallback cũ nếu không có dữ liệu từ DB
        return [
            { id: 1, name: 'Xác định mục tiêu', icon: '🎯', courseIds: [1] },
            { id: 2, name: 'Nền tảng cơ bản', icon: '🧱', courseIds: [2] },
            { id: 3, name: 'Bán hàng đơn giản', icon: '🛒', courseIds: [4, 5] },
            { id: 4, name: 'Bán trải nghiệm', icon: '🌟', courseIds: [3] },
            { id: 5, name: 'Nhân hiệu chuyên gia', icon: '🦸', courseIds: [6] },
            { id: 6, name: 'Nhà đào tạo', icon: '🎓', courseIds: [7] },
            { id: 7, name: 'Xây dựng cộng đồng', icon: '🌐', courseIds: [8] },
            { id: 8, name: 'Giàu toàn diện', icon: '💎', courseIds: [9] }
        ];
    }, [roadmapPoints]);

    const highlightedIds = useMemo(() => {
        if (!activeStage) return []
        return stages.find(s => s.id === activeStage)?.courseIds || []
    }, [activeStage, stages])

    // ─── TÍNH TOÁN TIẾN ĐỘ TỪNG CHẶNG ────────────────────────────
    const stageProgress = useMemo(() => {
        return stages.map(stage => {
            let total = 0;
            let completed = 0;

            stage.courseIds.forEach((cid: number) => {
                const enr = enrollmentsMap[cid];
                if (enr) {
                    total += enr.totalLessons || 0;
                    completed += enr.completedCount || 0;
                }
            });

            return {
                id: stage.id,
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
                isCompleted: total > 0 && completed >= total && total === total // Đảm bảo có bài học
            };
        });
    }, [stages, enrollmentsMap]);

    // Xác định Chặng Hiện Tại (Chặng đầu tiên chưa xong)
    const currentStageId = useMemo(() => {
        const firstIncomplete = stageProgress.find(p => p.percentage < 100);
        if (firstIncomplete) return firstIncomplete.id;
        return stages[stages.length - 1]?.id || 1; // Nếu xong hết thì là chặng cuối
    }, [stageProgress, stages]);

    // ─── SẮP XẾP MẢNH GHÉP THEO LỘ TRÌNH ────────────────────────────
    // Tác dụng: Đảm bảo các mảnh ghép trong Matrix luôn hiển thị theo thứ tự học tập (Chặng 1 -> 9)
    const sortedCustomPath = useMemo(() => {
        // Tạo bản đồ tra cứu: CourseId -> StageId thấp nhất mà khóa đó thuộc về
        const courseToStageMap: Record<number, number> = {};
        stages.forEach(s => {
            s.courseIds.forEach((cid: number) => {
                if (courseToStageMap[cid] === undefined) {
                    courseToStageMap[cid] = s.id;
                }
            });
        });

        return [...customPath].sort((a, b) => {
            const stageA = courseToStageMap[a] ?? 999;
            const stageB = courseToStageMap[b] ?? 999;

            if (stageA !== stageB) return stageA - stageB;

            // Nếu cùng một chặng, giữ nguyên thứ tự gốc từ khảo sát (customPath)
            return customPath.indexOf(a) - customPath.indexOf(b);
        });
    }, [customPath, stages]);

    return (
        <div className="space-y-3 animate-in fade-in duration-700" ref={containerRef}>
            {/* 1. Dashboard Mục tiêu & Cam kết - PHONG CÁCH TỐI GIẢN */}
            <div className="relative space-y-4">
                <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-400" />
                        <span className="text-[12px] font-black uppercase tracking-widest text-gray-400">Mục tiêu & lộ trình</span>
                    </div>
                    {onReset && (
                        <button onClick={() => { if (confirm('Làm lại khảo sát?')) onReset() }} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors border-b border-gray-200">
                            🔄 Tạo lại lộ trình
                        </button>
                    )}
                </div>

                {(() => {
                    let goalData: any = null;
                    if (typeof userGoal === 'object' && userGoal !== null) goalData = userGoal;
                    else if (typeof userGoal === 'string' && userGoal.startsWith('{')) {
                        try { goalData = JSON.parse(userGoal); } catch (e) { goalData = null; }
                    }
                    const displayTitle = goalData ? goalData.mainGoal : (userGoal || 'Lộ trình phát triển');
                    const commitments = goalData && Array.isArray(goalData.commitments) ? goalData.commitments : [];

                    return (
                        <div className="flex flex-col md:flex-row gap-0">
                            {/* KHỐI MỤC TIÊU (QUẢ) */}
                            <div className="md:w-1/3 bg-black text-yellow-400 py-1 px-2 rounded-t-[2rem] flex items-center gap-2 border-2 border-black shadow-lg">
                                <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 flex items-center justify-center text-3xl">🏆</div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12px] font-black text-white uppercase opacity-86 mb-0.5">(Quả như ý) TÔI MUỐN</div>
                                    <div className="text-[18px] font-black uppercase tracking-tight truncate leading-none">{displayTitle}</div>
                                </div>
                            </div>

                            {/* KHỐI CAM KẾT TỔNG HỢP (NHÂN) */}
                            <div className="md:w-2/3 bg-white py-3 px-5 rounded-b-[2.5rem] border-2 border-gray-100 flex flex-col justify-center gap-1 shadow-md">
                                <div className="text-[12px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1">(NHÂN TỐT) Cam kết hành động</div>
                                <div className="space-y-2">
                                    {commitments.map((item: any, idx: number) => {
                                        const icons: any = { LEARN: '📚', VIDEO: '🎬', LIVE: '📡' };
                                        return (
                                            <div key={idx} className="flex items-center gap-1 text-[11px] font-bold text-zinc-700 leading-tight">
                                                <span className="text-sm grayscale-[0.5] group-hover:grayscale-0">{icons[item.type] || '✨'}</span>
                                                <span>{item.content}</span>
                                            </div>
                                        );
                                    })}
                                    {commitments.length === 0 && (
                                        <p className="text-[10px] text-gray-400 italic">Đang cập nhật kế hoạch hành động...</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* 2. UI CHẶNG ĐƯỜNG - S-CURVE TIMELINE (MOBILE OPTIMIZED) */}
            <div className="bg-zinc-950 rounded-[3rem] py-3 px-3 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#facc1505,transparent_70%)]"></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-center gap-3 mb-10 text-white">
                        <Flag className="w-5 h-5 text-yellow-400" />
                        <h3 className="text-[12px] font-black uppercase tracking-[0.3em] italic">Lộ trình Zero 2 Hero</h3>
                    </div>

                    <div className="relative max-w-4xl mx-auto px-2 md:px-8">
                        {/* Thay đổi gap-16 và md:gap-24 ở đây để chỉnh khoảng cách hàng */}
                        <div className="flex flex-col gap-10 md:gap-16">
                            {Array.from({ length: Math.ceil(stages.length / 3) }).map((_, rowIndex) => {
                                const rowStages = stages.slice(rowIndex * 3, rowIndex * 3 + 3);
                                const isReverseRow = rowIndex % 2 !== 0;

                                return (
                                    <div key={rowIndex} className={`flex relative w-full ${isReverseRow ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {rowStages.map((stage, idxInRow) => {
                                            const isActive = activeStage === stage.id;
                                            // Logic so khớp đích đến thông minh bằng targetPointId
                                            const isUserGoal = stage.id === targetPointId;
                                            const isCurrentPos = stage.id === currentStageId; // Vị trí hiện tại
                                            const isLocked = stage.id > targetPointId; // Khóa các nút sau đích đến
                                            const isLastInRow = idxInRow === rowStages.length - 1;
                                            const isNotLastRow = rowIndex < Math.ceil(stages.length / 3) - 1;

                                            // Lấy % tiến độ của chặng này
                                            const progress = stageProgress.find(p => p.id === stage.id)?.percentage || 0;
                                            const isCompleted = progress >= 100;

                                            return (
                                                <div key={stage.id} className="w-1/3 shrink-0 flex flex-col items-center relative z-10">
                                                    {!isLastInRow && (
                                                        <div className={`absolute top-[28px] md:top-[40px] w-full h-[2px] border-t-2 border-dashed border-gray-600 -z-10 ${isReverseRow ? 'right-1/2' : 'left-1/2'}`}></div>
                                                    )}
                                                    {isLastInRow && isNotLastRow && (
                                                        /* Chỉnh h-[120px] và md:h-[180px] ở đây để khớp với gap ở trên */
                                                        <div className="absolute top-[28px] md:top-[40px] left-1/2 -translate-x-1/2 w-[2px] h-[120px] md:h-[180px] border-l-2 border-dashed border-gray-600 -z-10"></div>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (isLocked) setShowUpgradeModal(true)
                                                            else setActiveStage(isActive ? null : stage.id)
                                                        }}
                                                        className={`w-14 h-14 md:w-20 md:h-20 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-500 relative group active:scale-90 ${isUserGoal
                                                            ? 'border-red-600 bg-yellow-400 text-white shadow-[0_0_60px_rgba(37,99,235,0.4)] scale-110 z-30'
                                                            : isLocked
                                                                ? 'border-zinc-800 bg-zinc-900/50 text-zinc-600 opacity-40 cursor-not-allowed'
                                                                : 'border-white/40 bg-zinc-600 text-white shadow-[0_0_20px_rgba(0,0,0,0.3)]'
                                                            }`}
                                                    >
                                                        {/* VÒNG TRÒN TIẾN ĐỘ (%) */}
                                                        {!isLocked && (
                                                            <svg className="absolute inset-[-6px] md:inset-[-8px] w-[calc(100%+12px)] h-[calc(100%+12px)] md:w-[calc(100%+16px)] md:h-[calc(100%+16px)] -rotate-90 z-0">
                                                                <circle
                                                                    cx="50%" cy="50%" r="46%"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="3"
                                                                    strokeDasharray="283"
                                                                    strokeDashoffset={283 - (283 * progress) / 100}
                                                                    className={`transition-all duration-1000 text-green-600`}
                                                                />
                                                            </svg>
                                                        )}

                                                        {/* Hiệu ứng Pulsing cho Vị trí hiện tại */}
                                                        {isCurrentPos && !isLocked && (
                                                            <span className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-20"></span>
                                                        )}

                                                        {/* Hiệu ứng tỏa sáng động cho Đích đến */}
                                                        {isUserGoal && (
                                                            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20"></span>
                                                        )}

                                                        <span className={`text-xl md:text-3xl font-black relative z-10 ${isLocked ? 'grayscale' : ''}`}>{stage.icon}</span>

                                                        {/* Badge: Điểm đích */}
                                                        {isUserGoal && (
                                                            <div className="absolute -top-6 bg-yellow-400 text-black text-[7px] font-black px-3 py-1 rounded-full uppercase tracking-tighter animate-bounce shadow-xl border border-emerald-300 z-40 whitespace-nowrap">
                                                                <Trophy className="w-2.5 h-2.5 inline mr-1" /> Điểm đến của bạn
                                                            </div>
                                                        )}

                                                        {/* Badge: Vị trí hiện tại */}
                                                        {isCurrentPos && !isUserGoal && (
                                                            <div className="absolute -top-8 bg-white text-black text-[10px] font-black px-2 py-1 rounded-full  tracking-tighter animate-pulse shadow-xl z-40 whitespace-nowrap">
                                                                <ArrowRight className="w-2.5 h-2.5 inline mr-1 rotate-90" /> Bạn đang ở đây
                                                            </div>
                                                        )}

                                                        {isLocked && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                                                                <Lock className="w-4 h-4 text-zinc-500" />
                                                            </div>
                                                        )}

                                                        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${isUserGoal ? 'bg-white text-emerald-600 border-emerald-400' : isCurrentPos ? 'bg-yellow-400 text-black border-zinc-900' : isLocked ? 'bg-zinc-800 text-zinc-600 border-zinc-700' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                                                            {stage.id}
                                                        </div>
                                                    </button>

                                                    <div className="mt-4 text-center px-1">
                                                        <h4 className={`text-[9px] md:text-xs font-black uppercase tracking-tighter leading-tight transition-colors ${isUserGoal ? 'text-emerald-400' : isActive ? 'text-yellow-400' : isLocked ? 'text-zinc-700' : 'text-zinc-500'}`}>
                                                            {stage.name}
                                                        </h4>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. MA TRẬN MẢNH GHÉP */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Bức tranh hiện thực</h3>
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{customPath.length} mảnh ghép cần học</span>
                </div>

                {/* Sửa tính năng: Thu hẹp gap từ 3/4 xuống 1.5/2 để các mảnh ghép nằm sát nhau hơn theo yêu cầu */}
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-1.5 md:gap-2">
                    {/* Sửa tính năng: Sử dụng sortedCustomPath để đảm bảo các mảnh ghép hiển thị đúng thứ tự chặng học (Lộ trình) */}
                    {sortedCustomPath.map((courseId, index) => {
                        const course = allCourses.find(c => c.id === courseId)
                        if (!course) return null
                        const enrollment = enrollmentsMap[courseId]
                        const isCompleted = enrollment?.status === 'COMPLETED'
                        const isActive = enrollment?.status === 'ACTIVE'
                        const isPending = enrollment?.status === 'PENDING'
                        const isHighlighted = highlightedIds.includes(courseId)

                        // Tính toán % tiến độ để tô màu nền xanh
                        const progressPercent = isCompleted ? 100 : (enrollment?.completedCount / enrollment?.totalLessons) * 100 || 0

                        return (
                            <div key={courseId} onClick={() => setSelectedCourse({ ...course, enrollment })}
                                // Sửa tính năng: Khóa được chọn không đổi nền, chỉ lóe viền vàng (border-yellow-400) theo yêu cầu
                                className={`group relative aspect-[23/9] rounded-[1.5rem] md:rounded-[2.5rem] p-1.5 sm:p-2 border-2 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 ${(isActive || isCompleted) ? 'bg-zinc-700' : 'bg-zinc-300'} ${isHighlighted ? 'border-yellow-400 shadow-xl shadow-yellow-400/50 scale-105 z-10' : 'border-black'}`} style={{ animationDelay: `${index * 50}ms` }}>

                                {/* Lớp màu xanh lá hiển thị tiến độ học tập (phủ từ trái sang) */}
                                {(isActive || isCompleted) && (
                                    <div
                                        className="absolute inset-0 bg-green-500/50 transition-all duration-1000 origin-left z-0"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                )}

                                <div className="absolute top-2 right-2 z-20">
                                    {isCompleted ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : isActive ? <Play className="w-3 h-3 text-red-500 fill-current animate-pulse" /> : isPending ? <Loader2 className="w-3 h-3 text-blue-500 animate-spin" /> : <Lock className="w-3 h-3 text-zinc-400" />}
                                </div>

                                <h4 className={`text-[12px] sm:text-[10px] font-black leading-[1.1] tracking-tighter line-clamp-2 pl-1 pr-3 w-full text-left relative z-10 ${isActive || isCompleted ? 'text-white' : 'text-zinc-500'}`}>
                                    {/* Sửa tính năng: Chữ trắng chỉ dành cho khóa đã mở, chữ xám cho khóa chưa kích hoạt kể cả khi được chọn */}
                                    {course.name_lop}
                                </h4>
                            </div>
                        )
                    })}
                </div>
            </div>

            {selectedCourse && <CourseDetailModal course={selectedCourse} enrollment={selectedCourse.enrollment} onClose={() => setSelectedCourse(null)} />}
            {showUpgradeModal && <UpgradeRoadmapModal onClose={() => setShowUpgradeModal(false)} onConfirm={onReset!} />}
        </div>
    )
}
