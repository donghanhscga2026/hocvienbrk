'use client'

import React from 'react'
import { OutcomesSectionContent } from '@/lib/course-page/types'

interface OutcomesSectionProps {
  id: string
  content: OutcomesSectionContent
}

export default function OutcomesSection({ id, content }: OutcomesSectionProps) {
  return (
    <section id={id} className="section-success" style={{ padding: 'var(--section-space) 24px' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        <div style={{ marginBottom: '52px' }}>
          {content.eyebrow && (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-heading)', opacity: 0.7, marginBottom: '20px' }}>
              {content.eyebrow}
            </div>
          )}
          <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text-heading)', maxWidth: '560px', margin: 0 }}>
            {content.title}
          </h2>
          {content.description && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', lineHeight: 1.75, color: 'var(--text-heading)', opacity: 0.85, maxWidth: '540px', marginTop: '16px', marginBottom: 0 }}>
              {content.description}
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {content.items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: '16px',
                padding: '24px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 'var(--radius-card)',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 18px 50px rgba(0,0,0,.35)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-heading)', flexShrink: 0 }}>✓</div>
              <div>
                {item.title && (
                  <h4 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '6px', lineHeight: 1.2 }}>
                    {item.title}
                  </h4>
                )}
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.75, color: 'var(--text-heading)', opacity: 0.85, margin: 0 }}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
