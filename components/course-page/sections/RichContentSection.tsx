'use client'

import React from 'react'
import Image from 'next/image'
import { isValidImageUrl } from '@/lib/image-validation'

export interface RichContentSectionContent {
  eyebrow?: string
  title?: string
  description?: string
  paragraphs?: string[]
  imageUrl?: string
  imageAlt?: string
  imagePosition?: 'left' | 'right' | 'top'
  cta?: { label: string; action: 'open_registration' | 'scroll' | 'external_link'; target?: string }
}

interface Props {
  id: string
  variant?: string
  content: RichContentSectionContent
  onAction?: (actionType: string, target?: string) => void
}

export default function RichContentSection({ id, variant, content, onAction }: Props) {
  const imagePosition = content.imagePosition || 'right'
  const imageFirst = imagePosition === 'left'
  const isTop = imagePosition === 'top'
  const image = content.imageUrl && isValidImageUrl(content.imageUrl) ? (
    <div className={isTop ? 'mb-8' : ''}>
      <div className="relative overflow-hidden rounded-[var(--radius-card)] min-h-[260px] md:min-h-[360px]">
        <Image src={content.imageUrl} alt={content.imageAlt || content.title || ''} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
    </div>
  ) : null

  return (
    <section id={id} className={variant || 'section-light'} style={{ padding: 'clamp(64px, 9vw, var(--section-space)) 24px' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        {isTop && image}
        <div className={isTop ? '' : 'grid items-center gap-10 md:grid-cols-2 md:gap-16'}>
          {!isTop && imageFirst && image}
          <div>
            {content.eyebrow && <div className="mb-4 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>{content.eyebrow}</div>}
            {content.title && <h2 className="mb-5 text-3xl font-bold md:text-5xl" style={{ color: 'var(--course-text)' }}>{content.title}</h2>}
            {content.description && <p className="mb-5 text-lg leading-8" style={{ color: 'var(--course-muted)' }}>{content.description}</p>}
            <div className="space-y-4">
              {(content.paragraphs || []).map((p, i) => <p key={i} className="leading-8" style={{ color: 'var(--course-muted)' }}>{p}</p>)}
            </div>
            {content.cta && (
              <button onClick={() => onAction?.(content.cta!.action, content.cta!.target)} className="mt-8 px-7 py-3 font-bold" style={{ background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-button)' }}>
                {content.cta.label}
              </button>
            )}
          </div>
          {!isTop && !imageFirst && image}
        </div>
      </div>
    </section>
  )
}
