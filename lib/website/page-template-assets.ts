import 'server-only'
import {createHash} from 'node:crypto'
import {parse,serialize,type DefaultTreeAdapterMap} from 'parse5'
import {PLATFORM_ORIGIN} from './domain-shared'
import {PAGE_HTML_LIMIT} from './page-template'

type Node=DefaultTreeAdapterMap['node']
type Asset={mime:string;bytes:Buffer}
const supported=new Set(['font/ttf','font/otf','font/woff','font/woff2','application/font-woff','application/x-font-ttf','application/x-font-opentype','image/png','image/jpeg','image/webp','image/gif','image/avif'])

/** Only CSS and image attributes are rewritten. Template scripts remain byte-for-byte intact. */
export function externalizePageAssets(html:string,profileId:number,revision:number,pageSlug='') {
  if(Buffer.byteLength(html)>PAGE_HTML_LIMIT)throw new Error('Template sau giải nén vượt 8MB.')
  const assets=new Map<string,Asset>(),doc=parse(html)
  const rewrite=(value:string)=>value.replace(/data:([a-z0-9/+.-]+);base64,([A-Za-z0-9+/]+={0,2})/gi,(original,mime:string,data:string)=>{
    mime=mime.toLowerCase()
    if(!supported.has(mime) || data.length<4096)return original
    const bytes=Buffer.from(data,'base64')
    if(bytes.toString('base64').replace(/=+$/,'')!==data.replace(/=+$/,''))return original
    const hash=createHash('sha256').update(mime+'\0').update(bytes).digest('hex')
    assets.set(hash,{mime,bytes})
    return `${PLATFORM_ORIGIN}/api/websites/template-assets/${profileId}/${revision}/${hash}${pageSlug?'?page='+encodeURIComponent(pageSlug):''}`
  })
  function visit(node:Node) {
    if('tagName' in node){
      if(node.tagName==='script')return
      if(node.tagName==='style')for(const child of node.childNodes)if(child.nodeName==='#text' && 'value' in child)child.value=rewrite(child.value)
      for(const attribute of node.attrs){
        if(attribute.name==='style' || (['img','source'].includes(node.tagName) && ['src','srcset'].includes(attribute.name)))attribute.value=rewrite(attribute.value)
      }
    }
    if('childNodes' in node)for(const child of node.childNodes)visit(child)
  }
  visit(doc)
  return {html:'<!doctype html>\n'+serialize(doc),assets}
}
