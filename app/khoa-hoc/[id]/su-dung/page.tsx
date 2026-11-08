import { notFound, redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { requireDomainCourse } from '@/lib/website/domain-context'
import { getPagePresentation } from '@/lib/site-profile/presentation'
import { offeringWorkspaceHref, type ProductGroup } from '@/lib/offerings/shared'
import OfferingWorkspace from '@/components/offerings/OfferingWorkspace'

export const metadata = { title: 'Không gian sử dụng', robots: { index: false, follow: false } }

// Đường vào không gian sử dụng theo dạng khóa học cho các site classic (chỉ có
// mục Khóa học). Site đang dùng bản wi300 cho nhóm tương ứng thì chuyển về
// đường dẫn sản phẩm/dịch vụ chính thức; khóa học thường vào thẳng trang học.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireDomainCourse(id)
  const course = await prisma.course.findUnique({ where: { id_khoa: id }, select: { productGroup: true } })
  if (!course) notFound()
  if (course.productGroup === 'COURSE') redirect('/courses/' + encodeURIComponent(id) + '/learn')
  const group = course.productGroup as Exclude<ProductGroup, 'COURSE'>
  const presentation = await getPagePresentation(group === 'DIGITAL' ? 'products' : 'services')
  if (presentation === 'wi300') redirect(offeringWorkspaceHref(group, id))
  return <OfferingWorkspace slug={id} group={group} variant="classic" />
}
