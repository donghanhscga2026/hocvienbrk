import 'server-only'
import {gunzipSync} from 'node:zlib'
import prisma from '@/lib/prisma'
import {getCourseWhereForProfile,type CourseScopeProfile} from '@/lib/site-profile/config'
import {PAGE_HTML_LIMIT,PAGE_COMPRESSED_LIMIT,pageTemplateKey,pageTemplateSchema,type PageTemplate} from './page-template'
import {PLATFORM_ORIGIN} from './domain-shared'

export function decodePageSource(source:string) {
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(source))throw new Error('Nội dung nén không hợp lệ.')
  const buffer=Buffer.from(source,'base64')
  if(buffer.length>PAGE_COMPRESSED_LIMIT)throw new Error('Template nén vượt 2,5MB.')
  return gunzipSync(buffer,{maxOutputLength:PAGE_HTML_LIMIT}).toString('utf8')
}
export async function readPageTemplate(id:number):Promise<PageTemplate|null> {
  const entry=await prisma.systemConfig.findUnique({where:{key:pageTemplateKey(id)}})
  const result=pageTemplateSchema.safeParse(entry?.value)
  return result.success?result.data:null
}
export function pageCourseWhere(profile:CourseScopeProfile) {
  return {AND:[getCourseWhereForProfile(profile),{teacherId:profile.userId ?? -1}]}
}
export async function pageCourses(profile:CourseScopeProfile,enabled=true) {
  if(!enabled || profile.userId==null)return []
  const rows=await prisma.course.findMany({where:pageCourseWhere(profile),orderBy:[{pin:'asc'},{id:'asc'}],take:100,select:{id:true,id_khoa:true,name_khoa:true,name_lop:true,mo_ta_ngan:true,link_anh_bia:true}})
  return rows.map(c=>({id:c.id,title:c.name_khoa || c.name_lop,description:c.mo_ta_ngan || '',image:publicImage(c.link_anh_bia),href:PLATFORM_ORIGIN+'/khoa-hoc/'+encodeURIComponent(c.id_khoa)}))
}
function publicImage(value:string|null) {
  if(!value)return ''
  try{const url=new URL(value,PLATFORM_ORIGIN);return url.protocol==='https:'?url.toString():''}catch{return ''}
}
