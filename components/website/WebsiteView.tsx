'use client'

import { CSSProperties, FormEvent, useState, useSyncExternalStore } from 'react'
import { NodeStyle, WebsiteDocument, WebsiteNode } from '@/lib/website/document'
import {useDomainBrand} from './DomainShell'
import { websiteTheme } from '@/lib/website/theme'
import { websiteHref, DomainModules } from '@/lib/website/domain-shared'

export interface WebsiteData {
  community?: boolean
  courses: { id: number; title: string; image: string; description: string; href: string }[]
  testimonials: { id: number; courseId: number; name: string; role: string | null; content: string; rating: number }[]
  posts: { id: string; title: string; content: string }[]
}
export function cssStyle(s: NodeStyle, kind: string): CSSProperties {
  return { background: s.background, color: s.color, padding: s.padding, gap: s.gap, fontSize: s.fontSize, fontFamily: s.fontFamily, width: s.width ? s.width + '%' : undefined, borderRadius: s.radius, maxWidth: s.maxWidth, textAlign: s.align, minHeight: s.minHeight, ...(kind === 'container' ? { display: 'grid', gridTemplateColumns: `repeat(${s.columns || 1}, minmax(0,1fr))` } : {}) }
}
function mobileRules(node: WebsiteNode): string {
  const style = cssStyle({ ...(node.kind === 'container' ? { columns: 1 } : {}), ...node.mobile }, node.kind)
  const declarations = Object.entries(style).filter(([,v]) => v != null).map(([key,value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${typeof value === 'number' ? value + 'px' : value} !important`).join(';')
  return `[data-website-node="${node.id}"]{${declarations}}` + node.children.map(mobileRules).join('')
}
function LeadForm({ node, slug, page, preview }: { node: WebsiteNode; slug: string; page: string; preview: boolean }) {
  const [status, setStatus] = useState(''); const [busy,setBusy] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(preview) { setStatus('Bản xem trước: form chỉ gửi sau khi website được xuất bản.'); return }
    const form = e.currentTarget; const fields = Object.fromEntries(new FormData(form))
    setBusy(true); setStatus('')
    try {
      const response = await fetch('/api/websites/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, consent: fields.consent === 'on', slug, page, node: node.id }) })
      const result = await response.json(); if(!response.ok) throw new Error(result.error || 'Không thể gửi.'); form.reset(); setStatus('Đã nhận đăng ký. Chúng tôi sẽ liên hệ với bạn.')
    } catch(e) { setStatus(e instanceof Error ? e.message : 'Không thể gửi.') } finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="grid gap-3 p-6 border rounded-2xl bg-white text-gray-900 website:bg-brk-surface website:text-brk-on-surface website:border-brk-outline"><h2 className="text-2xl font-bold">{node.text}</h2><label>Họ tên<input className="w-full border rounded-lg p-3 website:bg-brk-surface website:text-brk-on-surface website:border-brk-outline" name="name" required maxLength={150} autoComplete="name" /></label><label>Email<input className="w-full border rounded-lg p-3 website:bg-brk-surface website:text-brk-on-surface website:border-brk-outline" name="email" type="email" maxLength={254} autoComplete="email" /></label><label>Điện thoại<input className="w-full border rounded-lg p-3 website:bg-brk-surface website:text-brk-on-surface website:border-brk-outline" name="phone" type="tel" maxLength={40} autoComplete="tel" /></label><label>Nội dung<textarea className="w-full border rounded-lg p-3 website:bg-brk-surface website:text-brk-on-surface website:border-brk-outline" name="message" maxLength={4000} /></label><input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" defaultValue="" /><label className="text-sm"><input type="checkbox" name="consent" required /> Tôi đồng ý để đơn vị này nhận thông tin và liên hệ tư vấn.</label><button disabled={busy} className="rounded-lg bg-violet-600 text-white p-3 website:bg-brk-primary website:text-brk-on-primary">{busy ? 'Đang gửi…' : 'Gửi đăng ký'}</button><p aria-live="polite">{status}</p></form>
}
function subscribeLocation(callback: () => void) { window.addEventListener('popstate',callback); return () => window.removeEventListener('popstate',callback) }
export default function WebsiteView({ document: doc, data, slug, pageSlug = '', preview = false, mobile = false, selected, onSelect, customDomain = false, modules }: { document: WebsiteDocument; data: WebsiteData; slug: string; pageSlug?: string; preview?: boolean; mobile?: boolean; selected?: string; onSelect?: (id: string) => void; customDomain?: boolean; modules?: DomainModules }) {
  const referral = useSyncExternalStore(subscribeLocation, () => new URLSearchParams(window.location.search).get('ref') || '', () => '')
  const brand=useDomainBrand()
  const theme=websiteTheme(customDomain ? brand?.color || doc.color : doc.color,customDomain ? brand?.background || doc.background : doc.background,customDomain ? brand?.palette : undefined)
  const page = doc.pages.find(p => p.slug === pageSlug) || doc.pages[0]
  function href(url: string) {
    if(!customDomain && doc.pages.some(p=>p.slug && url.split(/[?#]/)[0]==='/'+p.slug)) url='/page/'+slug+url
    return websiteHref(url,slug,modules?.affiliate === false ? '' : referral,customDomain)
  }
  const card = 'p-5 rounded-xl border bg-white text-gray-900 grid gap-3 website:bg-brk-surface website:text-brk-on-surface website:border-brk-outline'
  function render(n: WebsiteNode) {
    if(n.kind === 'posts' && data.community === false) return null
    if(modules && ((['courses','testimonials'].includes(n.kind) && !modules.courses) || (n.kind === 'form' && !modules.crm) || (n.kind === 'affiliate' && !modules.affiliate))) return null
    const courses = n.courseIds.length ? data.courses.filter(c => n.courseIds.includes(c.id)) : data.courses
    const style = cssStyle({ ...(n.kind === 'heading' ? { fontSize: 30 } : n.kind === 'html' ? { minHeight: 400 } : {}), ...n.style, ...(mobile ? { ...(n.kind === 'container' ? { columns: 1 } : {}), ...n.mobile } : {}) },n.kind)
    let body
    switch(n.kind) {
      case 'container': body = n.children.length ? n.children.map(render) : preview ? <p className="text-gray-400 border border-dashed p-6">Bố cục trống — thêm thành phần vào đây</p> : null; break
      case 'heading': body = <h2 className="font-bold whitespace-pre-wrap" style={{ fontSize: 'inherit', color: 'inherit' }}>{n.text}</h2>; break
      case 'text': body = <p className="whitespace-pre-wrap leading-relaxed">{n.text}</p>; break
      case 'image': body = n.url ? <img src={n.url} alt={n.text} className="w-full h-auto rounded-xl" loading="lazy" /> : preview ? <div className="bg-gray-100 p-12 text-center text-gray-500">Thêm URL ảnh</div> : null; break
      case 'video': body = n.url ? <video src={n.url} controls className="w-full" /> : preview ? <p>Thêm URL tệp video MP4</p> : null; break
      case 'button': case 'affiliate': body = <a href={href(n.url)} className="inline-block px-6 py-3 rounded-xl text-white" style={{ background: customDomain ? theme.primary : doc.color, color: customDomain ? theme.onPrimary : '#ffffff' }} onClick={e => { if(preview) e.preventDefault() }}>{n.text}</a>; break
      case 'divider': body = <hr />; break
      case 'courses': body = <section id="courses"><h2 className="text-2xl font-bold mb-6">{n.text}</h2><div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))' }}>{courses.map(c => <a key={c.id} href={href(c.href)} className={card} onClick={e => { if(preview) e.preventDefault() }}>{c.image && <img src={c.image} alt="" className="w-full aspect-video object-cover rounded-lg" loading="lazy" />}<h3 className="text-lg font-bold">{c.title}</h3><p>{c.description.replace(/<[^>]*>/g,'').slice(0,300)}</p><span style={{ color: customDomain ? theme.accent : doc.color }}>Xem khóa học →</span></a>)}</div>{!courses.length && <p>Chưa có khóa học phù hợp.</p>}</section>; break
      case 'testimonials': body = <section><h2 className="text-2xl font-bold mb-6">{n.text}</h2><div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))' }}>{data.testimonials.filter(t => !n.courseIds.length || n.courseIds.includes(t.courseId)).map(t => <blockquote key={t.id} className={card}><p>{'★'.repeat(Math.max(0,Math.min(5,t.rating)))}</p><p className="whitespace-pre-wrap">{t.content}</p><footer className="font-bold">{t.name} <span className="font-normal">{t.role}</span></footer></blockquote>)}</div>{!data.testimonials.length && <p>Chưa có lời chứng thực.</p>}</section>; break
      case 'posts': body = <section><h2 className="text-2xl font-bold mb-6">{n.text}</h2><div className="grid gap-5">{data.posts.map(p => <details key={p.id} className={card}><summary className="font-bold cursor-pointer">{p.title}</summary><p className="whitespace-pre-wrap">{p.content}</p></details>)}</div></section>; break
      case 'form': body = <LeadForm node={n} slug={slug} page={page.slug} preview={preview} />; break
      case 'html': {
        const csp = "default-src 'none'; img-src https: data:; media-src https:; style-src 'unsafe-inline'; font-src https:; base-uri 'none'; form-action 'none'"
        const src = '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="' + csp + '"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + n.css.replace(/<\/style/gi,'') + '</style></head><body>' + n.html + '</body></html>'
        body = <iframe title={n.text || 'HTML tùy chỉnh'} sandbox="" referrerPolicy="no-referrer" srcDoc={src} className="w-full border-0" style={{ height: '100%', minHeight: 'inherit', pointerEvents: onSelect ? 'none' : undefined }} />; break
      }
    }
    return <div key={n.id} data-website-node={n.id} style={{ ...style, outline: selected === n.id ? '2px solid #7c3aed' : undefined, outlineOffset: 3, minWidth: 0 }} onClick={onSelect ? e => { e.stopPropagation(); onSelect(n.id) } : undefined}>{body}</div>
  }
  return <div style={{ background: customDomain ? theme.background : doc.background, color: customDomain ? theme.text : '#172033', minHeight: '100%', fontFamily: doc.layout.fontFamily }}>
    {!mobile && <style>{'@media(max-width:640px){' + page.nodes.map(mobileRules).join('') + '}'}</style>}
    {!customDomain && doc.layout.showHeader && <header className="px-6 py-5 border-b flex flex-wrap gap-5 items-center justify-between"><a href={href('/page/' + slug)} className="text-xl font-bold" style={{ color: doc.color }} onClick={e => { if(preview) e.preventDefault() }}>{doc.name}</a><nav className="flex flex-wrap gap-4">{doc.pages.map(p => <a key={p.id} href={href('/page/' + slug + (p.slug ? '/' + p.slug : ''))} onClick={e => { if(preview) e.preventDefault() }} aria-current={p.id === page.id ? 'page' : undefined}>{p.title}</a>)}</nav></header>}
    <main className="mx-auto grid" style={{ maxWidth: doc.layout.maxWidth, padding: doc.layout.padding, gap: doc.layout.gap }}>{page.nodes.map(render)}{preview && !page.nodes.length && <div className="border-2 border-dashed p-16 text-center text-gray-500">Trang trống. Chọn thành phần để bắt đầu thiết kế.</div>}</main>
    {!customDomain && doc.layout.showFooter && <footer className="p-6 text-center text-sm opacity-70">© {doc.name}</footer>}
  </div>
}
