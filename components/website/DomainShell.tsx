'use client'
/* eslint-disable @next/next/no-html-link-for-pages -- Mỗi trang tải lại context tên miền và quyền hiện tại từ máy chủ. */
import {createContext,useContext} from 'react'
import {useSession,signOut} from 'next-auth/react'
import type {DomainModules} from '@/lib/website/domain-shared'

type Brand=DomainModules & {name:string;color:string;background:string;ownerId:number|null}
const Context=createContext<Brand|null>(null)
export const useDomainBrand=()=>useContext(Context)
export default function DomainShell({brand,showNavigation,children}:{brand:Brand;showNavigation:boolean;children:React.ReactNode}) {
  const {data:session}=useSession()
  return <Context.Provider value={brand}><div style={{background:brand.background,color:'#172033',minHeight:'100vh'}}>{showNavigation && <header className="border-b px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4" style={{background:brand.background}}><a href="/" className="font-bold text-xl" style={{color:brand.color}}>{brand.name}</a><nav className="flex flex-wrap items-center gap-4 text-sm"><a href="/">Trang chủ</a>{brand.courses && <a href="/khoa-hoc">Khóa học</a>}{brand.crm && Number(session?.user?.id)===brand.ownerId && <a href="/tools/crm">CRM</a>}{brand.affiliate && <a href="/tools/affiliate">Affiliate</a>}<a href={session?.user ? '/tai-khoan' : '/login'}>{session?.user ? 'Tài khoản' : 'Đăng nhập'}</a>{session?.user && <button onClick={()=>void signOut({callbackUrl:'/'})}>Đăng xuất</button>}</nav></header>}{children}</div></Context.Provider>
}
