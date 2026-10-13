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
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{projects.map(project => <Link key={project.slug} href={`/du-an/${project.slug}`} className="flex min-w-0 flex-col items-center gap-4 rounded-2xl border border-brk-outline bg-white p-5 text-center hover:border-brk-primary hover:shadow-md sm:p-6">
      <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brk-outline bg-white sm:h-36 sm:w-36">{project.logo ? <Image src={project.logo} alt="" width={144} height={144} sizes="(max-width: 639px) 128px, 144px" className="h-full w-full rounded-full object-contain p-1" /> : <span aria-hidden="true" className="px-2 text-center text-sm font-extrabold text-brk-primary">{project.name}</span>}</div>
      <div className="flex min-w-0 flex-1 flex-col"><h2 className="break-words text-xl font-bold">{project.name}</h2><p className="mt-2 text-sm leading-6 text-brk-muted">{project.description}</p><p className="mt-auto inline-flex min-h-11 items-center justify-center pt-3 text-sm font-semibold text-brk-primary">Xem dự án →</p></div>
    </Link>)}</div>
    {!projects.length && <p>Chưa có dự án công khai.</p>}
  </main>
}
