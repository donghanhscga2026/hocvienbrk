import Link from 'next/link'
import Image from 'next/image'
import { auth } from '@/auth'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'
import { wi300CoursePreferences, wi300CourseWhere } from '@/lib/wi300/course-visibility'
import { readProjects } from '@/lib/wi300/project-service'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  if (!await getCurrentDeploymentBrand()) notFound()
  const { slug } = await params
  const project = (await readProjects(prisma)).find(item => item.slug === slug && item.published)
  if (!project) notFound()
  const profile = await getCurrentSiteProfile()
  const scope = wi300CourseWhere(getCourseWhereForProfile(profile || { userId: 0 }), await wi300CoursePreferences(prisma))
  const courses = project.courseIds.length ? await prisma.course.findMany({ where: { AND: [scope, { id: { in: project.courseIds } }] }, select: { id: true, id_khoa: true, name_lop: true, mo_ta_ngan: true, link_anh_bia: true, teacher: { select: { name: true } } }, orderBy: { updatedAt: 'desc' } }) : []
  // Chỉ công khai tên chủ dự án; không gửi email, điện thoại hoặc thông tin tài khoản.
  const owner = project.ownerId == null ? null : await prisma.user.findUnique({ where: { id: project.ownerId }, select: { name: true } })
  const session = await auth()
  const actorId = session?.user?.id == null ? NaN : Number(session.user.id)
  const actor = Number.isSafeInteger(actorId) && actorId >= 0 ? await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } }) : null
  const canManage = !!actor && (actor.role === 'ADMIN' || project.ownerId === actorId)
  return <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 text-brk-on-surface sm:px-6 lg:py-12">
    <nav aria-label="Đường dẫn trang" className="flex flex-wrap gap-2 text-sm"><Link href="/" className="text-brk-primary">Trang chủ</Link><span>/</span><Link href="/du-an" className="text-brk-primary">Dự án Wi</Link><span>/</span><span aria-current="page">{project.name}</span></nav>
    {(owner?.name || canManage) && <div className="flex flex-wrap items-center justify-between gap-3">{owner?.name && <p className="text-sm">Chủ dự án: <Link href={`/du-an/chu-du-an/${project.ownerId}`} className="font-semibold text-brk-primary underline underline-offset-4">{owner.name}</Link></p>}{canManage && <Link href={`/du-an/quan-ly?project=${encodeURIComponent(project.slug)}`} className="inline-flex min-h-11 items-center rounded-xl border border-brk-outline bg-white px-4 font-semibold text-brk-primary">Quản lý dự án này</Link>}</div>}
    <section className="rounded-3xl border border-brk-outline bg-white p-6 sm:p-10"><div className="flex flex-col gap-6 sm:flex-row sm:items-center">{project.logo ? <Image src={project.logo} alt={`Logo ${project.name}`} width={160} height={160} className="h-36 w-36 shrink-0 rounded-full border border-brk-outline bg-white object-contain p-2" /> : <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full bg-brk-background text-2xl font-bold text-brk-primary">{project.name}</div>}<div><p className="text-sm font-semibold text-brk-primary">Dự án trong hệ sinh thái Wi</p><h1 className="mt-2 break-words text-3xl font-bold sm:text-4xl">{project.name}</h1><p className="mt-3 max-w-3xl leading-7 text-brk-muted">{project.description}</p>{project.website && <a href={project.website} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-white">Website / liên hệ ↗</a>}</div></div></section>
    <section className="rounded-2xl border border-brk-outline bg-white p-6"><h2 className="text-2xl font-bold">Giới thiệu dự án</h2><p className="mt-4 whitespace-pre-wrap break-words leading-8 text-brk-muted">{project.introduction || 'Thông tin giới thiệu chi tiết đang được cập nhật.'}</p></section>
    <section><h2 className="text-2xl font-bold">Khóa học liên quan</h2>{courses.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{courses.map(course => <Link key={course.id} href={`/khoa-hoc/${encodeURIComponent(course.id_khoa)}`} className="overflow-hidden rounded-2xl border border-brk-outline bg-white hover:shadow-md">{course.link_anh_bia && <Image src={course.link_anh_bia} alt="" width={600} height={340} className="aspect-video w-full object-cover" />}<div className="space-y-2 p-5"><h3 className="break-words text-lg font-bold">{course.name_lop}</h3>{course.teacher?.name && <p className="text-sm text-brk-primary">{course.teacher.name}</p>}{course.mo_ta_ngan && <p className="line-clamp-3 text-sm leading-6 text-brk-muted">{course.mo_ta_ngan}</p>}<p className="text-sm font-semibold text-brk-primary">Xem khóa học →</p></div></Link>)}</div> : <p className="mt-4 text-brk-muted">Chưa có khóa học được công khai cho dự án này.</p>}</section>
    {(['PRODUCT', 'SERVICE'] as const).map(kind => <section key={kind}><h2 className="text-2xl font-bold">{kind === 'PRODUCT' ? 'Sản phẩm' : 'Dịch vụ'}</h2>{project.offerings.some(item => item.kind === kind) ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{project.offerings.filter(item => item.kind === kind).map((item, index) => <article key={index} className="space-y-3 rounded-2xl border border-brk-outline bg-white p-5"><h3 className="break-words text-lg font-bold">{item.name}</h3><p className="whitespace-pre-wrap break-words text-sm leading-6 text-brk-muted">{item.description}</p><a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">Xem chi tiết ↗</a></article>)}</div> : <p className="mt-4 text-brk-muted">Thông tin đang được cập nhật.</p>}</section>)}
  </main>
}
