'use client'

import React from 'react'
import Image from 'next/image'
import { BonusesSectionContent } from '@/lib/course-page/types'

interface BonusesSectionProps {
  id: string
  content: BonusesSectionContent
}

export default function BonusesSection({ id, content }: BonusesSectionProps) {
  if (!content.items || content.items.length === 0) return null

  return (
    <section id={id} className="section-soft" style={{ padding: 'var(--section-space) 24px' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        <div style={{ marginBottom: '52px', textAlign: 'center' }}>
          {content.eyebrow && (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '20px' }}>
              {content.eyebrow}
            </div>
          )}
          <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text-heading)', margin: '0 auto', maxWidth: '640px' }}>
            {content.title}
          </h2>
          {content.description && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', lineHeight: 1.75, color: 'var(--text-body)', maxWidth: '540px', margin: '16px auto 0' }}>
              {content.description}
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {content.items.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-dark)',
                borderRadius: 'var(--radius-card)',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 12px 30px rgba(0,0,0,.25)',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 18px 50px rgba(0,0,0,.35)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,.25)'
              }}
            >
              <div>
                {item.imageUrl && (
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px', background: 'var(--bg-dark-soft)' }}>
                    <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                  </div>
                )}
                <h4 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '22px', fontWeight: 700, color: 'var(--accent)', marginBottom: '10px', lineHeight: 1.2 }}>
                  {item.title}
                </h4>
                {item.description && (
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.75, color: 'var(--text-muted)', margin: '0 0 16px' }}>
                    {item.description}
                  </p>
                )}
              </div>
              {item.statedValue && (
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: 'var(--accent)', borderTop: '1px solid var(--border-dark)', paddingTop: '12px', marginTop: 'auto', letterSpacing: '0.04em' }}>
                  Trị giá: {item.statedValue.toLocaleString('vi-VN')} {item.currency || 'VND'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
