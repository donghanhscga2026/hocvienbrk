import 'server-only'
import {cache} from 'react'
import prisma from '@/lib/prisma'
import {publishedWebsite} from '@/lib/website/server'
import {blankDocument} from './document'
import {presentationKey,presentationSchema} from './presentation'

/** Giữ nguyên lựa chọn hiện tại của website chưa có cấu hình; không tự chuyển mẫu. */
export const presentationState=cache(async (profileId:number)=>{
  const [config,custom]=await Promise.all([
    prisma.systemConfig.findUnique({where:{key:presentationKey(profileId)}}),
    publishedWebsite(profileId),
  ])
  const state=config ? presentationSchema.parse(config.value) : {mode:custom ? 'custom' as const : 'template' as const,revision:0}
  // Ẩn thiết kế tự do thì quay về mẫu có sẵn, tránh làm domain đang chạy thành 404.
  return {...state,mode:state.mode==='custom' && !custom ? 'template' as const : state.mode,customPublished:!!custom,custom}
})

export async function activeCustomWebsite(profileId:number) {
  const state=await presentationState(profileId)
  return state.mode==='custom' ? state.custom : null
}

/** Cấp thông tin khung website cho cả mẫu cũ và thiết kế tự do trên domain. */
export async function domainWebsite(profile:{id:number;title:string|null;subtitle?:string|null;accentColor?:string|null;backgroundColor?:string|null}) {
  const state=await presentationState(profile.id)
  if(state.mode==='custom') return state.custom
  const document=blankDocument(profile.title || 'Website của tôi')
  document.description=profile.subtitle || ''
  document.color=profile.accentColor || '#7c3aed'
  document.background=profile.backgroundColor || '#f8fafc'
  return document
}
