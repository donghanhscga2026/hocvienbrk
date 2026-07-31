'use client'

import React from 'react'
import { ClosingMessageSectionContent } from '@/lib/course-page/types'

interface ClosingMessageSectionProps {
  id: string
  content: ClosingMessageSectionContent
  isEnrolled?: boolean
  onAction?: (actionType: string, target?: string) => void
}

export default function ClosingMessageSection({ id, content, isEnrolled, onAction }: ClosingMessageSectionProps) {
  return (
    <section id={id} className="section-dark" style={{ padding: 'var(--section-space) 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        {content.title && (
          <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 700, fontStyle: 'italic', letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--text-heading)', marginBottom: '36px' }}>
            {content.title}
          </h2>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '48px' }}>
          {content.paragraphs.map((paragraph, idx) => (
            <p key={idx} style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', lineHeight: 1.75, color: 'var(--text-body)', margin: 0 }}>
              {paragraph}
            </p>
          ))}
        </div>

        <button
          onClick={() => onAction && onAction('open_registration')}
          style={{
            background: 'var(--accent)',
            color: '#FFF7ED',
            fontFamily: 'Inter, sans-serif',
            fontSize: '18px',
            fontWeight: 700,
            padding: '18px 48px',
            borderRadius: 'var(--radius-button)',
            border: 'none',
            cursor: 'pointer',
            transition: 'var(--transition)',
            boxShadow: '0 12px 30px rgba(200, 107, 61, 0.35)',
            letterSpacing: '0.02em',
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
          {isEnrolled ? 'Vào học ngay' : 'Bắt đầu hành trình ngay'}
        </button>

        {content.signature && (
          <div style={{ marginTop: '56px', paddingTop: '32px', borderTop: '1px solid var(--border-dark)' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '20px', fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '4px' }}>
              {content.signature}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
