'use client'
/* eslint-disable @next/next/no-html-link-for-pages -- Tải lại quyền website khi chuyển trang. */
import {createContext,useContext,useState} from 'react'
import {useSession,signOut} from 'next-auth/react'
import {usePathname} from 'next/navigation'
import type {DomainModules} from '@/lib/website/domain-shared'

type Brand=DomainModules & {name:string;color:string;background:string;ownerId:number|null}
type Page={title:string;slug:string}
const Context=createContext<Brand|null>(null)
export const useDomainBrand=()=>useContext(Context)

/** Khung điều hướng chung cho trang thiết kế, khóa học và tài khoản. */
export default function DomainShell({brand,pages=[],path:initialPath='/',children}:{brand:Brand;pages?:Page[];path?:string;children:React.ReactNode}) {
  const {data:session}=useSession()
  const pathname=usePathname()
  const path=pathname ? pathname.replace(/^\/site-domain\/[^/]+/, '') || '/' : initialPath
  const [open,setOpen]=useState(false)
  const links=[{href:'/',title:'Trang chủ'},...pages.filter(p=>p.slug && !['khoa-hoc','cong-cu','tai-khoan','ung-dung'].includes(p.slug)).map(p=>({href:'/'+p.slug,title:p.title})),...(brand.courses ? [{href:'/khoa-hoc',title:'Khóa học'}] : []),{href:'/cong-cu',title:session?.user ? 'Không gian của tôi' : 'Công cụ'}]
  const course=/^\/(khoa-hoc|courses)\//.test(path)
  const label=links.find(l=>l.href===path)?.title || ({'/login':'Đăng nhập','/register':'Đăng ký','/tai-khoan':'Tài khoản','/account-settings':'Thông tin tài khoản','/forgot-password':'Quên mật khẩu','/tools/crm':'CRM','/tools/affiliate':'Affiliate'} as Record<string,string>)[path] || (course ? (path.endsWith('/learn') ? 'Học tập' : 'Chi tiết khóa học') : 'Trang nội dung')
  return <Context.Provider value={brand}><div style={{background:brand.background,color:'#172033',minHeight:'100vh'}} className="flex flex-col">
    <a href="#website-content" className="sr-only focus:not-sr-only focus:p-3">Đến nội dung chính</a>
    <header className="border-b bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-4">
        <a href="/" className="font-bold text-xl min-w-0 flex-1 break-words lg:flex-none lg:mr-6" style={{color:brand.color}}>{brand.name}</a>
        <button type="button" className="lg:hidden border rounded-lg px-3 py-2" aria-expanded={open} aria-controls="website-menu" onClick={()=>setOpen(!open)}>{open ? 'Đóng menu' : 'Menu'}</button>
        <nav id="website-menu" aria-label="Điều hướng chính" className={`${open ? 'flex' : 'hidden'} w-full flex-col gap-1 lg:flex lg:w-auto lg:flex-1 lg:flex-row lg:flex-wrap lg:items-center`}>
          {links.map(l=><a key={l.href} href={l.href} aria-current={path===l.href ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm ${path===l.href || (course && l.href==='/khoa-hoc') ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}`}>{l.title}</a>)}
          <a href={session?.user ? '/tai-khoan' : '/login'} className="rounded-lg px-4 py-2 text-sm font-semibold text-white lg:ml-auto" style={{background:brand.color}}>{session?.user ? 'Tài khoản của tôi' : 'Đăng nhập'}</a>
          {session?.user && <button className="px-3 py-2 text-sm text-slate-600 text-left" onClick={()=>void signOut({callbackUrl:'/'})}>Đăng xuất</button>}
        </nav>
      </div>
    </header>
    {path!=='/' && <nav aria-label="Đường dẫn trang" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 text-sm text-slate-500"><ol className="flex flex-wrap gap-2"><li><a href="/" className="hover:underline">Trang chủ</a></li>{course && <li><span aria-hidden="true">/ </span><a href="/khoa-hoc" className="hover:underline">Khóa học</a></li>}<li><span aria-hidden="true">/ </span><span aria-current="page" className="text-slate-800">{label}</span></li></ol></nav>}
    <div id="website-content" className="flex-1 min-w-0">{children}</div>
    <footer className="border-t mt-10 bg-white text-slate-600"><div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap justify-between gap-4 text-sm"><p>© {brand.name}</p><nav aria-label="Liên kết chân trang" className="flex flex-wrap gap-4"><a href="/">Trang chủ</a><a href="/tai-khoan">Tài khoản</a></nav></div></footer>
  </div></Context.Provider>
}
