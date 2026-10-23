import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'
import { wi300CoursePreferences, wi300CourseWhere } from '@/lib/wi300/course-visibility'
import { teacherProfileKey, teacherProfileSchema } from '@/lib/wi300/teacher-profile'
import { canCreateProfile } from '@/lib/auth/roles'

// Chỉ đọc thông tin công khai và khóa trong đúng phạm vi website, không tải tài khoản người xem.
const readTeacher = cache(async (raw: string) => {
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) return null
  const id = Number(raw)
  const [brand, scope] = await Promise.all([getCurrentDeploymentBrand(), getCurrentSiteProfile()])
  if (!brand || brand.appearance?.hiddenPages.includes('teachers')) return null
  const preferences = await wi300CoursePreferences(prisma)
  const where = { AND: [wi300CourseWhere(getCourseWhereForProfile(scope || { userId: 0 }), preferences), { teacherId: id }] }
  const [user, courses, row] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { name: true, image: true, role: true, siteProfile: { select: { slug: true, isActive: true } } } }),
    prisma.course.findMany({ where, take: 13, orderBy: { updatedAt: 'desc' }, select: { id: true, id_khoa: true, name_lop: true, mo_ta_ngan: true, link_anh_bia: true, courseCategory: { select: { name: true } } } }),
    prisma.systemConfig.findUnique({ where: { key: teacherProfileKey(id) } }),
  ])
  if (!user || !canCreateProfile(user.role) || !courses.length) return null
  const parsed = teacherProfileSchema.safeParse(row?.value || {})
  return { user, courses, profile: parsed.success ? parsed.data : teacherProfileSchema.parse({}) }
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const data = await readTeacher((await params).id)
  return data ? { title: `${data.user.name || 'Giảng viên'} | Giảng viên`, description: data.profile.headline || 'Giới thiệu giảng viên và các khóa học công khai.' } : { title: 'Không tìm thấy giảng viên', robots: { index: false } }
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await readTeacher(id)
  if (!data) notFound()
  const { user, courses, profile } = data
  const fields = profile.fields.length ? profile.fields : [...new Set(courses.map(course => course.courseCategory?.name).filter((name): name is string => !!name))]
  const website = profile.website || (user.siteProfile?.isActive ? `/page/${encodeURIComponent(user.siteProfile.slug)}` : '')
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 text-brk-on-surface sm:px-6">
    <nav aria-label="Đường dẫn" className="flex flex-wrap gap-2 text-sm text-brk-muted"><Link href="/">Trang chủ</Link><span>/</span><Link href="/giang-vien">Giảng viên</Link><span>/</span><span aria-current="page">{user.name || 'Giảng viên'}</span></nav>
    <section className="wi300-hero grid items-center gap-6 rounded-3xl border border-brk-outline p-6 sm:p-9 md:grid-cols-[200px_1fr]">
      {user.image ? <Image src={user.image} alt={user.name || 'Giảng viên'} width={200} height={200} unoptimized className="mx-auto aspect-square w-40 rounded-full object-cover md:w-48" /> : <div aria-hidden="true" className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-brk-primary/10 text-5xl">{user.name?.charAt(0) || 'Wi'}</div>}
      <div className="min-w-0"><p className="text-sm font-semibold text-brk-primary">Giảng viên</p><h1 className="mt-2 break-words text-3xl font-bold sm:text-4xl">{user.name || 'Giảng viên Wi300'}</h1>{profile.headline && <p className="mt-3 leading-7 text-brk-muted">{profile.headline}</p>}<ul className="mt-4 flex flex-wrap gap-2">{fields.map(field => <li key={field} className="rounded-full bg-white px-3 py-2 text-sm">{field}</li>)}</ul><div className="mt-6 flex flex-wrap gap-3"><Link href="#khoa-hoc-giang-vien" className="wi300-pill-active inline-flex min-h-12 items-center rounded-xl border px-5 font-semibold">Xem khóa học</Link>{website && <Link href={website} target="_blank" rel="noopener noreferrer" className="wi300-pill inline-flex min-h-12 items-center rounded-xl border px-5 font-semibold">Website cá nhân ↗</Link>}</div></div>
    </section>
    <div className={`grid items-start gap-6 ${profile.introduction ? 'lg:grid-cols-[300px_1fr]' : ''}`}>
      {profile.introduction && <section className="rounded-2xl border border-brk-outline bg-white p-5"><h2 className="text-xl font-bold">Giới thiệu giảng viên</h2><p className="mt-4 whitespace-pre-line break-words leading-7 text-brk-muted">{profile.introduction}</p></section>}
      <section id="khoa-hoc-giang-vien" className="min-w-0 scroll-mt-28"><h2 className="mb-5 text-2xl font-bold">Khóa học của giảng viên</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{courses.slice(0, 12).map(course => <Link key={course.id} href={`/khoa-hoc/${encodeURIComponent(course.id_khoa)}`} className="overflow-hidden rounded-2xl border border-brk-outline bg-white focus-visible:outline-2 focus-visible:outline-brk-primary">{course.link_anh_bia && <Image src={course.link_anh_bia} alt="" width={400} height={225} unoptimized loading="lazy" className="aspect-video w-full object-cover" />}<div className="space-y-3 p-4"><h3 className="font-bold">{course.name_lop}</h3>{course.mo_ta_ngan && <p className="line-clamp-3 text-sm leading-6 text-brk-muted">{course.mo_ta_ngan.replace(/<[^>]*>/g, '')}</p>}<span className="inline-flex min-h-11 items-center text-sm font-semibold text-brk-primary">Xem khóa học →</span></div></Link>)}</div>{courses.length > 12 && <Link href={`/khoa-hoc?teacher=${id}`} className="mt-5 inline-flex min-h-11 items-center font-semibold text-brk-primary">Xem tất cả khóa học của giảng viên →</Link>}</section>
    </div>
  </main>
}
