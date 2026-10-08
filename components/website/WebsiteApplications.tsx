/* eslint-disable @next/next/no-html-link-for-pages -- Tải lại quyền ở máy chủ khi mở ứng dụng. */
import {applicationKeys,applications,canUseApplication,isWebsiteStaff,type ApplicationFlags} from '@/lib/website/applications'
import type {DomainModules} from '@/lib/website/domain-shared'
type Props={domain:DomainModules & {applications:ApplicationFlags;profile:{userId:number|null;members:{userId:number}[]}};user:{id:number;role:string}|null;name:string}
type Card={href:string;title:string;description:string}
function Cards({items}:{items:Card[]}){return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item=><a key={item.href} href={item.href} className="border rounded-2xl p-5 bg-brk-surface text-brk-on-surface border-brk-outline hover:border-brk-primary"><h3 className="font-bold mb-2">{item.title}</h3><p className="text-brk-muted text-sm">{item.description}</p><span className="inline-block mt-4 text-sm font-semibold">Mở ứng dụng →</span></a>)}</div>}
export default function WebsiteApplications({domain,user,name}:Props){
  const learning:Card[]=[
    ...(domain.courses?[{href:'/khoa-hoc',title:'Khóa học',description:'Khám phá và đăng ký khóa học của website.'}]:[]),
    ...(domain.courses && user?[{href:'/tai-khoan',title:'Khóa học của tôi',description:'Khóa học và tiến độ học tập của bạn tại website này.'}]:[]),
  ]
  const personal:Card[]=domain.affiliate && user?[{href:'/tools/affiliate',title:'Affiliate',description:'Liên kết giới thiệu và hoa hồng cá nhân.'}]:[]
  const management:Card[]=domain.crm && isWebsiteStaff(domain.profile,user)?[{href:'/tools/crm',title:'CRM',description:'Khách hàng và công việc thuộc quyền quản lý của tài khoản bạn.'}]:[]
  const connected=applicationKeys.filter(key=>domain.applications[key] && canUseApplication(key,domain.profile,user))
  return <section className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
    <h1 className="text-3xl font-bold">Không gian của tôi</h1><p className="text-brk-muted mt-3 mb-6">Ứng dụng được kết nối tại {name}, phù hợp với quyền tài khoản của bạn.</p>
    {!user && <p className="rounded-xl bg-brk-primary/10 p-4 mb-6"><a href="/login?callbackUrl=%2Fcong-cu" className="text-brk-accent underline">Đăng nhập</a> để xem công cụ cá nhân và chức năng được phân quyền.</p>}
    {[[learning,'Học tập'],[personal,'Công cụ cá nhân'],[management,'Quản lý website']].map(([items,title])=>{const cards=items as Card[];return cards.length?<div key={title as string} className="mb-8"><h2 className="font-bold text-lg mb-3">{title as string}</h2><Cards items={cards}/></div>:null})}
    {!!connected.length && <><h2 className="font-bold text-lg mt-8 mb-3">Kết nối hệ thống chính</h2><p className="text-sm text-brk-muted mb-4">Mở trong tab mới trên Giautoandien. Đăng nhập đúng tài khoản của bạn tại đó; dữ liệu theo quyền tài khoản trên hệ thống chính.</p><Cards items={connected.map(key=>({href:'/ung-dung/'+key,title:applications[key].name,description:applications[key].scope}))}/></>}
    {user && !learning.length && !personal.length && !management.length && !connected.length && <p className="border rounded-2xl p-6">Chưa có ứng dụng được kết nối cho tài khoản của bạn tại website này.</p>}
  </section>
}
