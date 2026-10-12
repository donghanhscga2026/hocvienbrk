import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { managedProjects } from '@/lib/wi300/project-service'
import WiOfferingManager from '@/components/wi300/WiOfferingManager'

export const metadata = { title: 'Quản lý sản phẩm & dịch vụ' }
export default async function Page() {
  if (!await getCurrentDeploymentBrand()) notFound()
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Fdu-an%2Fnoi-dung')
  const { projects } = await managedProjects(prisma, Number(session.user.id))
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-brk-on-surface sm:px-6"><Link href="/du-an/quan-ly" className="inline-flex min-h-11 items-center text-brk-primary">← Quản lý dự án</Link><h1 className="text-3xl font-bold">Sản phẩm & dịch vụ</h1><WiOfferingManager initial={projects} /></main>
}
