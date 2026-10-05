import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { activeDomain } from '@/lib/website/domains'
import { requestHostname } from '@/lib/website/domain-shared'
import { publishedWebsite, websiteData } from '@/lib/website/server'
import WebsiteView from '@/components/website/WebsiteView'
import { getSession } from '@/lib/get-session'
import prisma from '@/lib/prisma'

type Props={params:Promise<{hostname:string;path?:string[]}>}
async function context(props:Props) {
  const {hostname,path=[]}=await props.params
  if(requestHostname((await headers()).get('host') || '')!==hostname) notFound()
  const domain=await activeDomain(hostname)
  if(!domain) notFound()
  const document=await publishedWebsite(domain.profileId)
  if(!document) notFound()
  return {domain,document,path}
}
export async function generateMetadata(props:Props):Promise<Metadata> {
  const {domain,document,path}=await context(props)
  const page=document.pages.find(p=>p.slug===path.join('/'))
  const title=path.length ? (page?.title || (path[0]==='tai-khoan' ? 'Tài khoản' : 'Khóa học'))+' | '+document.name : document.name
  return {title:{absolute:title},description:document.description,alternates:{canonical:'https://'+domain.hostname+'/'+path.map(encodeURIComponent).join('/')},openGraph:{title,description:document.description,url:'https://'+domain.hostname+'/'+path.join('/'),siteName:document.name}}
}
export default async function DomainPage(props:Props) {
  const {domain,document,path}=await context(props)
  if(path.join('/')==='tai-khoan') {
    const session=await getSession()
    if(!session?.user?.id) return <section className="max-w-3xl mx-auto p-6"><h1 className="text-2xl font-bold">Tài khoản của bạn</h1><a className="inline-block py-4 underline" href="/login?callbackUrl=%2Ftai-khoan">Đăng nhập để xem khóa học</a></section>
    const data=domain.courses ? await websiteData(domain.profile,{strict:true}) : {courses:[]}
    const enrollments=await prisma.enrollment.findMany({where:{userId:Number(session.user.id),courseId:{in:data.courses.map(c=>c.id)}},select:{status:true,course:{select:{id_khoa:true,name_lop:true}}}})
    return <section className="max-w-3xl mx-auto p-6 grid gap-4"><h1 className="text-2xl font-bold">Xin chào {session.user.name}</h1><h2 className="font-bold">Khóa học của bạn tại {document.name}</h2>{enrollments.map(e=><a className="border rounded-xl p-4" key={e.course.id_khoa} href={(e.status==='ACTIVE' ? '/courses/'+encodeURIComponent(e.course.id_khoa)+'/learn' : '/khoa-hoc/'+encodeURIComponent(e.course.id_khoa))}>{e.course.name_lop} · {e.status}</a>)}{!enrollments.length && <p>Bạn chưa có khóa học tại website này.</p>}</section>
  }
  const catalog=path.join('/')==='khoa-hoc'
  if(catalog && !domain.courses) notFound()
  if(!catalog && !document.pages.some(p=>p.slug===path.join('/'))) notFound()
  const data=await websiteData(domain.profile,{strict:true,courses:domain.courses})
  if(catalog) return <section className="max-w-5xl mx-auto p-6"><h1 className="text-2xl font-bold mb-6">Khóa học</h1><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.courses.map(c=><a className="border rounded-xl p-4 grid gap-3" key={c.id} href={c.href}>{c.image && <img src={c.image} alt="" className="rounded-lg w-full aspect-video object-cover" />}<h2 className="font-bold">{c.title}</h2><p>{c.description.replace(/<[^>]*>/g,'').slice(0,200)}</p></a>)}</div></section>
  return <WebsiteView document={document} data={data} slug={domain.profile.slug} pageSlug={path.join('/')} customDomain modules={{courses:domain.courses,crm:domain.crm,affiliate:domain.affiliate}} />
}
