'use client'
import Link from 'next/link'
import {useMemo,useState} from 'react'
import {Globe2,Save} from 'lucide-react'
import {updateSiteProfileRuntime} from '@/app/actions/site-profile-actions'

type ProfileLike={id:number;slug?:string;siteConfig?:unknown;communityAvailable?:boolean;domains?:Array<{hostname:string;isPrimary:boolean;isActive:boolean}>}
type Props={profile:ProfileLike;onSaved?:()=>void|Promise<void>}
function record(value:unknown) {
  return value && typeof value==='object' && !Array.isArray(value)?value as Record<string,unknown>:{}
}

/** Chỉ gửi thông tin được chỉnh tại đây; giữ các thiết lập ở khu vực khác. */
export default function SiteRuntimeConfigEditor({profile,onSaved}:Props) {
  const config=record(profile.siteConfig),branding=record(config.branding),homepage=record(config.homepage),modules=record(config.modules)
  const initial=useMemo(()=>{
    const active=(profile.domains || []).filter(item=>item.isActive)
    const primary=active.find(item=>item.isPrimary) || active[0]
    return {primary:primary?.hostname || '',additional:active.filter(item=>item.hostname!==primary?.hostname).map(item=>item.hostname).join(', ')}
  },[profile])
  const [primaryDomain,setPrimaryDomain]=useState(initial.primary)
  const [additionalDomains,setAdditionalDomains]=useState(initial.additional)
  const [brandName,setBrandName]=useState(String(branding.name || ''))
  const [logoUrl,setLogoUrl]=useState(String(branding.logoUrl || ''))
  const [faviconUrl,setFaviconUrl]=useState(String(branding.faviconUrl || ''))
  const [community,setCommunity]=useState(modules.community!==false)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState<{type:'success'|'error';text:string}|null>(null)
  const homepageLabel=homepage.type==='landing'?'Sales page đã chọn':homepage.type==='website'?'Thiết kế tự do':'Mẫu có sẵn'
  const field='mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm'
  async function saveRuntime() {
    setSaving(true);setMessage(null)
    try {
      // Giữ nguyên trang chủ, bộ màu, nguồn khóa học và các quyền đã lưu.
      const result=await updateSiteProfileRuntime(profile.id,{
        ...(primaryDomain!==initial.primary || additionalDomains!==initial.additional
          ? {primaryDomain,additionalDomains:additionalDomains.split(',').map(item=>item.trim()).filter(Boolean)} : {}),
        siteConfig:{
          branding:{...branding,name:brandName.trim(),logoUrl:logoUrl.trim(),faviconUrl:faviconUrl.trim()},
          ...(profile.communityAvailable?{modules:{...modules,community}}:{}),
        },
      })
      if(result.error)setMessage({type:'error',text:result.error})
      else {setMessage({type:'success',text:'Đã lưu thông tin website.'});await onSaved?.()}
    } catch(error) {
      setMessage({type:'error',text:error instanceof Error?error.message:'Không thể lưu. Vui lòng thử lại.'})
    } finally {setSaving(false)}
  }
  return <section className="space-y-5 rounded-2xl border border-emerald-100 bg-white p-4 sm:p-6">
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800"><Globe2 className="h-5 w-5 text-emerald-600"/>Thông tin website</h2>
      <p className="mt-2 text-sm text-gray-600">Giao diện hiện tại: <strong>{homepageLabel}</strong>.</p>
      <p className="mt-1 text-sm text-gray-500">Giao diện, nguồn khóa học, tên miền và ứng dụng được quản lý trong Quản lý website.</p>
    </div>
    <div className="flex flex-wrap gap-3">
      {profile.slug && <Link href={'/page/'+profile.slug} target="_blank" className="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold text-violet-700">Xem trang của hồ sơ này ↗</Link>}
      <Link href="/tools/my-site/manage" className="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold text-violet-700">Quản lý website của tài khoản tôi →</Link>
    </div>
    <p className="text-sm text-gray-500">Nút quản lý mở website của tài khoản đang đăng nhập. Các ô bên dưới áp dụng cho hồ sơ đang chỉnh sửa.</p>
    {message && <p role={message.type==='error'?'alert':'status'} className={'rounded-xl p-3 text-sm '+(message.type==='success'?'bg-green-50 text-green-700':'bg-red-50 text-red-700')}>{message.text}</p>}
    <fieldset disabled={saving} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-gray-700">Tên thương hiệu<input value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="Tên hiển thị của website" className={field}/></label>
        <label className="text-sm font-medium text-gray-700">Đường dẫn logo<input value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} placeholder="https://..." className={field}/></label>
        <label className="text-sm font-medium text-gray-700">Đường dẫn favicon<input value={faviconUrl} onChange={e=>setFaviconUrl(e.target.value)} placeholder="https://..." className={field}/></label>
      </div>
      <p className="text-sm text-gray-500">Thông tin thương hiệu dùng cho khung website trên tên miền riêng. Nội dung bên trong thiết kế được sửa tại trình thiết kế.</p>
      {profile.communityAvailable && <label className="flex min-h-11 items-center gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={community} onChange={e=>setCommunity(e.target.checked)} className="h-4 w-4 accent-emerald-600"/>Hiển thị bảng tin cộng đồng</label>}
      <details className="rounded-xl border border-gray-200 p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">Tên miền do Admin cấp</summary>
        <p className="my-3 text-sm text-gray-500">Dành cho tên miền cấu hình thủ công. Chủ website kết nối và kiểm tra DNS tại mục Tên miền trong Quản lý website.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">Tên miền chính<input value={primaryDomain} onChange={e=>setPrimaryDomain(e.target.value)} placeholder="example.com" className={field}/></label>
          <label className="text-sm font-medium text-gray-700">Tên miền phụ<input value={additionalDomains} onChange={e=>setAdditionalDomains(e.target.value)} placeholder="www.example.com" className={field}/></label>
        </div>
        <p className="mt-3 text-sm text-gray-500">Lưu ở đây chưa tự cấu hình DNS hoặc HTTPS.</p>
      </details>
      <button type="button" onClick={saveRuntime} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{saving?'Đang lưu...':'Lưu thông tin website'}</button>
    </fieldset>
  </section>
}
