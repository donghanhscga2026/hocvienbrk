import {parse, parseFragment, serialize, type DefaultTreeAdapterMap} from 'parse5'
import {z} from 'zod'

export const PAGE_HTML_LIMIT = 8 * 1024 * 1024
export const PAGE_COMPRESSED_LIMIT = 2500 * 1024
export const pageTemplateKey = (id:number) => `website-page-template:${id}:v1`
export const pageTemplateSchema = z.object({
  revision:z.number().int().nonnegative(), active:z.boolean(), name:z.string().min(1).max(160),
  region:z.string().regex(/^(?:__append__|[A-Za-z][\w:.-]{0,159})$/),
  source:z.string().max(Math.ceil(PAGE_COMPRESSED_LIMIT / 3) * 4 + 4),
}).strict()
export type PageTemplate = z.infer<typeof pageTemplateSchema>
export type PageCourse = {id:number;title:string;description:string;image:string;href:string;price?:number;feeType?:string}
type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']
const element = (node:Node):node is Element => 'tagName' in node
const attr = (node:Element,name:string) => node.attrs.find(a=>a.name===name)?.value || ''
function set(node:Element,name:string,value:string) {
  const a=node.attrs.find(a=>a.name===name)
  if(a)a.value=value;else node.attrs.push({name,value})
}
function walk(node:Node):Element[] {
  return [...(element(node)?[node]:[]),...('childNodes' in node?node.childNodes.flatMap(walk):[])]
}
const hasClass=(node:Element,name:string)=>attr(node,'class').split(/\s+/).includes(name)
function text(node:Element,value:string) {node.childNodes=[{nodeName:'#text',value,parentNode:node}]}
function append(node:Element,html:string) {
  for(const child of parseFragment(html).childNodes){child.parentNode=node;node.childNodes.push(child)}
}
const escape=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const cleanText=(value:string)=>{
  const plain=value.replace(/<[^>]*>/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*#`]/g,'').replace(/\s+/g,' ').trim()
  return plain.length>180?plain.slice(0,177).trimEnd()+'…':plain
}

export function coursePrice(course:PageCourse) {
  const labels:Record<string,string>={PHI_CAM_KET:'Phí cam kết',PHI_TUY_TINH:'Phí tùy tâm',PHI_DONG_HANH:'Phí đồng hành',PHI_TOI_THIEU:'Phí tối thiểu'}
  const label=labels[course.feeType || ''] || 'Học phí'
  if(course.price==null || !Number.isFinite(course.price) || course.price<0)return {label,text:'Xem học phí'}
  if(course.price===0)return {label,text:course.feeType==='PHI_TUY_TINH'?'Tùy tâm':'Miễn phí'}
  return {label,text:course.price.toLocaleString('vi-VN')+'đ'}
}

/** Compile one region before the template's own scripts initialize. No private course fields enter the frame. */
// null chỉ dùng để xem template gốc, vẫn qua cùng bộ bảo vệ iframe.
export function renderPageTemplate(html:string,region:string|null,courses:PageCourse[]) {
  if(new TextEncoder().encode(html).length>PAGE_HTML_LIMIT)throw new Error('Template sau giải nén vượt 8MB.')
  const doc=parse(html),nodes=walk(doc),body=nodes.find(n=>n.tagName==='body')!,head=nodes.find(n=>n.tagName==='head')!
  const matches=nodes.filter(n=>attr(n,'id')===region)
  if(region!==null && region!=='__append__' && (matches.length!==1 || !['div','section','main','ul','ol','article'].includes(matches[0].tagName)))throw new Error('Chọn một vùng danh sách duy nhất trong template.')
  let slot=region===null?body:matches[0]
  if(region!==null && slot){
    const inner=walk(slot).filter(n=>n!==slot && ['courses','course-list','system-course-list'].includes(attr(n,'id')))
    if(inner.length===1)slot=inner[0]
    else if(walk(slot).some(n=>{
      if(!/^h[1-6]$/.test(n.tagName))return false
      let parent:Node|null=n.parentNode
      while(parent && parent!==slot){
        if(element(parent) && (['article','a'].includes(parent.tagName) || ['course','course-card','system-course-card','card'].some(c=>hasClass(parent as Element,c))))return false
        // Thẻ dùng tên class tùy ý có ảnh hoặc giá, tên khóa học và nút/link.
        if(element(parent) && parent.parentNode===slot){
          const parts=walk(parent)
          const hasMediaOrPrice=parts.some(p=>p.tagName==='img' || hasClass(p,'price') || (p.tagName==='span' && p.childNodes.some(c=>c.nodeName==='#text' && 'value' in c && /\d[\d.,\s]*[đ₫]/i.test(c.value))))
          if(parts.filter(p=>/^h[1-6]$/.test(p.tagName)).length===1 && hasMediaOrPrice && parts.some(p=>['a','button'].includes(p.tagName)))return false
        }
        parent='parentNode' in parent?parent.parentNode:null
      }
      return true
    }))throw new Error('Vùng này chứa tiêu đề. Hãy chọn vùng danh sách bên trong, ví dụ courses, để giữ nguyên phần giới thiệu.')
  }
  if(region==='__append__') {
    append(body,'<section><h2>Khóa học của tôi</h2><div id="system-course-list"></div></section>')
    slot=walk(body).find(n=>attr(n,'id')==='system-course-list')!
  }
  const prototype=slot.childNodes.find(n=>element(n)&&hasClass(n,'course'))
  // ZIP importer bridge belongs to the sale-page renderer; it must not intercept this Page.
  for(const n of nodes) {
    if(n.tagName==='base' || (n.tagName==='meta' && /^(?:content-security-policy|refresh)$/i.test(attr(n,'http-equiv'))) || (n.tagName==='script' && (n.attrs.some(a=>a.name==='data-mfc-zip-bridge') || !!attr(n,'src')))) {
      if(n.parentNode && 'childNodes' in n.parentNode)n.parentNode.childNodes=n.parentNode.childNodes.filter(c=>c!==n)
    }
  }
  if(region!==null){
  slot.childNodes=[];set(slot,'data-system-course-list','true')
  if(!prototype)set(slot,'data-system-course-layout','cards')
  for(const [index,course] of courses.entries()) {
    const pricing=coursePrice(course)
    let card:Element
    if(prototype && element(prototype)) {
      const fragment=parseFragment(serialize({nodeName:'#document-fragment',childNodes:[prototype]}))
      card=fragment.childNodes[0] as Element
      const descendants=walk(card)
      for(const n of descendants) {
        n.attrs=n.attrs.filter(a=>!a.name.startsWith('on') && a.name!=='id')
        if(n.tagName==='a'){set(n,'href',course.href);set(n,'data-system-course-link',course.href)}
        if(hasClass(n,'cover-index'))text(n,String(index+1).padStart(2,'0'))
        if(hasClass(n,'cover-title') || /^h[1-6]$/.test(n.tagName))text(n,course.title)
        if(n.tagName==='p')text(n,cleanText(course.description))
        if(hasClass(n,'course-category'))text(n,'Khóa học')
        if(hasClass(n,'cover-tag'))text(n,'Khóa học trên hệ thống')
        if(hasClass(n,'price')){text(n,pricing.text);set(n,'title',pricing.label)}
        if(n.tagName==='button'){set(n,'type','button');set(n,'data-system-course-link',course.href);set(n,'aria-label','Xem thông tin '+course.title);text(n,'Xem thông tin')}
      }
      const cover=descendants.find(n=>hasClass(n,'course-cover'))
      if(cover && course.image){
        // Ảnh bìa thật thay toàn bộ chữ/số trang trí của ảnh mẫu.
        cover.childNodes=[];set(cover,'data-system-course-cover','image')
        append(cover,`<img class="system-course-cover" src="${escape(course.image)}" alt="" loading="lazy">`)
      }
      set(card,'data-category','course');set(card,'class',attr(card,'class')+' visible')
    } else {
      card=parseFragment(`<article class="system-course-card"><a class="system-course-open" data-system-course-link="${escape(course.href)}" href="${escape(course.href)}" aria-label="Xem khóa học ${escape(course.title)}"><div class="system-course-media">${course.image?`<img src="${escape(course.image)}" alt="" loading="lazy">`:'<span>Khóa học trực tuyến</span>'}</div><div class="system-course-content"><span class="system-course-label">Khóa học</span><h3 title="${escape(course.title)}">${escape(course.title)}</h3><p>${escape(cleanText(course.description))}</p><div class="system-course-pricing"><span>${escape(pricing.label)}</span><strong>${escape(pricing.text)}</strong></div><span class="system-course-cta">Xem khóa học <span aria-hidden="true">→</span></span></div></a></article>`).childNodes[0] as Element
    }
    card.parentNode=slot;slot.childNodes.push(card)
  }
  if(!courses.length)append(slot,'<p role="status">Chưa có khóa học đang mở trên trang này.</p>')
  for(const n of walk(doc))if(hasClass(n,'filter') && !['all','course'].includes(attr(n,'data-filter')))set(n,'hidden','')
  const counter=walk(doc).find(n=>attr(n,'id')==='sr-count');if(counter)text(counter,`${courses.length} khóa học`)
  }
  // sandbox has no same-origin, forms, popups or top-navigation permission.
  const originalHeadLength=head.childNodes.length
  append(head,`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; media-src data: https:; style-src 'unsafe-inline' https:; font-src data: https:; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><style>[data-system-course-list]{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:24px}.system-course-card{border:1px solid #ddd;border-radius:16px;overflow:hidden;background:white;color:#18202b}.system-course-card a{display:block;padding:20px;color:inherit;text-decoration:none}.system-course-card img{width:100%;aspect-ratio:16/9;object-fit:cover}.system-course-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.course-cover:has(.system-course-cover)>span{position:relative;z-index:1;text-shadow:0 1px 8px #000}.course-cover:has(.system-course-cover){position:relative}button[data-system-course-link]{cursor:pointer}[hidden]{display:none!important}</style>`)
  append(head,`<script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-system-course-link]');if(!a)return;e.preventDefault();e.stopImmediatePropagation();parent.postMessage({source:'system-page-course',href:a.getAttribute('data-system-course-link')},'*')},true);</script>`)
  head.childNodes=[...head.childNodes.slice(originalHeadLength),...head.childNodes.slice(0,originalHeadLength)]
  append(head,`<style data-system-course-style>
[data-system-course-list][data-system-course-layout="cards"]{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:24px;max-width:1120px;margin:0 auto;padding:8px 0;align-items:stretch}
[data-system-course-list] .system-course-card{min-width:0;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;background:#fff;color:#0f172a;box-shadow:0 6px 24px #0f172a0a;transition:transform .2s,box-shadow .2s;font-size:16px;text-align:left}
[data-system-course-list] .system-course-card:hover{transform:translateY(-4px);box-shadow:0 14px 32px #0f172a18}
[data-system-course-list] a.system-course-open{display:flex;flex-direction:column;height:100%;padding:0;color:inherit;text-decoration:none}
[data-system-course-list] a.system-course-open:focus-visible{outline:3px solid #7c3aed;outline-offset:-3px}
[data-system-course-list] .system-course-media{display:grid;place-items:center;aspect-ratio:16/9;overflow:hidden;background:linear-gradient(135deg,#f5f3ff,#e0e7ff);color:#5b21b6;font-weight:600;font-size:16px}
[data-system-course-list] .system-course-media img{display:block;width:100%;height:100%;aspect-ratio:16/9;object-fit:cover;margin:0;border-radius:0}
[data-system-course-list] .system-course-content{display:flex;flex:1;flex-direction:column;gap:12px;padding:22px}
[data-system-course-list] .system-course-label{color:#6d28d9;font-size:12px;line-height:18px;font-weight:600}
[data-system-course-list] .system-course-content h3{margin:0;min-height:52px;font-size:19px;line-height:26px;font-weight:700;color:#0f172a;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
[data-system-course-list] .system-course-content p{margin:0;min-height:66px;font-size:14px;line-height:22px;font-weight:400;color:#64748b;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;overflow-wrap:anywhere}
[data-system-course-list] .system-course-pricing{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:auto;padding-top:16px;border-top:1px solid #eef2f6}
[data-system-course-list] .system-course-pricing>span{font-size:12px;line-height:20px;color:#64748b}
[data-system-course-list] .system-course-pricing>strong{font-size:20px;line-height:28px;font-weight:750;color:#6d28d9;white-space:nowrap}
[data-system-course-list] .system-course-cta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:auto;padding:12px 16px;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;font-size:14px;line-height:22px;font-weight:600}
[data-system-course-list] .course-body p{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
[data-system-course-list] [data-system-course-cover="image"]{position:relative;padding:0;overflow:hidden;background:none}
[data-system-course-list] [data-system-course-cover="image"]::before,[data-system-course-list] [data-system-course-cover="image"]::after{display:none;content:none}
@media(prefers-reduced-motion:reduce){[data-system-course-list] .system-course-card{transition:none}[data-system-course-list] .system-course-card:hover{transform:none}}
</style>`)
  return '<!doctype html>\n'+serialize(doc)
}
