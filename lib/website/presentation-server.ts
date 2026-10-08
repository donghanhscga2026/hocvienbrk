import 'server-only'
import {getSiteRuntimeConfig} from '@/lib/site-profile/config'
import {cache} from 'react'
import prisma from '@/lib/prisma'
import {normalizeWebsitePalette} from './theme'
import {readWebsitePages} from './pages-server'
import {websiteNavigation} from './pages'
import {blankDocument} from './document'
import {presentationKey,presentationSchema} from './presentation'

/** Đọc revision cũ để kiểm soát cập nhật; Page luôn sử dụng mẫu có sẵn. */
export const presentationState=cache(async (profileId:number)=>{
  const [config,profile]=await Promise.all([
    prisma.systemConfig.findUnique({where:{key:presentationKey(profileId)}}),
    prisma.siteProfile.findUnique({where:{id:profileId},select:{siteConfig:true}}),
  ])
  const revision=config ? presentationSchema.parse(config.value).revision : 0
  return {mode:'template' as const,revision,customPublished:false,homepageType:profile ? getSiteRuntimeConfig(profile).homepage.type:'profile'}
})

/** Thông tin thương hiệu dùng chung cho khung tên miền và mẫu có sẵn. */
export async function domainWebsite(profile:{id:number;slug?:string;title:string|null;subtitle?:string|null;accentColor?:string|null;backgroundColor?:string|null;siteConfig?:unknown;theme?:{colors:unknown}|null}) {
  const config=getSiteRuntimeConfig(profile)
  const palette=normalizeWebsitePalette(profile.theme?.colors)
  const document=blankDocument(config.branding.name || profile.title || 'Website của tôi')
  document.description=profile.subtitle || ''
  document.color=palette.primary || profile.accentColor || '#7c3aed'
  document.background=palette.background || profile.backgroundColor || '#f8fafc'
  const content=await readWebsitePages(profile.id)
  document.pages.push(...content.pages.filter(p=>p.published).map(p=>({id:'page-'+p.slug,title:p.title,slug:p.slug,nodes:[]})))
  return {...document,navigation:content.menu.length?websiteNavigation(content,profile.slug || '',true,{courses:config.modules.courses,tools:config.modules.tools}):undefined}
}
