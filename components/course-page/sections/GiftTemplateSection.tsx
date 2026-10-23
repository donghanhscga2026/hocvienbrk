'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'
import type { CourseSection, HeroSectionContent, BenefitsSectionContent, InstructorSectionContent, PricingSectionContent, RichContentSectionContent, ClosingMessageSectionContent } from '@/lib/course-page/types'
import { isValidImageUrl } from '@/lib/image-validation'

type GiftContent = Partial<HeroSectionContent & BenefitsSectionContent & InstructorSectionContent & PricingSectionContent & RichContentSectionContent & ClosingMessageSectionContent>
type Testimonial = { id: string | number; name: string; content: string }

// Renderer riêng cho mẫu Quà tặng; các mẫu cũ vẫn giữ nguyên giao diện.
export default function GiftTemplateSection({ section, onAction, testimonials = [], isEnrolled = false, projectLabels }: { section: CourseSection; onAction?: (action: string, target?: string) => void; testimonials?: Testimonial[]; isEnrolled?: boolean; projectLabels?: ReactNode }) {
  const content = section.content as GiftContent
  const type = (section as CourseSection & { sectionType?: string }).sectionType || section.type
  const button = (label: string, action = 'open_registration', target?: string) => <button type="button" onClick={() => onAction?.(action, target)} className="gift-button">{label}</button>
  return <section id={section.anchorId || section.sectionKey} className={`gift-section ${type === 'hero' ? 'gift-hero' : ''}`}>
    <style>{`
      .gift-section{padding:64px 24px;color:var(--course-text);background:var(--course-bg);font-family:var(--course-body-font)}
      .gift-inner{max-width:var(--container);margin:auto}.gift-section h1,.gift-section h2,.gift-section h3{color:var(--course-text);margin:0 0 16px}
      .gift-section h1{font-size:clamp(36px,5vw,60px);line-height:1.15}.gift-section h2{font-size:clamp(28px,3vw,40px)}.gift-section p{color:var(--course-muted);font-size:16px;line-height:1.8;margin:0 0 20px}
      .gift-eyebrow{font-size:12px;letter-spacing:.12em;color:var(--course-primary);margin-bottom:18px}
      .gift-button{min-height:48px;padding:12px 24px;border:0;border-radius:var(--radius-button);background:var(--course-primary);color:white;font-size:15px;font-weight:600;cursor:pointer}
      .gift-hero-grid,.gift-grid{display:grid;gap:24px}.gift-hero-grid{align-items:center}.gift-image{width:100%;height:auto;border-radius:var(--radius-card);object-fit:cover}
      .gift-card{padding:28px;background:var(--course-surface);border:1px solid var(--course-border);border-radius:var(--radius-card)}.gift-card h3{font-size:21px}.gift-card p{font-size:15px;margin-bottom:0}.gift-icon{font-size:28px;margin-bottom:16px}
      .gift-heading{text-align:center;margin-bottom:32px}.gift-price{font-size:42px;font-weight:700;margin:20px 0;color:var(--course-primary)}.gift-features{list-style:none;padding:0;font-size:15px;line-height:2}.gift-bio{max-width:720px;margin:auto}.gift-signature{font-weight:600;color:var(--course-primary)}
      @media(min-width:760px){.gift-hero-grid{grid-template-columns:1fr 1fr;gap:48px}.gift-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.gift-section{padding:72px 32px}}
      @media(max-width:759px){.gift-section{padding:40px 20px}.gift-card{padding:22px}.gift-hero-grid .gift-image{max-height:360px}.gift-section h1{font-size:36px}}
    `}</style>
    <div className="gift-inner">
      {type === 'hero' ? <div className="gift-hero-grid"><div>{content.eyebrow && <div className="gift-eyebrow">{content.eyebrow}</div>}<h1>{content.title} {content.highlightedText}</h1>{projectLabels && <div className="my-4 rounded-xl bg-white p-3 text-slate-900">{projectLabels}</div>}<p>{content.description}</p>{content.primaryCta && button(content.primaryCta.label, content.primaryCta.action, content.primaryCta.target)}</div>{isValidImageUrl(content.imageUrl) && <Image unoptimized src={content.imageUrl || ''} alt={content.imageAlt || content.title || ''} width={800} height={720} className="gift-image" />}</div> : <>
        <div className="gift-heading">{content.eyebrow && <div className="gift-eyebrow">{content.eyebrow}</div>}<h2>{content.title}</h2>{content.description && <p>{content.description}</p>}</div>
        {type === 'benefits' && <div className="gift-grid">{(content.items || []).map((item) => <article key={item.id} className="gift-card"><div className="gift-icon">{item.icon || '✦'}</div><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>}
        {type === 'instructor' && <div className="gift-grid">{(content.instructors || []).map((person) => <article key={person.id} className="gift-card">{isValidImageUrl(person.imageUrl) && <Image unoptimized src={person.imageUrl || ''} alt={person.name || ''} width={240} height={240} className="gift-image" />}<h3>{person.name}</h3><p>{person.role}</p>{(person.bio || []).map((text: string, index: number) => <p key={index}>{text}</p>)}</article>)}</div>}
        {type === 'pricing' && <div className="gift-bio">{(content.plans || []).map((plan) => <article key={plan.id} className="gift-card"><h3>{plan.name}</h3><div className="gift-price">{plan.price === 0 ? 'Miễn phí' : `${Number(plan.price).toLocaleString('vi-VN')} ₫`}</div><p>{plan.description}</p><ul className="gift-features">{(plan.features || []).map((item: string, index: number) => <li key={index}>✓ {item}</li>)}</ul>{button(isEnrolled ? 'Vào học ngay' : plan.ctaText || 'Đăng ký khóa học')}</article>)}<p>{content.paymentNote}</p></div>}
        {section.variant === 'wi300-gift-testimonials' && <div className="gift-grid">{testimonials.map((item) => <article key={item.id} className="gift-card"><p>{item.content}</p><h3>{item.name}</h3></article>)}</div>}
        {(type === 'rich_content' || type === 'closing_message') && <div className="gift-bio">{isValidImageUrl(content.imageUrl) && <Image unoptimized src={content.imageUrl || ''} alt={content.imageAlt || ''} width={800} height={500} className="gift-image" />}{(content.paragraphs || []).map((text: string, index: number) => <p key={index}>{text}</p>)}{content.signature && <div className="gift-signature">{content.signature}</div>}{content.cta && button(content.cta.label, content.cta.action, content.cta.target)}</div>}
      </>}
    </div>
  </section>
}
