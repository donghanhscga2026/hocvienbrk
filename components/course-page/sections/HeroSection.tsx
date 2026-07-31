'use client'

import React from 'react'
import Image from 'next/image'
import { Share2, BookOpen, Clock, Users } from 'lucide-react'
import { HeroSectionContent } from '@/lib/course-page/types'

interface HeroSectionProps {
  id: string
  variant?: string
  content: HeroSectionContent
  isEnrolled?: boolean
  lessons?: any[]
  totalHours?: number
  activeStudentCount?: number
  course?: any
  session?: any
  onAction?: (actionType: string, target?: string) => void
}

export default function HeroSection({
  id,
  variant,
  content,
  isEnrolled = false,
  lessons = [],
  totalHours = 0,
  activeStudentCount = 0,
  course,
  session,
  onAction,
}: HeroSectionProps) {


  const handlePrimaryClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (onAction) onAction(content.primaryCta.action, content.primaryCta.target)
  }

  const handleSecondaryClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (content.secondaryCta && onAction) onAction(content.secondaryCta.action, content.secondaryCta.target)
  }

  const canShare = !!session
  const shareInfo = !canShare
    ? 'Đăng nhập để chia sẻ và nhận hoa hồng affiliate.'
    : isEnrolled
    ? 'Chia sẻ link để nhận 100% hoa hồng khi đã kích hoạt.'
    : 'Chia sẻ link để nhận 50% hoa hồng khi chưa kích hoạt.'

  const handleShareClick = () => {
    if (onAction) onAction('open_share')
  }

  const imageSrc = content.imageUrl || course?.link_anh_bia || course?.link_anh_bia_khoa

  return (
    <header id={id} className="section-dark" style={{ padding: 'var(--section-space) 24px', paddingTop: 'calc(var(--section-space) + 20px)' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>

        {content.eyebrow && (
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ width: '24px', height: '1px', background: 'var(--accent)' }} />
            {content.eyebrow}
          </div>
        )}

        <h1 style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontSize: 'clamp(38px, 5vw, 60px)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
          color: 'var(--text-heading)',
          marginBottom: '24px',
          maxWidth: '760px',
        }}>
          {content.title}
          {content.highlightedText && (
            <em style={{ color: 'var(--accent)', fontStyle: 'italic', fontWeight: 400 }}> {content.highlightedText}</em>
          )}
        </h1>

        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '18px',
          lineHeight: 1.75,
          color: 'var(--text-body)',
          maxWidth: '640px',
          marginBottom: '28px',
        }}>
          {content.description}
        </p>

        {/* Dynamic stats */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '36px', color: 'var(--text-muted)', fontSize: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} color="var(--accent)" />
            <span>{lessons?.length || 0} bài học</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--accent)" />
            <span>{totalHours || 0} giờ học</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--accent)" />
            <span>{activeStudentCount || 0} học viên</span>
          </div>
        </div>

        {/* Content stats from DB */}
        {content.stats && content.stats.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '36px', marginBottom: '44px' }}>
            {content.stats.map((stat, idx) => (
              <div key={idx} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '16px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '32px', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '36px' }}>
          <button
            onClick={handlePrimaryClick}
            style={{
              background: 'var(--accent)',
              color: '#FFF7ED',
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              padding: '16px 36px',
              borderRadius: 'var(--radius-button)',
              border: 'none',
              cursor: 'pointer',
              transition: 'var(--transition)',
              boxShadow: '0 12px 30px rgba(200, 107, 61, 0.3)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--accent-hover)'
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--accent)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {content.primaryCta.label}
          </button>

          {content.secondaryCta && (
            <button
              onClick={handleSecondaryClick}
              style={{
                background: 'transparent',
                color: 'var(--text-heading)',
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px',
                fontWeight: 500,
                padding: '14px 28px',
                borderRadius: 'var(--radius-button)',
                border: '1px solid var(--border-dark)',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-dark)')}
            >
              {content.secondaryCta.label}
            </button>
          )}
        </div>

        {/* Affiliate share */}
        <div style={{ paddingTop: '24px', borderTop: '1px solid var(--border-dark)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={handleShareClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '10px 18px',
              borderRadius: 'var(--radius-button)',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,107,61,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Share2 size={14} />
            Chia sẻ link giới thiệu
          </button>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            {shareInfo}
          </p>
        </div>

        {/* Cover image */}
        {imageSrc && (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-card)', overflow: 'hidden', marginTop: '56px', boxShadow: '0 12px 30px rgba(0,0,0,.25)' }}>
            <Image src={imageSrc} alt={content.imageAlt || content.title} fill className="object-cover" />
          </div>
        )}
      </div>
    </header>
  )
}
