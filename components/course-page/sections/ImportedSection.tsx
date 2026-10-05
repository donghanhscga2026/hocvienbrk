'use client'

import React from 'react'
import { isRegistrationAnchor } from '@/lib/course-page/importer/registration'

type ImportedSectionProps = {
  id?: string
  content: any
  onAction?: (actionType: string, target?: string) => void
}

function actionFor(href?: string) {
  if (!href) return { type: 'open_registration', target: undefined }
  try {
    if (href.startsWith('#')) {
      if (isRegistrationAnchor(href)) return { type: 'open_registration', target: undefined }
      return { type: 'scroll', target: href.slice(1) }
    }
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


function FidelityFrame({
  id,
  fidelity,
  structured,
  onAction,
}: {
  id?: string
  fidelity: { html: string; css: string }
  structured: any
  onAction?: (actionType: string, target?: string) => void
}) {
  const frameRef = React.useRef<HTMLIFrameElement | null>(null)
  const [height, setHeight] = React.useState(500)
  const frameId = React.useId().replace(/:/g, '-')

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return
      const data = event.data
      if (!data || data.frameId !== frameId) return
      if (data.type === 'mfc-fidelity-height' && Number.isFinite(data.height)) {
        setHeight(Math.max(40, Math.min(5000, Math.ceil(data.height))))
      }
      if (data.type === 'mfc-fidelity-action') {
        const resolved = actionFor(typeof data.href === 'string' ? data.href : undefined)
        onAction?.(resolved.type, resolved.target)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [frameId, onAction])

  const srcDoc = React.useMemo(() => {
    const structuredJson = JSON.stringify(structured || {})
      .replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')
    const bridge = `
<script>
(function(){
  var frameId = ${JSON.stringify(frameId)};
  var structured = ${structuredJson};
  function norm(v){return String(v==null?'':v).replace(/\\s+/g,' ').trim()}
  function patchText(selector,values){
    if(!Array.isArray(values))return;
    document.querySelectorAll(selector).forEach(function(el,i){
      if(values[i]==null)return;
      if(norm(el.textContent)!==norm(values[i]))el.textContent=values[i];
    });
  }
  function patchStructured(){
    var firstHeading=document.querySelector('h1,h2,h3');
    if(firstHeading&&structured.heading!=null&&norm(firstHeading.textContent)!==norm(structured.heading))firstHeading.textContent=structured.heading;
    patchText('p',structured.paragraphs);
    patchText('li',structured.listItems);
    if(Array.isArray(structured.cards)){
      document.querySelectorAll('article').forEach(function(article,i){
        var card=structured.cards[i];if(!card)return;
        var title=article.querySelector('h2,h3,h4');
        if(title&&card.title!=null&&norm(title.textContent)!==norm(card.title))title.textContent=card.title;
      });
    }
    if(Array.isArray(structured.images)){
      document.querySelectorAll('img').forEach(function(img,i){
        var item=structured.images[i];if(!item||!item.src)return;
        if(img.getAttribute('src')!==item.src)img.setAttribute('src',item.src);
        if(item.alt!=null)img.setAttribute('alt',item.alt);
      });
    }
    if(Array.isArray(structured.actions)){
      var links=structured.actions.filter(function(a){return a&&a.kind==='link'});
      var buttons=structured.actions.filter(function(a){return a&&a.kind==='button'});
      document.querySelectorAll('a').forEach(function(el,i){
        var a=links[i];if(!a)return;
        if(a.href!=null)el.setAttribute('href',a.href);
        if(a.label!=null&&norm(el.textContent)!==norm(a.label))el.textContent=a.label;
      });
      document.querySelectorAll('button').forEach(function(el,i){
        var a=buttons[i];if(!a)return;
        if(a.label!=null&&norm(el.textContent)!==norm(a.label))el.textContent=a.label;
      });
    }
    if(Array.isArray(structured.formFields)){
      document.querySelectorAll('input,textarea,select').forEach(function(el,i){
        var field=structured.formFields[i];if(!field)return;
        if(field.placeholder!=null)el.setAttribute('placeholder',field.placeholder);
      });
    }
  }
  function sendHeight(){
    var b=document.body,d=document.documentElement;
    var h=Math.max(b?b.scrollHeight:0,d?d.scrollHeight:0,b?b.offsetHeight:0,d?d.offsetHeight:0);
    parent.postMessage({type:'mfc-fidelity-height',frameId:frameId,height:h},'*');
  }
  document.addEventListener('click',function(e){
    var el=e.target&&e.target.closest?e.target.closest('a,button'):null;
    if(!el)return;
    e.preventDefault();
    parent.postMessage({type:'mfc-fidelity-action',frameId:frameId,href:el.getAttribute('href')||'',label:(el.textContent||'').trim()},'*');
  },true);
  document.addEventListener('submit',function(e){
    e.preventDefault();
    parent.postMessage({type:'mfc-fidelity-action',frameId:frameId,href:'',label:'Đăng ký'},'*');
  },true);
  addEventListener('load',function(){patchStructured();sendHeight()});
  addEventListener('resize',sendHeight);
  if(window.ResizeObserver)new ResizeObserver(sendHeight).observe(document.documentElement);
  setTimeout(sendHeight,50);setTimeout(sendHeight,400);setTimeout(sendHeight,1200);
})();
<\/script>`
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data: blob:; style-src 'unsafe-inline'; font-src https: data:; script-src 'unsafe-inline'; form-action 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'"><style>html,body{margin:0;padding:0;overflow:hidden}*,*:before,*:after{box-sizing:border-box}${fidelity.css || ''}</style></head><body>${fidelity.html || ''}${bridge}</body></html>`
  }, [fidelity.css, fidelity.html, frameId, structured])

  return (
    <iframe
      ref={frameRef}
      id={id}
      title="Imported website section"
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      scrolling="no"
      className="block w-full border-0"
      style={{ height }}
    />
  )
}

export default function ImportedSection({ id, content, onAction }: ImportedSectionProps) {
  const [galleryIndex, setGalleryIndex] = React.useState<number | null>(null)
  const source = content?.importedSource || {}
  const design = content?.design || {}
  const type = source.sectionType || 'rich_content'
  const heading = source.heading || content?.title
  const paragraphs: string[] = Array.isArray(source.paragraphs) ? source.paragraphs : []
  const listItems: string[] = Array.isArray(source.listItems) ? source.listItems : []
  const cards: any[] = Array.isArray(source.cards) ? source.cards : []
  const images: any[] = Array.isArray(source.images) ? source.images : []
  const displayImages = images.filter(image => image?.role !== 'decorative' && image?.role !== 'brand')
  const brandImages = images.filter(image => image?.role === 'brand')
  const visualImages = displayImages.length ? displayImages : images.filter(image => image?.role !== 'decorative')
  const actions: any[] = Array.isArray(source.actions) ? source.actions : []
  const faqItems: any[] = Array.isArray(source.faqItems) ? source.faqItems : []
  const formFields: any[] = Array.isArray(source.formFields) ? source.formFields : []
  const tableRows: string[] = Array.isArray(source.tableRows) ? source.tableRows : []
  const fidelity = source.fidelity && typeof source.fidelity.html === 'string' && typeof source.fidelity.css === 'string'
    ? source.fidelity
    : null

  if (fidelity && type !== 'sticky_cta') {
    return <FidelityFrame id={id} fidelity={fidelity} structured={source} onAction={onAction} />
  }

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

  if (type === 'sticky_cta') {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-black/10 bg-white/95 p-2 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-xl gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(actions.length, 2))}, minmax(0, 1fr))` }}>
          {(actions.length ? actions : [{ label: 'Đăng ký', kind: 'button' }]).slice(0, 2).map(renderAction)}
        </div>
      </div>
    )
  }

  if (type === 'header') {
    return (
      <section id={id} style={sectionStyle}>
        <div style={containerStyle} className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {(brandImages[0] || visualImages[0]) && <img src={(brandImages[0] || visualImages[0]).src} alt={(brandImages[0] || visualImages[0]).alt || ''} className="h-10 w-10 rounded-xl object-contain" />}
            <div className="min-w-0">
            {heading && <div className="font-black" style={{ fontFamily: 'var(--course-heading-font)' }}>{heading}</div>}
            {paragraphs[0] && <div className="text-xs opacity-70">{paragraphs[0]}</div>}
            </div>
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
          {!!brandImages.length && <div className="my-4 flex flex-wrap justify-center gap-3">{brandImages.slice(0, 4).map((image, index) => <img key={index} src={image.src} alt={image.alt || ''} className="h-16 rounded-xl bg-white p-2 object-contain" />)}</div>}
          {!!actions.length && <div className="mt-3 flex flex-wrap justify-center gap-2">{actions.slice(0, 8).map(renderAction)}</div>}
        </div>
      </section>
    )
  }

  if (type === 'gallery') {
    const activeImage = galleryIndex === null ? null : visualImages[galleryIndex]
    return (
      <>
        <section id={id} style={sectionStyle}>
          <div style={containerStyle}>
            {heading && <h2 style={headingStyle}>{heading}</h2>}
            {paragraphs[0] && <p style={paragraphStyle}>{paragraphs[0]}</p>}
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {visualImages.slice(0, 16).map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setGalleryIndex(index)}
                  className={(index % 5 === 0 ? 'md:col-span-2 ' : '') + 'min-h-40 overflow-hidden rounded-2xl bg-black/5'}
                >
                  <img src={image.src} alt={image.alt || ''} className="h-full min-h-40 w-full object-cover transition hover:scale-105" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </section>
        {activeImage && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setGalleryIndex(null)}
          >
            <button type="button" className="absolute right-4 top-4 h-11 w-11 rounded-full bg-white text-xl font-black text-gray-900" onClick={() => setGalleryIndex(null)} aria-label="Đóng ảnh">×</button>
            <img src={activeImage.src} alt={activeImage.alt || ''} className="max-h-[88vh] max-w-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          </div>
        )}
      </>
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

  if (type === 'roadmap' && listItems.length) {
    return (
      <section id={id} style={sectionStyle}>
        <div style={{ ...containerStyle, maxWidth: '820px' }}>
          {heading && <h2 style={headingStyle}>{heading}</h2>}
          {paragraphs[0] && <p style={paragraphStyle}>{paragraphs[0]}</p>}
          <ol className="mt-7 space-y-4 text-left">
            {listItems.map((item, index) => (
              <li key={index} className="grid grid-cols-[44px_1fr] items-start gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full font-black text-white" style={{ background: 'var(--course-primary)' }}>{index + 1}</span>
                <div className="rounded-2xl border border-black/10 bg-white/85 px-4 py-3 text-gray-800 shadow-sm">{item}</div>
              </li>
            ))}
          </ol>
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
          {!!visualImages.length && (
            <div className="mt-6 grid grid-cols-3 gap-3">
              {visualImages.slice(0, 6).map((image, index) => (
                <img key={index} src={image.src} alt={image.alt || ''} className="aspect-square w-full rounded-2xl object-cover shadow-sm" loading="lazy" />
              ))}
            </div>
          )}
          {!!actions.length && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions.slice(0, 3).map(renderAction)}</div>}
        </div>
      </section>
    )
  }

  const isHero = type === 'hero'
  const layout = design.suggestedLayout || (visualImages.length ? 'split' : 'single')
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
        {!!visualImages.length && (
          <div className={(layout === 'split' ? '' : 'mt-7') + (isHero && visualImages.length > 1 ? ' relative pb-10' : '')}>
            <img src={visualImages[0].src} alt={visualImages[0].alt || heading || ''} className="mx-auto max-h-[560px] w-full rounded-3xl object-cover shadow-lg" loading={isHero ? 'eager' : 'lazy'} />
            {isHero && visualImages[1] && <img src={visualImages[1].src} alt={visualImages[1].alt || ''} className="absolute -bottom-1 left-0 aspect-square w-[32%] -rotate-3 rounded-2xl border-4 border-white object-cover shadow-lg" />}
            {isHero && visualImages[2] && <img src={visualImages[2].src} alt={visualImages[2].alt || ''} className="absolute -bottom-1 right-0 aspect-square w-[32%] rotate-3 rounded-2xl border-4 border-white object-cover shadow-lg" />}
          </div>
        )}
      </div>
    </section>
  )
}
