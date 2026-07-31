'use client'

import React from 'react'
import Image from 'next/image'
import { InstructorSectionContent } from '@/lib/course-page/types'

interface InstructorSectionProps {
  id: string
  variant?: string
  content: InstructorSectionContent
}

export default function InstructorSection({ id, variant, content }: InstructorSectionProps) {
  const isImageRight = variant === 'single-image-right'

  return (
    <section id={id} className="section-light" style={{ padding: 'var(--section-space) 24px' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        <div style={{ marginBottom: '52px' }}>
          {content.eyebrow && (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '20px' }}>
              {content.eyebrow}
            </div>
          )}
          <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: '#2E2A27', maxWidth: '560px', margin: 0 }}>
            {content.title}
          </h2>
          {content.description && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', lineHeight: 1.75, color: '#6B6459', maxWidth: '540px', marginTop: '16px', marginBottom: 0 }}>
              {content.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {content.instructors.map((ins) => (
            <div
              key={ins.id}
              style={{
                background: '#F6EDDE',
                borderRadius: 'var(--radius-card)',
                padding: '48px',
                display: 'flex',
                flexDirection: isImageRight ? 'row-reverse' : 'row',
                gap: '40px',
                alignItems: 'center',
                boxShadow: '0 12px 30px rgba(0,0,0,.08)',
                flexWrap: 'wrap',
              }}
            >
              {ins.imageUrl && (
                <div style={{ position: 'relative', width: '180px', height: '180px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 12px 30px rgba(0,0,0,.15)' }}>
                  <Image src={ins.imageUrl} alt={ins.imageAlt || ins.name} fill className="object-cover" />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '8px' }}>
                  {ins.role}
                </div>
                <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#2E2A27', marginBottom: '20px', lineHeight: 1.15 }}>
                  {ins.name}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {ins.bio.map((paragraph, index) => (
                    <p key={index} style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.75, color: '#6B6459', margin: 0 }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
                {ins.socialLinks && ins.socialLinks.length > 0 && (
                  <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
                    {ins.socialLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
                      >
                        {link.platform}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
