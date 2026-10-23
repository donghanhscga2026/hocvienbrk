import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { readProjects } from '@/lib/wi300/project-service'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!await getCurrentDeploymentBrand()) notFound()
  const { id } = await params
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) notFound()
  const ownerId = Number(id)
  const projects = (await readProjects(prisma)).filter(project => project.published && project.ownerId === ownerId)
  if (!projects.length) notFound()
  // Chỉ lấy tên và ảnh công khai; không lấy email, điện thoại hoặc dữ liệu ví.
  const [owner, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: ownerId }, select: { name: true, image: true } }),
    prisma.siteProfile.findFirst({ where: { userId: ownerId, isActive: true }, select: { slug: true }, orderBy: { id: 'asc' } }),
  ])
  if (!owner) notFound()
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-brk-on-surface sm:px-6">
    <Link href="/du-an" className="inline-flex min-h-11 items-center text-brk-primary">← Các dự án Wi</Link>
    <section className="flex flex-wrap items-center gap-5 rounded-2xl border border-brk-outline bg-white p-6">
      {owner.image && <Image src={owner.image} alt="" width={96} height={96} className="h-24 w-24 rounded-full object-cover" />}
      <div><p className="text-sm text-brk-muted">Chủ dự án trong hệ sinh thái Wi</p><h1 className="mt-2 text-3xl font-bold">{owner.name || 'Chủ dự án'}</h1>{profile && <Link href={`/page/${encodeURIComponent(profile.slug)}`} className="mt-3 inline-flex min-h-11 items-center font-semibold text-brk-primary">Xem trang cá nhân →</Link>}</div>
    </section>
    <h2 className="text-2xl font-bold">Dự án đang phụ trách</h2>
    <div className="grid gap-4 sm:grid-cols-2">{projects.map(project => <Link key={project.slug} href={`/du-an/${project.slug}`} className="rounded-2xl border border-brk-outline bg-white p-5 hover:shadow-md"><h3 className="text-lg font-bold">{project.name}</h3><p className="mt-2 text-sm leading-6 text-brk-muted">{project.description}</p></Link>)}</div>
  </main>
}
