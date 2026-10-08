'use client'
import {useEffect,useRef} from 'react'
import type {PublicForm} from '@/lib/crm/form-shared'
export default function ImportedPageFrame({html,links,preview=false,forms=[],slug=''}:{html:string;links:string[];preview?:boolean;forms?:PublicForm[];slug?:string}) {
  const frame=useRef<HTMLIFrameElement>(null)
  useEffect(()=>{
    const controllers=new Map<string,AbortController>()
    const receive=async(event:MessageEvent)=>{
      if(event.source!==frame.current?.contentWindow)return
      const data=event.data
      if(data?.source==='system-page-course' && links.includes(data.href)){
        if(!preview)window.location.assign(data.href)
        return
      }
      if(data?.source!=='system-page-form' || typeof data.key!=='string' || data.key.length>40 || !forms.some(f=>f.id===data.formId && f.version===data.version) || controllers.has(data.key))return
      const target=event.source as Window
      const reply=(ok:boolean,error?:string)=>target.postMessage({source:'system-page-form-result',key:data.key,ok,error},'*')
      if(preview){reply(false,'Đây là bản xem trước. Chưa gửi đăng ký vào CRM.');return}
      if(!slug)return
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000)
      controllers.set(data.key,controller)
      try{
        const body=JSON.stringify({slug,formId:data.formId,version:data.version,key:data.key,answers:data.answers,consent:data.consent,website:data.website})
        if(new TextEncoder().encode(body).length>48000)throw new Error('Câu trả lời quá dài.')
        const response=await fetch('/api/websites/forms/submit',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:controller.signal})
        const result=await response.json();if(!response.ok)throw new Error(result.error || 'Không gửi được đăng ký.')
        reply(true)
      }catch(e){reply(false,e instanceof Error?(e.name==='AbortError'?'Phản hồi quá lâu. Vui lòng thử gửi lại.':e.message):'Không gửi được đăng ký.')}
      finally{clearTimeout(timeout);controllers.delete(data.key)}
    }
    window.addEventListener('message',receive);return()=>{window.removeEventListener('message',receive);controllers.forEach(c=>c.abort())}
  },[links,preview,forms,slug])
  return <iframe ref={frame} title="Giao diện Page và danh sách khóa học" srcDoc={html} sandbox="allow-scripts" referrerPolicy="no-referrer" className="block w-full border-0 bg-white" style={{height:preview?'75vh':'100dvh',minHeight:600}} />
}
