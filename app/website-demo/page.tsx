'use client'

import {useMemo,useState} from 'react'
import Link from 'next/link'
import WebsiteView from '@/components/website/WebsiteView'
import {makeNode,sharedTemplateDocument} from '@/lib/website/document'

// Bản xem thử chỉ dùng dữ liệu minh họa; không đọc hoặc ghi dữ liệu khách hàng.
const courses = [
  {id:1,title:'Xây nền tảng chuyên môn',description:'Lộ trình học và thực hành từ những bước đầu tiên.',image:'',href:'/khoa-hoc/demo-1'},
  {id:2,title:'Ứng dụng kiến thức vào công việc',description:'Từng bước đưa điều đã học vào tình huống thực tế.',image:'',href:'/khoa-hoc/demo-2'},
  {id:3,title:'Phát triển thương hiệu cá nhân',description:'Làm rõ giá trị và cách bạn kết nối với khách hàng.',image:'',href:'/khoa-hoc/demo-3'},
]
export default function WebsiteDemo() {
  const [sales,setSales]=useState(false),[showCourses,setShowCourses]=useState(true),[onlyFirst,setOnlyFirst]=useState(false)
  const [html,setHtml]=useState(false),[mobile,setMobile]=useState(false),[name,setName]=useState('Thương hiệu của bạn')
  const [page,setPage]=useState(''),[showJson,setShowJson]=useState(false)
  const doc=useMemo(()=>{
    const value=sharedTemplateDocument(name.trim() || 'Thương hiệu của bạn',sales)
    value.pages[0].nodes=value.pages[0].nodes.filter(node=>showCourses || node.kind!=='courses')
    value.pages[0].nodes.forEach(node=>{if(node.kind==='courses')node.courseIds=onlyFirst?[1]:[]})
    if(html) {
      const block=makeNode('html');block.text='Thông điệp riêng';block.style.minHeight=160
      block.html='<section><small>Thông điệp của bạn</small><h2>Một bước nhỏ hôm nay, một thay đổi lớn ngày mai.</h2></section>'
      block.css='body{margin:0;font-family:system-ui;color:#164e45}section{background:#e8f3ef;padding:24px;border-radius:20px}h2{font-size:24px;line-height:1.4;margin:12px 0}small{font-weight:700}'
      value.pages[0].nodes.splice(1,0,block)
    }
    return value
  },[name,sales,showCourses,onlyFirst,html])
  function download() {
    const url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}))
    const link=document.createElement('a');link.href=url;link.download='mau-website-chung.json';link.click();URL.revokeObjectURL(url)
  }
  const button='min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium'
  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6">
    <header className="mx-auto mb-5 max-w-7xl">
      <Link href="/tools/my-site/manage" className="text-sm text-teal-700 underline">← Quản lý website</Link>
      <h1 className="mt-3 text-2xl font-bold">Thử mẫu website chung</h1>
      <p className="mt-2 text-sm text-slate-600">Đổi các lựa chọn để xem mẫu hoạt động. Khóa học dưới đây là dữ liệu minh họa; nút đăng ký và form chưa gửi thông tin.</p>
    </header>
    <div className="mx-auto grid max-w-7xl items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4 rounded-2xl bg-white p-5 lg:sticky lg:top-4">
        <label className="block text-sm font-semibold">Tên website<input value={name} onChange={e=>setName(e.target.value)} maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border px-3"/></label>
        <label className="block text-sm font-semibold">Cách dùng mẫu<select className="mt-2 min-h-11 w-full rounded-xl border px-3" value={sales?'sales':'website'} onChange={e=>setSales(e.target.value==='sales')}><option value="website">Website chuyên gia / dịch vụ</option><option value="sales">Sales page · tập trung đăng ký</option></select></label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showCourses} onChange={e=>setShowCourses(e.target.checked)}/>Hiển thị khối Khóa học</label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={onlyFirst} disabled={!showCourses} onChange={e=>setOnlyFirst(e.target.checked)}/>Chỉ chọn khóa học đầu tiên</label>
        <p className="text-xs leading-5 text-slate-500">Trên website thật, khối này lấy khóa học theo nguồn đã chọn tại Dữ liệu & giáo viên.</p>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={html} onChange={e=>setHtml(e.target.checked)}/>Thêm khối HTML minh họa</label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={mobile} onChange={e=>setMobile(e.target.checked)}/>Xem chiều rộng điện thoại</label>
        <button className={button+' w-full'} onClick={()=>setShowJson(!showJson)}>{showJson?'Ẩn':'Xem'} cấu trúc JSON</button>
        <button className={button+' w-full'} onClick={download}>Tải mẫu JSON để chỉnh tiếp</button>
        <Link className={button+' flex items-center justify-center text-teal-800'} href="/tools/my-site/design">Mở trình thiết kế →</Link>
        <p className="text-xs leading-5 text-slate-500">Trong trình thiết kế, chọn Mẫu chung hoặc nhập JSON vừa tải. Bản xem này không thay website đang chạy.</p>
      </aside>
      <section className="min-w-0 space-y-4">
        {showJson && <details open className="rounded-2xl bg-white p-4"><summary className="cursor-pointer font-semibold">JSON chứa bố cục, nội dung và khối dữ liệu</summary><p className="my-3 text-sm">Đây là cấu trúc cho trình thiết kế. Không chứa danh sách khóa học minh họa hay thông tin học viên.</p><pre className="max-h-64 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">{JSON.stringify(doc,null,2)}</pre></details>}
        <div className="mx-auto overflow-hidden rounded-2xl bg-white shadow-sm" style={{width:mobile?390:'100%',maxWidth:'100%'}}>
          {doc.layout.showHeader && <nav aria-label="Menu mẫu" className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><strong className="text-teal-800">{doc.name}</strong><div className="flex gap-4 text-sm"><button onClick={()=>setPage('')}>Trang chủ</button><button onClick={()=>setPage('lien-he')}>Liên hệ</button></div></nav>}
          {sales && <div className="flex gap-4 p-4 text-sm"><button onClick={()=>setPage('')}>Trang bán hàng</button><button onClick={()=>setPage('lien-he')}>Xem trang liên hệ</button></div>}
          <WebsiteView document={{...doc,layout:{...doc.layout,showHeader:false}}} data={{courses,testimonials:[],posts:[],community:false}} slug="demo" pageSlug={page} preview mobile={mobile}/>
        </div>
      </section>
    </div>
  </main>
}
