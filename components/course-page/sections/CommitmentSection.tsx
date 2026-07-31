'use client'

import React from 'react'
import { CommitmentSectionContent } from '@/lib/course-page/types'

interface CommitmentSectionProps {
  id: string
  content: CommitmentSectionContent
}

export default function CommitmentSection({ id, content }: CommitmentSectionProps) {
  return (
    <section id={id} className="section-dark" style={{ padding: 'var(--section-space) 24px' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '56px', alignItems: 'start' }}>
          {/* Left: Title + Rewards */}
          <div>
            {content.eyebrow && (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '20px' }}>
                {content.eyebrow}
              </div>
            )}
            <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text-heading)', marginBottom: '20px' }}>
              {content.title}
            </h2>
            {content.description && (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', lineHeight: 1.75, color: 'var(--text-body)', marginBottom: '28px' }}>
                {content.description}
              </p>
            )}

            {content.rewards && content.rewards.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {content.rewards.map((reward) => (
                  <div
                    key={reward.id}
                    style={{
                      background: 'var(--bg-dark-soft)',
                      border: '1px solid rgba(200,107,61,0.2)',
                      borderRadius: 'var(--radius-card)',
                      padding: '24px',
                    }}
                  >
                    {reward.amount && (
                      <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '36px', fontWeight: 700, color: 'var(--accent)', lineHeight: 1, marginBottom: '8px' }}>
                        +{reward.amount.toLocaleString('vi-VN')} {reward.currency || 'VND'}
                      </div>
                    )}
                    <h4 style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '6px' }}>{reward.title}</h4>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{reward.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Refund card */}
          {content.refund && content.refund.enabled && (
            <div
              style={{
                background: 'var(--bg-dark-soft)',
                border: '1px solid var(--border-dark)',
                borderRadius: 'var(--radius-card)',
                padding: '40px',
                boxShadow: '0 12px 30px rgba(0,0,0,.25)',
              }}
            >
              <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '24px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '24px', lineHeight: 1.2 }}>
                {content.refund.headline}
              </h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
                {content.refund.conditions.map((cond, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'var(--text-body)', lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>✓</span>
                    <span>{cond}</span>
                  </li>
                ))}
              </ul>
              {content.refund.note && (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-dark)', lineHeight: 1.6 }}>
                  {content.refund.note}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
