import 'server-only'
import {cache} from 'react'
import type {Prisma} from '@prisma/client'
import prisma from '@/lib/prisma'
import {getSiteRuntimeConfig} from '@/lib/site-profile/config'
import {isPlatformHost} from './domain-shared'

type Profile=Prisma.SiteProfileGetPayload<{include:{members:true;theme:true}}>
type Domain=Prisma.SiteDomainGetPayload<{include:{profile:{include:{members:true;theme:true}}}}>
type Managed=Prisma.SiteProfileDomainGetPayload<Record<string,never>>
type Row={verified:Omit<Domain,'profile'>|null;managed:Managed|null;profile:Profile|null;access:Prisma.JsonValue|null}
function date(value:Date|string|null):Date|null {
  if(value==null)return null
  if(value instanceof Date)return new Date(value.getTime())
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value+'Z')
}

/** Một snapshot DB cho mỗi request; không giữ quyền giữa các request. */
export const domainSnapshot=cache(async(hostname:string):Promise<{domain:Domain|null;access:Prisma.JsonValue|null}|null>=>{
  if(isPlatformHost(hostname))return {domain:null,access:null}
  // Cho phép bộ phân giải cũ hoạt động trên các DB chưa có đủ bảng.
  if(typeof prisma.$queryRaw!=='function')return null
  let rows:Row[]
  try {
    rows=await prisma.$queryRaw<Row[]>`
      SELECT to_jsonb(d) AS verified, to_jsonb(m) AS managed,
        CASE WHEN p.id IS NULL THEN NULL ELSE to_jsonb(p) || jsonb_build_object(
          'members', COALESCE((SELECT jsonb_agg(to_jsonb(pm)) FROM public."SiteProfileMember" pm WHERE pm."profileId"=p.id), '[]'::jsonb),
          'theme', to_jsonb(t)
        ) END AS profile, a.value AS access
      FROM (SELECT ${hostname}::text AS hostname) h
      LEFT JOIN public."SiteDomain" d ON d.hostname=h.hostname
      LEFT JOIN public."SiteProfileDomain" m ON m.hostname=h.hostname
      LEFT JOIN public."SiteProfile" p ON p.id=COALESCE(d."profileId",m."profileId")
      LEFT JOIN public."Theme" t ON t.id=p."themeId"
      LEFT JOIN public."SystemConfig" a ON a.key='website-access:' || p.id::text
    `
  } catch(error) {
    const known=error as {code?:string;meta?:{code?:string}}
    if(known.code==='P2010' && known.meta?.code==='42P01')return null
    throw error
  }
  const row=rows[0]
  if(!row?.profile || (!row.verified && !row.managed))return {domain:null,access:null}
  if(row.verified && row.managed && row.verified.profileId!==row.managed.profileId)return {domain:null,access:null}
  const profile:Profile={...row.profile,createdAt:date(row.profile.createdAt)!,updatedAt:date(row.profile.updatedAt)!,
    members:row.profile.members.map(member=>({...member,createdAt:date(member.createdAt)!})),
    theme:row.profile.theme ? {...row.profile.theme,createdAt:date(row.profile.theme.createdAt)!,updatedAt:date(row.profile.theme.updatedAt)!} : null}
  if(row.verified) {
    const d=row.verified
    return {domain:{...d,profile,createdAt:date(d.createdAt)!,updatedAt:date(d.updatedAt)!,verifiedAt:date(d.verifiedAt),checkedAt:date(d.checkedAt)},access:row.access}
  }
  const managed=row.managed!
  const config=getSiteRuntimeConfig(profile)
  return {domain:{...managed,profile,createdAt:date(managed.createdAt)!,updatedAt:date(managed.updatedAt)!,token:'',enabled:managed.isActive,
    courses:config.modules.courses,crm:false,affiliate:config.modules.affiliate,verifiedAt:date(managed.createdAt),checkedAt:null,message:'Tên miền được quản trị viên cấp'},access:row.access}
})
