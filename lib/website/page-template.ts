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
export type PageCourse = {id:number;title:string;description:string;image:string;href:string}
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
const cleanText=(value:string)=>value.replace(/<[^>]*>/g,'').slice(0,500)

/** Compile one region before the template's own scripts initialize. No private course fields enter the frame. */
export function renderPageTemplate(html:string,region:string,courses:PageCourse[]) {
  if(new TextEncoder().encode(html).length>PAGE_HTML_LIMIT)throw new Error('Template sau giải nén vượt 8MB.')
  const doc=parse(html),nodes=walk(doc),body=nodes.find(n=>n.tagName==='body')!,head=nodes.find(n=>n.tagName==='head')!
  const matches=nodes.filter(n=>attr(n,'id')===region)
  if(region!=='__append__' && (matches.length!==1 || !['div','section','main','ul','ol','article'].includes(matches[0].tagName)))throw new Error('Chọn một vùng danh sách duy nhất trong template.')
  let slot=matches[0]
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
  slot.childNodes=[];set(slot,'data-system-course-list','true')
  for(const [index,course] of courses.entries()) {
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
        if(hasClass(n,'price'))text(n,'Xem học phí tại trang khóa học')
        if(n.tagName==='button'){set(n,'type','button');set(n,'data-system-course-link',course.href);set(n,'aria-label','Xem thông tin '+course.title);text(n,'Xem thông tin')}
      }
      const cover=descendants.find(n=>hasClass(n,'course-cover'))
      if(cover && course.image)append(cover,`<img class="system-course-cover" src="${escape(course.image)}" alt="" loading="lazy">`)
      set(card,'data-category','course');set(card,'class',attr(card,'class')+' visible')
    } else {
      card=parseFragment(`<article class="system-course-card"><a data-system-course-link="${escape(course.href)}" href="${escape(course.href)}">${course.image?`<img src="${escape(course.image)}" alt="" loading="lazy">`:''}<h3>${escape(course.title)}</h3><p>${escape(cleanText(course.description))}</p><span>Xem thông tin →</span></a></article>`).childNodes[0] as Element
    }
    card.parentNode=slot;slot.childNodes.push(card)
  }
  if(!courses.length)append(slot,'<p role="status">Chưa có khóa học đang mở trên trang này.</p>')
  for(const n of walk(doc))if(hasClass(n,'filter') && !['all','course'].includes(attr(n,'data-filter')))set(n,'hidden','')
  const counter=walk(doc).find(n=>attr(n,'id')==='sr-count');if(counter)text(counter,`${courses.length} khóa học`)
  // sandbox has no same-origin, forms, popups or top-navigation permission.
  const originalHeadLength=head.childNodes.length
  append(head,`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; media-src data: https:; style-src 'unsafe-inline' https:; font-src data: https:; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><style>[data-system-course-list]{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:24px}.system-course-card{border:1px solid #ddd;border-radius:16px;overflow:hidden;background:white;color:#18202b}.system-course-card a{display:block;padding:20px;color:inherit;text-decoration:none}.system-course-card img{width:100%;aspect-ratio:16/9;object-fit:cover}.system-course-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.course-cover:has(.system-course-cover)>span{position:relative;z-index:1;text-shadow:0 1px 8px #000}.course-cover:has(.system-course-cover){position:relative}button[data-system-course-link]{cursor:pointer}[hidden]{display:none!important}</style>`)
  append(head,`<script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-system-course-link]');if(!a)return;e.preventDefault();e.stopImmediatePropagation();parent.postMessage({source:'system-page-course',href:a.getAttribute('data-system-course-link')},'*')},true);</script>`)
  head.childNodes=[...head.childNodes.slice(originalHeadLength),...head.childNodes.slice(0,originalHeadLength)]
  return '<!doctype html>\n'+serialize(doc)
}
