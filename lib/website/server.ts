import 'server-only'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { Prisma } from '@prisma/client'
import { CrmError } from '@/lib/crm/service'
import { getCoursesForProfile, getPostsForProfile } from '@/app/actions/site-profile-actions'
import { parseDocument } from './document'

export async function ownedProfile() {
  const session = await auth()
  const id = Number(session?.user?.id)
  if(!session?.user?.id || !Number.isInteger(id)) throw new CrmError('Vui lòng đăng nhập.', 401)
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if(!user) throw new CrmError('Phiên đăng nhập không hợp lệ.', 401)
  const profile = await prisma.siteProfile.findUnique({ where: { userId: id }, include: { members: true, user: { select: { role: true } } } })
  if(!profile) throw new CrmError('Bạn chưa có trang riêng. Hãy nhờ quản trị viên cấp trang trước.', 404)
  return profile
}
export async function publishedWebsite(profileId: number) {
  try { const row = await prisma.siteWebsite.findUnique({ where: { profileId }, select: { published: true } }); return row?.published ? parseDocument(row.published) : null }
  catch(error) { if(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') return null; throw error }
}
export async function websiteData(profile: Parameters<typeof getCoursesForProfile>[0]) {
  const [courses, posts] = await Promise.all([getCoursesForProfile(profile), getPostsForProfile(profile)])
  const testimonials = await prisma.courseTestimonial.findMany({ where: { courseId: { in: courses.map((c: { id: number }) => c.id) }, isActive: true }, take: 60, orderBy: { createdAt: 'desc' }, select: { id: true, courseId: true, name: true, role: true, content: true, rating: true } })
  return {
    courses: courses.map((c: { id: number; id_khoa: string; name_khoa: string | null; name_lop: string; link_anh_bia: string | null; mo_ta_ngan: string | null }) => ({ id: c.id, title: c.name_khoa || c.name_lop, image: c.link_anh_bia || '', description: c.mo_ta_ngan || '', href: '/khoa-hoc/' + encodeURIComponent(c.id_khoa) })),
    testimonials,
    posts: posts.map(p => ({ id: p.id, title: p.title, content: p.content.replace(/<[^>]*>/g, '').slice(0,1200) })),
  }
}
