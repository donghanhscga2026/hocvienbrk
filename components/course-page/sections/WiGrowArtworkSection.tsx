'use client'

import React from 'react'
import Image from 'next/image'
import { isValidImageUrl } from '@/lib/image-validation'

export interface WiGrowArtworkSectionContent {
  imageUrl: string
  imageAlt?: string
  maxWidth?: number
  background?: string
  overlay?: {
    eyebrow?: string
    title?: string
    accent?: string
    description?: string
    top?: number
  }
}

interface Props { id: string; content: WiGrowArtworkSectionContent }

export default function WiGrowArtworkSection({ id, content }: Props) {
  if (!isValidImageUrl(content.imageUrl)) return null
  const overlay = content.overlay
  return (
    <section id={id} style={{ background: content.background || '#fff', padding: 0, overflow: 'hidden' }}>
      <div style={{ position:'relative', width:'100%', maxWidth: content.maxWidth ? content.maxWidth + 'px' : '750px', margin:'0 auto' }}>
        <Image src={content.imageUrl} alt={content.imageAlt || ''} width={750} height={1194}
          sizes="(max-width: 750px) 100vw, 750px"
          style={{ width:'100%', height:'auto', display:'block', objectFit:'contain' }} />
        {overlay && <div style={{ position:'absolute', top:`${overlay.top ?? 15}%`, left:'5%', right:'5%', textAlign:'center', zIndex:2 }}>
          {overlay.eyebrow && <div style={{fontFamily:'var(--font-momo-signature, "Momo Signature"), cursive',fontSize:'clamp(24px,7vw,42px)',fontWeight:400,lineHeight:1.25,color:'#248641'}}>{overlay.eyebrow}</div>}
          {overlay.title && <div style={{fontFamily:'"Momo Signature", cursive',fontSize:'clamp(24px,7vw,42px)',fontWeight:700,lineHeight:1.25,color:'#248641'}}>{overlay.title}</div>}
          {overlay.accent && <div style={{fontFamily:'var(--font-momo-signature, "Momo Signature"), cursive',fontSize:'clamp(23px,6.5vw,38px)',fontWeight:400,lineHeight:1.2,color:'#cf9301',marginTop:4}}>{overlay.accent}</div>}
          {overlay.description && <div style={{fontFamily:'"Noto Serif", serif',fontSize:'clamp(12px,3.3vw,15px)',lineHeight:1.8,color:'#05224a',margin:'24px auto 0',maxWidth:'78%'}}>{overlay.description}</div>}
        </div>}
      </div>
    </section>
  )
}
