'use client'

import React from 'react'
import { BenefitsSectionContent } from '@/lib/course-page/types'

interface BenefitsSectionProps {
  id: string
  content: BenefitsSectionContent
}

export default function BenefitsSection({ id, content }: BenefitsSectionProps) {
  return (
    <section id={id} className="section-dark" style={{ padding: 'var(--section-space) 24px' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        <div style={{ marginBottom: '56px' }}>
          {content.eyebrow && (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '20px' }}>
              {content.eyebrow}
            </div>
          )}
          <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text-heading)', maxWidth: '640px', margin: 0 }}>
            {content.title}
          </h2>
          {content.description && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', lineHeight: 1.75, color: 'var(--text-body)', maxWidth: '540px', marginTop: '16px', marginBottom: 0 }}>
              {content.description}
            </p>
          )}
        </div>

        <div>
          {content.items.map((item, idx) => {
            const isFeatured = item.featured
            return (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: '24px',
                  padding: '32px 0',
                  borderBottom: idx < content.items.length - 1 ? '1px solid var(--border-dark)' : 'none',
                  alignItems: 'start',
                  ...(isFeatured ? {
                    background: 'var(--bg-dark-soft)',
                    border: '1px solid rgba(200,107,61,0.3)',
                    borderRadius: 'var(--radius-card)',
                    padding: '24px',
                    margin: '8px 0',
                    boxShadow: '0 12px 30px rgba(0,0,0,.25)',
                  } : {}),
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {item.badge && (
                    <span style={{ display: 'inline-block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--accent)', color: '#FFF7ED', padding: '3px 10px', borderRadius: '999px' }}>
                      {item.badge}
                    </span>
                  )}
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                    {item.icon || '—'}
                  </span>
                </div>
                <div>
                  <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em', color: isFeatured ? 'var(--accent)' : 'var(--text-heading)', marginBottom: '8px', lineHeight: 1.2 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.75, color: 'var(--text-muted)', margin: 0 }}>
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
