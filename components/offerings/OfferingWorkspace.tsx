import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowUpRight, CheckCircle2, CalendarDays, Package, LifeBuoy, FileText } from 'lucide-react'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getPublicProjects } from '@/lib/wi300/public-projects'
import { requireOfferingWorkspace, readDelivery, workspaceResources, WorkspaceError } from '@/lib/offerings/workspace'
import {
  offeringHref,
  offeringWorkspaceHref,
  groupInfo,
  resolvedWorkspace,
  workspaceLayouts,
  deliveryPhaseLabels,
  modeLabels,
  type ProductGroup,
} from '@/lib/offerings/shared'
import { formatVnDateTime } from '@/lib/booking/notify'
import MainHeader from '@/components/layout/MainHeader'
import FooterSection from '@/components/home/FooterSection'
import CourseProjectBadges from '@/components/course/CourseProjectBadges'
import CrmRequestButton from '@/components/crm/CrmRequestButton'
import OfferingLibrary from './OfferingLibrary'
import OfferingRichText from './OfferingRichText'

const panel = 'rounded-2xl border border-brk-outline bg-white p-5 sm:p-6'
const action =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brk-primary px-5 font-semibold text-white'
export default async function OfferingWorkspace({
  slug,
  group,
}: {
  slug: string
  group: Exclude<ProductGroup, 'COURSE'>
}) {
  let context
  try {
    context = await requireOfferingWorkspace(slug, group)
  } catch (error) {
    if (!(error instanceof WorkspaceError)) throw error
    if (error.status === 401) redirect('/login?callbackUrl=' + encodeURIComponent(offeringWorkspaceHref(group, slug)))
    if (error.status === 403) redirect(offeringHref(group, slug))
    notFound()
  }
  const { course, details, userId, profile } = context
  const layout = resolvedWorkspace(group, details)
  const has = (module: (typeof details.modules)[number]) => details.modules.includes(module)
  const [brand, projects, resources, bookings, bookingSession, delivery] = await Promise.all([
    getCurrentDeploymentBrand(),
    getPublicProjects(),
    has('resources') ? workspaceResources(course.id, details) : [],
    has('bookings') && group === 'SERVICE'
      ? prisma.booking.findMany({
          where: {
            userId,
            session: { courseId: course.id },
            status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] },
          },
          select: { id: true, startsAt: true, status: true, session: { select: { title: true, meetingUrl: true } } },
          orderBy: { startsAt: 'asc' },
        })
      : [],
    has('bookings') && group === 'SERVICE' && details.bookingCode
      ? prisma.bookingSession.findFirst({
          where: { courseId: course.id, code: details.bookingCode, status: 'ACTIVE' },
          select: { code: true },
        })
      : null,
    has('delivery') && group === 'SERVICE' ? readDelivery(course.id, userId) : null,
  ])
  const badges = projects
    .filter((project) => project.courseIds.includes(course.id))
    .map(({ slug, name, logo }) => ({ slug, name, logo }))
  const appUrl = details.accessUrl || details.resources.find((resource) => resource.kind === 'APP')?.url
  const visibleResources = layout === 'APP' ? resources.filter((resource) => resource.kind !== 'APP') : resources
  const showLibrary = has('resources') && (layout === 'LIBRARY' || visibleResources.length > 0)
  const showBookings = has('bookings') && group === 'SERVICE'
  const showDelivery = has('delivery') && group === 'SERVICE' && (layout === 'DELIVERY' || !!delivery)
  const navigation = [
    ...(layout === 'APP' ? [['ung-dung', 'Ứng dụng của tôi']] : []),
    ...(showLibrary ? [['tai-nguyen', 'Tài nguyên']] : []),
    ...(showBookings ? [['lich-hen', 'Lịch hẹn']] : []),
    ...(showDelivery ? [['ban-giao', 'Tiến độ & Bàn giao']] : []),
    ...(has('instructions') ? [['huong-dan', group === 'SERVICE' ? 'Chuẩn bị & Hướng dẫn' : 'Hướng dẫn']] : []),
    ...(has('conversation') ? [['trao-doi', 'Trao đổi & Hỗ trợ']] : []),
  ]
  const bookingLabels: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    COMPLETED: 'Hoàn thành',
    NO_SHOW: 'Vắng mặt',
    CANCELLED: 'Đã hủy',
  }
  return (
    <>
      {!brand && <MainHeader title={course.name_lop} profile={profile} />}
      <div className="bg-stone-50 text-brk-on-surface">
        <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-7 sm:px-6">
          <nav aria-label="Đường dẫn sử dụng" className="flex flex-wrap gap-2 text-sm text-brk-muted">
            <Link href={'/my-space?tab=' + (group === 'DIGITAL' ? 'products' : 'services')}>
              {group === 'DIGITAL' ? 'Sản phẩm đã mua' : 'Dịch vụ đã đặt'}
            </Link>
            <span>/</span>
            <span aria-current="page">{course.name_lop}</span>
          </nav>
          <header className="flex flex-wrap items-start justify-between gap-5">
            <div className="space-y-3">
              <CourseProjectBadges projects={badges} compact />
              <h1 className="text-3xl font-bold tracking-tight text-green-950 sm:text-4xl">{course.name_lop}</h1>
              <p className="text-sm text-brk-muted">
                {workspaceLayouts[layout]}
                {course.teacher?.name ? ' · ' + course.teacher.name : ''}
              </p>
            </div>
            <div className="space-y-3">
              <p className="flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-900">
                <CheckCircle2 className="h-4 w-4" />
                Quyền truy cập đang hoạt động
              </p>
              <Link
                href={offeringHref(group, slug)}
                className="flex min-h-11 items-center justify-end gap-2 text-sm font-semibold text-brk-primary"
              >
                Xem trang giới thiệu
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </header>
          <nav aria-label="Các mục sử dụng" className="flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2">
            {navigation.map(([id, label]) => (
              <a
                key={id}
                href={'#' + id}
                className="inline-flex min-h-12 shrink-0 items-center rounded-xl px-4 text-sm font-semibold text-brk-primary hover:bg-green-50"
              >
                {label}
              </a>
            ))}
          </nav>
          {layout === 'APP' && (
            <section id="ung-dung" className={panel + ' scroll-mt-28'}>
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <Package className="mb-3 h-9 w-9 text-brk-primary" />
                  <h2 className="text-2xl font-bold">Ứng dụng của bạn</h2>
                  <p className="mt-2 text-sm text-brk-muted">
                    {details.accessDays
                      ? `Quyền mở trên Wi300: ${details.accessDays} ngày từ khi kích hoạt.`
                      : 'Quyền mở trên Wi300 không giới hạn thời gian.'}
                  </p>
                  {details.platform && <p className="mt-2 text-sm text-brk-muted">Nền tảng: {details.platform}</p>}
                </div>
                {appUrl ? (
                  <a href={appUrl} target="_blank" rel="noopener noreferrer" className={action}>
                    Mở ứng dụng
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : (
                  <p className="text-sm text-brk-muted">Đơn vị cung cấp đang cập nhật cách truy cập App.</p>
                )}
              </div>
              <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-brk-muted">
                Ứng dụng mở theo cơ chế truy cập của nhà cung cấp. Nếu cần tài khoản hoặc mã bản quyền riêng, hãy xem
                hướng dẫn hoặc gửi yêu cầu hỗ trợ.
              </p>
            </section>
          )}
          {showBookings && (
            <section id="lich-hen" className="scroll-mt-28 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-green-950">Lịch đồng hành của bạn</h2>
                {bookingSession && (
                  <Link href={'/dat-lich/' + encodeURIComponent(bookingSession.code)} className={action}>
                    <CalendarDays className="h-5 w-5" />
                    Chọn lịch hẹn
                  </Link>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Hình thức', modeLabels[details.mode]],
                  ['Thời lượng', `${details.sessions} buổi · ${details.durationMin} phút/buổi`],
                  ['Đã hoàn thành', `${bookings.filter((booking) => booking.status === 'COMPLETED').length} buổi`],
                ].map(([label, value]) => (
                  <div key={label} className={panel}>
                    <p className="text-sm text-brk-muted">{label}</p>
                    <p className="mt-2 font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div className={panel}>
                {bookings.length ? (
                  <ul className="divide-y">
                    {bookings.map((booking) => (
                      <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div>
                          <h3 className="font-semibold">{booking.session.title}</h3>
                          <p className="mt-1 text-sm text-brk-muted">
                            {formatVnDateTime(booking.startsAt)} · {bookingLabels[booking.status]}
                          </p>
                        </div>
                        {booking.status === 'CONFIRMED' && /^https:\/\//i.test(booking.session.meetingUrl || '') && (
                          <a
                            href={booking.session.meetingUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={action}
                          >
                            Vào buổi hẹn
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-brk-muted">
                    Chưa có lịch hẹn trong dịch vụ này.
                    {!bookingSession && ' Gửi yêu cầu đồng hành để thống nhất lịch với người phụ trách.'}
                  </p>
                )}
                <Link
                  href="/my-requests"
                  className="mt-4 inline-flex min-h-11 items-center font-semibold text-brk-primary"
                >
                  Xem lịch đã đặt / yêu cầu đổi lịch →
                </Link>
              </div>
            </section>
          )}
          {showDelivery && (
            <section id="ban-giao" className="scroll-mt-28 space-y-4">
              <h2 className="text-2xl font-bold text-green-950">Tiến độ & Kết quả bàn giao</h2>
              {delivery ? (
                <>
                  <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Object.entries(deliveryPhaseLabels).map(([phase, label]) => (
                      <li
                        key={phase}
                        aria-current={phase === delivery.phase ? 'step' : undefined}
                        className={`rounded-xl border p-4 text-sm font-semibold ${phase === delivery.phase ? 'border-green-600 bg-green-100 text-green-950' : 'bg-white text-brk-muted'}`}
                      >
                        {label}
                      </li>
                    ))}
                  </ol>
                  {delivery.note && (
                    <div className={panel}>
                      <h3 className="mb-3 font-bold">Cập nhật từ người phụ trách</h3>
                      <OfferingRichText text={delivery.note} />
                    </div>
                  )}
                  <div className={panel}>
                    <h3 className="mb-4 font-bold">Bản bàn giao cho bạn</h3>
                    {delivery.files.length ? (
                      <ul className="space-y-3">
                        {delivery.files.map((file, index) => (
                          <li key={index}>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex min-h-12 items-center justify-between gap-3 rounded-xl border p-3 font-semibold text-brk-primary"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <FileText className="h-5 w-5 shrink-0" />
                                {file.title}
                              </span>
                              <ArrowUpRight className="h-4 w-4 shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-brk-muted">Người phụ trách chưa thêm bản bàn giao.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className={panel + ' text-brk-muted'}>
                  Người phụ trách chưa cập nhật tiến độ riêng cho bạn. Các thông tin bàn giao sẽ xuất hiện tại đây khi
                  được cung cấp.
                </p>
              )}
            </section>
          )}
          {showLibrary && <OfferingLibrary key={course.id + ':' + userId} slug={slug} resources={visibleResources} />}
          {has('instructions') && (
            <section id="huong-dan" className={panel + ' scroll-mt-28'}>
              <h2 className="mb-4 text-2xl font-bold text-green-950">
                {group === 'SERVICE' ? 'Chuẩn bị & Hướng dẫn' : 'Hướng dẫn sử dụng'}
              </h2>
              <OfferingRichText
                text={
                  details.instructions ||
                  'Chọn tài nguyên hoặc mở ứng dụng để bắt đầu. Nếu cần hướng dẫn thêm, hãy liên hệ người phụ trách.'
                }
              />
              {details.agenda.length > 0 && (
                <div className="mt-5 divide-y">
                  {details.agenda.map((item, index) => (
                    <details key={index} className="py-2">
                      <summary className="min-h-12 cursor-pointer py-3 font-semibold">{item.title}</summary>
                      <OfferingRichText text={item.description} />
                    </details>
                  ))}
                </div>
              )}
            </section>
          )}
          {has('conversation') && (
            <section id="trao-doi" className={panel + ' scroll-mt-28'}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold">
                    <LifeBuoy className="h-6 w-6 text-brk-primary" />
                    Trao đổi với người phụ trách
                  </h2>
                  <p className="mt-2 text-sm text-brk-muted">
                    Gửi thông tin chuẩn bị, phản hồi hoặc yêu cầu hỗ trợ gắn với {groupInfo[group].singular} này.
                  </p>
                </div>
                <CrmRequestButton
                  courseId={course.id}
                  courseTitle={course.name_lop}
                  signedIn
                  learning
                  subjectLabel={groupInfo[group].label}
                  actionLabel="Gửi phản hồi / Hỗ trợ"
                />
              </div>
              <Link
                href="/my-requests"
                className="mt-3 inline-flex min-h-11 items-center font-semibold text-brk-primary"
              >
                Theo dõi trao đổi và phản hồi →
              </Link>
            </section>
          )}
        </main>
      </div>
      {!brand && <FooterSection profile={profile || {}} />}
    </>
  )
}
