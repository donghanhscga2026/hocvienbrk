'use client'
/* eslint-disable @next/next/no-html-link-for-pages -- Tải lại quyền website khi chuyển trang. */
import {createContext,useContext,useState} from 'react'
import {useSession,signOut} from 'next-auth/react'
import {usePathname} from 'next/navigation'
import {websiteTheme} from '@/lib/website/theme'
import type {DomainModules} from '@/lib/website/domain-shared'

type Brand=DomainModules & {name:string;color:string;background:string;ownerId:number|null;footerText?:string|null;logoUrl?:string;tools?:boolean;palette?:unknown}
type Page={title:string;slug:string}
const pathIsLearning=(path:string)=>/^\/(?:courses|khoa-hoc)\/[^/]+\/learn$/.test(path)
const Context=createContext<Brand|null>(null)
export const useDomainBrand=()=>useContext(Context)

/** Khung điều hướng chung cho trang thiết kế, khóa học và tài khoản. */
export default function DomainShell({brand,pages=[],path:initialPath='/',importedHome=false,children}:{brand:Brand;pages?:Page[];path?:string;importedHome?:boolean;children:React.ReactNode}) {
  const {data:session}=useSession()
  const theme=websiteTheme(brand.color,brand.background,brand.palette)

  const pathname=usePathname()
  const path=pathname ? pathname.replace(/^\/site-domain\/[^/]+/, '') || '/' : initialPath
  const learning=pathIsLearning(path)
  const [open,setOpen]=useState(false)
  const links=[{href:'/',title:'Trang chủ'},...pages.filter(p=>p.slug && !['khoa-hoc','cong-cu','tai-khoan','ung-dung'].includes(p.slug)).map(p=>({href:'/'+p.slug,title:p.title})),...(brand.courses ? [{href:'/khoa-hoc',title:'Khóa học'}] : []),...(brand.tools!==false ? [{href:'/cong-cu',title:session?.user ? 'Không gian của tôi' : 'Công cụ'}]:[])]
  const course=/^\/(khoa-hoc|courses)\//.test(path)
  const label=links.find(l=>l.href===path)?.title || ({'/login':'Đăng nhập','/register':'Đăng ký','/tai-khoan':'Tài khoản','/account-settings':'Thông tin tài khoản','/forgot-password':'Quên mật khẩu','/tools/crm':'CRM','/tools/affiliate':'Affiliate'} as Record<string,string>)[path] || (course ? (path.endsWith('/learn') ? 'Học tập' : 'Chi tiết khóa học') : 'Trang nội dung')
  return <Context.Provider value={brand}><div style={{background:theme.background,color:theme.text,minHeight:'100vh'}} className="flex flex-col" data-website-shell data-website-learning={learning || undefined}>
    <a href="#website-content" className="sr-only focus:not-sr-only focus:p-3">Đến nội dung chính</a>
    {!(importedHome && path==='/') && <header className="border-b border-brk-outline bg-brk-surface text-brk-on-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-4">
        <a href="/" className="font-bold text-xl min-w-0 flex-1 break-words lg:flex-none lg:mr-6" style={{color:theme.accent}}>{brand.logoUrl ? <img src={brand.logoUrl} alt={brand.name} className="max-h-12 max-w-48 object-contain"/>:brand.name}</a>
        <button type="button" className="lg:hidden border rounded-lg px-3 py-2" aria-expanded={open} aria-controls="website-menu" onClick={()=>setOpen(!open)}>{open ? 'Đóng menu' : 'Menu'}</button>
        <nav id="website-menu" aria-label="Điều hướng chính" className={`${open ? 'flex' : 'hidden'} w-full flex-col gap-1 lg:flex lg:w-auto lg:flex-1 lg:flex-row lg:flex-wrap lg:items-center`}>
          {links.map(l=><a key={l.href} href={l.href} aria-current={path===l.href ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm ${path===l.href || (course && l.href==='/khoa-hoc') ? 'bg-brk-primary/10 font-bold' : 'hover:bg-brk-primary/5'}`}>{l.title}</a>)}
          <a href={session?.user ? '/tai-khoan' : '/login'} className="rounded-lg px-4 py-2 text-sm font-semibold lg:ml-auto" style={{background:theme.primary,color:theme.onPrimary}}>{session?.user ? 'Tài khoản của tôi' : 'Đăng nhập'}</a>
          {session?.user && <button className="px-3 py-2 text-sm text-brk-muted text-left" onClick={()=>void signOut({callbackUrl:'/'})}>Đăng xuất</button>}
        </nav>
      </div>
    </header>}
    {path!=='/' && <nav aria-label="Đường dẫn trang" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 text-sm text-brk-muted"><ol className="flex flex-wrap gap-2"><li><a href="/" className="hover:underline">Trang chủ</a></li>{course && <li><span aria-hidden="true">/ </span><a href="/khoa-hoc" className="hover:underline">Khóa học</a></li>}<li><span aria-hidden="true">/ </span><span aria-current="page" className="text-brk-on-surface">{label}</span></li></ol></nav>}
    <div id="website-content" className={`flex-1 min-w-0 ${learning ? 'min-h-0 overflow-hidden' : ''}`}>{children}</div>
    {!learning && <footer className="border-t border-brk-outline mt-10 bg-brk-surface text-brk-muted"><div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap justify-between gap-4 text-sm"><p>{brand.footerText || '© '+brand.name}</p><nav aria-label="Liên kết chân trang" className="flex flex-wrap gap-4"><a href="/">Trang chủ</a><a href="/tai-khoan">Tài khoản</a></nav></div></footer>}
  </div></Context.Provider>
}
