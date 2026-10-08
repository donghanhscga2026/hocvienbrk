import 'server-only'
import {cache} from 'react'
import prisma from '@/lib/prisma'
import {blankWebsitePages,websitePagesKey,websitePagesSchema,contentTemplateKey,contentTemplateSchema} from './pages'

// Cache chỉ trong request: trang nháp, menu và trạng thái xuất bản được đọc mới ở request sau.
export const readWebsitePages=cache(async(profileId:number)=>{
  const row=await prisma.systemConfig.findUnique({where:{key:websitePagesKey(profileId)}})
  if(!row)return blankWebsitePages()
  const value=websitePagesSchema.safeParse(row.value)
  if(!value.success)throw new Error('Cấu hình trang và menu không hợp lệ.')
  return value.data
})
export async function readContentTemplate(profileId:number,slug:string){
  const row=await prisma.systemConfig.findUnique({where:{key:contentTemplateKey(profileId,slug)}})
  const value=contentTemplateSchema.safeParse(row?.value)
  return value.success?value.data:null
}
