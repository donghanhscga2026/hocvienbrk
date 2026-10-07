import { parse, serialize } from 'parse5'
import { TemplateControls, safeControlLink } from '@/lib/course-page/importer/controls'

// Gán khóa ổn định theo vị trí DOM, không dựa vào nhãn có thể trùng nhau.
export function detectTemplateControls(html: string) {
  const doc = parse(html), nodes: any[] = []
  function visit(n: any) { if(n.tagName) nodes.push(n); for(const child of n.childNodes||[]) visit(child) }
  visit(doc)
  const get = (n:any,k:string) => n.attrs?.find((a:any)=>a.name===k)?.value || ''
  const set = (n:any,k:string,v:string) => { n.attrs=n.attrs.filter((a:any)=>a.name!==k); n.attrs.push({name:k,value:v}) }
  const text = (n:any):string => n.nodeName==='#text' ? n.value : (n.childNodes||[]).map(text).join(' ')
  const short = (value:string) => value.replace(/\s+/g,' ').trim().slice(0,180)
  const controls:TemplateControls={items:[],targets:[],bindings:[]}
  // Bỏ dấu cấu hình từ file nhập để người nhập không giả mạo khóa hệ thống.
  for(const n of nodes) n.attrs=n.attrs.filter((a:any)=>!['data-mfc-control','data-mfc-target'].includes(a.name))
  for(const n of nodes.filter(n=>(get(n,'id') || ['section','article'].includes(n.tagName) || get(n,'role')==='tabpanel' || /(?:^|\s)tab-(?:content|pane|panel)(?:\s|$)/.test(get(n,'class'))) && !['script','style','input','button','a','select','textarea'].includes(n.tagName)).slice(0,150)) {
    const id='target-'+(controls.targets.length+1); set(n,'data-mfc-target',id)
    controls.targets.push({id,originalId:short(get(n,'id') || 'Phần '+(controls.targets.length+1)),label:short(get(n,'aria-label')||text(n.childNodes?.find((c:any)=>/^h[1-6]$/.test(c.tagName))||n)||get(n,'id'))})
  }
  for(const n of nodes.filter(n=>n.tagName==='button' || n.tagName==='a' || get(n,'role')==='tab' || get(n,'onclick')).slice(0,150)) {
    const id='control-'+(controls.items.length+1), href=get(n,'href').slice(0,2000)
    set(n,'data-mfc-control',id)
    let parent=n.parentNode; while(parent && !['section','header','footer','nav'].includes(parent.tagName))parent=parent.parentNode
    const label=short(text(n)||get(n,'aria-label')||get(n,'title')||'Nút không có nhãn')
    controls.items.push({id,label,context:short(parent ? get(parent,'id')||parent.tagName : 'Nội dung trang'),originalHref:href})
    let action:TemplateControls['bindings'][number]['action']='pending', target=''
    const targetName=get(n,'aria-controls')||get(n,'data-bs-target').replace(/^#/,'')||href.replace(/^#/,'')
    const section=controls.targets.find(t=>t.originalId===targetName)
    if (/đăng\s*ký|register|enroll/i.test(label) || get(n,'data-mfc-action')==='register') action='register'
    else if(section && (href.startsWith('#') || get(n,'aria-controls'))) { action=get(n,'role')==='tab' || /tab/i.test(get(n,'class')+' '+get(n,'onclick')) ? 'tab':'scroll'; target=section.id }
    else if(safeControlLink(href)) { action='link'; target=href }
    controls.bindings.push({id,action,target})
  }
  return {html:serialize(doc),controls}
}
