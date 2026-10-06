import prisma from '@/lib/prisma'
import {z} from 'zod'
import {ownedProfile} from '@/lib/website/server'
import {isPlatformHost,requestHostname} from '@/lib/website/domain-shared'
import {crmBody,crmResponse} from '@/lib/crm/http'
import {websiteFailure} from '@/lib/website/http'
import {CrmError} from '@/lib/crm/service'
import {revalidateTag} from 'next/cache'

async function manager(request:Request) {
  if(!isPlatformHost(requestHostname(request.headers.get('host') || ''))) throw new CrmError('Quản lý dữ liệu tại hệ thống chính.',403)
  return ownedProfile()
}
function scope(profile:Awaited<ReturnType<typeof ownedProfile>>) {
  const selected=Array.isArray(profile.courseIds) ? profile.courseIds.filter((v):v is number=>typeof v==='number') : []
  const teachers=[profile.userId,...profile.members.map(m=>m.userId)].filter((v):v is number=>typeof v==='number')
  return {selected,where:{OR:[{teacherId:{in:teachers}},{id:{in:selected}}]}}
}
export async function GET(request:Request) {
  try {
    const profile=await manager(request),selection=scope(profile)
    const [members,courses]=await Promise.all([
      prisma.siteProfileMember.findMany({where:{profileId:profile.id},include:{user:{select:{id:true,name:true,email:true,image:true}}}}),
      prisma.course.findMany({where:{status:true,...selection.where},orderBy:{id:'desc'},select:{id:true,name_lop:true,teacherId:true}}),
    ])
    return crmResponse({profileId:profile.id,selected:selection.selected,members,courses})
  } catch(e){return websiteFailure(e)}
}
const command=z.object({courseIds:z.array(z.number().int().positive()).max(500)}).strict()
export async function POST(request:Request) {
  try {
    const profile=await manager(request),input=command.parse(await crmBody(request,10000))
    await prisma.$transaction(async tx=>{
      const fresh=await tx.siteProfile.findFirst({where:{id:profile.id,userId:profile.userId},include:{members:true,user:{select:{role:true}}}})
      if(!fresh) throw new CrmError('Bạn không còn quyền quản lý website.',403)
      const ids=[...new Set(input.courseIds)],selection=scope(fresh)
      const allowed=await tx.course.findMany({where:{id:{in:ids},...selection.where},select:{id:true}})
      if(allowed.length!==ids.length) throw new CrmError('Chỉ chọn khóa học của giáo viên liên kết hoặc khóa đã được cấp cho website.',403)
      await tx.siteProfile.update({where:{id:profile.id},data:{courseIds:ids}})
    },{isolationLevel:'Serializable'})
    revalidateTag('site-profile',{expire:0})
    return crmResponse({success:true})
  } catch(e){return websiteFailure(e)}
}
