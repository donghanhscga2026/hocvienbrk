'use client'
/* eslint-disable @next/next/no-html-link-for-pages -- Các công cụ quản lý có vòng đời riêng. */
import {useEffect,useState} from 'react'
import {moduleKeys,moduleLabels,moduleScopes,noModules,type WebsiteAccess} from '@/lib/website/access'
import {applicationKeys,applications,allApplications,noApplications,type ApplicationFlags} from '@/lib/website/applications'
import type {DomainModules} from '@/lib/website/domain-shared'

type Snapshot={access:WebsiteAccess;basic:DomainModules;basicApplications:ApplicationFlags;admin:boolean;name:string;slug:string;configured:boolean;domains:{hostname:string;enabled:boolean}[]}
export default function WebsiteManager() {
  const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const [basic,setBasic]=useState<DomainModules>(noModules),[extra,setExtra]=useState<DomainModules>(noModules),[enabled,setEnabled]=useState<DomainModules>(noModules)
  const [basicApps,setBasicApps]=useState<ApplicationFlags>(noApplications),[extraApps,setExtraApps]=useState<ApplicationFlags>(noApplications),[enabledApps,setEnabledApps]=useState<ApplicationFlags>(noApplications)
  function receive(value:Snapshot) {
    setData(value);setBasic(value.basic);setExtra(value.access.extra);setEnabled(value.access.enabled)
    setBasicApps(value.basicApplications);setExtraApps(value.access.applications.extra);setEnabledApps(value.access.applications.enabled)
  }
  useEffect(()=>{
    const abort=new AbortController()
    fetch('/api/websites/access',{signal:abort.signal}).then(async r=>{const value=await r.json();if(!r.ok)throw new Error(value.error);receive(value)}).catch(e=>{if(!abort.signal.aborted)setError(e.message)})
    return()=>abort.abort()
  },[])
  async function save(body:object) {
    setBusy(true);setError('');setMessage('')
    try {
      const r=await fetch('/api/websites/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const value=await r.json();if(!r.ok)throw new Error(value.error);receive(value);setMessage('Đã lưu. Tải lại website riêng để xem kết nối mới.')
    } catch(e) {setError(e instanceof Error ? e.message : 'Không thể lưu.')} finally {setBusy(false)}
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
  return <main className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8"><div className="max-w-5xl mx-auto grid gap-6">
    <a href="/tools/pages?tab=my-site" className="text-sm text-violet-700">← Trang của tôi</a>
    <header><p className="text-sm text-violet-700 mb-2">Không gian quản lý</p><h1 className="text-3xl font-bold">Website của tôi</h1><p className="text-slate-600 mt-2">{data?.name || 'Quản lý nội dung, tên miền và ứng dụng ở một nơi.'}</p></header>
    <nav aria-label="Quản lý website" className="grid gap-3 sm:grid-cols-3">
      {[['/tools/my-site/design','Trang & giao diện','Thiết kế trang và nội dung.'],['/tools/my-site/domains','Tên miền','Kết nối và xác minh tên miền riêng.'],['/tools/my-site/edit','Dữ liệu & giáo viên','Chọn khóa học, liên kết giáo viên và thông tin website.']].map(([href,title,description])=><a key={href} href={href} className="rounded-2xl border bg-white p-5 hover:border-violet-400"><h2 className="font-bold mb-2">{title} →</h2><p className="text-sm text-slate-600">{description}</p></a>)}
    </nav>
    {error && <p role="alert" className="p-4 rounded-xl bg-red-50 text-red-700">{error}</p>}
    {message && <p role="status" className="p-4 rounded-xl bg-green-50 text-green-800">{message}</p>}
    {!data && !error && <p role="status">Đang tải cấu hình…</p>}
    {data && <>
      <div className="flex flex-wrap gap-3">{view && <a className="rounded-lg bg-violet-700 text-white px-4 py-3" href={'https://'+view.hostname} target="_blank" rel="noreferrer">Xem {view.hostname} ↗</a>}<a className="rounded-lg border px-4 py-3" href={'/page/'+data.slug} target="_blank" rel="noreferrer">Xem trang trên hệ thống ↗</a></div>
      <fieldset disabled={busy} className="bg-white border rounded-2xl p-4 sm:p-6 grid gap-5">
        <legend className="font-bold text-xl px-2">Kết nối ứng dụng</legend>
        <p className="text-sm text-slate-600">Chọn ứng dụng đi cùng website. Có trong gói cơ bản không đồng nghĩa mọi tài khoản đều có quyền sử dụng: học viên xem phần cá nhân; giáo viên liên kết xem phần được phép quản lý.</p>
        <div className="flex flex-wrap gap-3"><button className="border rounded-lg px-4 py-2 text-sm" onClick={connectGranted}>Kết nối tất cả ứng dụng đã được cấp</button><button className="border rounded-lg px-4 py-2 text-sm" onClick={()=>{setEnabled({...noModules});setEnabledApps({...noApplications})}}>Ngắt tất cả kết nối</button></div>
        <h2 className="font-semibold">Ứng dụng chạy trên website riêng</h2>
        {moduleKeys.map(key=>{
          const granted=data.access.base[key] || extra[key]
          return <section key={key} className="border rounded-xl p-4 grid gap-3">
            <div><h3 className="font-bold">{moduleLabels[key]}</h3><p className="text-sm text-slate-500 mt-1">{data.access.base[key] ? 'Có trong gói cơ bản' : extra[key] ? 'Được cấp bổ sung' : 'Chưa được cấp'}</p></div>
            <p className="text-sm text-slate-600">{moduleScopes[key]}</p>
            <div className="flex flex-wrap gap-5">{data.admin && <label className="flex items-center gap-2"><input type="checkbox" checked={extra[key]} onChange={e=>setExtra({...extra,[key]:e.target.checked})}/>Cấp bổ sung</label>}<label className="flex items-center gap-2"><input role="switch" type="checkbox" checked={granted && enabled[key]} disabled={!granted} onChange={e=>setEnabled({...enabled,[key]:e.target.checked})}/>Kết nối với website</label></div>
          </section>
        })}
        <h2 className="font-semibold mt-3">Ứng dụng mở trên hệ thống chính</h2>
        <p className="text-sm text-slate-600">Các ứng dụng bên dưới mở Giautoandien trong tab mới. Dữ liệu và quyền theo tài khoản đăng nhập trên hệ thống chính, có thể bao gồm dữ liệu ngoài website này. Hai tên miền có phiên đăng nhập riêng.</p>
        {applicationKeys.map(key=>{
          const app=applications[key],granted=data.access.applications.base[key] || extraApps[key]
          return <section key={key} className="border rounded-xl p-4 grid gap-3">
            <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{app.name}</h3><span className="text-xs rounded-full bg-slate-100 px-3 py-1">{app.audience==='staff' ? 'Chủ website / giáo viên liên kết' : 'Thành viên theo quyền tài khoản'}</span></div>
            <p className="text-sm text-slate-500">{data.access.applications.base[key] ? 'Có trong gói cơ bản' : extraApps[key] ? 'Được cấp bổ sung' : 'Chưa được cấp'}</p>
            <p className="text-sm text-slate-600">{app.scope}</p>
            <div className="flex flex-wrap gap-5">{data.admin && <label className="flex items-center gap-2"><input type="checkbox" checked={extraApps[key]} onChange={e=>setExtraApps({...extraApps,[key]:e.target.checked})}/>Cấp bổ sung</label>}<label className="flex items-center gap-2"><input role="switch" type="checkbox" checked={granted && enabledApps[key]} disabled={!granted} onChange={e=>setEnabledApps({...enabledApps,[key]:e.target.checked})}/>Kết nối ứng dụng</label></div>
          </section>
        })}
        <p className="text-sm text-slate-500">Ngắt kết nối sẽ chặn đường vào ứng dụng từ website này, giữ nguyên dữ liệu. Tài khoản vẫn có thể dùng ứng dụng trực tiếp trên hệ thống chính theo quyền sẵn có.</p>
        <button className="justify-self-start rounded-lg bg-violet-700 text-white px-5 py-3" onClick={()=>void save(websiteCommand())}>{busy ? 'Đang lưu…' : 'Lưu kết nối ứng dụng'}</button>
      </fieldset>
      {data.admin && <fieldset disabled={busy} className="bg-white border rounded-2xl p-4 sm:p-6 grid gap-4">
        <legend className="font-bold text-xl px-2">Gói cơ bản · Quản trị viên</legend>
        <p className="text-sm text-slate-600">Chọn các ứng dụng có trong gói. Lưu mẫu, rồi áp dụng cho website này; sau đó bật kết nối mong muốn ở phần trên. Website đang hoạt động không tự đổi quyền khi bạn lưu mẫu.</p>
        <button className="justify-self-start border rounded-lg px-4 py-2 text-sm" onClick={()=>{setBasic({courses:true,crm:true,affiliate:true});setBasicApps({...allApplications})}}>Chọn bộ cơ bản đầy đủ</button>
        <div className="grid gap-3 sm:grid-cols-2">
          {moduleKeys.map(key=><label key={key} className="flex gap-3"><input type="checkbox" checked={basic[key]} onChange={e=>setBasic({...basic,[key]:e.target.checked})}/>{moduleLabels[key]}</label>)}
          {applicationKeys.map(key=><label key={key} className="flex gap-3"><input type="checkbox" checked={basicApps[key]} onChange={e=>setBasicApps({...basicApps,[key]:e.target.checked})}/>{applications[key].name}</label>)}
        </div>
        <div className="flex flex-wrap gap-3"><button className="border rounded-lg px-4 py-3" onClick={()=>void save({action:'basic',modules:basic,applications:basicApps})}>Lưu mẫu gói cơ bản</button><button className="border rounded-lg px-4 py-3" onClick={()=>void save(websiteCommand(true))}>Áp dụng gói đã lưu cho website này</button></div>
      </fieldset>}
    </>}
  </div></main>
}
