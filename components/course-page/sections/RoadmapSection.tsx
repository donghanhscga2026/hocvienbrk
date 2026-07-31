'use client'

import React from 'react'
import { RoadmapSectionContent } from '@/lib/course-page/types'

interface RoadmapSectionProps {
  id: string
  content: RoadmapSectionContent
}

export default function RoadmapSection({ id, content }: RoadmapSectionProps) {
  return (
    <section id={id} className="section-dark" style={{ padding: 'var(--section-space) 24px' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        <div style={{ marginBottom: '52px' }}>
          {content.eyebrow && (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '20px' }}>
              {content.eyebrow}
            </div>
          )}
          <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text-heading)', maxWidth: '560px', margin: 0 }}>
            {content.title}
          </h2>
          {content.description && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', lineHeight: 1.75, color: 'var(--text-body)', maxWidth: '540px', marginTop: '16px', marginBottom: 0 }}>
              {content.description}
            </p>
          )}
        </div>

        <div>
          {content.phases.map((phase, idx) => (
            <div
              key={phase.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr',
                gap: '24px',
                padding: '32px 0',
                borderBottom: idx < content.phases.length - 1 ? '1px solid var(--border-dark)' : 'none',
                alignItems: 'start',
              }}
            >
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: '4px' }}>
                {phase.period}
              </div>
              <div>
                <h4 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-heading)', marginBottom: '10px', lineHeight: 1.2 }}>
                  {phase.title}
                </h4>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.75, color: 'var(--text-muted)', margin: 0 }}>
                  {phase.description}
                </p>
                {phase.details && phase.details.length > 0 && (
                  <ul style={{ marginTop: '12px', paddingLeft: '20px', listStyleType: 'disc', color: 'var(--text-muted)' }}>
                    {phase.details.map((detail, i) => (
                      <li key={i} style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', lineHeight: 1.75, marginBottom: '4px' }}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
