import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { courseEditorActor } from '@/lib/course-page/permissions'
import OfferingDeliveryEditor from '@/components/offerings/OfferingDeliveryEditor'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await courseEditorActor(),
    id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id < 1) notFound()
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id_khoa: true, name_lop: true, teacherId: true, productGroup: true },
  })
  if (!course || course.productGroup !== 'SERVICE' || (actor.role !== 'ADMIN' && course.teacherId !== actor.id))
    notFound()
  return (
    <div className="space-y-6">
      <Link href="/tools/services" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">
        ← Về danh sách dịch vụ
      </Link>
      <h1 className="text-2xl font-bold">Tiến độ & Bàn giao · {course.name_lop}</h1>
      <OfferingDeliveryEditor slug={course.id_khoa} />
    </div>
  )
}
