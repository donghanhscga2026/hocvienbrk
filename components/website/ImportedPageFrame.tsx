'use client'
import {useEffect,useRef} from 'react'

/** Template chỉ điều hướng tới khóa học; không nhận đăng ký vào CRM. */
export default function ImportedPageFrame({html,links,preview=false}:{html:string;links:string[];preview?:boolean}) {
  const frame=useRef<HTMLIFrameElement>(null)
  useEffect(()=>{
    const receive=(event:MessageEvent)=>{
      if(event.source!==frame.current?.contentWindow)return
      const data=event.data
      if(!preview && data?.source==='system-page-course' && links.includes(data.href))window.location.assign(data.href)
    }
    window.addEventListener('message',receive)
    return()=>window.removeEventListener('message',receive)
  },[links,preview])
  return <iframe ref={frame} title="Giao diện Page và danh sách khóa học" srcDoc={html} sandbox="allow-scripts" referrerPolicy="no-referrer" className="block w-full border-0 bg-white" style={{height:preview?'75vh':'100dvh',minHeight:600}} />
}
