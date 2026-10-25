import { Metadata } from 'next'
import { cache } from 'react'
import { getSession } from '@/lib/get-session'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { CourseLandingClient } from '@/components/landing/LandingPageClient'
import { getPublishedCoursePageBySlug } from '@/app/actions/course-page-actions'
import CoursePageView from '@/components/course-page/CoursePageView'
import NotificationLessonEntry from '@/components/course/NotificationLessonEntry'
import { requireDomainCourse } from '@/lib/website/domain-context'
import { canProfileAccessCourse, getCurrentSiteProfile } from '@/lib/site-profile/runtime'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import Wi300Header from '@/components/wi300/Wi300Header'
import Wi300Breadcrumb from '@/components/wi300/Wi300Breadcrumb'
import { courseLoadingPlan } from '@/lib/course-page/loading-plan'
import { getCoursePublicExtras } from '@/lib/course-page/public-extras'
import { getPublicProjects } from '@/lib/wi300/public-projects'
import CourseProjectBadges from '@/components/course/CourseProjectBadges'

// Dùng chung kiểm tra phạm vi trong metadata và nội dung của cùng request.
const getPageProfile = cache(getCurrentSiteProfile)
const canAccessPageCourse = cache(canProfileAccessCourse)

interface PageProps {
    params: Promise<{ id: string }>
    searchParams?: Promise<{ notificationLesson?: string | string[] }>
}

// [OPTIMIZE] cache() giúp generateMetadata và component trang dùng chung 1 lần
// query thay vì mỗi bên tự query lại cùng 1 row Course (được gọi 2 lần/request).
const getCourseByIdKhoa = cache((idKhoa: string) =>
    prisma.course.findUnique({
        where: { id_khoa: idKhoa },
        include: { teacherBankAccount: true }
    })
)

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    let { id } = await params
    id = id.replace(/\$+$/, '')
    await requireDomainCourse(id)

    const course = await getCourseByIdKhoa(id)

    if (!course) return { title: 'Không tìm thấy khóa học' }

    const siteProfile = await getPageProfile()
    if (siteProfile && !(await canAccessPageCourse(siteProfile, course.id))) {
        return { title: 'Không tìm thấy khóa học' }
    }

    const brand = await getCurrentDeploymentBrand()
    const defaultDescription = brand?.description || siteProfile?.metaDescription || siteProfile?.subtitle || undefined
    const defaultImage = brand?.ogImageUrl || siteProfile?.metaImage || siteProfile?.heroImage || '/og-image.png'
    const courseImg = course.link_anh_bia || (course as any).link_anh_bia_khoa

    // Check if dynamic course page exists
    const coursePage = await prisma.coursePage.findFirst({
        where: { slug: id, status: 'published' }
    })

    if (coursePage) {
        const seo = (coursePage.seo as any) || {}
        return {
            title: seo.title || course.name_lop,
            description: seo.description || course.mo_ta_ngan || defaultDescription,
            openGraph: {
                title: seo.title || course.name_lop,
                description: seo.description || course.mo_ta_ngan || defaultDescription,
                images: seo.image ? [seo.image] : [courseImg || defaultImage],
            },
            twitter: {
                card: 'summary_large_image',
                title: seo.title || course.name_lop,
                description: seo.description || course.mo_ta_ngan || defaultDescription,
                images: seo.image ? [seo.image] : [courseImg || defaultImage],
            }
        }
    }

    return {
        title: course.name_lop,
        description: course.mo_ta_ngan || defaultDescription,
        openGraph: {
            title: course.name_lop,
            description: course.mo_ta_ngan || defaultDescription,
            images: courseImg ? [courseImg] : [defaultImage],
        },
        twitter: {
            card: 'summary_large_image',
            title: course.name_lop,
            description: course.mo_ta_ngan || defaultDescription,
            images: courseImg ? [courseImg] : [defaultImage],
        },
    }
}

export default async function KhoaHocPage({ params, searchParams }: PageProps) {
    let { id } = await params
    await requireDomainCourse(id.replace(/\$+$/, ''))

    id = id.replace(/\$+$/, '')

    // Dữ liệu công khai và phiên của request độc lập; không cache phiên/người học chung.
    const [course, siteProfile, session, publishedPage, deploymentBrand, requestSearch] = await Promise.all([
        getCourseByIdKhoa(id), getPageProfile(), getSession(), getPublishedCoursePageBySlug(id),
        getCurrentDeploymentBrand(), searchParams || Promise.resolve(undefined),
    ])

    if (!course) notFound()
    if (siteProfile && !(await canAccessPageCourse(siteProfile, course.id))) notFound()

    const courseId = course.id
    const userId = session?.user?.id ? parseInt(session.user.id) : null
    const requestedLesson = requestSearch?.notificationLesson
    const loadPlan = courseLoadingPlan(publishedPage, !!deploymentBrand, requestedLesson)

    // [OPTIMIZE] Các truy vấn dưới đây độc lập với nhau — chạy song song
    // thay vì tuần tự để giảm tổng thời gian chờ của trang bán khóa học.
    // Riêng dữ liệu công khai của khóa (bài học, thống kê, testimonials) đi qua
    // getCoursePublicExtras đã cache 300s; enrollment và SĐT vẫn tươi theo phiên.
    const [
        userRow,
        enrollment,
        extras,
        coursePage,
        projectBadges
    ] = await Promise.all([
        userId
            ? prisma.user.findUnique({ where: { id: userId }, select: { phone: true } })
            : Promise.resolve(null),
        userId
            ? prisma.enrollment.findFirst({ where: { userId, courseId } })
            : Promise.resolve(null),
        getCoursePublicExtras(courseId, loadPlan.lessons, loadPlan.statistics, loadPlan.testimonials),
        Promise.resolve(publishedPage),
        // Chỉ lấy dự án công khai sau khi đã kiểm tra phạm vi khóa học.
        deploymentBrand ? getPublicProjects()
            .then(projects => projects.filter(project => project.courseIds.includes(courseId)).map(({ slug, name, logo }) => ({ slug, name, logo })))
            .catch(error => { console.error('[Course projects]', error instanceof Error ? error.name : 'Unknown'); return [] })
            : Promise.resolve([])
    ])

    const userPhone = userRow?.phone || null
    const lessons = extras.lessons
    const totalHours = extras.totalHours
    const activeStudentCount = extras.activeStudentCount
    const testimonials = extras.testimonials

    // Chỉ tự mở bài từ thông báo khi bài đó thực sự thuộc khóa học này.
    const notificationEntry = typeof requestedLesson === 'string'
        && lessons.some(lesson => lesson.id === requestedLesson)
        ? <NotificationLessonEntry courseSlug={course.id_khoa} lessonId={requestedLesson} />
        : null

    // Course page hiển thị hoàn toàn theo dữ liệu đã publish trong DB.
    const effectiveCoursePage = coursePage
    const projectLabels = projectBadges.length ? <CourseProjectBadges projects={projectBadges} showAll compact /> : undefined
    const customWi300Page = !!deploymentBrand && effectiveCoursePage?.useTemplate !== false
        && (effectiveCoursePage?.theme as { importedLayout?: boolean } | undefined)?.importedLayout === true
    // Mẫu HTML sở hữu giao diện bên trong, nhưng trang hệ thống vẫn cần header.
    // Gộp dự án vào breadcrumb để không chèn thêm một dải trước landing page.
    const breadcrumb = deploymentBrand ? <Wi300Breadcrumb title={course.name_lop} projectLabels={customWi300Page ? projectLabels : undefined} /> : undefined

    // Giữ dữ liệu đã publish; chỉ bỏ phần thống kê mà mẫu ZIP không dùng.
    if (effectiveCoursePage && (effectiveCoursePage as any).useTemplate !== false) {
        return (
            <>
                {notificationEntry}
                {customWi300Page && <Wi300Header />}
                <CoursePageView
                    wi300Breadcrumb={breadcrumb}
                    projectLabels={customWi300Page ? undefined : projectLabels}
                    coursePage={effectiveCoursePage as any}
                    course={course}
                    enrollment={enrollment}
                    userPhone={userPhone}
                    userId={userId}
                    session={session}
                    lessons={lessons}
                    testimonials={testimonials}
                    totalHours={totalHours}
                    activeStudentCount={activeStudentCount}
                />
            </>
        )
    }

    return (
        <>
            {notificationEntry}
            {deploymentBrand && <Wi300Header />}
            {breadcrumb}
            <CourseLandingClient
                projectLabels={projectLabels}
                course={course}
                lessons={lessons}
                testimonials={testimonials}
                enrollment={enrollment}
                userPhone={userPhone}
                userId={userId}
                session={session}
                totalHours={totalHours}
                activeStudentCount={activeStudentCount}
            />
        </>
    )
}
