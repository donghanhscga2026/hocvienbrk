import 'server-only'
import { headers } from 'next/headers'
import { cache } from 'react'
import prisma from '@/lib/prisma'
import { activeDomain } from './domains'
import { isPlatformHost, requestHostname } from './domain-shared'
import {courseBelongsToProfile} from '@/lib/site-profile/config'
import { CrmError } from '@/lib/crm/service'

/** Đọc Host thực, không tin header tenant do trình duyệt tự gửi. */
export const domainContext=cache(async()=>{
  const host=requestHostname((await headers()).get('host') || '')
  if(!host || isPlatformHost(host)) return null
  const domain=await activeDomain(host)
  if(!domain) throw new CrmError('Tên miền chưa được kích hoạt.',403)
  return domain
})
export async function requireDomainModule(module: 'courses'|'crm'|'affiliate') {
  const domain=await domainContext()
  if(domain && !domain[module]) throw new CrmError('Website chưa được cấp chức năng này.',403)
  return domain
}
/** Phạm vi khóa học giống trang riêng; không dùng dữ liệu dự phòng khi DB lỗi. */
export async function requireDomainCourse(id: number|string) {
  const domain=await requireDomainModule('courses')
  if(!domain) return
  const course=await prisma.course.findUnique({where:typeof id==='number' ? {id} : {id_khoa:id},select:{id:true,teacherId:true,categoryId:true,status:true}})
  const allowed=courseBelongsToProfile(domain.profile,course)
  if(!allowed) throw new CrmError('Khóa học không thuộc website này.',404)
}
export async function requireDomainEnrollment(enrollmentId: number, userId: number, lessonId?: string) {
  // Đồng thời kiểm tra người sở hữu — kể cả trên tên miền chính.
  const enrollment=await prisma.enrollment.findUnique({where:{id:enrollmentId},select:{userId:true,courseId:true}})
  if(!enrollment || enrollment.userId!==userId) throw new CrmError('Bạn không có quyền sửa kết quả này.',403)
  if(lessonId) { const lesson=await prisma.lesson.findUnique({where:{id:lessonId},select:{courseId:true}}); if(lesson?.courseId!==enrollment.courseId) throw new CrmError('Bài học không thuộc khóa học.',403) }
  await requireDomainCourse(enrollment.courseId)
}
export async function requireDomainLesson(lessonId:string) {
  if(!await domainContext()) return
  const lesson=await prisma.lesson.findUnique({where:{id:lessonId},select:{courseId:true}})
  if(!lesson) throw new CrmError('Bài học không tồn tại.',404)
  await requireDomainCourse(lesson.courseId)
}
