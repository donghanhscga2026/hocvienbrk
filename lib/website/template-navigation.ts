import {parse,parseFragment,serialize,type DefaultTreeAdapterMap} from 'parse5'
import type {WebsiteLink} from './pages'
type Node=DefaultTreeAdapterMap['node']
type Element=DefaultTreeAdapterMap['element']
const elements=(node:Node):Element[]=>[...('tagName' in node?[node]:[]),...('childNodes' in node?node.childNodes.flatMap(elements):[])]
const attr=(node:Element,name:string)=>node.attrs.find(a=>a.name===name)?.value || ''
function set(node:Element,name:string,value:string){const old=node.attrs.find(a=>a.name===name);if(old)old.value=value;else node.attrs.push({name,value})}
const escape=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
function inFooter(node:Node):boolean{return 'parentNode' in node && !!node.parentNode && (('tagName' in node.parentNode && node.parentNode.tagName==='footer') || inFooter(node.parentNode))}

/** Menu links use the same exact-href parent bridge as trusted course links. */
export function connectTemplateNavigation(html:string,links:WebsiteLink[],hiddenMatches:string[]=[]){
  if(!links.length && !hiddenMatches.length)return html
  const doc=parse(html),all=elements(doc),body=all.find(n=>n.tagName==='body')!
  const header=all.find(n=>n.tagName==='header')
  let nav=(header?elements(header):all).find(n=>n.tagName==='nav' && !inFooter(n))
  if(!nav && links.length){
    nav=elements(parseFragment('<nav aria-label="Menu website" style="display:flex;flex-wrap:wrap;gap:20px;padding:16px;align-items:center"></nav>'))[0]
    nav.parentNode=body;body.childNodes.unshift(nav)
  }
  for(const root of all.filter(n=>n.tagName==='nav'))for(const anchor of elements(root).filter(n=>n.tagName==='a')){
    if(hiddenMatches.includes(attr(anchor,'href')))set(anchor,'hidden','')
  }
  if(nav){
    const first=elements(nav).find(n=>n.tagName==='a'),className=attr(first || nav,'class')
    for(const link of links){
      const existing=all.filter(n=>n.tagName==='a' && (attr(n,'href')===link.href || (!!link.match && attr(n,'href')===link.match)))
      const targets=existing.length?existing:elements(parseFragment(`<a href="${escape(link.href)}" class="${escape(className)}">${escape(link.title)}</a>`))
      for(const node of targets){
        set(node,'href',link.href);set(node,'data-system-course-link',link.href)
        node.attrs=node.attrs.filter(a=>!['onclick','target','download','hidden'].includes(a.name))
        node.childNodes=[{nodeName:'#text',value:link.title,parentNode:node}]
        if(!existing.length){
          if(first?.parentNode && 'tagName' in first.parentNode && first.parentNode.tagName==='li' && first.parentNode.parentNode){
            const wrapper=elements(parseFragment(`<li class="${escape(attr(first.parentNode,'class'))}"></li>`))[0],parent=first.parentNode.parentNode
            node.parentNode=wrapper;wrapper.childNodes.push(node);wrapper.parentNode=parent;parent.childNodes.push(wrapper)
          }else{node.parentNode=nav;nav.childNodes.push(node)}
        }
      }
    }
    // Reorder configured links inside each menu container, preserving wrappers and local anchors.
    for(const root of all.filter(n=>n.tagName==='nav').concat(all.includes(nav)?[]:[nav]))for(const parent of elements(root)){
      const slots=parent.childNodes.map((node,index)=>{
        const anchors=elements(node).filter(n=>n.tagName==='a' && links.some(l=>l.href===attr(n,'data-system-course-link')))
        return anchors.length===1?{node,index,rank:links.findIndex(l=>l.href===attr(anchors[0],'data-system-course-link'))}:null
      }).filter((slot):slot is NonNullable<typeof slot>=>slot!==null)
      const sorted=[...slots].sort((a,b)=>a.rank-b.rank)
      slots.forEach((slot,i)=>{parent.childNodes[slot.index]=sorted[i].node})
    }
  }
  return '<!doctype html>\n'+serialize(doc)
}
