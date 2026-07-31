'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen, Clock } from 'lucide-react'

interface CurriculumSectionProps {
  id: string
  lessons?: any[]
  totalHours?: number
}

export default function CurriculumSection({ id, lessons = [], totalHours = 0 }: CurriculumSectionProps) {
  const [showAllLessons, setShowAllLessons] = useState(false)
  const displayLessons = showAllLessons ? lessons : lessons.slice(0, 3)
  const hasMoreLessons = lessons.length > 3

  if (!lessons || lessons.length === 0) return null

  return (
    <section id={id} className="py-20 px-6 bg-[var(--course-surface)] border-t border-[var(--course-border)]">
      <div className="max-w-[var(--course-container-max)] mx-auto">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-serif font-black text-[var(--course-text)] mb-4">
            Nội dung khóa học
          </h2>
          <div className="flex items-center gap-6 text-sm text-[var(--course-muted)] mb-8">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--course-primary)]" />
              <span>{lessons.length} bài học</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--course-primary)]" />
              <span>{totalHours} giờ</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {displayLessons.map((lesson, index) => (
              <div 
                key={lesson.id}
                className="flex items-center gap-4 p-4 bg-[var(--course-bg)] rounded-xl border border-[var(--course-border)]"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--course-primary)]/10 flex items-center justify-center text-[var(--course-primary)] font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[var(--course-text)]">
                    {lesson.title}
                  </h4>
                </div>
              </div>
            ))}
          </div>
          
          {hasMoreLessons && (
            <button
              onClick={() => setShowAllLessons(!showAllLessons)}
              className="mt-6 flex items-center gap-2 text-[var(--course-primary)] font-medium hover:underline"
            >
              {showAllLessons ? (
                <>
                  <ChevronUp className="w-5 h-5" />
                  Thu gọn
                </>
              ) : (
                <>
                  <ChevronDown className="w-5 h-5" />
                  Xem thêm {lessons.length - 3} bài học
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
