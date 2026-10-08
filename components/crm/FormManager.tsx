'use client'
/* eslint-disable @next/next/no-html-link-for-pages -- Management tools have independent lifecycles. */
import {useEffect,useState} from 'react'
import {defaultForm,formConfigSchema,type FormConfig,type ManagedForm} from '@/lib/crm/form-shared'

const input='w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900'
const button='min-h-11 rounded-xl border px-4 py-2 text-sm disabled:opacity-50'
export default function FormManager(){
  const [forms,setForms]=useState<ManagedForm[]>([]),[selected,setSelected]=useState<ManagedForm|null>(null),[editing,setEditing]=useState(false)
  const [config,setConfig]=useState<FormConfig>(defaultForm),[name,setName]=useState('Đăng ký tư vấn'),[active,setActive]=useState(true)
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[revision,setRevision]=useState(0)
  useEffect(()=>{
    const abort=new AbortController();setLoading(true)
    let mounted=true
    const timeout=setTimeout(()=>abort.abort(),25000)
    fetch('/api/websites/forms',{signal:abort.signal,cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);if(mounted){setForms(data.forms);setError('')}}).catch(e=>{if(mounted)setError(e.name==='AbortError'?'Tải form quá lâu. Vui lòng bấm tải lại.':e.message)}).finally(()=>{clearTimeout(timeout);if(mounted)setLoading(false)})
    return()=>{mounted=false;clearTimeout(timeout);abort.abort()}
  },[revision])
  function edit(form:ManagedForm|null,title='Đăng ký tư vấn'){
    setSelected(form);setName(form?.name || title);setConfig(form?.config || {...defaultForm,title});setActive(form?.active ?? true);setEditing(true);setError('');setMessage('')
  }
  function field(index:number,patch:Partial<FormConfig['fields'][number]>){setConfig(c=>({...c,fields:c.fields.map((f,i)=>i===index?{...f,...patch}:f)}))}
  async function save(){
    if(busy)return
    const parsed=formConfigSchema.safeParse(config)
    if(!parsed.success){setError(parsed.error.issues[0].message);return}
    if(!name.trim()){setError('Hãy đặt tên cho form.');return}
    setBusy(true);setError('');setMessage('')
    const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),25000)
    try{
      const payload=selected?{action:'update',id:selected.id,version:selected.version,name,active,config:parsed.data}:{action:'create',name,config:parsed.data}
      const response=await fetch('/api/websites/forms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:abort.signal})
      const data=await response.json();if(!response.ok)throw new Error(data.error)
      setEditing(false);setSelected(null);setRevision(r=>r+1);setMessage('Đã lưu form. Vào Nhập template để chọn form và ghép các ô. Các đăng ký cũ vẫn giữ nguyên câu hỏi và câu trả lời.')
    }catch(e){setError(e instanceof Error?(e.name==='AbortError'?'Yêu cầu quá lâu. Tải lại danh sách trước khi lưu lại.':e.message):'Không lưu được form.')}
    finally{clearTimeout(timeout);setBusy(false)}
  }
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-6xl space-y-6">
    <nav className="flex flex-wrap gap-4 text-sm text-violet-700"><a href="/tools/my-site/manage">← Quản lý website</a><a href="/tools/my-site/template">Kết nối vào template</a><a href="/tools/crm?view=requests">Xem yêu cầu trong CRM</a></nav>
    <header><h1 className="text-3xl font-bold">Form của tôi</h1><p className="mt-2 text-slate-600">Tạo một lần, dùng lại trên Page của bạn. Khách gửi vào CRM của bạn và chuông thông báo; không cần kết nối Google Sheets.</p></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    {!editing?<>
      <div className="flex flex-wrap gap-3">{['Đăng ký tư vấn','Đăng ký trải nghiệm','Yêu cầu nhận tài liệu'].map(title=><button key={title} className={button+' bg-white'} disabled={loading || busy} onClick={()=>edit(null,title)}>+ {title}</button>)}<button className={button} disabled={loading || busy} onClick={()=>setRevision(r=>r+1)}>Tải lại</button></div>
      {loading?<p role="status">Đang tải form…</p>:<div className="grid gap-4 md:grid-cols-2">{forms.map(form=><article key={form.id} className="space-y-3 rounded-2xl border bg-white p-5"><div className="flex justify-between gap-3"><h2 className="text-lg font-bold">{form.name}</h2><span className={form.active?'text-emerald-700':'text-slate-500'}>{form.active?'Đang nhận đăng ký':'Tạm dừng'}</span></div><p className="text-sm text-slate-500">{form.config.fields.length} câu hỏi · {form.submissions} đăng ký · phiên bản {form.version}</p><div className="flex flex-wrap gap-2"><button className={button} onClick={()=>edit(form)}>Chỉnh sửa / bật tắt</button><button className={button} onClick={()=>{edit(null,form.name+' (bản sao)');setConfig(form.config)}}>Nhân bản</button><a className={button+' inline-flex items-center'} href="/tools/my-site/template">Kết nối vào template</a></div></article>)}{!forms.length && !error && <p className="rounded-2xl border bg-white p-6 text-slate-600">Chưa có form. Chọn một mẫu ở trên để bắt đầu.</p>}</div>}
    </>:<form onSubmit={e=>{e.preventDefault();void save()}} className="space-y-5 rounded-2xl border bg-white p-5">
      <fieldset disabled={busy} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><label>Tên quản lý<input required maxLength={100} className={input} value={name} onChange={e=>setName(e.target.value)}/></label><label>Tiêu đề form<input required maxLength={160} className={input} value={config.title} onChange={e=>setConfig({...config,title:e.target.value})}/></label></div>
        <p className="text-sm text-slate-500">Họ tên là bắt buộc. Khách cần để lại ít nhất email hoặc điện thoại. Những câu hỏi khác được lưu trong từng đăng ký, không tạo thêm cột trong danh sách khách.</p>
        <section className="space-y-3"><h2 className="font-bold">Các câu hỏi</h2>{config.fields.map((f,index)=><article key={f.id} className="space-y-3 rounded-xl border bg-slate-50 p-4"><div className="grid gap-3 sm:grid-cols-[1fr_180px]"><label>Nội dung câu hỏi<input required className={input} maxLength={120} value={f.label} onChange={e=>field(index,{label:e.target.value})}/></label><label>Loại câu trả lời<select className={input} value={f.type} disabled={['name','email','phone'].includes(f.id)} onChange={e=>field(index,{type:e.target.value as typeof f.type,options:[]})}>{[['text','Một dòng'],['textarea','Nhiều dòng'],['email','Email'],['tel','Điện thoại'],['select','Chọn một'],['multiselect','Chọn nhiều']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>{['select','multiselect'].includes(f.type) && <label className="block">Các lựa chọn (mỗi dòng một lựa chọn)<textarea className={input} rows={3} value={f.options.join('\n')} onChange={e=>field(index,{options:e.target.value.split('\n')})}/></label>}<div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2"><input type="checkbox" checked={f.required} disabled={f.id==='name'} onChange={e=>field(index,{required:e.target.checked})}/>Bắt buộc</label><span className="text-xs text-slate-500">{f.id}</span>{f.id!=='name' && <button type="button" className={button} onClick={()=>setConfig({...config,fields:config.fields.filter((_,i)=>i!==index)})}>Xóa câu hỏi</button>}</div></article>)}<button type="button" className={button} disabled={config.fields.length>=20} onClick={()=>setConfig({...config,fields:[...config.fields,{id:'q_'+crypto.randomUUID().replace(/-/g,'').slice(0,12),label:'Câu hỏi mới',type:'text',required:false,options:[]}]})}>+ Thêm câu hỏi</button>{!config.fields.some(f=>f.id==='email') && <button type="button" className={button} onClick={()=>setConfig({...config,fields:[...config.fields,defaultForm.fields[2]]})}>+ Thêm email</button>}{!config.fields.some(f=>f.id==='phone') && <button type="button" className={button} onClick={()=>setConfig({...config,fields:[...config.fields,defaultForm.fields[1]]})}>+ Thêm điện thoại</button>}</section>
        <label className="block">Chữ trên nút gửi<input required className={input} maxLength={80} value={config.submitLabel} onChange={e=>setConfig({...config,submitLabel:e.target.value})}/></label><label className="block">Lời cảm ơn sau khi gửi<textarea required className={input} maxLength={500} value={config.successMessage} onChange={e=>setConfig({...config,successMessage:e.target.value})}/></label><label className="block">Xác nhận cho phép liên hệ<textarea required className={input} maxLength={300} value={config.consentLabel} onChange={e=>setConfig({...config,consentLabel:e.target.value})}/></label>
        {selected && <label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>Đang nhận đăng ký mới</label>}
        <div className="flex gap-3"><button className={button+' bg-violet-700 text-white'}>{busy?'Đang lưu…':'Lưu form'}</button><button type="button" className={button} onClick={()=>setEditing(false)}>Đóng chỉnh sửa</button></div>
      </fieldset>
    </form>}
  </div></main>
}
