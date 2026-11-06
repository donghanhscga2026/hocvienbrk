import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { requireDomainCourse } from '@/lib/website/domain-context'
import { getPublishedCoursePageBySlug } from '@/app/actions/course-page-actions'
import { readOfferingDetails, publicCatalogWhere } from '@/lib/offerings/server'
import type { ProductGroup } from '@/lib/offerings/shared'
import OfferingDetail from './OfferingDetail'
import CourseSalesPage from '@/components/course-page/CourseSalesPage'

export default async function OfferingSalesPage({
  slug,
  group,
  searchParams,
}: {
  slug: string
  group: Exclude<ProductGroup, 'COURSE'>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireDomainCourse(slug)
  const course = await prisma.course.findUnique({ where: { id_khoa: slug }, select: { id: true, productGroup: true } })
  if (!course || course.productGroup !== group) notFound()
  const details = await readOfferingDetails(course.id)
  if (
    details.salesLayout === 'TEMPLATE' &&
    (await prisma.course.findFirst({
      where: { AND: [await publicCatalogWhere(), { id: course.id }] },
      select: { id: true },
    })) &&
    (await getPublishedCoursePageBySlug(slug))
  )
    return <CourseSalesPage params={Promise.resolve({ id: slug })} searchParams={searchParams} expectedGroup={group} />
  return <OfferingDetail slug={slug} expectedGroup={group} initialDetails={details} />
}
