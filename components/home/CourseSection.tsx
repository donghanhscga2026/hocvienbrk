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

    const visibleCourses = isExpanded ? courses : courses.slice(0, 1)
    const hasMore = courses.length > 1

    return (
        <div 
            ref={groupRef}
            onMouseMove={handleActivity}
            onTouchStart={handleActivity}
            className={`relative p-6 rounded-[2.5rem] border-2 transition-all duration-500 ${
                isExpanded 
                ? 'bg-white border-yellow-400 shadow-2xl z-20 mb-8' 
                : 'bg-gray-50/50 border-gray-100 hover:border-gray-200 mb-4'
            }`}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isExpanded ? 'bg-yellow-400 text-black' : 'bg-white text-gray-400 shadow-sm'}`}>
                        <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-widest ${isExpanded ? 'text-black' : 'text-gray-500'}`}>
                            {categoryName}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">
                            {courses.length} khóa học
                        </p>
                    </div>
                </div>

                {isExpanded && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 rounded-full border border-yellow-200 animate-in fade-in zoom-in duration-300">
                        <Clock className="w-3 h-3 text-yellow-600 animate-pulse" />
                        <span className="text-[9px] font-black text-yellow-700 uppercase">Đóng sau {countdown}s</span>
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
                            ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' 
                            : 'bg-black text-white hover:bg-yellow-400 hover:text-black shadow-lg shadow-black/10'
                        }`}
                    >
                        {isExpanded ? (
                            <> Thu gọn <ChevronUp className="w-3.5 h-3.5" /> </>
                        ) : (
                            <> Xem thêm {courses.length - 1} khóa <ChevronDown className="w-3.5 h-3.5 animate-bounce group-hover:animate-none" /> </>
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
    // Nếu có groupedCourses thì hiển thị theo nhóm
    if (groupedCourses && groupedCourses.length > 0) {
        return (
            <div className={`mb-16 rounded-[3rem] transition-all duration-500 ${darkMode ? '-mx-4 px-4 py-12 bg-zinc-950 shadow-2xl' : ''}`}>
                <div className="mb-10 text-center">
                    <h2 className={`text-2xl md:text-3xl font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
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

    // Hiển thị dạng phẳng như cũ cho "Khóa học của tôi"
    const visibleCourses = courses || []

    return (
        <div className={`mb-12 rounded-3xl transition-all duration-500 ${darkMode ? '-mx-4 px-4 py-10 bg-zinc-950 shadow-2xl shadow-black/50' : ''}`}>
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
        </div>
    )
}
