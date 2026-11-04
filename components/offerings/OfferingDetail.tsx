import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { requireDomainCourse } from '@/lib/website/domain-context'
import { canProfileAccessCourse, getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import Wi300Header from '@/components/wi300/Wi300Header'
import MainHeader from '@/components/layout/MainHeader'
import OfferingPurchase from './OfferingPurchase'
import OfferingShare from './OfferingShare'
import { publicCatalogWhere, readOfferingDetails } from '@/lib/offerings/server'
import { groupInfo, offeringAccess, offeringKinds, productGroup, type ProductGroup } from '@/lib/offerings/shared'

export default async function OfferingDetail({ slug, expectedGroup }: { slug: string; expectedGroup?: Exclude<ProductGroup, 'COURSE'> }) {
  await requireDomainCourse(slug)
  const [course, session, profile, brand] = await Promise.all([
    prisma.course.findUnique({ where: { id_khoa: slug }, select: {
      id: true, id_khoa: true, name_lop: true, productGroup: true, phi_coc: true, mo_ta_ngan: true, mo_ta_dai: true, link_anh_bia: true,
      type: true, feeType: true, voucherConfig: true, allowMbvDeduction: true, requiresReferralActivation: true, referralActivationThreshold: true,
      _count: { select: { lessons: true } },
      teacher: { select: { name: true } }, teacherBankAccount: { select: { id: true, accountHolder: true, accountNumber: true, bankName: true, qrCodeUrl: true } },
    } }), getSession(), getCurrentSiteProfile(), getCurrentDeploymentBrand(),
  ])
  if (!course || course.productGroup === 'COURSE' || (expectedGroup && course.productGroup !== expectedGroup)) notFound()
  const userId = session?.user?.id != null ? Number(session.user.id) : null
  const [enrollment, user, details] = await Promise.all([
    userId != null ? prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } }, include: { payment: { select: { verifiedAt: true, status: true } } } }) : null,
    userId != null ? prisma.user.findUnique({ where: { id: userId }, select: { phone: true } }) : null,
    readOfferingDetails(course.id),
  ])
  if (profile) {
    if (enrollment) {
      const { status: _status, ...scope } = getCourseWhereForProfile(profile)
      void _status
      if (!await prisma.course.findFirst({ where: { AND: [scope, { id: course.id }] }, select: { id: true } })) notFound()
    } else if (!await canProfileAccessCourse(profile, course.id)) notFound()
  }
  // Khách đã mua vẫn mở được mục đã ẩn; người lạ phải thuộc danh mục công khai.
  if (!enrollment && !await prisma.course.findFirst({ where: { AND: [await publicCatalogWhere(), { id: course.id }] }, select: { id: true } })) notFound()
  const group = productGroup(course.productGroup)
  const info = groupInfo[group]
  const active = offeringAccess(enrollment, group === 'DIGITAL' ? details.accessDays : 0)
  const previouslyActive = enrollment && ['ACTIVE', 'COMPLETED'].includes(enrollment.status)
  const booking = active && group === 'SERVICE' && details.bookingCode ? await prisma.bookingSession.findFirst({ where: { code: details.bookingCode, courseId: course.id, status: 'ACTIVE' }, select: { code: true } }) : null
  return <>{brand ? <Wi300Header /> : <MainHeader title={info.label} profile={profile} />}<main className="mx-auto max-w-6xl space-y-7 px-4 py-8 text-brk-on-surface sm:px-6">
    <nav aria-label="Đường dẫn trang" className="flex flex-wrap gap-2 text-sm"><Link href="/">Trang chủ</Link><span>/</span><Link href={info.catalog} className="text-brk-primary">{info.label}</Link><span>/</span><span aria-current="page">{course.name_lop}</span></nav>
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]"><section className="min-w-0 space-y-5">{course.link_anh_bia && <img src={course.link_anh_bia} alt={course.name_lop} className="aspect-video w-full rounded-2xl object-cover" />}<p className="font-semibold text-brk-primary">{offeringKinds[details.kind]}</p><h1 className="text-3xl font-bold sm:text-4xl">{course.name_lop}</h1>{course.teacher?.name && <p className="text-base text-brk-muted">{group === 'SERVICE' ? 'Chuyên gia' : 'Đơn vị cung cấp'}: {course.teacher.name}</p>}<p className="whitespace-pre-wrap text-lg leading-8 text-brk-muted">{course.mo_ta_ngan?.replace(/<[^>]+>/g, ' ')}</p>{course.mo_ta_dai && <section className="rounded-2xl border bg-white p-5"><h2 className="mb-3 text-xl font-bold">Giới thiệu chi tiết</h2><p className="whitespace-pre-wrap text-base leading-8">{course.mo_ta_dai.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')}</p></section>}</section>
    <aside className="space-y-5 rounded-2xl border border-brk-outline bg-white p-6 lg:sticky lg:top-28"><h2 className="text-xl font-bold">{info.label}</h2><p className="text-3xl font-bold text-brk-primary">{course.phi_coc > 0 ? course.phi_coc.toLocaleString('vi-VN') + 'đ' : 'Miễn phí'}</p><p className="text-base leading-7 text-brk-muted">{group === 'DIGITAL' ? details.accessDays ? `Quyền sử dụng ${details.accessDays} ngày từ khi kích hoạt.` : 'Quyền sử dụng không giới hạn thời gian tại website.' : `${details.sessions} buổi · ${details.durationMin} phút/buổi · ${{ ONLINE: 'Online', OFFLINE: 'Trực tiếp', HYBRID: 'Kết hợp' }[details.mode]}`}</p>
      {active ? <div className="space-y-4"><p className="rounded-xl bg-green-50 p-3 font-semibold text-green-800">Đã kích hoạt</p>{group === 'DIGITAL' ? details.accessUrl ? <a href={details.accessUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center rounded-xl bg-brk-primary px-4 font-semibold text-white">{details.kind === 'APP' ? 'Mở ứng dụng' : 'Mở / tải tài nguyên'} ↗</a> : <p className="text-sm text-brk-muted">Tài nguyên đang được cập nhật. Bạn có thể gửi yêu cầu hỗ trợ.</p> : <Link href={booking ? '/dat-lich/' + encodeURIComponent(booking.code) : '/my-requests'} className="flex min-h-12 items-center justify-center rounded-xl bg-brk-primary px-4 font-semibold text-white">{booking ? 'Chọn lịch hẹn' : 'Gửi yêu cầu đồng hành'} →</Link>}{details.instructions && <p className="whitespace-pre-wrap text-base leading-7">{details.instructions}</p>}<Link href="/my-requests" className="inline-flex min-h-11 items-center text-sm font-semibold text-brk-primary">Yêu cầu hỗ trợ →</Link></div> : previouslyActive ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Quyền sử dụng đã hết hạn. Vui lòng gửi yêu cầu hỗ trợ để gia hạn.</p> : <OfferingPurchase course={course} enrollment={enrollment ? { status: enrollment.status } : null} userId={userId} userPhone={user?.phone || null} />}
      <Link href={'/my-space?tab=' + (group === 'DIGITAL' ? 'products' : 'services')} className="inline-flex min-h-11 items-center text-sm font-semibold text-brk-primary">{group === 'DIGITAL' ? 'Sản phẩm đã mua' : 'Dịch vụ đã đặt'} →</Link>
      <OfferingShare course={{ id_khoa: course.id_khoa, name_lop: course.name_lop, productGroup: course.productGroup }} userId={userId} siteName={brand?.name || profile?.title || 'Cộng đồng'} />
      {active && (course._count?.lessons || 0) > 0 && <Link href={'/courses/' + encodeURIComponent(course.id_khoa) + '/learn'} className="inline-flex min-h-11 items-center text-base font-semibold text-brk-primary">Mở nội dung đã được cấp trước đây →</Link>}
    </aside></div>
  </main></>
}
