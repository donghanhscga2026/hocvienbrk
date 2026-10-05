import 'server-only'
import {getSiteRuntimeConfig} from '@/lib/site-profile/config'
import {cache} from 'react'
import prisma from '@/lib/prisma'
import {publishedWebsite} from '@/lib/website/server'
import {blankDocument} from './document'
import {presentationKey,presentationSchema} from './presentation'

/** Giữ nguyên lựa chọn hiện tại của website chưa có cấu hình; không tự chuyển mẫu. */
export const presentationState=cache(async (profileId:number)=>{
  const [config,custom,profile]=await Promise.all([
    prisma.systemConfig.findUnique({where:{key:presentationKey(profileId)}}),
    publishedWebsite(profileId),
    prisma.siteProfile.findUnique({where:{id:profileId},select:{siteConfig:true}}),
  ])
  const raw=profile?.siteConfig && typeof profile.siteConfig==='object' && !Array.isArray(profile.siteConfig)?profile.siteConfig:{}
  const homepage=raw.homepage && typeof raw.homepage==='object' && !Array.isArray(raw.homepage)?raw.homepage:{}
  const state=config ? presentationSchema.parse(config.value) : {mode:typeof homepage.type==='string' ? (getSiteRuntimeConfig(profile || {}).homepage.type==='website' && custom ? 'custom' as const:'template' as const) : custom ? 'custom' as const : 'template' as const,revision:0}
  // Ẩn thiết kế tự do thì quay về mẫu có sẵn, tránh làm domain đang chạy thành 404.
  return {...state,mode:state.mode==='custom' && !custom ? 'template' as const : state.mode,customPublished:!!custom,custom,homepageType:profile ? getSiteRuntimeConfig(profile).homepage.type:'profile'}
})

export async function activeCustomWebsite(profileId:number) {
  const state=await presentationState(profileId)
  return state.mode==='custom' ? state.custom : null
}

/** Cấp thông tin khung website cho cả mẫu cũ và thiết kế tự do trên domain. */
export async function domainWebsite(profile:{id:number;title:string|null;subtitle?:string|null;accentColor?:string|null;backgroundColor?:string|null;siteConfig?:unknown;theme?:{colors:unknown}|null}) {
  const state=await presentationState(profile.id)
  const config=getSiteRuntimeConfig(profile)
  if(state.mode==='custom') return state.custom ? {...state.custom,name:config.branding.name || state.custom.name}:null
  const document=blankDocument(config.branding.name || profile.title || 'Website của tôi')
  document.description=profile.subtitle || ''
  const palette=profile.theme?.colors as Record<string,string>|undefined
  document.color=palette?.primary || profile.accentColor || '#7c3aed'
  document.background=palette?.background || profile.backgroundColor || '#f8fafc'
  return document
}
