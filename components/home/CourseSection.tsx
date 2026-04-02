'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import CourseCard from '@/components/course/CourseCard'
import { ChevronDown, ChevronUp, Clock, LayoutGrid } from 'lucide-react'

interface CourseCategoryGroupProps {
    categoryName: string
    courses: any[]
    session: any
    enrollmentsMap: any
    isCourseOneActive: boolean
    userPhone: string | null
    userId: number | null
    darkMode?: boolean
}

function CourseCategoryGroup({
    categoryName,
    courses,
    session,
    enrollmentsMap,
    isCourseOneActive,
    userPhone,
    userId,
    darkMode = false
}: CourseCategoryGroupProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [countdown, setCountdown] = useState(10)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const groupRef = useRef<HTMLDivElement>(null)

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (intervalRef.current) clearInterval(intervalRef.current)
        
        if (isExpanded) {
            setCountdown(10)
            
            intervalRef.current = setInterval(() => {
                setCountdown(prev => (prev > 0 ? prev - 1 : 0))
            }, 1000)

            timerRef.current = setTimeout(() => {
                setIsExpanded(false)
            }, 10000)
        }
    }, [isExpanded])

    useEffect(() => {
        if (isExpanded) {
            resetTimer()
        } else {
            if (timerRef.current) clearTimeout(timerRef.current)
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [isExpanded, resetTimer])

    const handleActivity = () => {
        if (isExpanded) resetTimer()
    }

    // Tính toán số lượng khóa học hiển thị khi thu gọn dựa trên thiết bị
    const [displayCount, setDisplayCount] = useState(1)
    
    useEffect(() => {
        const updateCount = () => {
            // Trên Desktop (>= 768px) hiện 3 khóa, trên Mobile hiện 1 khóa
            setDisplayCount(window.innerWidth >= 768 ? 3 : 1)
        }
        updateCount()
        window.addEventListener('resize', updateCount)
        return () => window.removeEventListener('resize', updateCount)
    }, [])

    const visibleCourses = isExpanded ? courses : courses.slice(0, displayCount)
    const hasMore = courses.length > displayCount

    return (
        <div 
            ref={groupRef}
            onMouseMove={handleActivity}
            onTouchStart={handleActivity}
            className={`relative p-6 rounded-[2.5rem] transition-all duration-500 bg-brk-background border-brk-outline shadow-xl ${
                isExpanded 
                ? 'ring-2 ring-yellow-400 shadow-2xl z-20 mb-8' 
                : 'mb-4'
            }`}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isExpanded ? 'bg-brk-primary text-brk-on-primary' : 'bg-brk-surface text-brk-muted shadow-sm'}`}>
                        <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-brk-on-surface">
                            {categoryName}
                        </h3>
                        <p className="text-[10px] font-bold text-brk-muted uppercase">
                            {courses.length} khóa học
                        </p>
                    </div>
                </div>

                {isExpanded && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-brk-primary/10 rounded-full border border-brk-primary/20 animate-in fade-in zoom-in duration-300">
                        <Clock className="w-3 h-3 text-brk-primary animate-pulse" />
                        <span className="text-[9px] font-black text-brk-primary uppercase">Đóng sau {countdown}s</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visibleCourses.map((course: any, index: number) => (
                    <div key={course.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <CourseCard
                            course={course}
                            isLoggedIn={!!session}
                            enrollment={enrollmentsMap[course.id] || null}
                            isCourseOneActive={isCourseOneActive}
                            userPhone={userPhone}
                            userId={userId}
                            priority={index === 0}
                            darkMode={darkMode}
                        />
                    </div>
                ))}
            </div>

            {hasMore && (
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`group flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                            isExpanded 
                            ? 'bg-brk-background text-brk-muted hover:bg-brk-surface' 
                            : 'bg-brk-primary text-brk-on-primary shadow-lg shadow-black/10'
                        }`}
                    >
                        {isExpanded ? (
                            <> Thu gọn <ChevronUp className="w-3.5 h-3.5" /> </>
                        ) : (
                            <> Xem thêm {courses.length - displayCount} khóa <ChevronDown className="w-3.5 h-3.5 animate-bounce group-hover:animate-none" /> </>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}

interface CourseSectionProps {
    title: string
    courses?: any[]
    groupedCourses?: { category: string, courses: any[] }[]
    session: any
    enrollmentsMap: any
    isCourseOneActive: boolean
    userPhone: string | null
    userId: number | null
    darkMode?: boolean
    accentColor?: string
}

export default function CourseSection({
    title,
    courses,
    groupedCourses,
    session,
    enrollmentsMap,
    isCourseOneActive,
    userPhone,
    userId,
    darkMode = false,
    accentColor = 'bg-blue-600'
}: CourseSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [countdown, setCountdown] = useState(10)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (intervalRef.current) clearInterval(intervalRef.current)
        
        if (isExpanded) {
            setCountdown(10)
            intervalRef.current = setInterval(() => {
                setCountdown(prev => (prev > 0 ? prev - 1 : 0))
            }, 1000)
            timerRef.current = setTimeout(() => {
                setIsExpanded(false)
            }, 10000)
        }
    }, [isExpanded])

    useEffect(() => {
        if (isExpanded) resetTimer()
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [isExpanded, resetTimer])

    const handleActivity = () => {
        if (isExpanded) resetTimer()
    }

    // Nếu có groupedCourses thì hiển thị theo nhóm
    if (groupedCourses && groupedCourses.length > 0) {
        return (
            <div className="mb-16 rounded-[3rem] transition-all duration-500 bg-brk-surface border-brk-outline p-4 md:p-12">
                <div className="mb-10 text-center">
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-brk-on-surface">
                        {title}
                    </h2>
                    <div className={`mx-auto mt-3 h-1.5 w-16 rounded-full ${accentColor}`}></div>
                </div>

                <div className="space-y-6">
                    {groupedCourses.map((group, idx) => (
                        <CourseCategoryGroup 
                            key={group.category + idx}
                            categoryName={group.category}
                            courses={group.courses}
                            session={session}
                            enrollmentsMap={enrollmentsMap}
                            isCourseOneActive={isCourseOneActive}
                            userPhone={userPhone}
                            userId={userId}
                            darkMode={darkMode}
                        />
                    ))}
                </div>
            </div>
        )
    }

    // Tính toán số lượng khóa học hiển thị khi thu gọn dựa trên thiết bị cho nhóm "Khóa học của tôi"
    const [displayCount, setDisplayCount] = useState(3)
    
    useEffect(() => {
        const updateCount = () => {
            // Trên Desktop (>= 768px) hiện 3 khóa, trên Mobile hiện 1 khóa
            setDisplayCount(window.innerWidth >= 768 ? 3 : 1)
        }
        updateCount()
        window.addEventListener('resize', updateCount)
        return () => window.removeEventListener('resize', updateCount)
    }, [])

    // Hiển thị dạng phẳng có thu gọn cho "Khóa học của tôi"
    const visibleCourses = isExpanded ? (courses || []) : (courses || []).slice(0, displayCount)
    const hasMore = (courses || []).length > displayCount

    return (
        <div 
            onMouseMove={handleActivity}
            onTouchStart={handleActivity}
            className={`mb-12 rounded-[2.5rem] transition-all duration-500 relative bg-brk-surface border-brk-outline shadow-xl p-6 md:p-10 ${
                isExpanded ? 'ring-2 ring-brk-primary z-30' : ''
            }`}
        >
            {/* Thông báo đếm ngược nổi */}
            {isExpanded && (
                <div className="absolute top-6 right-6 z-50 animate-in fade-in zoom-in duration-300">
                    <div className="bg-brk-surface text-brk-primary px-4 py-2 rounded-full border border-brk-primary/30 shadow-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span>Đóng sau {countdown}s</span>
                    </div>
                </div>
            )}

            <div className="mb-8 text-center">
                <h2 className="text-2xl font-black uppercase tracking-tight text-brk-on-surface">
                    {title}
                </h2>
                <div className={`mx-auto mt-2 h-1 w-12 rounded-full ${accentColor}`}></div>
                {title === 'Khóa học của tôi' && (
                    <p className="mt-3 text-[10px] font-black text-brk-muted uppercase tracking-widest">Theo thứ tự lộ trình riêng của bạn</p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visibleCourses.map((course: any, index: number) => (
                    <div key={course.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                        <CourseCard
                            course={course}
                            isLoggedIn={!!session}
                            enrollment={enrollmentsMap[course.id] || null}
                            isCourseOneActive={isCourseOneActive}
                            userPhone={userPhone}
                            userId={userId}
                            priority={index < 3}
                            darkMode={darkMode}
                        />
                    </div>
                ))}
            </div>

            {hasMore && (
                <div className="mt-10 flex justify-center">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`group flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl ${
                            isExpanded 
                            ? 'bg-brk-background text-brk-muted hover:bg-brk-surface' 
                            : 'bg-brk-primary text-brk-on-primary shadow-brk-primary/20'
                        }`}
                    >
                        {isExpanded ? (
                            <> Thu gọn lộ trình <ChevronUp className="w-3.5 h-3.5" /> </>
                        ) : (
                            <> Xem tất cả ({ (courses?.length || 0) - displayCount} khóa) <ChevronDown className="w-3.5 h-3.5 animate-bounce group-hover:animate-none" /> </>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
