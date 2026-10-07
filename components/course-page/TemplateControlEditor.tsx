'use client'

import { TemplateControls, ControlBinding, bindingSchema } from '@/lib/course-page/importer/controls'
export type ControlCourse = {title:string;href:string}
export default function TemplateControlEditor({value,onChange,courses=[]}:{value:TemplateControls;onChange:(v:TemplateControls)=>void;courses?:ControlCourse[]}) {
  function patch(id:string,b:Partial<ControlBinding>) { onChange({...value,bindings:value.bindings.map(item=>item.id===id?{...item,...b}:item)}) }
  return <section className="grid gap-3 rounded-xl border bg-white p-3 text-gray-900">
    <h3 className="font-bold">Kết nối các nút ({value.items.length})</h3>
    <p className="text-xs text-gray-600">Chọn hành động và đích đến cho từng nút. Tab cần chọn đúng vùng nội dung; vùng cùng cấp sẽ được ẩn/hiện.</p>
    <p className="text-xs text-amber-700">{value.bindings.filter(b=>b.action==='pending'||!bindingSchema.safeParse(b).success).length} nút cần cấu hình. “Giữ hành động gốc” phụ thuộc script của template.</p>
    <div className="grid max-h-[480px] gap-3 overflow-y-auto">{value.items.map((item,index)=>{
      const b=value.bindings.find(b=>b.id===item.id)||{id:item.id,action:'pending' as const,target:''}
      const courseAction=b.action==='course'||b.action==='register'
      return <div key={item.id} className="grid gap-2 rounded-lg border p-2">
        <div className="text-sm font-semibold">{index+1}. {item.label}</div><div className="break-all text-xs text-gray-500">{item.context}{item.originalHref?' · '+item.originalHref:''}</div>
        <select aria-label={'Hành động '+item.id} className="w-full rounded border p-2 text-sm" value={b.action} onChange={e=>patch(item.id,{action:e.target.value as ControlBinding['action'],target:''})}>
          <option value="pending">Cần cấu hình</option><option value="keep">Giữ hành động gốc</option><option value="tab">Chuyển tab</option><option value="scroll">Cuộn đến nội dung</option><option value="course">Xem khóa học</option><option value="register">Đăng ký khóa học</option><option value="link">Mở đường dẫn</option>
        </select>
        {courseAction&&<select aria-label={'Khóa học '+item.id} className="w-full rounded border p-2 text-sm" value={b.target} onChange={e=>patch(item.id,{target:e.target.value})}><option value="">{b.action==='register'?'Khóa học đang áp dụng / Form của Page':'Chọn khóa học…'}</option>{courses.map(c=><option key={c.href} value={c.href}>{c.title}</option>)}</select>}
        {['tab','scroll'].includes(b.action)&&<select aria-label={'Nội dung '+item.id} className="w-full rounded border p-2 text-sm" value={b.target} onChange={e=>patch(item.id,{target:e.target.value})}><option value="">Chọn vùng nội dung…</option>{value.targets.map(t=><option key={t.id} value={t.id}>{t.originalId} — {t.label}</option>)}</select>}
        {!bindingSchema.safeParse(b).success&&<p className="text-xs text-red-700">Chọn đích đến hợp lệ cho nút này trước khi lưu.</p>}
        {b.action==='link'&&<input aria-label={'Đường dẫn '+item.id} className="w-full rounded border p-2 text-sm" value={b.target} onChange={e=>patch(item.id,{target:e.target.value})} placeholder="https://… hoặc /…"/>}
        {courseAction&&!courses.length&&<p className="text-xs text-amber-700">Chưa có khóa học để chọn trong nguồn dữ liệu này.</p>}
      </div>
    })}</div>
  </section>
}
