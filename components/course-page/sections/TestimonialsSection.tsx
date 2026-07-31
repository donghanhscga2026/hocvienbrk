'use client'

import React from 'react'
import Image from 'next/image'
import { Star, MessageSquare } from 'lucide-react'

interface Testimonial {
  id: string
  name: string
  role?: string | null
  avatar?: string | null
  content: string
  rating?: number | null
}

interface TestimonialsSectionProps {
  id: string
  testimonials?: Testimonial[]
}

export default function TestimonialsSection({ id, testimonials = [] }: TestimonialsSectionProps) {
  return (
    <section id={id} className="py-20 px-6 bg-[var(--course-bg)] border-t border-[var(--course-border)]">
      <div className="max-w-[var(--course-container-max)] mx-auto">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-serif font-black text-[var(--course-text)] mb-8">
            Học viên nói gì về khóa học
          </h2>
          
          {testimonials && testimonials.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.slice(0, 3).map((testimonial) => (
                <div 
                  key={testimonial.id}
                  className="bg-[var(--course-surface)] rounded-2xl p-6 border border-[var(--course-border)] shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(testimonial.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-[var(--course-secondary)] text-[var(--course-secondary)]" />
                      ))}
                    </div>
                    <p className="text-[var(--course-text)] mb-6 leading-relaxed italic text-sm">
                      "{testimonial.content}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 border-t border-[var(--course-border)] pt-4 mt-auto">
                    {testimonial.avatar ? (
                      <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--course-primary)]/10 flex items-center justify-center text-[var(--course-primary)] font-bold">
                        {testimonial.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-[var(--course-text)] text-sm">
                        {testimonial.name}
                      </p>
                      {testimonial.role && (
                        <p className="text-[var(--course-muted)] text-xs">
                          {testimonial.role}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 bg-[var(--course-surface)] rounded-2xl border border-[var(--course-border)]">
              <MessageSquare className="w-12 h-12 mx-auto text-[var(--course-muted)] mb-4" />
              <h3 className="text-lg font-bold text-[var(--course-text)] mb-2">
                Chưa có chia sẻ nào
              </h3>
              <p className="text-[var(--course-muted)] max-w-md mx-auto leading-relaxed text-sm">
                Hãy tham gia khóa học và để lại cảm nhận của bạn để giúp cộng đồng học viên có thêm động lực nhé!
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
