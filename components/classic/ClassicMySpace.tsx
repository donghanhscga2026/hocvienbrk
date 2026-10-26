import Link from 'next/link'
import Image from 'next/image'
import MainHeader from '@/components/layout/MainHeader'
import FooterSection from '@/components/home/FooterSection'
import prisma from '@/lib/prisma'
import { getCoursesForProfile } from '@/app/actions/site-profile-actions'
import { getCurrentSiteProfile } from '@/lib/site-profile/runtime'
import { canTeach, spaceNavigation, type PersonalTool } from '@/lib/wi300/personal-space'
import { FALLBACK_PROFILE } from '@/lib/db-fallback'

/**
 * Bản classic (giautoandien) của trang cá nhân /my-space.
 * Dữ liệu dùng chung với bản wi300: spaceNavigation (lib/wi300/personal-space)
 * quyết định nhóm/mục theo vai trò và danh sách công cụ, dữ liệu học tập lấy
 * từ enrollment + getCoursesForProfile như trang chủ classic. Chỉ khác khung
 * hiển thị. Các mục trỏ tới trang thuần wi300 (quản trị website Wi, quản lý
 * dự án Wi) không hiển thị ở bản classic.
 */
const WI300_ONLY_HREF = /^\/(?:tools\/wi-|du-an\/)/
const WI300_ONLY_GROUPS = new Set(['website-admin'])

export default async function ClassicMySpace({ session, tab, status }: { session: any; tab?: string; status?: string }) {
  const userId = session?.user?.id != null ? Number(session.user.id) : NaN
  if (!Number.isSafeInteger(userId) || userId < 0) return null
  const role = session?.user?.role || 'STUDENT'
  const profile = await getCurrentSiteProfile()
  const safeProfile: any = profile || FALLBACK_PROFILE

  const [tools, enrollments, teachingCourses] = await Promise.all([
    prisma.tool.findMany({ where: { isActive: true }, orderBy: { order: 'asc' }, select: { id: true, slug: true, name: true, url: true, roles: true, isActive: true, icon: true, description: true } }).catch(() => [] as any[]),
    prisma.enrollment.findMany({
      where: { userId },
      select: {
        id: true, courseId: true, status: true, startedAt: true,
        payment: { select: { id: true, status: true, proofImage: true, amount: true } },
        course: { select: { _count: { select: { lessons: true } } } },
        _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } },
      },
    }).catch(() => [] as any[]),
    canTeach(role)
      ? prisma.course.findMany({ where: { teacherId: userId }, select: { id: true, id_khoa: true, name_lop: true, link_anh_bia: true, status: true, updatedAt: true, _count: { select: { enrollments: true } } }, orderBy: { updatedAt: 'desc' }, take: 12 }).catch(() => [] as any[])
      : Promise.resolve([] as any[]),
  ])

  const groups = spaceNavigation(role, tools as PersonalTool[])
    .filter(group => !WI300_ONLY_GROUPS.has(group.id))
    .map(group => ({ ...group, items: group.items.filter(item => !WI300_ONLY_HREF.test(item.href)) }))
  const activeTab = tab === 'pages' ? 'business' : groups.some(group => group.id === tab) ? tab! : 'home'
  const activeGroup = groups.find(group => group.id === activeTab)

  const courses = await getCoursesForProfile(safeProfile)
  const courseById = new Map((Array.isArray(courses) ? courses : []).map((course: any) => [course.id, course]))
  const myEnrollments = (enrollments as any[]).filter(e => courseById.has(e.courseId))
  const active = myEnrollments.filter(e => e.status === 'ACTIVE')
  const completed = myEnrollments.filter(e => e.status === 'COMPLETED')
  const pending = myEnrollments.filter(e => e.status !== 'ACTIVE' && e.status !== 'COMPLETED')
  const learningList = status === 'active' ? active : status === 'completed' ? completed : status === 'pending' ? pending : myEnrollments

  const courseCard = (enrollment: any) => {
    const course = courseById.get(enrollment.courseId)
    if (!course) return null
    const total = enrollment.course?._count?.lessons || 0
    const done = enrollment._count?.lessonProgress || 0
    return (
      <Link key={enrollment.id} href={`/khoa-hoc/${encodeURIComponent(course.id_khoa)}`} className="overflow-hidden rounded-2xl border border-brk-outline bg-brk-surface shadow-sm hover:shadow-md">
        {course.link_anh_bia && <Image src={course.link_anh_bia} alt="" width={600} height={340} unoptimized loading="lazy" className="aspect-video w-full object-cover" />}
        <div className="space-y-2 p-5">
          <h3 className="break-words text-lg font-bold text-brk-on-surface">{course.name_lop}</h3>
          <p className="text-sm text-brk-muted">{enrollment.status === 'ACTIVE' ? `Đã học ${done}/${total} bài` : enrollment.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đang chờ xử lý'}</p>
          <p className="text-sm font-semibold text-brk-primary">Vào học →</p>
        </div>
      </Link>
    )
  }
  const itemCards = (group: (typeof groups)[number]) => (
    group.items.length ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.items.map(item => (
          <Link key={item.href + item.label} href={item.href} className="rounded-2xl border border-brk-outline bg-brk-surface p-5 shadow-sm hover:shadow-md">
            <span className="font-bold text-brk-on-surface">{item.label}</span>
            <span className="mt-2 block text-sm font-semibold text-brk-primary">Mở →</span>
          </Link>
        ))}
      </div>
    ) : <p className="rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">Chưa có mục nào trong nhóm này.</p>
  )

  return (
    <main className="min-h-screen" style={{ backgroundColor: safeProfile.backgroundColor || undefined }}>
      <MainHeader title="KHÔNG GIAN CỦA TÔI" profile={profile} />
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-brk-on-surface">Không gian của tôi</h1>
        <p className="mt-2 text-brk-muted">Xin chào {session?.user?.name || 'bạn'} — học tập, giảng dạy và công cụ của bạn ở một nơi.</p>

        <nav aria-label="Khu vực cá nhân" className="mt-8 flex flex-wrap gap-2">
          {groups.map(group => (
            <Link key={group.id} href={group.href} aria-current={activeTab === group.id ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${activeTab === group.id ? 'bg-brk-primary text-brk-on-primary border-brk-primary' : 'border-brk-outline bg-brk-surface text-brk-on-surface'}`}>{group.label}</Link>
          ))}
        </nav>

        <div className="mt-8">
          {activeTab === 'home' && (
            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-brk-outline bg-brk-surface p-4 text-center shadow-sm"><p className="text-2xl font-black text-brk-on-surface">{active.length}</p><p className="mt-1 text-xs text-brk-muted">Khóa đang học</p></div>
                <div className="rounded-2xl border border-brk-outline bg-brk-surface p-4 text-center shadow-sm"><p className="text-2xl font-black text-brk-on-surface">{completed.length}</p><p className="mt-1 text-xs text-brk-muted">Khóa đã hoàn thành</p></div>
                <div className="rounded-2xl border border-brk-outline bg-brk-surface p-4 text-center shadow-sm"><p className="text-2xl font-black text-brk-on-surface">{pending.length}</p><p className="mt-1 text-xs text-brk-muted">Đăng ký chờ xử lý</p></div>
              </div>
              {active.length > 0 && <section><h2 className="mb-4 text-xl font-black text-brk-on-surface">Đang học gần đây</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{active.slice(0, 3).map(courseCard)}</div><Link href="/my-space?tab=learning" className="mt-4 inline-flex min-h-11 items-center font-semibold text-brk-primary">Xem tất cả khóa học →</Link></section>}
              <section><h2 className="mb-4 text-xl font-black text-brk-on-surface">Lối tắt</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groups.filter(group => group.id !== 'home').map(group => (
                    <Link key={group.id} href={group.href} className="rounded-2xl border border-brk-outline bg-brk-surface p-5 shadow-sm hover:shadow-md">
                      <span className="font-bold text-brk-on-surface">{group.label}</span>
                      <span className="mt-2 block text-sm text-brk-muted">{group.items.slice(0, 3).map(item => item.label).join(' · ') || 'Mở khu vực'}</span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'learning' && (
            <section>
              <div className="mb-5 flex flex-wrap gap-2">
                {[['', 'Tất cả'], ['active', 'Đang học'], ['completed', 'Đã hoàn thành'], ['pending', 'Chờ xử lý']].map(([value, label]) => (
                  <Link key={value || 'all'} href={value ? `/my-space?tab=learning&status=${value}` : '/my-space?tab=learning'} aria-current={status === value || (!status && !value) ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${(status || '') === value ? 'bg-brk-primary text-brk-on-primary border-brk-primary' : 'border-brk-outline bg-brk-surface text-brk-on-surface'}`}>{label}</Link>
                ))}
              </div>
              {learningList.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{learningList.map(courseCard)}</div> : <p className="rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">Chưa có khóa học nào ở mục này.</p>}
            </section>
          )}

          {activeTab === 'teaching' && (
            <section>
              {teachingCourses.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(teachingCourses as any[]).map(course => (
                <Link key={course.id} href={`/khoa-hoc/${encodeURIComponent(course.id_khoa)}`} className="overflow-hidden rounded-2xl border border-brk-outline bg-brk-surface shadow-sm hover:shadow-md">
                  {course.link_anh_bia && <Image src={course.link_anh_bia} alt="" width={600} height={340} unoptimized loading="lazy" className="aspect-video w-full object-cover" />}
                  <div className="space-y-2 p-5"><h3 className="break-words text-lg font-bold text-brk-on-surface">{course.name_lop}</h3><p className="text-sm text-brk-muted">{course._count?.enrollments || 0} học viên ghi danh</p><p className="text-sm font-semibold text-brk-primary">Xem khóa học →</p></div>
                </Link>
              ))}</div> : <p className="rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">Bạn chưa có khóa học giảng dạy nào.</p>}
              {activeGroup && <div className="mt-8">{itemCards(activeGroup)}</div>}
            </section>
          )}

          {activeTab !== 'home' && activeTab !== 'learning' && activeTab !== 'teaching' && activeGroup && (
            <section>
              {activeTab === 'affiliate' && <p className="mb-5 max-w-3xl leading-7 text-brk-muted">Chương trình cộng tác viên: chia sẻ link giới thiệu và theo dõi hoa hồng của bạn.</p>}
              {itemCards(activeGroup)}
            </section>
          )}
        </div>
      </div>
      <FooterSection profile={safeProfile} />
    </main>
  )
}
