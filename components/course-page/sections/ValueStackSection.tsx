'use client'

import React from 'react'
import { ValueStackSectionContent } from '@/lib/course-page/types'

interface ValueStackSectionProps {
  id: string
  content: ValueStackSectionContent
}

export default function ValueStackSection({ id, content }: ValueStackSectionProps) {
  return (
    <section id={id} className="section-soft" style={{ padding: 'var(--section-space) 24px' }}>
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

        <div style={{ border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-card)', overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,.25)', maxWidth: '760px' }}>
          {content.items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 28px',
                borderBottom: idx < content.items.length - 1 ? '1px solid var(--border-dark)' : 'none',
                background: idx % 2 === 0 ? 'var(--bg-dark)' : 'var(--bg-dark-soft)',
              }}
            >
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--text-body)' }}>{item.label}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                {item.displayValue || (item.maxValue ? `${item.maxValue.toLocaleString('vi-VN')} VND` : '')}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', background: 'var(--accent)', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, color: '#FFF7ED' }}>Tổng giá trị bạn nhận được</span>
            <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '28px', fontWeight: 700, color: '#FFF7ED' }}>
              {content.totalDisplayValue}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
