'use client'

import React, { useState, useEffect, useRef } from 'react'
import CourseCard from '@/components/course/CourseCard'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'

interface CourseSectionProps {
    title: string
    courses: any[]
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
    
    // Hàm reset bộ đếm thời gian
    const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (intervalRef.current) clearInterval(intervalRef.current)
        
        if (isExpanded) {
            setCountdown(10)
            
            // Đếm ngược số giây
            intervalRef.current = setInterval(() => {
                setCountdown(prev => (prev > 0 ? prev - 1 : 0))
            }, 1000)

            // Thực hiện thu gọn sau 10 giây
            timerRef.current = setTimeout(() => {
                setIsExpanded(false)
            }, 10000)
        }
    }

    useEffect(() => {
        if (isExpanded) {
            resetTimer()
            const handleActivity = () => resetTimer()
            window.addEventListener('scroll', handleActivity)
            window.addEventListener('touchmove', handleActivity)

            return () => {
                if (timerRef.current) clearTimeout(timerRef.current)
                if (intervalRef.current) clearInterval(intervalRef.current)
                window.removeEventListener('scroll', handleActivity)
                window.removeEventListener('touchmove', handleActivity)
            }
        }
    }, [isExpanded])

    // Chỉ hiển thị 3 khóa học đầu tiên nếu chưa nhấn "Xem thêm"
    const visibleCourses = isExpanded ? courses : courses.slice(0, 3)
    const hasMore = courses.length > 3

    return (
        <div className={`mb-12 rounded-3xl transition-all duration-500 ${darkMode ? '-mx-4 px-4 py-10 bg-zinc-950 shadow-2xl shadow-black/50' : ''}`}>
            {/* Thông báo đếm ngược nổi */}
            {isExpanded && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-black/90 backdrop-blur-md text-yellow-400 px-4 py-2 rounded-full border border-yellow-400/30 shadow-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ring-4 ring-black/10">
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span>Tự động thu gọn sau <span className="text-white text-xs">{countdown}</span> giây</span>
                    </div>
                </div>
            )}

            <div className="mb-8 text-center">
                <h2 className={`text-2xl font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {title}
                </h2>
                <div className={`mx-auto mt-2 h-1 w-12 rounded-full ${accentColor}`}></div>
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
                        className={`group flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                            darkMode 
                            ? 'bg-white text-black hover:bg-yellow-400' 
                            : 'bg-black text-white hover:bg-zinc-800'
                        }`}
                    >
                        {isExpanded ? (
                            <> Thu gọn <ChevronUp className="w-4 h-4" /> </>
                        ) : (
                            <> Xem thêm ({courses.length - 3}) <ChevronDown className="w-4 h-4 animate-bounce group-hover:animate-none" /> </>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
