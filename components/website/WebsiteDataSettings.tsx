'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import ProfileMemberManager from '@/components/admin/ProfileMemberManager'

type Snapshot={scopeMode?:string;profileId:number;selected:number[];members:Parameters<typeof ProfileMemberManager>[0]['initialMembers'];courses:{id:number;name_lop:string;teacherId:number|null}[]}
export default function WebsiteDataSettings() {
  const [data,setData]=useState<Snapshot|null>(null),[selected,setSelected]=useState<number[]>([]),[automatic,setAutomatic]=useState(true)
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  async function refresh() {
    try {const r=await fetch('/api/websites/data',{cache:'no-store'}),value=await r.json();if(!r.ok)throw new Error(value.error);setData(value);setSelected(value.selected);setAutomatic(!value.selected.length)} catch(e){setError(e instanceof Error?e.message:'Không thể tải dữ liệu.')}
  }
  useEffect(()=>{void refresh()},[])
  async function save() {
    setBusy(true);setError('');setMessage('')
    try {
      if(!automatic && !selected.length)throw new Error('Chọn ít nhất một khóa học hoặc bật chế độ tự động.')
      const r=await fetch('/api/websites/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseIds:automatic?[]:selected})}),value=await r.json()
      if(!r.ok)throw new Error(value.error);setMessage('Đã lưu nguồn khóa học cho cả hai mẫu giao diện.');await refresh()
    } catch(e){setError(e instanceof Error?e.message:'Không thể lưu.')} finally{setBusy(false)}
  }
  return <main className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8"><div className="max-w-3xl mx-auto grid gap-6">
    <Link href="/tools/my-site/manage" className="text-violet-700">← Quản lý website của tôi</Link><h1 className="text-3xl font-bold">Dữ liệu & giáo viên</h1>
    <p className="text-slate-600">Nguồn nội dung dùng chung cho mẫu có sẵn và thiết kế tự do. Quyền học và quản lý vẫn theo tài khoản.</p>
    {error && <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</p>}{message && <p role="status" className="bg-green-50 text-green-800 rounded-xl p-4">{message}</p>}
    {!data && !error && <p>Đang tải…</p>}
    {data && <><ProfileMemberManager profileId={data.profileId} initialMembers={data.members} onUpdate={()=>void refresh()} />
      <fieldset disabled={busy} className="grid gap-4 bg-white border rounded-2xl p-5"><legend className="font-bold text-xl px-2">Khóa học hiển thị</legend>
        {data.scopeMode && !['profile','ids'].includes(data.scopeMode) && <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-800">Đang dùng bộ lọc quản trị: {({all:'Tất cả khóa học',teacher:'Theo giáo viên',category:'Theo danh mục'} as Record<string,string>)[data.scopeMode]}. Lưu tại đây sẽ chuyển sang nguồn tự động hoặc các khóa bạn chọn.</p>}
        <label className="flex items-start gap-3"><input type="checkbox" checked={automatic} onChange={e=>setAutomatic(e.target.checked)} className="mt-1"/>Tự động lấy khóa học của chủ website và giáo viên liên kết</label>
        {!automatic && data.courses.map(c=><label key={c.id} className="flex items-start gap-3"><input type="checkbox" checked={selected.includes(c.id)} onChange={e=>setSelected(e.target.checked?[...selected,c.id]:selected.filter(id=>id!==c.id))} className="mt-1"/>{c.name_lop}</label>)}
        {!automatic && !data.courses.length && <p>Chưa có khóa học. Thêm giáo viên liên kết hoặc tạo khóa học trước.</p>}
        <button className="justify-self-start rounded-lg bg-violet-700 text-white px-5 py-3" onClick={()=>void save()}>{busy?'Đang lưu…':'Lưu nguồn khóa học'}</button>
      </fieldset></>}
  </div></main>
}
