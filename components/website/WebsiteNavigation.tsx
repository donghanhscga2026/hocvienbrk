'use client'
/* eslint-disable @next/next/no-html-link-for-pages -- Website tools load fresh permissions on navigation. */
import {usePathname,useSearchParams} from 'next/navigation'
import {useWebsiteScope} from './WebsiteScope'

export default function WebsiteNavigation(){
  const website=useWebsiteScope(),path=usePathname(),params=useSearchParams()
  const section=params.get('section') || 'overview'
  const active=path.includes('/pages')?'pages':path.endsWith('/data')?'data':path.endsWith('/domains')?'settings':path.endsWith('/manage')?(section==='design'?'design':['domains','apps','package'].includes(section)?'settings':'overview'):'design'
  const items=[['overview','Tổng quan','/tools/my-site/manage'],['pages','Trang & menu','/tools/my-site/pages'],['design','Giao diện','/tools/my-site/manage?section=design'],['data','Khóa học hiển thị','/tools/my-site/data'],['settings','Cài đặt','/tools/my-site/manage?section=domains']]
  return <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-8"><a className="inline-flex min-h-11 items-center text-sm font-medium text-violet-700" href="/tools/pages?tab=my-site">← Website của tôi</a><nav aria-label="Các mục quản lý website" className="flex gap-1 overflow-x-auto rounded-2xl border bg-white p-2">{items.map(([id,label,href])=><a key={id} aria-current={active===id?'page':undefined} className={'shrink-0 rounded-xl px-4 py-3 text-sm font-semibold '+(active===id?'bg-violet-700 text-white':'text-slate-600 hover:bg-slate-50')} href={website.href(href)}>{label}</a>)}</nav></div>
}
