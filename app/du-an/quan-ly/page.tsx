import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'
import { wi300CoursePreferences, wi300CourseWhere } from '@/lib/wi300/course-visibility'
import WiProjectManager from '@/components/wi300/WiProjectManager'
import { managedProjects } from '@/lib/wi300/project-service'

export const metadata = { title: 'Quản lý dự án Wi' }
export default async function Page({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  if (!await getCurrentDeploymentBrand()) notFound()
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Fdu-an%2Fquan-ly')
  const initial = await managedProjects(prisma, Number(session.user.id))
  const { project } = await searchParams
  if (project && !initial.projects.some(item => item.slug === project)) notFound()
  // Màn danh sách thẻ không cần tải toàn bộ khóa học; chỉ tải khi mở một dự án.
  let courses: { id: number; name_lop: string; id_khoa: string }[] = []
  if (project) {
    const profile = await getCurrentSiteProfile()
    const where = wi300CourseWhere(getCourseWhereForProfile(profile || { userId: 0 }), await wi300CoursePreferences(prisma))
    courses = await prisma.course.findMany({ where, select: { id: true, name_lop: true, id_khoa: true }, orderBy: { name_lop: 'asc' } })
  }
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-brk-on-surface sm:px-6"><Link href="/my-space?tab=business" className="inline-flex min-h-11 items-center text-brk-primary">← Không gian của tôi</Link><h1 className="text-3xl font-bold">Quản lý dự án</h1><WiProjectManager key={project || 'list'} courses={courses} initial={initial} initialSlug={project} /></main>
}
