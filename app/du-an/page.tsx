import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { readProjects } from '@/lib/wi300/project-service'

export const metadata = { title: 'Các dự án Wi' }
export default async function Page() {
  if (!await getCurrentDeploymentBrand()) notFound()
  const projects = (await readProjects(prisma)).filter(project => project.published)
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-10 text-brk-on-surface sm:px-6">
    <Link href="/" className="inline-flex min-h-11 items-center text-brk-primary">← Trang chủ</Link>
    <h1 className="text-3xl font-bold">Các dự án Wi</h1>
    <p className="text-brk-muted">Khám phá dự án, khóa học, sản phẩm và dịch vụ trong hệ sinh thái Wi.</p>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{projects.map(project => <Link key={project.slug} href={`/du-an/${project.slug}`} className="flex items-center gap-4 rounded-2xl border border-brk-outline bg-white p-5 hover:shadow-md">
      {project.logo && <Image src={project.logo} alt="" width={80} height={80} className="h-20 w-20 shrink-0 rounded-full object-contain" />}
      <div className="min-w-0"><h2 className="break-words text-lg font-bold">{project.name}</h2><p className="mt-2 text-sm leading-6 text-brk-muted">{project.description}</p><p className="mt-3 text-sm font-semibold text-brk-primary">Xem hồ sơ →</p></div>
    </Link>)}</div>
    {!projects.length && <p>Chưa có dự án công khai.</p>}
  </main>
}
