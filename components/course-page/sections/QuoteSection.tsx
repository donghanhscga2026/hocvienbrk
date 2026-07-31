'use client'

import React from 'react'
import { QuoteSectionContent } from '@/lib/course-page/types'

interface QuoteSectionProps {
  id: string
  content: QuoteSectionContent
}

export default function QuoteSection({ id, content }: QuoteSectionProps) {
  return (
    <section id={id} className="section-light" style={{ padding: 'var(--section-space) 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <blockquote style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontSize: 'clamp(26px, 3.5vw, 40px)',
          fontWeight: 400,
          fontStyle: 'italic',
          letterSpacing: '-0.01em',
          lineHeight: 1.4,
          color: '#2E2A27',
          margin: 0,
        }}>
          {content.quote.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < content.quote.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </blockquote>

        {(content.author || content.caption) && (
          <cite style={{ display: 'block', marginTop: '28px', fontStyle: 'normal' }}>
            {content.author && (
              <span style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '15px', color: 'var(--accent)', letterSpacing: '0.04em' }}>
                — {content.author}
              </span>
            )}
            {content.caption && (
              <span style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#6B6459', marginTop: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {content.caption}
              </span>
            )}
          </cite>
        )}
      </div>
    </section>
  )
}
