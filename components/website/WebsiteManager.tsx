'use client'
/* eslint-disable @next/next/no-html-link-for-pages -- Các công cụ quản lý có vòng đời riêng. */
import {useEffect,useState} from 'react'
import {moduleKeys,moduleLabels,moduleScopes,noModules,type WebsiteAccess} from '@/lib/website/access'
import {applicationKeys,applications,allApplications,noApplications,type ApplicationFlags} from '@/lib/website/applications'
import type {DomainModules} from '@/lib/website/domain-shared'

type Section='design'|'data'|'domains'|'apps'|'package'
type Presentation={mode:'template'|'custom';revision:number;customPublished:boolean}
type Snapshot={access:WebsiteAccess;basic:DomainModules;basicApplications:ApplicationFlags;admin:boolean;name:string;slug:string;configured:boolean;domains:{hostname:string;enabled:boolean}[]}
export default function WebsiteManager() {
  const [presentation,setPresentation]=useState<Presentation|null>(null)
  const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const [basic,setBasic]=useState<DomainModules>(noModules),[extra,setExtra]=useState<DomainModules>(noModules),[enabled,setEnabled]=useState<DomainModules>(noModules)
  const [basicApps,setBasicApps]=useState<ApplicationFlags>(noApplications),[extraApps,setExtraApps]=useState<ApplicationFlags>(noApplications),[enabledApps,setEnabledApps]=useState<ApplicationFlags>(noApplications)
  const [section,setSection]=useState<Section>('design')
  function receive(value:Snapshot,scope:'all'|'website'|'basic'='all') {
    setData(value)
    if(scope!=='website'){setBasic(value.basic);setBasicApps(value.basicApplications)}
    if(scope!=='basic'){setExtra(value.access.extra);setEnabled(value.access.enabled);setExtraApps(value.access.applications.extra);setEnabledApps(value.access.applications.enabled)}
  }
  const websiteDirty=!!data && (moduleKeys.some(key=>enabled[key]!==data.access.enabled[key] || extra[key]!==data.access.extra[key]) || applicationKeys.some(key=>enabledApps[key]!==data.access.applications.enabled[key] || extraApps[key]!==data.access.applications.extra[key]))
  const basicDirty=!!data && (moduleKeys.some(key=>basic[key]!==data.basic[key]) || applicationKeys.some(key=>basicApps[key]!==data.basicApplications[key]))
  useEffect(()=>{
    if(!websiteDirty && !basicDirty)return
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
    window.addEventListener('beforeunload',warn)
    return()=>window.removeEventListener('beforeunload',warn)
  },[websiteDirty,basicDirty])
  useEffect(()=>{
    const abort=new AbortController()
    fetch('/api/websites/access',{signal:abort.signal}).then(async r=>{const value=await r.json();if(!r.ok)throw new Error(value.error);receive(value)}).catch(e=>{if(!abort.signal.aborted)setError(e.message)})
    fetch('/api/websites/presentation',{signal:abort.signal}).then(async r=>{const value=await r.json();if(!r.ok)throw new Error(value.error);setPresentation(value)}).catch(e=>{if(!abort.signal.aborted)setError(e.message)})
    return()=>abort.abort()
  },[])
  async function save(body:object,scope:'website'|'basic'='website') {
    setBusy(true);setError('');setMessage('')
    try {
      const r=await fetch('/api/websites/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const value=await r.json();if(!r.ok)throw new Error(value.error);receive(value,scope);setMessage(scope==='basic'?'Đã lưu mẫu gói cơ bản. Bạn có thể áp dụng cho website này.':'Đã lưu kết nối của website.')
    } catch(e) {setError(e instanceof Error ? e.message : 'Không thể lưu.')} finally {setBusy(false)}
  }
  async function chooseMode(mode:Presentation['mode']) {
    if(!presentation)return
    setBusy(true);setError('');setMessage('')
    try {
      const r=await fetch('/api/websites/presentation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,revision:presentation.revision})})
      const value=await r.json();if(!r.ok)throw new Error(value.error);setPresentation(value);setMessage('Đã chọn giao diện. Nội dung cả hai mẫu được giữ nguyên; tải lại website để xem.')
    } catch(e){setError(e instanceof Error?e.message:'Không thể đổi giao diện.')} finally{setBusy(false)}
  }
  function websiteCommand(applyBasic=false) {
    return {action:'save',revision:data!.access.revision,enabled,applications:enabledApps,...(data!.admin ? {extra,applicationExtra:extraApps,...(applyBasic ? {applyBasic:true} : {})} : {})}
  }
  // Chỉ bật những ứng dụng đã được cấp; thao tác này chưa ghi cho tới khi bấm Lưu.
  function connectGranted() {
    if(!data)return
    setEnabled(Object.fromEntries(moduleKeys.map(key=>[key,data.access.base[key] || extra[key]])) as DomainModules)
    setEnabledApps(Object.fromEntries(applicationKeys.map(key=>[key,data.access.applications.base[key] || extraApps[key]])) as ApplicationFlags)
  }
  const view=data?.domains.find(d=>d.enabled)
  const items:{id:Section;label:string;description:string}[]=[
    {id:'design',label:'Trang & giao diện',description:'Nội dung và mẫu đang dùng'},
    {id:'data',label:'Dữ liệu & giáo viên',description:'Khóa học và người phụ trách'},
    {id:'domains',label:'Tên miền',description:'Địa chỉ truy cập website'},
    {id:'apps',label:'Ứng dụng & quyền truy cập',description:'Bật, tắt các kết nối'},
    ...(data?.admin?[{id:'package' as const,label:'Gói cơ bản',description:'Thiết lập dành cho quản trị viên'}]:[]),
  ]
  const current=items.find(item=>item.id===section)!
  const button='inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-600 disabled:opacity-50'
  const primary=button.replace('border-slate-200 bg-white','border-violet-700 bg-violet-700').replace('hover:bg-slate-50','hover:bg-violet-800')+' text-white'
  const editHref=presentation?.mode==='custom'?'/tools/my-site/design':'/tools/my-site/edit'
  function applicationRow(id:string,name:string,audience:string,scope:string,base:boolean,extraFlag:boolean,connected:boolean,onExtra:(value:boolean)=>void,onConnected:(value:boolean)=>void) {
    const granted=base || extraFlag
    return <article key={id} className="rounded-xl border border-slate-200 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><h3 className="font-semibold">{name}</h3><p className="mt-1 text-xs text-slate-500">{audience} · {base?'Trong gói cơ bản':extraFlag?'Được cấp bổ sung':'Chưa được cấp'}</p></div>
        <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm"><input aria-label={'Kết nối '+name} role="switch" type="checkbox" className="h-5 w-5 accent-violet-700" checked={granted && connected} disabled={busy || !granted} onChange={e=>onConnected(e.target.checked)}/>{granted && connected?'Đang bật':'Đang tắt'}</label>
      </div>
      <details className="mt-2 text-sm"><summary className="cursor-pointer text-violet-700">Quyền truy cập & dữ liệu</summary><p className="mt-3 text-slate-600">{scope}</p>{data?.admin && <label className="mt-3 flex min-h-11 items-center gap-2"><input type="checkbox" aria-label={'Cấp bổ sung '+name} className="h-4 w-4 accent-violet-700" disabled={busy} checked={extraFlag} onChange={e=>onExtra(e.target.checked)}/>Cấp bổ sung cho website này</label>}</details>
    </article>
  }
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-6xl space-y-6">
    <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-slate-500"><a href="/tools/pages?tab=my-site" className="text-violet-700 hover:underline">Trang của tôi</a><span aria-hidden="true">/</span><span>Quản lý website</span></nav>
    <header className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="min-w-0"><p className="mb-2 text-sm text-violet-700">Quản lý website của tôi</p><h1 className="break-words text-2xl font-bold sm:text-3xl">{data?.name || 'Website của tôi'}</h1><div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="rounded-full bg-violet-50 px-3 py-1 text-violet-800">{presentation?presentation.mode==='template'?'Mẫu có sẵn':'Thiết kế tự do':'Đang tải giao diện…'}</span>{data && <span className="break-all text-slate-500">{view?.hostname || 'Chưa kết nối tên miền riêng'}</span>}</div></div>
      <div className="flex flex-wrap gap-2">{data && <a className={button} href={view?'https://'+view.hostname:'/page/'+data.slug} target="_blank" rel="noreferrer">Xem website ↗</a>}{presentation && <a className={primary} href={editHref}>Chỉnh sửa →</a>}</div>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    {!data && !error && <p role="status">Đang tải cấu hình…</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6">
        <label className="block lg:hidden"><span className="mb-2 block text-sm font-medium">Mục quản lý</span><select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3" value={section} onChange={e=>setSection(e.target.value as Section)}>{items.map(item=><option key={item.id} value={item.id}>{item.label}{(item.id==='apps' && websiteDirty || item.id==='package' && basicDirty)?' · Chưa lưu':''}</option>)}</select></label>
        <nav aria-label="Quản lý website" className="hidden space-y-1 rounded-2xl border border-slate-200 bg-white p-2 lg:block">{items.map(item=><button type="button" key={item.id} aria-current={section===item.id?'page':undefined} onClick={()=>setSection(item.id)} className={'w-full rounded-xl p-3 text-left focus-visible:outline-2 focus-visible:outline-violet-600 '+(section===item.id?'bg-violet-50 text-violet-800':'hover:bg-slate-50')}><span className="block text-sm font-semibold">{item.label}</span><span className="mt-1 block text-xs text-slate-500">{item.description}</span>{(item.id==='apps' && websiteDirty || item.id==='package' && basicDirty) && <span className="mt-1 block text-xs text-amber-700">Chưa lưu</span>}</button>)}</nav>
      </aside>
      <section aria-label={current.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-xl font-bold">{current.label}</h2><p className="mb-6 mt-1 text-sm text-slate-500">{current.description}</p>
        {section==='design' && <div className="space-y-5">
          {!presentation?<p>Đang tải mẫu đang dùng…</p>:<>
            <div className="rounded-xl bg-slate-50 p-5"><p className="mb-2 text-sm text-slate-500">Giao diện đang hiển thị</p><h3 className="text-lg font-semibold">{presentation.mode==='template'?'Mẫu có sẵn':'Thiết kế tự do'}</h3><p className="mb-4 mt-2 text-sm text-slate-600">{presentation.mode==='template'?'Ảnh bìa, thông điệp, khóa học và bảng tin của bạn.':'Thiết kế kéo thả, các trang con và nội dung tùy chỉnh của bạn.'}</p><a className={primary} href={editHref}>Chỉnh sửa giao diện đang dùng →</a></div>
            <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-medium text-violet-700">Đổi giao diện</summary><p className="my-4 text-sm text-slate-600">Cả hai mẫu dùng chung tên miền, nguồn khóa học và kết nối ứng dụng. Đổi mẫu giữ nguyên nội dung đã tạo.</p><div className="grid gap-4 sm:grid-cols-2">
              <article className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Mẫu có sẵn</h3><a href="/tools/my-site/edit" className="block text-sm text-violet-700 underline">Chỉnh sửa mẫu</a><button className={button} disabled={busy || presentation.mode==='template'} onClick={()=>void chooseMode('template')}>{presentation.mode==='template'?'Đang sử dụng':'Dùng mẫu có sẵn'}</button></article>
              <article className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Thiết kế tự do</h3><a href="/tools/my-site/design" className="block text-sm text-violet-700 underline">Mở trình thiết kế</a>{!presentation.customPublished && <p className="text-sm text-amber-800">Cần xuất bản thiết kế trước khi sử dụng.</p>}<button className={button} disabled={busy || !presentation.customPublished || presentation.mode==='custom'} onClick={()=>void chooseMode('custom')}>{presentation.mode==='custom'?'Đang sử dụng':'Dùng thiết kế tự do'}</button></article>
            </div></details>
            <p className="text-sm text-slate-500">Khảo sát và lộ trình của mẫu cũ hiện dùng trên hệ thống chính.</p>
          </>}
        </div>}
        {section==='data' && <div className="space-y-5"><div className="rounded-xl bg-slate-50 p-5"><h3 className="font-semibold">Nguồn khóa học</h3><p className="mt-2 text-sm text-slate-600">Chọn các khóa học được hiển thị và truy cập trên website. Bạn có thể dùng nguồn tự động từ chủ website, giáo viên liên kết hoặc chọn từng khóa học.</p></div><div className="rounded-xl border p-5"><h3 className="font-semibold">Giáo viên liên kết</h3><p className="mt-2 text-sm text-slate-600">Quản lý người phụ trách và nguồn khóa học dùng chung. Quyền sử dụng công cụ vẫn theo vai trò của từng tài khoản.</p></div><a className={primary} href="/tools/my-site/data">Quản lý dữ liệu & giáo viên →</a></div>}
        {section==='domains' && data && <div className="space-y-5"><p className="text-sm text-slate-600">Tên miền dùng chung cho mẫu có sẵn và thiết kế tự do.</p>{data.domains.length?data.domains.map(domain=><div key={domain.hostname} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><span className="break-all font-medium">{domain.hostname}</span><span className={'rounded-full px-3 py-1 text-xs '+(domain.enabled?'bg-green-50 text-green-800':'bg-slate-100 text-slate-600')}>{domain.enabled?'Đang bật':'Đang tắt'}</span></div>):<p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Bạn chưa kết nối tên miền riêng.</p>}<div className="flex flex-wrap gap-2"><a className={primary} href="/tools/my-site/domains">Quản lý tên miền →</a><a className={button} href={'/page/'+data.slug} target="_blank" rel="noreferrer">Xem địa chỉ trên hệ thống ↗</a></div></div>}
        {section==='apps' && data && <div className="space-y-5">
          <p className="text-sm text-slate-600">Bật ứng dụng đã được cấp cho website. Học viên dùng phần cá nhân; giáo viên liên kết dùng phần được phép quản lý.</p>
          <div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={connectGranted}>Bật tất cả đã được cấp</button><button className={button} disabled={busy} onClick={()=>{setEnabled({...noModules});setEnabledApps({...noApplications})}}>Tắt tất cả</button></div>
          <div className="space-y-3"><h3 className="font-semibold">Trên website riêng</h3>{moduleKeys.map(key=>applicationRow(key,moduleLabels[key],key==='crm'?'Chủ website / giáo viên liên kết':'Theo quyền tài khoản',moduleScopes[key],data.access.base[key],extra[key],enabled[key],value=>setExtra({...extra,[key]:value}),value=>setEnabled({...enabled,[key]:value})))}</div>
          <div className="space-y-3"><h3 className="font-semibold">Mở trên hệ thống chính</h3><p className="text-sm text-slate-500">Ứng dụng mở trong tab mới và có phiên đăng nhập riêng. Dữ liệu theo tài khoản trên hệ thống chính, có thể bao gồm dữ liệu ngoài website này.</p>{applicationKeys.map(key=>applicationRow(key,applications[key].name,applications[key].audience==='staff'?'Chủ website / giáo viên liên kết':'Thành viên theo quyền tài khoản',applications[key].scope,data.access.applications.base[key],extraApps[key],enabledApps[key],value=>setExtraApps({...extraApps,[key]:value}),value=>setEnabledApps({...enabledApps,[key]:value})))}</div>
          <p className="text-sm text-slate-500">Tắt kết nối giữ nguyên dữ liệu và quyền dùng trực tiếp trên hệ thống chính.</p>
          <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-white p-4 sm:-mx-6 sm:px-6"><p role="status" className={'text-sm '+(websiteDirty?'text-amber-800':'text-slate-500')}>{websiteDirty?'Có thay đổi chưa lưu':'Kết nối đã được lưu'}</p><button className={primary} disabled={busy || !websiteDirty} onClick={()=>void save(websiteCommand())}>{busy?'Đang lưu…':'Lưu kết nối'}</button></div>
        </div>}
        {section==='package' && data?.admin && <fieldset disabled={busy} className="space-y-5">
          <p className="text-sm text-slate-600">Chọn ứng dụng đi cùng gói cơ bản, lưu mẫu rồi áp dụng cho website này. Sau đó chuyển sang Ứng dụng & quyền truy cập để bật kết nối. Lưu mẫu không tự đổi quyền của website đang hoạt động.</p>
          <button className={button} onClick={()=>{setBasic({courses:true,crm:true,affiliate:true});setBasicApps({...allApplications})}}>Chọn bộ cơ bản đầy đủ</button>
          <div className="grid gap-3 sm:grid-cols-2">{moduleKeys.map(key=><label key={key} className="flex min-h-11 items-center gap-3 rounded-xl border p-3"><input className="h-4 w-4 accent-violet-700" type="checkbox" checked={basic[key]} onChange={e=>setBasic({...basic,[key]:e.target.checked})}/>{moduleLabels[key]}</label>)}{applicationKeys.map(key=><label key={key} className="flex min-h-11 items-center gap-3 rounded-xl border p-3"><input className="h-4 w-4 accent-violet-700" type="checkbox" checked={basicApps[key]} onChange={e=>setBasicApps({...basicApps,[key]:e.target.checked})}/>{applications[key].name}</label>)}</div>
          <div className="sticky bottom-0 -mx-4 space-y-3 border-t bg-white p-4 sm:-mx-6 sm:px-6"><p role="status" className={'text-sm '+(basicDirty?'text-amber-800':'text-slate-500')}>{basicDirty?'Mẫu gói có thay đổi chưa lưu':'Mẫu gói đã được lưu'}</p><div className="flex flex-wrap gap-2"><button className={primary} disabled={!basicDirty || busy} onClick={()=>void save({action:'basic',modules:basic,applications:basicApps},'basic')}>Lưu mẫu gói cơ bản</button><button className={button} disabled={basicDirty || busy} onClick={()=>void save(websiteCommand(true))}>Áp dụng gói đã lưu cho website này</button></div></div>
        </fieldset>}
      </section>
    </div>
  </div></main>
}
