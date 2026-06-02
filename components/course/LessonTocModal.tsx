'use client'

import React, { useState, useEffect } from 'react'
import { X, BookOpen, Loader2 } from 'lucide-react'
import { getCourseLessonsAction } from '@/app/actions/course-actions'

interface LessonTocModalProps {
    isOpen: boolean
    onClose: () => void
    courseId: number
    courseName: string
}

export default function LessonTocModal({ isOpen, onClose, courseId, courseName }: LessonTocModalProps) {
    const [lessons, setLessons] = useState<{ id: string; title: string; order: number }[]>([])
    const [loading, setLoading] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            setLoading(true)
            getCourseLessonsAction(courseId)
                .then(setLessons)
                .finally(() => setLoading(false))
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, courseId])

    if (!mounted || !isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-[85vw] h-[85vh] max-w-5xl bg-brk-surface rounded-3xl shadow-2xl border border-brk-outline overflow-hidden animate-in zoom-95 fade-in duration-200 flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-brk-outline shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-brk-primary/10 flex items-center justify-center shrink-0">
                            <BookOpen className="w-5 h-5 text-brk-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg font-black text-brk-on-surface">
                                {courseName}
                            </h3>
                            <p className="text-xs text-brk-accent">
                                {loading ? 'Đang tải...' : `${lessons.length} bài học`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-brk-surface-dark hover:bg-brk-primary/10 flex items-center justify-center transition-colors shrink-0 ml-4"
                    >
                        <X className="w-4 h-4 text-brk-on-surface" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 text-brk-primary animate-spin" />
                        </div>
                    ) : lessons.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-brk-muted">
                            <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm font-medium">Chưa có bài học nào</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {lessons.map((lesson) => (
                                <li key={lesson.id}>
                                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brk-background/50 hover:bg-brk-primary/5 transition-colors border border-brk-outline/50">
                                        <span className="w-7 h-7 rounded-full bg-brk-primary/10 text-brk-primary text-[11px] font-black flex items-center justify-center shrink-0">
                                            {lesson.order}
                                        </span>
                                        <span className="text-sm font-medium text-brk-on-surface leading-snug">
                                            {lesson.title}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
