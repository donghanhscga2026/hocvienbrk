'use client'

import React from 'react'
import { PainPointsSectionContent } from '@/lib/course-page/types'

interface PainPointsSectionProps {
  id: string
  content: PainPointsSectionContent
}

export default function PainPointsSection({ id, content }: PainPointsSectionProps) {
  return (
    <section id={id} className="section-soft" style={{ padding: 'var(--section-space) 24px' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '56px', alignItems: 'start' }}>
          <div>
            {content.eyebrow && (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '20px' }}>
                {content.eyebrow}
              </div>
            )}
            <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text-heading)', margin: '0 0 20px' }}>
              {content.title}
            </h2>
            {content.description && (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', lineHeight: 1.75, color: 'var(--text-body)', margin: 0 }}>
                {content.description}
              </p>
            )}
          </div>

          <div>
            {content.items.map((item, idx) => (
              <div key={item.id} style={{ padding: '24px 0', borderBottom: idx < content.items.length - 1 ? '1px solid var(--border-dark)' : 'none' }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-heading)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {item.icon && <span>{item.icon}</span>}
                  {item.title}
                </h3>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.75, color: 'var(--text-muted)', margin: 0 }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
