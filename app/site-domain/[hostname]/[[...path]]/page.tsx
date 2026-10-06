import { CrmError } from '@/lib/crm/service'
import { connectedApplication, websiteApplicationUser } from '@/lib/website/application-context'
import { PLATFORM_ORIGIN } from '@/lib/website/domain-shared'
import WebsiteApplications from '@/components/website/WebsiteApplications'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { activeDomain } from '@/lib/website/domains'
import { requestHostname } from '@/lib/website/domain-shared'
import ProfileHome from '@/components/website/ProfileHome'
import {domainWebsite,presentationState} from '@/lib/website/presentation-server'
import { websiteData } from '@/lib/website/server'
import WebsiteView from '@/components/website/WebsiteView'
import { getSession } from '@/lib/get-session'
import prisma from '@/lib/prisma'

type Props={params:Promise<{hostname:string;path?:string[]}>}
async function context(props:Props) {
  const {hostname,path=[]}=await props.params
  if(requestHostname((await headers()).get('host') || '')!==hostname) notFound()
  const domain=await activeDomain(hostname)
  if(!domain) notFound()
  const document=await domainWebsite(domain.profile)
  if(!document) notFound()
  return {domain,document,path}
}
export async function generateMetadata(props:Props):Promise<Metadata> {
  const {domain,document,path}=await context(props)
  const page=document.pages.find(p=>p.slug===path.join('/'))
  const title=path.length ? (page?.title || (path[0]==='tai-khoan' ? 'Tài khoản' : path[0]==='cong-cu' ? 'Không gian của tôi' : path[0]==='ung-dung' ? 'Kết nối ứng dụng' : 'Khóa học'))+' | '+document.name : document.name
  return {title:{absolute:title},description:document.description,alternates:{canonical:'https://'+domain.hostname+'/'+path.map(encodeURIComponent).join('/')},openGraph:{title,description:document.description,url:'https://'+domain.hostname+'/'+path.join('/'),siteName:document.name}}
}
export default async function DomainPage(props:Props) {
  const {domain,document,path}=await context(props)
  if(path[0]==='ung-dung' && path.length===2) {
    try {
      const connection=await connectedApplication(path[1])
      return <section className="max-w-2xl mx-auto p-4 sm:p-6"><a href="/cong-cu" className="text-violet-700 underline">← Không gian của tôi</a><h1 className="text-3xl font-bold mt-6">{connection.app.name}</h1><p className="mt-4 text-slate-600">{connection.app.scope}</p><p className="mt-4 text-sm text-slate-600">Ứng dụng mở trên Giautoandien trong tab mới. Phiên đăng nhập độc lập: hãy đăng nhập đúng tài khoản của bạn tại đó. Quyền trên hệ thống chính có thể bao gồm dữ liệu ngoài website này.</p><a href={PLATFORM_ORIGIN+connection.app.path} target="_blank" rel="noreferrer" className="inline-block mt-6 rounded-xl bg-violet-700 text-white px-5 py-3">Mở trên hệ thống chính ↗</a></section>
    } catch(e) {
      if(!(e instanceof CrmError)) throw e
      if(e.status===404) notFound()
      return <section className="max-w-2xl mx-auto p-6"><h1 className="text-2xl font-bold">Kết nối ứng dụng</h1><p className="mt-4" role="alert">{e.message}</p>{e.status===401 ? <a className="inline-block mt-4 underline" href={'/login?callbackUrl='+encodeURIComponent('/ung-dung/'+path[1])}>Đăng nhập</a> : <a className="inline-block mt-4 underline" href="/cong-cu">Về Không gian của tôi</a>}</section>
    }
  }
  if(path.join('/')==='cong-cu') return <WebsiteApplications domain={domain} user={await websiteApplicationUser()} name={document.name} />
  if(path.join('/')==='tai-khoan') {
    const session=await getSession()
    if(!session?.user?.id) return <section className="max-w-3xl mx-auto p-6"><h1 className="text-2xl font-bold">Tài khoản của bạn</h1><a className="inline-block py-4 underline" href="/login?callbackUrl=%2Ftai-khoan">Đăng nhập để xem khóa học</a></section>
    const data=domain.courses ? await websiteData(domain.profile,{strict:true}) : {courses:[]}
    const enrollments=await prisma.enrollment.findMany({where:{userId:Number(session.user.id),courseId:{in:data.courses.map(c=>c.id)}},select:{status:true,course:{select:{id_khoa:true,name_lop:true}}}})
    return <section className="max-w-3xl mx-auto p-6 grid gap-4"><h1 className="text-2xl font-bold">Xin chào {session.user.name}</h1><h2 className="font-bold">Khóa học của bạn tại {document.name}</h2>{enrollments.map(e=><a className="border rounded-xl p-4" key={e.course.id_khoa} href={(e.status==='ACTIVE' ? '/courses/'+encodeURIComponent(e.course.id_khoa)+'/learn' : '/khoa-hoc/'+encodeURIComponent(e.course.id_khoa))}>{e.course.name_lop} · {e.status}</a>)}{!enrollments.length && <p>Bạn chưa có khóa học tại website này.</p>}</section>
  }
  if(!path.length && (await presentationState(domain.profileId)).mode==='template') return <ProfileHome profile={domain.profile} customDomain modules={{courses:domain.courses,crm:domain.crm,affiliate:domain.affiliate}} />
  const catalog=path.join('/')==='khoa-hoc'
  if(catalog && !domain.courses) notFound()
  if(!catalog && !document.pages.some(p=>p.slug===path.join('/'))) notFound()
  const data=await websiteData(domain.profile,{strict:true,courses:domain.courses})
  if(catalog) return <section className="max-w-5xl mx-auto p-6"><h1 className="text-2xl font-bold mb-6">Khóa học</h1><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.courses.map(c=><a className="border rounded-xl p-4 grid gap-3" key={c.id} href={c.href}>{c.image && <img src={c.image} alt="" className="rounded-lg w-full aspect-video object-cover" />}<h2 className="font-bold">{c.title}</h2><p>{c.description.replace(/<[^>]*>/g,'').slice(0,200)}</p></a>)}</div></section>
  return <WebsiteView document={document} data={data} slug={domain.profile.slug} pageSlug={path.join('/')} customDomain modules={{courses:domain.courses,crm:domain.crm,affiliate:domain.affiliate}} />
}
