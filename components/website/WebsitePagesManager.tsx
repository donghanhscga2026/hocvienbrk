'use client'
/* eslint-disable @next/next/no-html-link-for-pages -- Open saved website pages with fresh permissions. */
import {useEffect,useState} from 'react'
import {blankWebsitePages,websitePagesSchema,type WebsitePages,type WebsitePage} from '@/lib/website/pages'

const targets=[['home','Trang chủ'],['courses','Khóa học'],['tools','Công cụ'],['account','Tài khoản'],['login','Đăng nhập']]
const input='w-full rounded-xl border border-slate-300 bg-white px-3 py-2'
const button='rounded-xl border px-4 py-2 text-sm disabled:opacity-50'
export default function WebsitePagesManager(){
  const [value,setValue]=useState<WebsitePages>(blankWebsitePages),[original,setOriginal]=useState<WebsitePages>(blankWebsitePages)
  const [slug,setSlug]=useState(''),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0)
  const [error,setError]=useState(''),[message,setMessage]=useState('')
  const dirty=JSON.stringify(value)!==JSON.stringify(original)
  useEffect(()=>{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000)
    let active=true
    setLoaded(false);setError('')
    fetch('/api/websites/pages',{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);if(active){setValue(data.content);setOriginal(data.content);setSlug(data.slug);setLoaded(true)}})
      .catch(e=>{if(active)setError(e.name==='AbortError'?'Tải trang quá lâu. Hãy thử lại.':e.message)}).finally(()=>clearTimeout(timeout))
    return()=>{active=false;clearTimeout(timeout);controller.abort()}
  },[attempt])
  useEffect(()=>{
    if(!dirty)return
    const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue=''}
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)
  },[dirty])
  function updatePage(index:number,patch:Partial<WebsitePage>){setValue(v=>({...v,pages:v.pages.map((p,i)=>i===index?{...p,...patch}:p)}));setMessage('')}
  function move(kind:'pages'|'menu',index:number,delta:number){setValue(v=>{const list=[...v[kind]];[list[index],list[index+delta]]=[list[index+delta],list[index]];return {...v,[kind]:list}})}
  async function save(){
    const parsed=websitePagesSchema.safeParse(value)
    if(!parsed.success){setError(parsed.error.issues[0]?.message || 'Kiểm tra tên và đường dẫn trang.');return}
    setBusy(true);setError('');setMessage('')
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),60000)
    try{
      const r=await fetch('/api/websites/pages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.data),signal:controller.signal})
      const data=await r.json();if(!r.ok)throw new Error(data.error)
      setValue(data.content);setOriginal(data.content);setMessage('Đã lưu trang và menu. Trang được xuất bản sẽ hiển thị trên website của bạn.')
    }catch(e){setError(e instanceof Error?(e.name==='AbortError'?'Lưu quá lâu. Tải lại để kiểm tra trạng thái trước khi thử lại.':e.message):'Không thể lưu.')}
    finally{clearTimeout(timeout);setBusy(false)}
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8"><div className="mx-auto max-w-5xl space-y-6">
    <a href="/tools/my-site/manage" className="text-violet-700 underline">← Quản lý website</a>
    <header><h1 className="text-3xl font-bold">Trang con & menu</h1><p className="mt-3 text-slate-600">Tạo trang Giới thiệu, Liên hệ… hoặc nhập template riêng cho từng trang. Các trang dùng chung tên miền và quyền tài khoản của website.</p></header>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}{!loaded && <button className={button+' ml-3'} onClick={()=>setAttempt(n=>n+1)}>Thử lại</button>}</div>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    {!loaded && !error && <p role="status">Đang tải trang và menu…</p>}
    <fieldset disabled={!loaded || busy} className="space-y-6 disabled:opacity-60">
      <section className="space-y-5 rounded-2xl border bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Các trang của website</h2><button className={button} disabled={value.pages.length>=30} onClick={()=>setValue(v=>({...v,pages:[...v.pages,{slug:'',title:'',description:'',body:'',published:false,showInMenu:true}]}))}>+ Thêm trang</button></div>
        {!value.pages.length && <p className="text-slate-500">Trang chủ hiện tại được giữ nguyên. Thêm trang con khi bạn cần.</p>}
        {value.pages.map((page,index)=>{
          const saved=original.pages.some(p=>p.slug===page.slug && page.slug!=='')
          return <article key={index} className="space-y-4 rounded-xl border bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{page.title || 'Trang mới'} <span className="ml-2 text-sm font-normal text-slate-500">{page.published?'Xuất bản':'Bản nháp'}</span></h3><div className="flex gap-2"><button aria-label="Đưa trang lên" className={button} disabled={index===0} onClick={()=>move('pages',index,-1)}>↑</button><button aria-label="Đưa trang xuống" className={button} disabled={index===value.pages.length-1} onClick={()=>move('pages',index,1)}>↓</button></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><label>Tên trang<input className={input+' mt-1'} maxLength={120} value={page.title} onChange={e=>updatePage(index,{title:e.target.value})}/></label><label>Đường dẫn<input className={input+' mt-1'} placeholder="gioi-thieu" maxLength={80} disabled={saved} value={page.slug} onChange={e=>updatePage(index,{slug:e.target.value.toLowerCase()})}/><span className="mt-1 block text-xs text-slate-500">Chữ thường không dấu, nối bằng dấu gạch ngang. Đường dẫn cố định sau khi lưu.</span></label></div>
            <label className="block">Mô tả ngắn<textarea className={input+' mt-1'} rows={2} maxLength={500} value={page.description} onChange={e=>updatePage(index,{description:e.target.value})}/></label>
            <label className="block">Nội dung văn bản<textarea className={input+' mt-1'} rows={6} maxLength={20000} value={page.body} onChange={e=>updatePage(index,{body:e.target.value})}/><span className="mt-1 block text-xs text-slate-500">Dùng khi chưa áp dụng template HTML/ZIP.</span></label>
            <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2"><input type="checkbox" checked={page.published} onChange={e=>updatePage(index,{published:e.target.checked})}/>Xuất bản trang</label><label className="flex items-center gap-2"><input type="checkbox" checked={page.showInMenu} onChange={e=>updatePage(index,{showInMenu:e.target.checked})}/>Tự thêm vào menu</label></div>
            <div className="flex flex-wrap gap-3 text-sm">{saved && !dirty?<a className="text-violet-700 underline" href={'/tools/my-site/pages/'+page.slug+'/template'}>Nhập HTML / ZIP cho trang này →</a>:<span className="text-slate-500">Lưu trang và menu trước khi nhập template.</span>}{saved && page.published && !dirty && <a className="text-violet-700 underline" target="_blank" rel="noreferrer" href={'/page/'+slug+'/'+page.slug}>Mở trang ↗</a>}</div>
            <p className="text-xs text-slate-500">Muốn ngừng hiển thị trang, bỏ chọn Xuất bản. Nội dung và template vẫn được giữ lại.</p>
          </article>
        })}
      </section>
      <section className="space-y-5 rounded-2xl border bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Menu điều hướng</h2><button className={button} disabled={value.menu.length>=40} onClick={()=>setValue(v=>({...v,menu:[...v.menu,{label:'Trang chủ',target:'home',visible:true,match:''}]}))}>+ Thêm mục menu</button></div><p className="text-sm text-slate-600">Chọn nơi đến và thứ tự. Với template riêng, nhập liên kết gốc như #about hoặc /about.html để kết nối nút có sẵn. Mục chưa có trong template sẽ được thêm vào menu đầu trang.</p>
        {value.menu.map((item,index)=><div key={index} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"><label>Tên hiển thị<input className={input+' mt-1'} maxLength={80} value={item.label} onChange={e=>setValue(v=>({...v,menu:v.menu.map((m,i)=>i===index?{...m,label:e.target.value}:m)}))}/></label><label>Điều hướng đến<select className={input+' mt-1'} value={item.target} onChange={e=>setValue(v=>({...v,menu:v.menu.map((m,i)=>i===index?{...m,target:e.target.value}:m)}))}>{[...targets,...value.pages.filter(p=>p.slug).map(p=>['page:'+p.slug,p.title || p.slug])].map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label><label>Liên kết gốc trong template (tùy chọn)<input className={input+' mt-1'} maxLength={180} placeholder="#about" value={item.match} onChange={e=>setValue(v=>({...v,menu:v.menu.map((m,i)=>i===index?{...m,match:e.target.value}:m)}))}/></label><div className="flex flex-wrap items-end gap-2"><label className="mr-auto flex items-center gap-2 py-2"><input type="checkbox" checked={item.visible} onChange={e=>setValue(v=>({...v,menu:v.menu.map((m,i)=>i===index?{...m,visible:e.target.checked}:m)}))}/>Hiển thị</label><button className={button} aria-label="Đưa mục menu lên" disabled={index===0} onClick={()=>move('menu',index,-1)}>↑</button><button className={button} aria-label="Đưa mục menu xuống" disabled={index===value.menu.length-1} onClick={()=>move('menu',index,1)}>↓</button><button className={button} onClick={()=>setValue(v=>({...v,menu:v.menu.filter((_,i)=>i!==index)}))}>Bỏ mục</button></div></div>)}
      </section>
      <div className="sticky bottom-3 flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4 shadow-lg"><button className={button+' bg-violet-700 text-white'} disabled={!dirty} onClick={()=>void save()}>{busy?'Đang lưu…':'Lưu trang & menu'}</button><span className="text-sm text-slate-500">{dirty?'Có thay đổi chưa lưu':'Đã lưu toàn bộ thay đổi'}</span></div>
    </fieldset>
  </div></main>
}
