import { Metadata } from 'next'
import { cache } from 'react'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { CourseLandingClient } from '@/components/landing/LandingPageClient'
import { getPublishedCoursePageBySlug } from '@/app/actions/course-page-actions'
import CoursePageView from '@/components/course-page/CoursePageView'

const DEFAULT_OG_TITLE = 'MBC - Ngân hàng Phước Báu'
const DEFAULT_OG_DESCRIPTION = 'Môi trường chia sẻ cùng nhau học tập nâng cao nhận thức và năng lực tạo lập giá trị từ gốc, tích tạo phước báu thuận theo nhân quả'
const DEFAULT_OG_IMAGE = 'https://giautoandien.io.vn/og-image.png'

interface PageProps {
    params: Promise<{ id: string }>
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

    const course = await getCourseByIdKhoa(id)

    if (!course) return { title: 'Không tìm thấy khóa học' }

    const courseImg = course.link_anh_bia || (course as any).link_anh_bia_khoa
    
    // Check if dynamic course page exists
    const coursePage = await prisma.coursePage.findFirst({
        where: { slug: id, status: 'published' }
    })

    if (coursePage) {
        const seo = (coursePage.seo as any) || {}
        return {
            title: seo.title || course.name_lop,
            description: seo.description || course.mo_ta_ngan || DEFAULT_OG_DESCRIPTION,
            openGraph: {
                title: seo.title || course.name_lop,
                description: seo.description || course.mo_ta_ngan || DEFAULT_OG_DESCRIPTION,
                images: seo.image ? [seo.image] : [courseImg || DEFAULT_OG_IMAGE],
            },
            twitter: {
                card: 'summary_large_image',
                title: seo.title || course.name_lop,
                description: seo.description || course.mo_ta_ngan || DEFAULT_OG_DESCRIPTION,
                images: seo.image ? [seo.image] : [courseImg || DEFAULT_OG_IMAGE],
            }
        }
    }

    return {
        title: course.name_lop,
        description: course.mo_ta_ngan || DEFAULT_OG_DESCRIPTION,
        openGraph: {
            title: course.name_lop,
            description: course.mo_ta_ngan || DEFAULT_OG_DESCRIPTION,
            images: courseImg ? [courseImg] : [DEFAULT_OG_IMAGE],
        },
        twitter: {
            card: 'summary_large_image',
            title: course.name_lop,
            description: course.mo_ta_ngan || DEFAULT_OG_DESCRIPTION,
            images: courseImg ? [courseImg] : [DEFAULT_OG_IMAGE],
        },
    }
}

export default async function KhoaHocPage({ params }: PageProps) {
    let { id } = await params
    const session = await auth()

    id = id.replace(/\$+$/, '')

    const course = await getCourseByIdKhoa(id)

    if (!course) notFound()

    const courseId = course.id
    const userId = session?.user?.id ? parseInt(session.user.id) : null

    // [OPTIMIZE] Các truy vấn dưới đây độc lập với nhau — chạy song song
    // thay vì tuần tự để giảm tổng thời gian chờ của trang bán khóa học.
    const [
        userRow,
        enrollment,
        lessons,
        durationRows,
        activeStudentCount,
        reflectionsLP,
        lessonComments,
        coursePage
    ] = await Promise.all([
        userId
            ? prisma.user.findUnique({ where: { id: userId }, select: { phone: true } })
            : Promise.resolve(null),
        userId
            ? prisma.enrollment.findFirst({ where: { userId, courseId } })
            : Promise.resolve(null),
        prisma.lesson.findMany({
            where: { courseId },
            orderBy: { order: 'asc' },
            select: { id: true, title: true, order: true }
        }),
        // Tổng thời lượng video từ lessonProgress.maxTime
        prisma.lessonProgress.groupBy({
            by: ['lessonId'],
            where: { lesson: { courseId }, maxTime: { gt: 0 } },
            _max: { maxTime: true }
        }),
        // Số thành viên đang học
        prisma.enrollment.count({ where: { courseId, status: 'ACTIVE' } }),
        // Testimonials từ dữ liệu thật (LessonProgress.assignment.reflection)
        prisma.lessonProgress.findMany({
            where: { lesson: { courseId }, status: 'COMPLETED' },
            include: {
                enrollment: {
                    include: { user: { select: { id: true, name: true, image: true } } }
                },
                lesson: { select: { title: true, order: true } }
            },
            orderBy: { submittedAt: 'desc' },
            take: 5
        }),
        prisma.lessonComment.findMany({
            where: { lesson: { courseId } },
            include: {
                user: { select: { id: true, name: true, image: true } },
                lesson: { select: { title: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        }),
        getPublishedCoursePageBySlug(id)
    ])

    const userPhone = userRow?.phone || null
    const totalSeconds = durationRows.reduce((sum, r) => sum + (r._max.maxTime || 0), 0)
    const totalHours = Math.max(1, Math.ceil(totalSeconds / 3600))

    const testimonials = [
        ...reflectionsLP
            .filter(lp => {
                if (!lp.assignment) return false
                const a = lp.assignment as Record<string, unknown>
                return typeof a.reflection === 'string' && a.reflection.trim().length > 0
            })
            .map(lp => ({
                id: `ref-${lp.id}`,
                name: lp.enrollment.user.name || 'Thành viên',
                content: ((lp.assignment as Record<string, unknown>).reflection as string).trim(),
                avatar: lp.enrollment.user.image,
                role: `Bài ${lp.lesson.order}`,
                rating: Math.min(5, Math.max(1, Math.round(lp.totalScore / 2))) || 5,
            })),
        ...lessonComments
            .filter(c => c.content && c.content.trim().length > 0)
            .map(c => ({
                id: `cmt-${c.id}`,
                name: c.user.name || 'Thành viên',
                content: c.content.trim(),
                avatar: c.user.image,
                role: `Bình luận bài: ${c.lesson.title}`,
                rating: 5,
            }))
    ].slice(0, 5)

    // coursePage đã được lấy song song ở trên cùng các query khác
    if (coursePage && (coursePage as any).useTemplate !== false) {
        return (
            <CoursePageView
                coursePage={coursePage as any}
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
        )
    }

    return (
        <CourseLandingClient
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
    )
}
