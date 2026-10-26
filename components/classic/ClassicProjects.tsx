import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import MainHeader from '@/components/layout/MainHeader'
import FooterSection from '@/components/home/FooterSection'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getPublicProjects } from '@/lib/wi300/public-projects'
import { readProjects } from '@/lib/wi300/project-service'
import { canManageProject, projectCategoryLabels, type PublicWiProject } from '@/lib/wi300/projects'
import { getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'
import { FALLBACK_PROFILE } from '@/lib/db-fallback'

/**
 * Bản classic (giautoandien) của các trang dự án.
 * Dữ liệu dùng chung với bản wi300: getPublicProjects cho danh sách và
 * readProjects cho chi tiết/chủ dự án. Phạm vi khóa học liên quan dùng
 * getCourseWhereForProfile gốc — không áp wi300CoursePreferences.
 */

function ProjectCard({ project }: { project: PublicWiProject }) {
  const category = project.category ? projectCategoryLabels[project.category] : null
  return (
    <Link href={`/du-an/${project.slug}`} className="group overflow-hidden rounded-2xl border border-brk-outline bg-brk-surface shadow-sm transition-shadow hover:shadow-md">
      {project.logo
        ? <Image src={project.logo} alt="" width={600} height={340} unoptimized loading="lazy" className="aspect-video w-full object-contain p-4" />
        : <div aria-hidden="true" className="flex aspect-video w-full items-center justify-center bg-brk-background text-3xl font-black text-brk-primary">{project.name}</div>}
      <div className="space-y-2 p-5">
        {category && <p className="text-xs font-semibold text-brk-primary">{category}</p>}
        <h3 className="break-words text-lg font-bold text-brk-on-surface">{project.name}</h3>
        <p className="line-clamp-3 text-sm leading-6 text-brk-muted">{project.description}</p>
        <p className="text-sm font-semibold text-brk-primary">Xem dự án →</p>
      </div>
    </Link>
  )
}

export async function ClassicProjectsPage() {
  const profile = await getCurrentSiteProfile()
  const safeProfile: any = profile || FALLBACK_PROFILE
  const projects = (await getPublicProjects()).filter(project => project.published)
  return (
    <main className="min-h-screen" style={{ backgroundColor: safeProfile.backgroundColor || undefined }}>
      <MainHeader title="DỰ ÁN" profile={profile} />
      <section className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-brk-on-surface">Các dự án</h1>
        <p className="mt-2 max-w-3xl leading-7 text-brk-muted">Khám phá dự án, khóa học, sản phẩm và dịch vụ trong cộng đồng.</p>
        {projects.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{projects.map(project => <ProjectCard key={project.slug} project={project} />)}</div>
        ) : (
          <p className="mt-8 rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">Chưa có dự án nào được công khai.</p>
        )}
      </section>
      <FooterSection profile={safeProfile} />
    </main>
  )
}

export async function ClassicProjectDetailPage({ slug }: { slug: string }) {
  const project = (await readProjects(prisma)).find(item => item.slug === slug && item.published)
  if (!project) notFound()
  const siteProfile = await getCurrentSiteProfile()
  const safeProfile: any = siteProfile || FALLBACK_PROFILE
  const scope = getCourseWhereForProfile(siteProfile || { userId: 0 })
  const courses = project.courseIds.length ? await prisma.course.findMany({ where: { AND: [scope, { id: { in: project.courseIds } }] }, select: { id: true, id_khoa: true, name_lop: true, mo_ta_ngan: true, link_anh_bia: true, teacher: { select: { name: true } } }, orderBy: { updatedAt: 'desc' } }) : []
  // Chỉ công khai tên chủ dự án; không gửi email, điện thoại hoặc thông tin tài khoản.
  const owner = project.ownerId == null ? null : await prisma.user.findUnique({ where: { id: project.ownerId }, select: { name: true } })
  const session = await auth()
  const actorId = session?.user?.id == null ? NaN : Number(session.user.id)
  const actor = Number.isSafeInteger(actorId) && actorId >= 0 ? await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } }) : null
  const canManage = !!actor && canManageProject(project, actorId, actor.role === 'ADMIN')
  const team = await Promise.all((project.members || []).filter(member => member.visible).map(async member => ({ ...member, user: await prisma.user.findUnique({ where: { id: member.userId }, select: { name: true, image: true } }) })))
  return (
    <main className="min-h-screen" style={{ backgroundColor: safeProfile.backgroundColor || undefined }}>
      <MainHeader title="DỰ ÁN" profile={siteProfile} />
      <div className="container mx-auto space-y-10 px-4 py-10">
        <nav aria-label="Đường dẫn trang" className="flex flex-wrap gap-2 text-sm"><Link href="/" className="text-brk-primary">Trang chủ</Link><span>/</span><Link href="/du-an" className="text-brk-primary">Dự án</Link><span>/</span><span aria-current="page">{project.name}</span></nav>
        {canManage && <div className="flex justify-end"><Link href={`/du-an/quan-ly?project=${encodeURIComponent(project.slug)}`} className="inline-flex min-h-11 items-center rounded-xl border border-brk-outline bg-brk-surface px-4 font-semibold text-brk-primary">Quản lý dự án này</Link></div>}
        <section className="rounded-[2rem] border border-brk-outline bg-brk-surface p-6 shadow-xl sm:p-10"><div className="flex flex-col gap-6 sm:flex-row sm:items-center">{project.logo ? <Image src={project.logo} alt={`Logo ${project.name}`} width={160} height={160} unoptimized className="h-36 w-36 shrink-0 rounded-full border border-brk-outline bg-white object-contain p-2" /> : <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full bg-brk-background text-2xl font-bold text-brk-primary">{project.name}</div>}<div><p className="text-sm font-semibold text-brk-primary">Dự án trong cộng đồng</p><h1 className="mt-2 break-words text-3xl font-black text-brk-on-surface sm:text-4xl">{project.name}</h1><p className="mt-3 max-w-3xl leading-7 text-brk-muted">{project.description}</p>{owner?.name && <p className="mt-3 text-sm">Chủ dự án: <Link href={`/du-an/chu-du-an/${project.ownerId}`} className="font-semibold text-brk-primary underline underline-offset-4">{owner.name}</Link></p>}{project.website && <a href={project.website} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-brk-on-primary">Website / liên hệ ↗</a>}</div></div></section>
        {team.some(member => member.user) && <section><h2 className="text-2xl font-black text-brk-on-surface">Đội ngũ dự án</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{team.filter(member => member.user).map(member => <article key={member.userId} className="flex items-center gap-4 rounded-2xl border border-brk-outline bg-brk-surface p-5 shadow-sm">{member.user?.image && <Image src={member.user.image} alt="" width={64} height={64} unoptimized className="h-16 w-16 rounded-full object-cover" />}<div><h3 className="font-bold text-brk-on-surface">{member.user?.name || 'Thành viên dự án'}</h3><p className="mt-1 text-sm text-brk-muted">{member.title}</p></div></article>)}</div></section>}
        <section className="rounded-2xl border border-brk-outline bg-brk-surface p-6 shadow-sm"><h2 className="text-2xl font-black text-brk-on-surface">Giới thiệu dự án</h2><p className="mt-4 whitespace-pre-wrap break-words leading-8 text-brk-muted">{project.introduction || 'Thông tin giới thiệu chi tiết đang được cập nhật.'}</p></section>
        <section><h2 className="text-2xl font-black text-brk-on-surface">Khóa học liên quan</h2>{courses.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{courses.map(course => <Link key={course.id} href={`/khoa-hoc/${encodeURIComponent(course.id_khoa)}`} className="overflow-hidden rounded-2xl border border-brk-outline bg-brk-surface shadow-sm hover:shadow-md">{course.link_anh_bia && <Image src={course.link_anh_bia} alt="" width={600} height={340} unoptimized loading="lazy" className="aspect-video w-full object-cover" />}<div className="space-y-2 p-5"><h3 className="break-words text-lg font-bold text-brk-on-surface">{course.name_lop}</h3>{course.teacher?.name && <p className="text-sm text-brk-primary">{course.teacher.name}</p>}{course.mo_ta_ngan && <p className="line-clamp-3 text-sm leading-6 text-brk-muted">{course.mo_ta_ngan}</p>}<p className="text-sm font-semibold text-brk-primary">Xem khóa học →</p></div></Link>)}</div> : <p className="mt-4 text-brk-muted">Chưa có khóa học được công khai cho dự án này.</p>}</section>
        {(['PRODUCT', 'SERVICE'] as const).map(kind => <section key={kind}><h2 className="text-2xl font-black text-brk-on-surface">{kind === 'PRODUCT' ? 'Sản phẩm' : 'Dịch vụ'}</h2>{project.offerings.some(item => item.kind === kind) ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{project.offerings.filter(item => item.kind === kind).map((item, index) => <article key={index} className="space-y-3 rounded-2xl border border-brk-outline bg-brk-surface p-5 shadow-sm"><h3 className="break-words text-lg font-bold text-brk-on-surface">{item.name}</h3><p className="whitespace-pre-wrap break-words text-sm leading-6 text-brk-muted">{item.description}</p><a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">Xem chi tiết ↗</a></article>)}</div> : <p className="mt-4 text-brk-muted">Thông tin đang được cập nhật.</p>}</section>)}
      </div>
      <FooterSection profile={safeProfile} />
    </main>
  )
}

export async function ClassicProjectOwnerPage({ id }: { id: string }) {
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) notFound()
  const ownerId = Number(id)
  const projects = (await readProjects(prisma)).filter(project => project.published && project.ownerId === ownerId)
  if (!projects.length) notFound()
  // Chỉ lấy tên và ảnh công khai; không lấy email, điện thoại hoặc dữ liệu ví.
  const [owner, profile, siteProfile] = await Promise.all([
    prisma.user.findUnique({ where: { id: ownerId }, select: { name: true, image: true } }),
    prisma.siteProfile.findFirst({ where: { userId: ownerId, isActive: true }, select: { slug: true }, orderBy: { id: 'asc' } }),
    getCurrentSiteProfile(),
  ])
  if (!owner) notFound()
  const safeProfile: any = siteProfile || FALLBACK_PROFILE
  return (
    <main className="min-h-screen" style={{ backgroundColor: safeProfile.backgroundColor || undefined }}>
      <MainHeader title="CHỦ DỰ ÁN" profile={siteProfile} />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-10">
        <Link href="/du-an" className="inline-flex min-h-11 items-center text-brk-primary">← Các dự án</Link>
        <section className="flex flex-wrap items-center gap-5 rounded-2xl border border-brk-outline bg-brk-surface p-6 shadow-sm">
          {owner.image && <Image src={owner.image} alt="" width={96} height={96} unoptimized className="h-24 w-24 rounded-full object-cover" />}
          <div><p className="text-sm text-brk-muted">Chủ dự án trong cộng đồng</p><h1 className="mt-2 text-3xl font-black text-brk-on-surface">{owner.name || 'Chủ dự án'}</h1>{profile && <Link href={`/page/${encodeURIComponent(profile.slug)}`} className="mt-3 inline-flex min-h-11 items-center font-semibold text-brk-primary">Xem trang cá nhân →</Link>}</div>
        </section>
        <h2 className="text-2xl font-black text-brk-on-surface">Dự án đang phụ trách</h2>
        <div className="grid gap-4 sm:grid-cols-2">{projects.map(project => <Link key={project.slug} href={`/du-an/${project.slug}`} className="rounded-2xl border border-brk-outline bg-brk-surface p-5 shadow-sm hover:shadow-md"><h3 className="text-lg font-bold text-brk-on-surface">{project.name}</h3><p className="mt-2 text-sm leading-6 text-brk-muted">{project.description}</p></Link>)}</div>
      </div>
      <FooterSection profile={safeProfile} />
    </main>
  )
}
