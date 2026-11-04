import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { requireDomainCourse } from '@/lib/website/domain-context'
import {
  canProfileAccessCourse,
  getCurrentSiteProfile,
  getCourseWhereForProfile,
} from '@/lib/site-profile/runtime'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import Wi300Header from '@/components/wi300/Wi300Header'
import Wi300Footer from '@/components/wi300/Wi300Footer'
import FooterSection from '@/components/home/FooterSection'
import CourseProjectBadges from '@/components/course/CourseProjectBadges'
import { getPublicProjects } from '@/lib/wi300/public-projects'
import { CheckCircle2, LifeBuoy, ArrowRight, Layers } from 'lucide-react'
import OfferingRichText from './OfferingRichText'
import MainHeader from '@/components/layout/MainHeader'
import OfferingPurchase from './OfferingPurchase'
import OfferingShare from './OfferingShare'
import { publicCatalogWhere, readOfferingDetails } from '@/lib/offerings/server'
import {
  groupInfo,
  offeringFacts,
  offeringWorkspaceHref,
  publicOfferingDetails,
  offeringAccess,
  offeringKinds,
  productGroup,
  type ProductGroup,
} from '@/lib/offerings/shared'

export default async function OfferingDetail({
  slug,
  expectedGroup,
}: {
  slug: string
  expectedGroup?: Exclude<ProductGroup, 'COURSE'>
}) {
  await requireDomainCourse(slug)
  const [course, session, profile, brand] = await Promise.all([
    prisma.course.findUnique({
      where: { id_khoa: slug },
      select: {
        id: true,
        id_khoa: true,
        name_lop: true,
        productGroup: true,
        phi_coc: true,
        mo_ta_ngan: true,
        mo_ta_dai: true,
        link_anh_bia: true,
        type: true,
        feeType: true,
        voucherConfig: true,
        allowMbvDeduction: true,
        requiresReferralActivation: true,
        referralActivationThreshold: true,
        teacher: { select: { name: true } },
        teacherBankAccount: {
          select: {
            id: true,
            accountHolder: true,
            accountNumber: true,
            bankName: true,
            qrCodeUrl: true,
          },
        },
      },
    }),
    getSession(),
    getCurrentSiteProfile(),
    getCurrentDeploymentBrand(),
  ])
  if (!course || course.productGroup === 'COURSE' || (expectedGroup && course.productGroup !== expectedGroup))
    notFound()
  const userId = session?.user?.id != null ? Number(session.user.id) : null
  const [enrollment, user, details] = await Promise.all([
    userId != null
      ? prisma.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId: course.id } },
          include: {
            payment: { select: { verifiedAt: true, status: true } },
          },
        })
      : null,
    userId != null
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { phone: true },
        })
      : null,
    readOfferingDetails(course.id),
  ])
  if (profile) {
    if (enrollment) {
      const { status: _status, ...scope } = getCourseWhereForProfile(profile)
      void _status
      if (
        !(await prisma.course.findFirst({
          where: { AND: [scope, { id: course.id }] },
          select: { id: true },
        }))
      )
        notFound()
    } else if (!(await canProfileAccessCourse(profile, course.id))) notFound()
  }
  // Khách đã mua vẫn mở được mục đã ẩn; người lạ phải thuộc danh mục công khai.
  if (
    !enrollment &&
    !(await prisma.course.findFirst({
      where: { AND: [await publicCatalogWhere(), { id: course.id }] },
      select: { id: true },
    }))
  )
    notFound()
  const group = productGroup(course.productGroup)
  const info = groupInfo[group]
  const active = offeringAccess(enrollment, group === 'DIGITAL' ? details.accessDays : 0)
  const previouslyActive = enrollment && ['ACTIVE', 'COMPLETED'].includes(enrollment.status)
  const projects = (await getPublicProjects())
    .filter((project) => project.courseIds.includes(course.id))
    .map(({ slug, name, logo }) => ({ slug, name, logo }))
  const ownBrandShell = !!brand && !expectedGroup
  const button =
    'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brk-primary px-4 text-center font-semibold text-white'
  const contentTitle = group === 'DIGITAL' ? 'Nội dung sản phẩm' : 'Nội dung đồng hành'
  return (
    <>
      {ownBrandShell ? <Wi300Header /> : !brand ? <MainHeader title={info.label} profile={profile} /> : null}
      <div className="bg-gradient-to-b from-stone-50 via-white to-white">
        <main className="mx-auto max-w-7xl space-y-8 px-4 py-7 text-brk-on-surface sm:px-6 sm:py-9">
          <nav aria-label="Đường dẫn trang" className="flex flex-wrap gap-2 text-sm text-brk-muted">
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <Link href={info.catalog} className="text-brk-primary">
              {info.label}
            </Link>
            <span>/</span>
            <span aria-current="page">{course.name_lop}</span>
          </nav>
          <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
            <section className="min-w-0 space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <CourseProjectBadges projects={projects} compact />
                <span className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-brk-primary">
                  {offeringKinds[details.kind]}
                </span>
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-green-950 sm:text-4xl lg:text-5xl">
                {course.name_lop}
              </h1>
              <OfferingRichText text={course.mo_ta_ngan} />
              {course.link_anh_bia && (
                <img
                  src={course.link_anh_bia}
                  alt={course.name_lop}
                  className="aspect-video w-full rounded-2xl object-cover"
                />
              )}
              <div>
                <h2 className="mb-3 text-xl font-bold text-green-950">
                  {details.benefits.length
                    ? group === 'DIGITAL'
                      ? 'Bạn nhận được gì?'
                      : 'Kết quả hướng đến'
                    : 'Thông tin nổi bật'}
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(details.benefits.length
                    ? details.benefits
                    : offeringFacts(group, publicOfferingDetails(details))
                        .slice(0, 3)
                        .map(([label, value]) => label + ': ' + value)
                  ).map((benefit) => (
                    <div key={benefit} className="rounded-xl bg-green-50 p-4">
                      <CheckCircle2 className="mb-3 h-6 w-6 text-brk-primary" />
                      <p className="text-sm font-semibold leading-6 text-green-950">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <aside className="space-y-5 rounded-2xl border border-brk-outline bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-28">
              <div className="border-b border-brk-outline pb-5">
                <h2 className="mb-3 text-2xl font-bold text-green-950">
                  {active ? (group === 'DIGITAL' ? 'Sản phẩm của bạn' : 'Dịch vụ của bạn') : info.label}
                </h2>
                {active ? (
                  <p className="flex items-center gap-2 rounded-xl bg-green-50 p-3 font-semibold text-green-800">
                    <CheckCircle2 className="h-5 w-5" />
                    Đã kích hoạt
                  </p>
                ) : (
                  <p className="text-3xl font-bold text-red-700">
                    {course.phi_coc > 0 ? course.phi_coc.toLocaleString('vi-VN') + 'đ' : 'Miễn phí'}
                  </p>
                )}
              </div>
              <section>
                <h3 className="mb-3 text-lg font-bold text-green-950">
                  {group === 'DIGITAL' ? 'Thông tin sử dụng' : 'Thông tin đồng hành'}
                </h3>
                <dl className="divide-y divide-stone-100 text-sm">
                  {[
                    ...offeringFacts(group, publicOfferingDetails(details)),
                    ...(course.teacher?.name
                      ? [[group === 'DIGITAL' ? 'Cung cấp bởi' : 'Chuyên gia', course.teacher.name]]
                      : []),
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[20px_100px_minmax(0,1fr)] gap-2 py-3">
                      <Layers className="h-5 w-5 text-brk-primary" />
                      <dt className="font-medium">{label}</dt>
                      <dd className="min-w-0 break-words text-brk-muted">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              {active ? (
                <Link href={offeringWorkspaceHref(group, slug)} className={button}>
                  Vào sử dụng <ArrowRight className="h-4 w-4" />
                </Link>
              ) : previouslyActive ? (
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                  Quyền sử dụng đã hết hạn. Vui lòng gửi yêu cầu hỗ trợ để gia hạn.
                </p>
              ) : (
                <OfferingPurchase
                  course={course}
                  enrollment={enrollment ? { status: enrollment.status } : null}
                  userId={userId}
                  userPhone={user?.phone || null}
                />
              )}
              <div className="grid grid-cols-2 gap-3 border-t border-brk-outline pt-4">
                <OfferingShare
                  course={{
                    id_khoa: course.id_khoa,
                    name_lop: course.name_lop,
                    productGroup: course.productGroup,
                  }}
                  userId={userId}
                  siteName={brand?.name || profile?.title || 'Cộng đồng'}
                />
                <a
                  href="#ho-tro"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-brk-outline text-sm font-semibold text-brk-primary"
                >
                  <LifeBuoy className="h-4 w-4" />
                  Hỗ trợ
                </a>
              </div>
              <Link
                href={'/my-space?tab=' + (group === 'DIGITAL' ? 'products' : 'services')}
                className="flex min-h-11 items-center justify-center text-sm text-brk-muted"
              >
                {group === 'DIGITAL' ? 'Sản phẩm đã mua' : 'Dịch vụ đã đặt'} →
              </Link>
            </aside>
          </div>
          <nav
            aria-label="Mục trong trang"
            className="flex gap-2 overflow-x-auto border-y border-brk-outline bg-white py-2"
          >
            {[
              ['tong-quan', 'Tổng quan'],
              ['noi-dung', contentTitle],
              ['huong-dan', group === 'DIGITAL' ? 'Hướng dẫn' : 'Quy trình'],
              ['ho-tro', 'Hỗ trợ'],
            ].map(([id, label]) => (
              <a
                key={id}
                href={'#' + id}
                className="flex min-h-12 flex-1 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-semibold text-brk-primary hover:bg-green-50"
              >
                {label}
              </a>
            ))}
          </nav>
          <section id="tong-quan" className="scroll-mt-36 rounded-2xl border bg-white p-5 sm:p-7">
            <h2 className="mb-4 text-2xl font-bold text-green-950">Tổng quan</h2>
            <OfferingRichText
              text={
                course.mo_ta_dai ||
                course.mo_ta_ngan ||
                'Thông tin chi tiết đang được đơn vị cung cấp cập nhật.'
              }
            />
          </section>
          {group === 'DIGITAL' ? (
            <section id="noi-dung" className="scroll-mt-36 rounded-2xl border bg-green-50 p-6">
              <h2 className="text-2xl font-bold text-green-950">Nội dung sản phẩm</h2>
              {details.agenda.length > 0 ? (
                <div className="mt-4 divide-y rounded-xl bg-white px-5">
                  {details.agenda.map((item, index) => (
                    <details key={index} className="py-2">
                      <summary className="cursor-pointer py-4 text-lg font-semibold">
                        {index + 1}. {item.title}
                      </summary>
                      <OfferingRichText text={item.description} />
                    </details>
                  ))}
                </div>
              ) : details.resources.length > 0 ? (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {details.resources.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 rounded-xl bg-white p-4">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-brk-primary" />
                      <span>{item.title}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-brk-muted">
                  {course.mo_ta_ngan ||
                    'Đơn vị cung cấp đang cập nhật danh sách nội dung. Bạn có thể gửi yêu cầu để tìm hiểu trước khi đăng ký.'}
                </p>
              )}
              <p className="my-3 text-brk-muted">
                Tài nguyên và hướng dẫn được mở tại khu vực riêng sau khi kích hoạt sản phẩm.
              </p>
              {active && (
                <Link
                  href={offeringWorkspaceHref(group, slug)}
                  className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-white"
                >
                  Vào sử dụng →
                </Link>
              )}
            </section>
          ) : (
            <section id="noi-dung" className="scroll-mt-36 space-y-4">
              <h2 className="text-2xl font-bold text-green-950">{contentTitle}</h2>
              {details.agenda.length ? (
                <div className="divide-y rounded-2xl border bg-white px-5">
                  {details.agenda.map((item, index) => (
                    <details key={index} className="py-2">
                      <summary className="cursor-pointer py-4 text-lg font-semibold">
                        {index + 1}. {item.title}
                      </summary>
                      <OfferingRichText text={item.description} />
                    </details>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border bg-white p-6">
                  Nội dung cụ thể được thống nhất với chuyên gia theo nhu cầu của bạn. Gửi yêu cầu hỗ trợ để
                  trao đổi trước khi đăng ký.
                </p>
              )}
            </section>
          )}
          <section id="huong-dan" className="scroll-mt-36 space-y-5">
            <h2 className="text-2xl font-bold text-green-950">
              {group === 'DIGITAL' ? 'Hướng dẫn bắt đầu' : 'Quy trình đồng hành'}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {(group === 'DIGITAL'
                ? [
                    ['Kích hoạt sản phẩm', 'Đăng nhập và hoàn tất đăng ký để lưu quyền truy cập.'],
                    ['Chọn tài nguyên', 'Mở nội dung sản phẩm, chọn tài nguyên phù hợp và xem hướng dẫn.'],
                    [
                      'Bắt đầu áp dụng',
                      'Xem tài liệu, video và hướng dẫn trực tiếp trong không gian sử dụng.',
                    ],
                  ]
                : [
                    ['Đăng ký dịch vụ', 'Hoàn tất đăng ký để kích hoạt quyền đồng hành.'],
                    [
                      'Chọn lịch hẹn',
                      details.bookingCode
                        ? 'Chọn khung giờ phù hợp trong lịch của chuyên gia.'
                        : 'Gửi yêu cầu đồng hành để thống nhất lịch với chuyên gia.',
                    ],
                    ['Tham gia buổi hẹn', 'Chuẩn bị theo hướng dẫn và tham gia đúng lịch đã xác nhận.'],
                  ]
              ).map(([title, description], index) => (
                <article key={title} className="rounded-2xl border bg-white p-5">
                  <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-900">
                    {index + 1}
                  </span>
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-brk-muted">{description}</p>
                </article>
              ))}
            </div>
          </section>
          <section
            id="ho-tro"
            className="flex scroll-mt-36 flex-wrap items-center justify-between gap-5 rounded-2xl border border-green-100 bg-green-50 p-6"
          >
            <div>
              <h2 className="text-xl font-bold text-green-950">Bạn cần hỗ trợ thêm?</h2>
              <p className="mt-2 text-sm text-brk-muted">
                Gửi yêu cầu để được hướng dẫn về nội dung, quyền sử dụng hoặc lịch hẹn.
              </p>
            </div>
            <Link
              href="/my-requests"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brk-primary px-5 font-semibold text-white"
            >
              <LifeBuoy className="h-5 w-5" />
              Gửi yêu cầu hỗ trợ
            </Link>
          </section>
        </main>
      </div>
      {ownBrandShell ? <Wi300Footer /> : !brand ? <FooterSection profile={profile || {}} /> : null}
    </>
  )
}
