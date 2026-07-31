'use client'

import React from 'react'
import { PricingSectionContent } from '@/lib/course-page/types'

interface PricingSectionProps {
  id: string
  content: PricingSectionContent
  isEnrolled?: boolean
  onAction?: (actionType: string, target?: string) => void
}

export default function PricingSection({ id, content, isEnrolled, onAction }: PricingSectionProps) {
  return (
    <section id={id} className="section-dark" style={{ padding: 'var(--section-space) 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        <div style={{ marginBottom: '52px' }}>
          {content.eyebrow && (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '20px' }}>
              {content.eyebrow}
            </div>
          )}
          {content.title && (
            <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text-heading)', margin: 0 }}>
              {content.title}
            </h2>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '24px' }}>
          {content.plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: plan.featured ? 'var(--accent)' : 'var(--bg-dark-soft)',
                border: plan.featured ? 'none' : '1px solid var(--border-dark)',
                borderRadius: 'var(--radius-card)',
                padding: '48px 40px',
                maxWidth: '480px',
                width: '100%',
                textAlign: 'left',
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
              {plan.badge && (
                <div style={{ display: 'inline-block', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: plan.featured ? 'rgba(255,255,255,0.15)' : 'var(--accent)', color: '#FFF7ED', padding: '4px 12px', borderRadius: '999px', marginBottom: '20px' }}>
                  {plan.badge}
                </div>
              )}

              <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '28px', fontWeight: 700, color: plan.featured ? '#FFF7ED' : 'var(--text-heading)', marginBottom: '8px', lineHeight: 1.2 }}>
                {plan.name}
              </h3>

              {plan.originalPrice && (
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: plan.featured ? 'rgba(255,247,237,0.6)' : 'var(--text-muted)', textDecoration: 'line-through', marginBottom: '8px' }}>
                  {plan.originalPrice.toLocaleString('vi-VN')} {plan.currency}
                </div>
              )}

              <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '52px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: plan.featured ? '#FFF7ED' : 'var(--accent)', marginBottom: '4px' }}>
                {plan.price.toLocaleString('vi-VN')}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: plan.featured ? 'rgba(255,247,237,0.7)' : 'var(--text-muted)', marginBottom: '28px' }}>
                {plan.currency}
              </div>

              {plan.description && (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.75, color: plan.featured ? 'rgba(255,247,237,0.85)' : 'var(--text-body)', marginBottom: '28px' }}>
                  {plan.description}
                </p>
              )}

              {plan.features && plan.features.length > 0 && (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                  {plan.features.map((feat: string, idx: number) => (
                    <li key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: plan.featured ? 'rgba(255,247,237,0.9)' : 'var(--text-body)' }}>
                      <span style={{ color: plan.featured ? '#FFF7ED' : 'var(--accent)', flexShrink: 0 }}>✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={() => onAction && onAction('open_registration')}
                style={{
                  width: '100%',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '16px',
                  fontWeight: 700,
                  padding: '16px 28px',
                  borderRadius: 'var(--radius-button)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  background: plan.featured ? '#FFF7ED' : 'var(--accent)',
                  color: plan.featured ? 'var(--accent)' : '#FFF7ED',
                  letterSpacing: '0.02em',
                  boxShadow: plan.featured ? '0 12px 30px rgba(0,0,0,.15)' : '0 12px 30px rgba(200,107,61,0.3)',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {isEnrolled ? 'Vào học ngay' : plan.ctaText}
              </button>
            </div>
          ))}
        </div>

        {content.paymentNote && (
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', marginTop: '32px', lineHeight: 1.75 }}>
            {content.paymentNote}
          </p>
        )}
      </div>
    </section>
  )
}
