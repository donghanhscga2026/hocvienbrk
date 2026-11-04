import Link from 'next/link'
import prisma from '@/lib/prisma'
import { getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'
import { offeringHref, type ProductGroup } from '@/lib/offerings/shared'

export default async function PurchasedOfferings({ userId, group }: { userId: number; group: Exclude<ProductGroup, 'COURSE'> }) {
  const profile = await getCurrentSiteProfile()
  const { status: _status, ...scope } = getCourseWhereForProfile(profile || { userId: 0 })
  void _status
  const rows = await prisma.enrollment.findMany({ where: { userId, course: { AND: [scope, { productGroup: group }] } }, select: { id: true, status: true, course: { select: { id_khoa: true, name_lop: true } } }, orderBy: { createdAt: 'desc' } })
  return <section className="space-y-4">{rows.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map(row => <article key={row.id} className="space-y-3 rounded-2xl border border-brk-outline bg-white p-5"><h2 className="text-xl font-bold">{row.course.name_lop}</h2><p className="text-sm text-brk-muted">{['ACTIVE', 'COMPLETED'].includes(row.status) ? 'Đã kích hoạt' : row.status === 'PENDING' ? 'Chờ xử lý / thanh toán' : 'Chưa kích hoạt'}</p><Link href={offeringHref(group, row.course.id_khoa)} className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-4 font-semibold text-white">{group === 'DIGITAL' ? 'Mở sản phẩm' : 'Xem / đặt lịch'} →</Link></article>)}</div> : <p className="rounded-xl border bg-white p-5">Chưa có nội dung ở mục này.</p>}{group === 'SERVICE' && <Link href="/my-requests" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">Lịch hẹn & yêu cầu của tôi →</Link>}</section>
}
