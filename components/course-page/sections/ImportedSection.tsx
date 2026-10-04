'use client'

import React from 'react'

type ImportedSectionProps = {
  id?: string
  content: any
  onAction?: (actionType: string, target?: string) => void
}

function actionFor(href?: string) {
  if (!href) return { type: 'open_registration', target: undefined }
  try {
    if (href.startsWith('#')) return { type: 'scroll', target: href.slice(1) }
    const url = new URL(href, typeof window !== 'undefined' ? window.location.href : 'https://example.com')
    if (url.hash && url.origin === (typeof window !== 'undefined' ? window.location.origin : url.origin)) {
      return { type: 'scroll', target: url.hash.slice(1) }
    }
    if (!['http:', 'https:', 'tel:', 'mailto:'].includes(url.protocol)) {
      return { type: 'open_registration', target: undefined }
    }
  } catch {
    return { type: 'open_registration', target: undefined }
  }
  return { type: 'external_link', target: href }
}

export default function ImportedSection({ id, content, onAction }: ImportedSectionProps) {
  const source = content?.importedSource || {}
  const design = content?.design || {}
  const type = source.sectionType || 'rich_content'
  const heading = source.heading || content?.title
  const paragraphs: string[] = Array.isArray(source.paragraphs) ? source.paragraphs : []
  const listItems: string[] = Array.isArray(source.listItems) ? source.listItems : []
  const cards: any[] = Array.isArray(source.cards) ? source.cards : []
  const images: any[] = Array.isArray(source.images) ? source.images : []
  const actions: any[] = Array.isArray(source.actions) ? source.actions : []
  const faqItems: any[] = Array.isArray(source.faqItems) ? source.faqItems : []
  const formFields: any[] = Array.isArray(source.formFields) ? source.formFields : []
  const tableRows: string[] = Array.isArray(source.tableRows) ? source.tableRows : []

  const sectionStyle: React.CSSProperties = {
    background: design.backgroundColor || undefined,
    color: design.textColor || undefined,
    padding: design.padding || (type === 'header' ? '18px 16px' : '64px 16px'),
    textAlign: design.alignment || undefined,
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: 'var(--course-container-max)',
    margin: '0 auto',
  }

  const headingStyle: React.CSSProperties = {
    color: design.textColor || 'var(--text-heading)',
    fontFamily: 'var(--course-heading-font)',
    fontSize: type === 'hero' ? 'clamp(2rem, 6vw, 4rem)' : 'clamp(1.6rem, 4vw, 2.5rem)',
    fontWeight: 800,
    lineHeight: 1.12,
    margin: '0 0 16px',
  }

  const paragraphStyle: React.CSSProperties = {
    color: design.textColor || 'var(--text-body)',
    fontFamily: 'var(--course-body-font)',
    lineHeight: 1.7,
    margin: '0 0 12px',
  }

  const renderAction = (action: any, index: number) => {
    const resolved = actionFor(action?.href)
    return (
      <button
        key={index}
        type="button"
        onClick={() => onAction?.(resolved.type, resolved.target)}
        className="min-h-11 rounded-full px-5 py-2.5 text-sm font-bold transition hover:-translate-y-0.5"
        style={{
          background: index === 0 ? 'var(--course-primary)' : 'transparent',
          color: index === 0 ? '#fff' : (design.textColor || 'var(--course-text)'),
          border: index === 0 ? '1px solid transparent' : '1px solid var(--course-primary)',
        }}
      >
        {action?.label || 'Xem thêm'}
      </button>
    )
  }

  if (type === 'header') {
    return (
      <section id={id} style={sectionStyle}>
        <div style={containerStyle} className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            {heading && <div className="font-black" style={{ fontFamily: 'var(--course-heading-font)' }}>{heading}</div>}
            {paragraphs[0] && <div className="text-xs opacity-70">{paragraphs[0]}</div>}
          </div>
          {!!actions.length && <div className="flex flex-wrap gap-2">{actions.slice(0, 7).map(renderAction)}</div>}
        </div>
      </section>
    )
  }

  if (type === 'footer') {
    return (
      <section id={id} style={{ ...sectionStyle, padding: design.padding || '36px 16px' }}>
        <div style={containerStyle}>
          {heading && <h2 style={{ ...headingStyle, fontSize: '1.25rem' }}>{heading}</h2>}
          {paragraphs.map((p, i) => <p key={i} style={paragraphStyle}>{p}</p>)}
          {!!actions.length && <div className="mt-3 flex flex-wrap justify-center gap-2">{actions.slice(0, 8).map(renderAction)}</div>}
        </div>
      </section>
    )
  }

  if (type === 'gallery') {
    return (
      <section id={id} style={sectionStyle}>
        <div style={containerStyle}>
          {heading && <h2 style={headingStyle}>{heading}</h2>}
          {paragraphs[0] && <p style={paragraphStyle}>{paragraphs[0]}</p>}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {images.slice(0, 16).map((image, index) => (
              <figure key={index} className={(index % 5 === 0 ? 'md:col-span-2 ' : '') + 'overflow-hidden rounded-2xl bg-black/5'}>
                <img src={image.src} alt={image.alt || ''} className="h-full min-h-40 w-full object-cover" loading="lazy" />
              </figure>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (type === 'faq') {
    return (
      <section id={id} style={sectionStyle}>
        <div style={{ ...containerStyle, maxWidth: '820px' }}>
          {heading && <h2 style={headingStyle}>{heading}</h2>}
          <div className="mt-6 space-y-3 text-left">
            {faqItems.map((item, index) => (
              <details key={index} className="rounded-2xl border border-black/10 bg-white/80 p-4 text-gray-800">
                <summary className="cursor-pointer font-bold">{item.question}</summary>
                <p className="mt-3 text-sm leading-6 text-gray-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (type === 'registration') {
    return (
      <section id={id} style={sectionStyle}>
        <div style={{ ...containerStyle, maxWidth: '760px' }} className="rounded-3xl border border-black/10 bg-white/90 p-6 text-gray-900 shadow-sm md:p-8">
          {heading && <h2 style={{ ...headingStyle, color: 'inherit' }}>{heading}</h2>}
          {paragraphs.slice(0, 2).map((p, i) => <p key={i} className="text-sm leading-6 text-gray-600">{p}</p>)}
          {!!formFields.length && (
            <div className="mt-5 grid gap-3">
              {formFields.slice(0, 5).map((field, index) => (
                <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-500">
                  {field.placeholder || field.name || (field.type === 'tel' ? 'Số điện thoại' : 'Thông tin đăng ký')}
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => onAction?.('open_registration')}
            className="mt-5 min-h-12 w-full rounded-full px-5 font-black text-white"
            style={{ background: 'var(--course-primary)' }}
          >
            {actions.find(action => action.kind === 'button')?.label || actions[0]?.label || 'Đăng ký ngay'}
          </button>
          <p className="mt-3 text-center text-xs text-gray-500">Thông tin đăng ký được xử lý bằng hệ thống MFC, không gửi về form của website nguồn.</p>
        </div>
      </section>
    )
  }

  if (type === 'pricing') {
    return (
      <section id={id} style={sectionStyle}>
        <div style={{ ...containerStyle, maxWidth: '760px' }}>
          {heading && <h2 style={headingStyle}>{heading}</h2>}
          {paragraphs.slice(0, 3).map((p, i) => <p key={i} style={paragraphStyle}>{p}</p>)}
          {!!tableRows.length && (
            <div className="my-6 overflow-hidden rounded-2xl border border-black/10 bg-white/90 text-left text-gray-800">
              {tableRows.map((row, index) => <div key={index} className="border-b border-black/5 px-4 py-3 last:border-0">{row}</div>)}
            </div>
          )}
          {!!actions.length && <div className="flex flex-wrap justify-center gap-3">{actions.slice(0, 3).map(renderAction)}</div>}
        </div>
      </section>
    )
  }

  if (cards.length) {
    return (
      <section id={id} style={sectionStyle}>
        <div style={containerStyle}>
          {heading && <h2 style={headingStyle}>{heading}</h2>}
          {paragraphs[0] && <p style={{ ...paragraphStyle, maxWidth: 760, marginLeft: design.alignment === 'center' ? 'auto' : undefined, marginRight: design.alignment === 'center' ? 'auto' : undefined }}>{paragraphs[0]}</p>}
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card, index) => (
              <article key={index} className="overflow-hidden rounded-2xl border border-black/10 bg-white/90 text-left text-gray-800 shadow-sm">
                {card.image?.src && <img src={card.image.src} alt={card.image.alt || card.title || ''} className="aspect-[4/3] w-full object-cover" loading="lazy" />}
                <div className="p-5">
                  {card.subtitle && <div className="mb-2 text-xs font-bold uppercase tracking-wide opacity-60">{card.subtitle}</div>}
                  {card.title && <h3 className="text-lg font-black">{card.title}</h3>}
                  {card.text && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">{card.text}</p>}
                </div>
              </article>
            ))}
          </div>
          {!!actions.length && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions.slice(0, 3).map(renderAction)}</div>}
        </div>
      </section>
    )
  }

  const isHero = type === 'hero'
  const layout = design.suggestedLayout || (images.length ? 'split' : 'single')
  return (
    <section id={id} style={sectionStyle}>
      <div style={containerStyle} className={layout === 'split' ? 'grid items-center gap-8 md:grid-cols-2' : ''}>
        <div>
          {heading && <h2 style={headingStyle}>{heading}</h2>}
          {paragraphs.map((p, i) => <p key={i} style={paragraphStyle}>{p}</p>)}
          {!!listItems.length && (
            <ul className="mt-5 grid gap-3 text-left">
              {listItems.map((item, index) => (
                <li key={index} className="rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-gray-800">{item}</li>
              ))}
            </ul>
          )}
          {!!actions.length && <div className={'mt-6 flex flex-wrap gap-3 ' + (design.alignment === 'center' ? 'justify-center' : '')}>{actions.slice(0, isHero ? 3 : 2).map(renderAction)}</div>}
        </div>
        {!!images.length && (
          <div className={layout === 'split' ? '' : 'mt-7'}>
            <img src={images[0].src} alt={images[0].alt || heading || ''} className="mx-auto max-h-[560px] w-full rounded-3xl object-cover shadow-lg" loading={isHero ? 'eager' : 'lazy'} />
          </div>
        )}
      </div>
    </section>
  )
}
