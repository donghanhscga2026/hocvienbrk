'use client'

import React from 'react'
import Image from 'next/image'
import { isValidImageUrl } from '@/lib/image-validation'

export interface WiGrowArtworkSectionContent {
  imageUrl: string
  imageAlt?: string
  maxWidth?: number
  background?: string
}

interface Props { id: string; content: WiGrowArtworkSectionContent }

export default function WiGrowArtworkSection({ id, content }: Props) {
  if (!isValidImageUrl(content.imageUrl)) return null
  return (
    <section id={id} style={{ background: content.background || '#fff', padding: 0, overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: content.maxWidth ? content.maxWidth + 'px' : '750px', margin: '0 auto' }}>
        <Image
          src={content.imageUrl}
          alt={content.imageAlt || ''}
          width={750}
          height={1194}
          sizes="(max-width: 750px) 100vw, 750px"
          style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
        />
      </div>
    </section>
  )
}
