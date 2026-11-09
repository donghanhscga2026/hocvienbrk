import { Metadata } from 'next'
import { cache } from 'react'
import { getSession } from '@/lib/get-session'
import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
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
import OfferingDetail from '@/components/offerings/OfferingDetail'
import { readOfferingDetails, getOfferingSalesCourse } from '@/lib/offerings/server'
import { publicOfferingDetails, offeringHref, type ProductGroup } from '@/lib/offerings/shared'
import { cohortNumberOf, cohortShortLabel, type CohortLink } from '@/lib/cohort'
import CohortPicker from '@/components/course/CohortPicker'
import { courseSalesContentKey, parseCourseSalesContent, type CourseSalesContent } from '@/lib/course-sales-content'

// Dùng chung kiểm tra phạm vi trong metadata và nội dung của cùng request.
const getPageProfile = cache(getCurrentSiteProfile)
const canAccessPageCourse = cache(canProfileAccessCourse)

export interface SalesPageProps {
    expectedGroup?: ProductGroup
    canonicalCourseRoute?: boolean
    params: Promise<{ id: string }>
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}

// [OPTIMIZE] cache() giúp generateMetadata và component trang dùng chung 1 lần
// query thay vì mỗi bên tự query lại cùng 1 row Course (được gọi 2 lần/request).
const getCourseByIdKhoa = cache((idKhoa: string) =>
    prisma.course.findUnique({
        where: { id_khoa: idKhoa },
        include: { teacherBankAccount: true }
    })
)

export async function generateSalesMetadata({ params, expectedGroup }: SalesPageProps): Promise<Metadata> {
    let { id } = await params
    id = id.replace(/\$+$/, '')
    await requireDomainCourse(id)

    const course = await (expectedGroup && expectedGroup !== 'COURSE' ? getOfferingSalesCourse(id) : getCourseByIdKhoa(id))

    if (!course || (expectedGroup && course.productGroup !== expectedGroup)) return { title: 'Không tìm thấy nội dung' }

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
        where: { slug: id, status: 'published' }, select: { seo: true }
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

export default async function CourseSalesPage({ params, searchParams, expectedGroup, canonicalCourseRoute = false }: SalesPageProps) {
    let { id } = await params
    await requireDomainCourse(id.replace(/\$+$/, ''))

    id = id.replace(/\$+$/, '')

    // Dữ liệu công khai và phiên của request độc lập; không cache phiên/người học chung.
    const [course, siteProfile, session, publishedPage, deploymentBrand, requestSearch] = await Promise.all([
        getCourseByIdKhoa(id), getPageProfile(), getSession(), getPublishedCoursePageBySlug(id),
        getCurrentDeploymentBrand(), searchParams || Promise.resolve(undefined),
    ])

    if (!course || (expectedGroup && course.productGroup !== expectedGroup)) notFound()
    if (canonicalCourseRoute && course.productGroup !== 'COURSE') {
        const query = new URLSearchParams()
        for (const [key, value] of Object.entries(requestSearch || {})) {
            if (Array.isArray(value)) value.forEach(item => query.append(key, item))
            else if (value != null) query.set(key, value)
        }
        redirect(offeringHref(course.productGroup, course.id_khoa) + (query.size ? '?' + query.toString() : ''))
    }
    const offeringDetails = course.productGroup !== 'COURSE' ? await readOfferingDetails(course.id) : null
    if (offeringDetails && (!publishedPage || offeringDetails.salesLayout !== 'TEMPLATE')) return <OfferingDetail slug={course.id_khoa} />
    if (siteProfile && !(await canAccessPageCourse(siteProfile, course.id))) notFound()
    const courseId = course.id
    const userId = session?.user?.id != null ? parseInt(session.user.id) : null
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
        userId != null
            ? prisma.user.findUnique({ where: { id: userId }, select: { phone: true } })
            : Promise.resolve(null),
        userId != null
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

    // Các kỳ khác của cùng khóa học (cùng giảng viên + cùng tên khóa học chung)
    // để trang chi tiết hiện mục chọn kỳ. Chỉ liệt kê các kỳ đang hiển thị và
    // thuộc phạm vi của site hiện tại; kỳ đang xem luôn có mặt trong danh sách.
    // Tính trước cả hai nhánh hiển thị: mẫu chuẩn hiện mục này trong trang,
    // trang bán tự dựng (HTML riêng) hiện dạng dải hệ thống ở phía trên.
    let cohorts: CohortLink[] | undefined
    if (course.productGroup === 'COURSE') {
        const siblings = await prisma.course.findMany({
            where: { teacherId: course.teacherId, name_lop: course.name_lop, productGroup: 'COURSE', status: true },
            select: { id: true, id_khoa: true, name_khoa: true, name_lop: true, date_join: true },
        })
        const scoped = siteProfile
            ? (await Promise.all(siblings.map(async s => (await canAccessPageCourse(siteProfile, s.id)) ? s : null))).filter((s): s is NonNullable<typeof s> => s != null)
            : siblings
        const withCurrent = scoped.some(s => s.id === course.id)
            ? scoped
            : [...scoped, { id: course.id, id_khoa: course.id_khoa, name_khoa: course.name_khoa, name_lop: course.name_lop, date_join: course.date_join }]
        if (withCurrent.length >= 2) {
            cohorts = [...withCurrent]
                .sort((a, b) => cohortNumberOf(a) - cohortNumberOf(b))
                .map(s => ({ slug: s.id_khoa, label: cohortShortLabel(s), dateJoin: s.date_join, current: s.id === course.id }))
        }
    }

    // Course page hiển thị hoàn toàn theo dữ liệu đã publish trong DB.
    const effectiveCoursePage = coursePage
    const projectLabels = projectBadges.length ? <CourseProjectBadges projects={projectBadges} showAll compact /> : undefined
    const customWi300Page = !!deploymentBrand && effectiveCoursePage?.useTemplate !== false
        && (effectiveCoursePage?.theme as { importedLayout?: boolean } | undefined)?.importedLayout === true
    // Mẫu HTML sở hữu giao diện bên trong, nhưng trang hệ thống vẫn cần header.
    // Gộp dự án vào breadcrumb để không chèn thêm một dải trước landing page.
    const breadcrumb = deploymentBrand ? <Wi300Breadcrumb group={course.productGroup} title={course.name_lop} projectLabels={customWi300Page ? projectLabels : undefined} /> : undefined

    // Giữ dữ liệu đã publish; chỉ bỏ phần thống kê mà mẫu ZIP không dùng.
    if (effectiveCoursePage && (effectiveCoursePage as any).useTemplate !== false) {
        return (
            <>
                {notificationEntry}
                {customWi300Page && <Wi300Header />}
                {cohorts && (
                    <div className="mx-auto w-full max-w-5xl px-4">
                        <CohortPicker cohorts={cohorts} />
                    </div>
                )}
                <CoursePageView
                    wi300Breadcrumb={breadcrumb}
                    projectLabels={customWi300Page ? undefined : projectLabels}
                    coursePage={effectiveCoursePage as any}
                    course={offeringDetails ? {...course, offeringDetails:publicOfferingDetails(offeringDetails)} : course}
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

    // Nội dung bán hàng bổ sung (3 ô chữ trong form sửa khóa học) + thông tin
    // giảng viên cho trang mặc định. Chưa điền thì các mục tương ứng tự ẩn.
    let salesContent: CourseSalesContent | undefined
    let salesTeacher: { name: string; image: string | null } | null = null
    if (course.productGroup === 'COURSE') {
        const [salesRow, teacherRow] = await Promise.all([
            prisma.systemConfig.findUnique({ where: { key: courseSalesContentKey(course.id) }, select: { value: true } }),
            course.teacherId != null
                ? prisma.user.findUnique({ where: { id: course.teacherId }, select: { name: true, image: true } })
                : Promise.resolve(null),
        ])
        salesContent = parseCourseSalesContent(salesRow?.value)
        salesTeacher = teacherRow ? { name: teacherRow.name || 'Giảng viên', image: teacherRow.image } : null
    }

    return (
        <>
            {notificationEntry}
            {deploymentBrand && <Wi300Header />}
            {breadcrumb}
            <CourseLandingClient
                cohorts={cohorts}
                salesContent={salesContent}
                teacher={salesTeacher}
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
