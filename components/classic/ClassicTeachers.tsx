import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import MainHeader from '@/components/layout/MainHeader'
import FooterSection from '@/components/home/FooterSection'
import prisma from '@/lib/prisma'
import { getCoursesForProfile } from '@/app/actions/site-profile-actions'
import { getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'
import { teacherProfileKey, teacherProfileSchema } from '@/lib/wi300/teacher-profile'
import { canCreateProfile } from '@/lib/auth/roles'
import { FALLBACK_PROFILE } from '@/lib/db-fallback'

/**
 * Bản classic (giautoandien) của các trang giảng viên.
 * Dữ liệu dùng chung với bản wi300: khóa học theo phạm vi SiteProfile
 * (getCoursesForProfile / getCourseWhereForProfile) và hồ sơ giảng viên
 * lưu ở SystemConfig (teacherProfileKey). Khác biệt duy nhất: bản classic
 * không áp bộ lọc hiển thị riêng của wi300 (wi300CoursePreferences).
 */

type ClassicTeacher = { id: number; name: string; image: string | null; count: number; fields: string[] }

async function loadClassicTeachers(): Promise<ClassicTeacher[]> {
  const profile = await getCurrentSiteProfile()
  const safeProfile = profile || FALLBACK_PROFILE
  const courses = await getCoursesForProfile(safeProfile as any)
  // Gom giảng viên từ danh mục khóa học, giống cách bản wi300 gom theo mã tài khoản.
  const teacherMap = new Map<number, ClassicTeacher>()
  for (const course of Array.isArray(courses) ? courses : []) {
    const name = (course as any).teacher?.name?.trim()
    const teacherId = (course as any).teacherId
    if (teacherId == null || !name) continue
    const category = (course as any).courseCategory?.name || (course as any).category || ''
    const current = teacherMap.get(teacherId)
    if (current) {
      current.count += 1
      if (category && !current.fields.includes(category)) current.fields.push(category)
    } else {
      teacherMap.set(teacherId, { id: teacherId, name, image: null, count: 1, fields: category ? [category] : [] })
    }
  }
  const teachers = [...teacherMap.values()]
  if (teachers.length) {
    // Ảnh đại diện không nằm trong dữ liệu khóa học; lấy thêm từ tài khoản giảng viên.
    const users = await prisma.user.findMany({ where: { id: { in: teachers.map(t => t.id) } }, select: { id: true, image: true } })
    const images = new Map(users.map(user => [user.id, user.image]))
    for (const teacher of teachers) teacher.image = images.get(teacher.id) || null
  }
  return teachers.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'))
}

export async function ClassicTeachersPage() {
  const profile = await getCurrentSiteProfile()
  const safeProfile = profile || FALLBACK_PROFILE
  const teachers = await loadClassicTeachers()
  return (
    <main className="min-h-screen" style={{ backgroundColor: (safeProfile as any).backgroundColor || undefined }}>
      <MainHeader title="ĐỘI NGŨ GIẢNG VIÊN" profile={profile} />
      <section className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-brk-on-surface">Đội ngũ giảng viên</h1>
        <p className="mt-2 text-brk-muted">Những người chia sẻ tri thức trong cộng đồng.</p>
        {teachers.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map(teacher => (
              <Link key={teacher.id} href={`/giang-vien/${teacher.id}`} className="flex items-center gap-4 rounded-2xl border border-brk-outline bg-brk-surface p-5 shadow-sm transition-shadow hover:shadow-md">
                {teacher.image
                  ? <Image src={teacher.image} alt="" width={72} height={72} unoptimized className="h-18 w-18 shrink-0 rounded-full object-cover" />
                  : <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brk-primary/10 text-2xl font-bold text-brk-primary">{teacher.name.charAt(0)}</span>}
                <span className="min-w-0">
                  <span className="block truncate text-lg font-bold text-brk-on-surface">{teacher.name}</span>
                  <span className="mt-1 block text-sm text-brk-muted">{teacher.count} khóa học</span>
                  {teacher.fields.length > 0 && <span className="mt-1 block truncate text-sm text-brk-primary">{teacher.fields.join(' · ')}</span>}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">Chưa có giảng viên nào có khóa học công khai.</p>
        )}
      </section>
      <FooterSection profile={safeProfile as any} />
    </main>
  )
}

/**
 * Đọc hồ sơ giảng viên cho bản classic. Giữ nguyên điều kiện nghiệp vụ
 * của bản wi300: mã hợp lệ, tài khoản có quyền tạo hồ sơ và có ít nhất
 * một khóa công khai trong phạm vi website hiện tại.
 */
export async function loadClassicTeacher(raw: string) {
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) return null
  const id = Number(raw)
  const scope = await getCurrentSiteProfile()
  const where = { AND: [getCourseWhereForProfile(scope || { userId: 0 }), { teacherId: id }] }
  const [user, courses, row] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { name: true, image: true, role: true, siteProfile: { select: { slug: true, isActive: true } } } }),
    prisma.course.findMany({ where, take: 13, orderBy: { updatedAt: 'desc' }, select: { id: true, id_khoa: true, name_lop: true, mo_ta_ngan: true, link_anh_bia: true, courseCategory: { select: { name: true } } } }),
    prisma.systemConfig.findUnique({ where: { key: teacherProfileKey(id) } }),
  ])
  if (!user || !canCreateProfile(user.role) || !courses.length) return null
  const parsed = teacherProfileSchema.safeParse(row?.value || {})
  return { user, courses, profile: parsed.success ? parsed.data : teacherProfileSchema.parse({}) }
}

export async function ClassicTeacherDetailPage({ id }: { id: string }) {
  const data = await loadClassicTeacher(id)
  if (!data) notFound()
  const { user, courses, profile } = data
  const siteProfile = await getCurrentSiteProfile()
  const safeProfile = siteProfile || FALLBACK_PROFILE
  const fields = profile.fields.length ? profile.fields : [...new Set(courses.map(course => course.courseCategory?.name).filter((name): name is string => !!name))]
  const website = profile.website || (user.siteProfile?.isActive ? `/page/${encodeURIComponent(user.siteProfile.slug)}` : '')
  return (
    <main className="min-h-screen" style={{ backgroundColor: (safeProfile as any).backgroundColor || undefined }}>
      <MainHeader title="GIẢNG VIÊN" profile={siteProfile} />
      <div className="container mx-auto space-y-8 px-4 py-10">
        <nav aria-label="Đường dẫn" className="flex flex-wrap gap-2 text-sm text-brk-muted"><Link href="/" className="text-brk-primary">Trang chủ</Link><span>/</span><Link href="/giang-vien" className="text-brk-primary">Giảng viên</Link><span>/</span><span aria-current="page">{user.name || 'Giảng viên'}</span></nav>
        <section className="grid items-center gap-6 rounded-[2rem] border border-brk-outline bg-brk-surface p-6 shadow-xl sm:p-9 md:grid-cols-[200px_1fr]">
          {user.image ? <Image src={user.image} alt={user.name || 'Giảng viên'} width={200} height={200} unoptimized className="mx-auto aspect-square w-40 rounded-full object-cover md:w-48" /> : <div aria-hidden="true" className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-brk-primary/10 text-5xl font-bold text-brk-primary">{user.name?.charAt(0) || 'G'}</div>}
          <div className="min-w-0"><p className="text-sm font-semibold text-brk-primary">Giảng viên</p><h1 className="mt-2 break-words text-3xl font-black text-brk-on-surface sm:text-4xl">{user.name || 'Giảng viên'}</h1>{profile.headline && <p className="mt-3 leading-7 text-brk-muted">{profile.headline}</p>}<ul className="mt-4 flex flex-wrap gap-2">{fields.map(field => <li key={field} className="rounded-full bg-brk-background px-3 py-2 text-sm text-brk-on-surface">{field}</li>)}</ul><div className="mt-6 flex flex-wrap gap-3"><Link href="#khoa-hoc-giang-vien" className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-brk-on-primary">Xem khóa học</Link>{website && <Link href={website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-xl border border-brk-outline bg-brk-surface px-5 font-semibold text-brk-primary">Website cá nhân ↗</Link>}</div></div>
        </section>
        {profile.introduction && <section className="rounded-2xl border border-brk-outline bg-brk-surface p-5 shadow-sm"><h2 className="text-xl font-bold text-brk-on-surface">Giới thiệu giảng viên</h2><p className="mt-4 whitespace-pre-line break-words leading-7 text-brk-muted">{profile.introduction}</p></section>}
        <section id="khoa-hoc-giang-vien" className="scroll-mt-28"><h2 className="mb-5 text-2xl font-black text-brk-on-surface">Khóa học của giảng viên</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{courses.slice(0, 12).map(course => <Link key={course.id} href={`/khoa-hoc/${encodeURIComponent(course.id_khoa)}`} className="overflow-hidden rounded-2xl border border-brk-outline bg-brk-surface shadow-sm focus-visible:outline-2 focus-visible:outline-brk-primary">{course.link_anh_bia && <Image src={course.link_anh_bia} alt="" width={400} height={225} unoptimized loading="lazy" className="aspect-video w-full object-cover" />}<div className="space-y-3 p-4"><h3 className="font-bold text-brk-on-surface">{course.name_lop}</h3>{course.mo_ta_ngan && <p className="line-clamp-3 text-sm leading-6 text-brk-muted">{course.mo_ta_ngan.replace(/<[^>]*>/g, '')}</p>}<span className="inline-flex min-h-11 items-center text-sm font-semibold text-brk-primary">Xem khóa học →</span></div></Link>)}</div>{courses.length > 12 && <Link href={`/khoa-hoc?teacher=${id}`} className="mt-5 inline-flex min-h-11 items-center font-semibold text-brk-primary">Xem tất cả khóa học của giảng viên →</Link>}</section>
      </div>
      <FooterSection profile={safeProfile as any} />
    </main>
  )
}
