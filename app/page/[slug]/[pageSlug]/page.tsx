import {cache} from 'react'
import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import {getSiteProfile} from '@/app/actions/site-profile-actions'
import {getSiteRuntimeConfig} from '@/lib/site-profile/config'
import {readWebsitePages} from '@/lib/website/pages-server'
import {pageSlugSchema,websiteNavigation} from '@/lib/website/pages'
import ImportedPage from '@/components/website/ImportedPage'
import WebsiteContentPage from '@/components/website/WebsiteContentPage'

type Props={params:Promise<{slug:string;pageSlug:string}>}
const context=cache(async(slug:string,pageSlug:string)=>{
  if(!pageSlugSchema.safeParse(pageSlug).success)notFound()
  const profile=await getSiteProfile(slug)
  if(!profile?.isActive)notFound()
  const content=await readWebsitePages(profile.id),page=content.pages.find(p=>p.slug===pageSlug && p.published)
  if(!page)notFound()
  return {profile,content,page,config:getSiteRuntimeConfig(profile)}
})
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {slug,pageSlug}=await params,{page,profile}=await context(slug,pageSlug)
  return {title:page.title+' | '+(profile.title || profile.slug),description:page.description}
}
export default async function WebsiteSubpage({params}:Props){
  const {slug,pageSlug}=await params,{profile,content,page,config}=await context(slug,pageSlug)
  const imported=await ImportedPage({profile,pageSlug,coursesEnabled:config.modules.courses})
  const navigation=websiteNavigation(content,slug,false,config.modules)
  return imported || <WebsiteContentPage page={page} navigation={[{title:'Trang chủ',href:'/page/'+encodeURIComponent(slug),match:''},...navigation.filter(n=>n.href!=='/page/'+encodeURIComponent(slug))]}/>
}
