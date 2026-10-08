'use client'
/* eslint-disable @next/next/no-html-link-for-pages -- Page and management have independent lifecycles. */
import {useEffect,useMemo,useRef,useState} from 'react'
import {prepareWebsiteZip} from '@/lib/course-page/importer/zip-browser'
import {PAGE_HTML_LIMIT,PAGE_COMPRESSED_LIMIT,renderPageTemplate,type PageCourse} from '@/lib/website/page-template'
import {type ContentTemplate} from '@/lib/website/pages'
import ImportedPageFrame from './ImportedPageFrame'

async function pack(html:string) {
  const buffer=new Uint8Array(await new Response(new Blob([html]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer())
  if(buffer.length>PAGE_COMPRESSED_LIMIT)throw new Error('Template nén vượt 2,5MB. Hãy giảm ảnh hoặc font nhúng.')
  let value='';for(let i=0;i<buffer.length;i+=32768)value+=String.fromCharCode(...buffer.subarray(i,i+32768))
  return btoa(value)
}
async function unpack(source:string) {
  const bytes=Uint8Array.from(atob(source),c=>c.charCodeAt(0))
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
}
function regions(html:string) {
  const doc=new DOMParser().parseFromString(html,'text/html')
  return [...doc.querySelectorAll<HTMLElement>('div[id],section[id],main[id],ul[id],ol[id],article[id]')]
    .filter(n=>/^[A-Za-z][\w:.-]{0,159}$/.test(n.id) && doc.querySelectorAll('[id]').length<2000)
    .map(n=>({id:n.id,label:(n.id==='courses' || n.id==='course-list'?'Danh sách khóa học · ': '')+n.id+(n.querySelector('h1,h2,h3')?.textContent?' · '+n.querySelector('h1,h2,h3')!.textContent!.trim().slice(0,60):'')}))
    .filter((n,i,all)=>all.findIndex(x=>x.id===n.id)===i).slice(0,100)
}
export default function PageTemplateImport({pageSlug=''}:{pageSlug?:string}) {
  const endpoint=pageSlug?'/api/websites/pages/template?slug='+encodeURIComponent(pageSlug):'/api/websites/page-template'
  const [saved,setSaved]=useState<ContentTemplate|null>(null),[html,setHtml]=useState(''),[name,setName]=useState('')
  const [region,setRegion]=useState('__append__'),[courses,setCourses]=useState<PageCourse[]>([]),[slug,setSlug]=useState('')
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[warnings,setWarnings]=useState<string[]>([])
  const [width,setWidth]=useState('100%'),[loaded,setLoaded]=useState(false)
  const [configLoading,setConfigLoading]=useState(true),[configError,setConfigError]=useState(''),[loadAttempt,setLoadAttempt]=useState(0)
  const [codeDraft,setCodeDraft]=useState(''),[savedHtml,setSavedHtml]=useState(''),[codeOpen,setCodeOpen]=useState(false)
  const codeDirty=codeDraft!==html
  const unsaved=codeDirty || (!!html && html!==savedHtml)
  const localFile=useRef(false)
  useEffect(()=>{
    if(!unsaved)return
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
    window.addEventListener('beforeunload',warn)
    return()=>window.removeEventListener('beforeunload',warn)
  },[unsaved])
  useEffect(()=>{
    const controller=new AbortController()
    let active=true
    setConfigLoading(true);setConfigError('');setLoaded(false)
    const timeout=setTimeout(()=>controller.abort(),30000)
    fetch(endpoint,{signal:controller.signal}).then(async response=>{
      const data=await response.json();if(!response.ok)throw new Error(data.error)
      if(!active)return
      setSaved(data.template);setCourses(data.courses);setSlug(data.slug);setLoaded(true)
      if(data.template && !localFile.current){
        try {
          const source=await unpack(data.template.source)
          if(active && !localFile.current){setHtml(source);setCodeDraft(source);setSavedHtml(source);setName(data.template.name);setRegion(data.template.region ?? '__original__')}
        }catch{if(active)setError('Không đọc được template đã lưu. Bạn có thể chọn file mới để thay thế.')}
      }
    }).catch(e=>{if(active)setConfigError(e.name==='AbortError'?'Tải cấu hình Page quá lâu. Bấm thử lại; bạn vẫn có thể chọn file.':e.message)})
      .finally(()=>{clearTimeout(timeout);if(active)setConfigLoading(false)})
    return()=>{active=false;clearTimeout(timeout);controller.abort()}
  },[loadAttempt,endpoint])
  const options=useMemo(()=>html?regions(html):[],[html])
  const preview=useMemo(()=>{
    if(!html)return {html:'',error:''}
    try{return {html:renderPageTemplate(html,region==='__original__'?null:region,courses),error:''}}catch(e){
      const error=e instanceof Error?e.message:'Vùng không hợp lệ.'
      // Vùng chèn chưa hợp lệ: vẫn xem được bản gốc, chưa cho áp dụng.
      try{return {html:renderPageTemplate(html,null,[]),error}}
      catch{return {html:'',error}}
    }
  },[html,region,courses])
  async function choose(file?:File) {
    if(!file)return
    localFile.current=true
    setBusy(true);setError('');setMessage('');setWarnings([])
    try {
      if(file.size>25*1024*1024)throw new Error('File tải lên vượt 25MB.')
      let source:string
      if(/\.zip$/i.test(file.name)) {const prepared=await prepareWebsiteZip(file);source=prepared.html;setWarnings(prepared.warnings)}
      else if(/\.html?$/i.test(file.name))source=await file.text()
      else throw new Error('Chọn file HTML hoặc ZIP chứa HTML, CSS, JS và ảnh.')
      if(new Blob([source]).size>PAGE_HTML_LIMIT)throw new Error('Template sau đóng gói vượt 8MB.')
      const ids=regions(source).map(n=>n.id)
      setRegion(ids.includes('courses')?'courses':ids.includes('course-list')?'course-list':pageSlug?'__original__':'__append__')
      setHtml(source);setCodeDraft(source);setName(file.name.slice(0,160))
      setMessage('Đã đọc file. Chọn vùng khóa học và kiểm tra bản xem trước trước khi áp dụng.')
    }catch(e){setError(e instanceof Error?e.message:'Không đọc được file.')}finally{setBusy(false)}
  }
  function updateCodePreview(){
    if(!codeDraft.trim()){setError('Mã HTML không được để trống.');return}
    if(new Blob([codeDraft]).size>PAGE_HTML_LIMIT){setError('Mã HTML vượt 8MB. Hãy giảm ảnh hoặc font nhúng.');return}
    localFile.current=true;setHtml(codeDraft);setError('');setMessage('Đã cập nhật bản xem trước từ mã sửa. Bấm Áp dụng template cho Page để lưu lên website.')
  }
  async function save(action:'apply'|'builtin') {
    if(!loaded){setError('Cần tải cấu hình Page thành công trước khi áp dụng.');return}
    if(action==='apply' && codeDirty){setError('Bấm Cập nhật xem trước để kiểm tra mã vừa sửa trước khi áp dụng.');return}
    if(action==='apply' && (preview.error || !preview.html)){setError('Chọn vùng danh sách hợp lệ trước khi áp dụng template.');return}
    setBusy(true);setError('');setMessage('')
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),60000)
    try {
      const payload=action==='apply'?{action,revision:saved?.revision || 0,name,region:region==='__original__'?null:region,source:await pack(html)}:{action,revision:saved?.revision || 0}
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal})
      const data=await response.json();if(!response.ok)throw new Error(data.error)
      setSaved(data.template);if(action==='apply')setSavedHtml(html);setMessage(action==='apply'?'Đã áp dụng template. Mở Page để kiểm tra nút khóa học.':'Đã trở về giao diện có sẵn trước đó.')
    }catch(e){setError(e instanceof Error?(e.name==='AbortError'?'Yêu cầu đã hết thời gian. Tải lại trang để kiểm tra trạng thái trước khi thử lại.':e.message):'Không thể lưu.')}
    finally{clearTimeout(timeout);setBusy(false)}
  }
  const button='rounded-xl border px-4 py-3 text-sm disabled:opacity-50'
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-7xl space-y-5">
    <a href={pageSlug?"/tools/my-site/pages":"/tools/my-site/manage"} className="text-violet-700 underline">← Quản lý website</a>
    <header><h1 className="text-2xl font-bold">{pageSlug?'Nhập template · '+pageSlug:'Nhập template cho Page'}</h1><p className="mt-2 text-slate-600">Giữ giao diện của bạn, thay một vùng bằng danh sách khóa học thật do bạn tạo và được phép hiển thị trên Page.</p></header>
    {configLoading && <p role="status" className="rounded-xl bg-blue-50 p-4 text-blue-800">Đang tải cấu hình Page. Bạn vẫn có thể chọn file để xem trước.</p>}
    {configError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700"><p>{configError}</p><button className="mt-3 rounded-lg border px-4 py-2" disabled={configLoading || busy} onClick={()=>setLoadAttempt(n=>n+1)}>Thử tải lại cấu hình</button></div>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    <section className="space-y-4 rounded-2xl border bg-white p-5">
      <p className="text-sm">Đang dùng: <strong>{saved?.active?saved.name:'Giao diện có sẵn'}</strong></p>
      <label className="block"><span className="mb-2 block font-medium">File HTML / ZIP</span><input type="file" accept=".html,.htm,.zip" disabled={busy} onChange={e=>void choose(e.target.files?.[0])} /></label>
      {html && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><button type="button" className="font-semibold text-violet-700" aria-expanded={codeOpen} aria-controls="template-html-editor" onClick={()=>setCodeOpen(open=>!open)}>{codeOpen?'Ẩn mã HTML':'Chỉnh sửa mã HTML'}</button>{codeOpen && <div id="template-html-editor" className="mt-4 space-y-3"><p className="text-sm text-slate-600">Sửa HTML, CSS và JavaScript nhúng của template. Với ZIP, đây là mã HTML đã được đóng gói. Danh sách khóa học thật vẫn được chèn vào vùng bạn chọn.</p><label className="block"><span className="mb-2 block font-medium">Mã HTML của template</span><textarea className="h-96 w-full resize-y whitespace-pre-wrap [overflow-wrap:anywhere] rounded-xl border bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100" value={codeDraft} spellCheck={false} wrap="soft" disabled={busy} onChange={event=>{localFile.current=true;setCodeDraft(event.target.value);setMessage('')}}/></label><div className="flex flex-wrap items-center gap-3"><button type="button" className={button+' bg-violet-700 text-white'} disabled={busy || !codeDirty} onClick={updateCodePreview}>Cập nhật xem trước</button><button type="button" className={button} disabled={busy || !codeDirty} onClick={()=>{setCodeDraft(html);setError('')}}>Bỏ sửa mã chưa xem trước</button><span className="text-sm text-slate-500">{codeDirty?'Mã vừa sửa chưa cập nhật vào bản xem trước':unsaved?'Bản xem trước có thay đổi chưa lưu':'Mã đang khớp với template đã lưu'}</span></div></div>}</div>}
      {html && <label className="block"><span className="mb-2 block font-medium">Vùng hiển thị danh sách khóa học</span><select className="w-full rounded-xl border p-3" disabled={busy} value={region} onChange={e=>setRegion(e.target.value)}>{pageSlug && <option value="__original__">Giữ nguyên template, không chèn khóa học</option>}<option value="__append__">Thêm vùng khóa học ở cuối trang</option>{options.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</select><span className="mt-2 block text-sm text-slate-500">Chỉ thay các thẻ khóa học bằng {courses.length} khóa học thật. Tiêu đề, đoạn giới thiệu và nội dung xung quanh được giữ nguyên. Với mẫu The Top1, chọn courses; không chọn cả mục khoa-hoc.</span></label>}
      <p className="text-sm text-slate-500">HTML nên có CSS và JS nhúng; ZIP có thể chứa các file đi kèm. Hiệu ứng chạy trong khung riêng. Nút khóa học mở trang thông tin trên hệ thống chính. Khách đăng nhập và đăng ký học trên hệ thống để nhận tài liệu.</p>
      {warnings.length>0 && <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">{warnings.map(w=><li key={w}>{w}</li>)}</ul>}
      {preview.error && <p role="alert" className="text-amber-800">{preview.error} Bên dưới là template gốc. Hãy kiểm tra vùng danh sách khóa học trước khi áp dụng.</p>}
      <div className="flex flex-wrap gap-3"><button className={button+' bg-violet-700 text-white'} disabled={busy || !loaded || codeDirty || !!preview.error || !preview.html} onClick={()=>void save('apply')}>{busy?'Đang xử lý…':'Áp dụng template cho Page'}</button><button className={button} disabled={busy || !loaded || !saved?.active} onClick={()=>void save('builtin')}>{pageSlug?'Dùng nội dung văn bản':'Dùng lại giao diện có sẵn'}</button>{slug && <a className={button} target="_blank" rel="noreferrer" href={'/page/'+slug+(pageSlug?'/'+pageSlug:'')}>Mở Page ↗</a>}</div>
    </section>
    {preview.html && <section className="space-y-3"><div className="flex flex-wrap items-center gap-2"><h2 className="mr-auto font-semibold">Xem trước · nút khóa học không chuyển trang ở đây</h2>{[['100%','Máy tính'],['768px','Tablet'],['390px','Điện thoại']].map(([size,label])=><button key={size} className={button+(width===size?' bg-violet-100':' bg-white')} onClick={()=>setWidth(size)}>{label}</button>)}</div><div className="mx-auto max-w-full overflow-hidden rounded-xl border shadow" style={{width}}><ImportedPageFrame html={preview.html} links={courses.map(c=>c.href)} preview /></div></section>}
  </div></main>
}
