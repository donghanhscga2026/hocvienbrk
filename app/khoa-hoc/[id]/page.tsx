import { Metadata } from 'next'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { CourseLandingClient } from '@/components/landing/LandingPageClient'

const DEFAULT_OG_TITLE = 'BRK - Ngân hàng Phước Báu'
const DEFAULT_OG_DESCRIPTION = 'Môi trường chia sẻ cùng nhau học tập nâng cao nhận thức và năng lực tạo lập giá trị từ gốc, tích tạo phước báu thuận theo nhân quả'
const DEFAULT_OG_IMAGE = 'https://giautoandien.io.vn/og-image.png'

interface PageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    let { id } = await params
    id = id.replace(/\$+$/, '')

    const course = await prisma.course.findUnique({
        where: { id_khoa: id }
    })

    if (!course) return { title: 'Không tìm thấy khóa học' }

    const courseImg = course.link_anh_bia || (course as any).link_anh_bia_khoa
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

    let course = await prisma.course.findUnique({
        where: { id_khoa: id }
    })

    if (!course) notFound()

    const courseId = course.id
    let userId: number | null = null
    let userPhone: string | null = null

    if (session?.user?.id) {
        userId = parseInt(session.user.id)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { phone: true }
        })
        userPhone = user?.phone || null
    }

    const enrollment = userId
        ? await prisma.enrollment.findFirst({
            where: { userId, courseId }
        })
        : null

    const courseOneEnrollment = userId
        ? await prisma.enrollment.findFirst({
            where: { userId, courseId: 1 }
        })
        : null
    const isCourseOneActive = courseOneEnrollment?.status === 'ACTIVE'

    const lessons = await prisma.lesson.findMany({
        where: { courseId },
        orderBy: { order: 'asc' },
        select: { id: true, title: true, order: true }
    })

    // Tổng thời lượng video từ lessonProgress.maxTime
    const durationRows = await prisma.lessonProgress.groupBy({
        by: ['lessonId'],
        where: { lesson: { courseId }, maxTime: { gt: 0 } },
        _max: { maxTime: true }
    })
    const totalSeconds = durationRows.reduce((sum, r) => sum + (r._max.maxTime || 0), 0)
    const totalHours = Math.max(1, Math.ceil(totalSeconds / 3600))

    // Số học viên đang học
    const activeStudentCount = await prisma.enrollment.count({
        where: { courseId, status: 'ACTIVE' }
    })

    // Testimonials từ dữ liệu thật (LessonProgress.assignment.reflection + LessonComment)
    const reflectionsLP = await prisma.lessonProgress.findMany({
        where: { lesson: { courseId }, status: 'COMPLETED' },
        include: {
            enrollment: {
                include: { user: { select: { id: true, name: true, image: true } } }
            },
            lesson: { select: { title: true, order: true } }
        },
        orderBy: { submittedAt: 'desc' },
        take: 5
    })

    const lessonComments = await prisma.lessonComment.findMany({
        where: { lesson: { courseId } },
        include: {
            user: { select: { id: true, name: true, image: true } },
            lesson: { select: { title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    })

    const testimonials = [
        ...reflectionsLP
            .filter(lp => {
                if (!lp.assignment) return false
                const a = lp.assignment as Record<string, unknown>
                return typeof a.reflection === 'string' && a.reflection.trim().length > 0
            })
            .map(lp => ({
                id: `ref-${lp.id}`,
                name: lp.enrollment.user.name || 'Học viên',
                content: ((lp.assignment as Record<string, unknown>).reflection as string).trim(),
                avatar: lp.enrollment.user.image,
                role: `Bài ${lp.lesson.order}`,
                rating: Math.min(5, Math.max(1, Math.round(lp.totalScore / 2))) || 5,
            })),
        ...lessonComments
            .filter(c => c.content && c.content.trim().length > 0)
            .map(c => ({
                id: `cmt-${c.id}`,
                name: c.user.name || 'Học viên',
                content: c.content.trim(),
                avatar: c.user.image,
                role: `Bình luận bài: ${c.lesson.title}`,
                rating: 5,
            }))
    ].slice(0, 5)

    return (
        <CourseLandingClient
            course={course}
            lessons={lessons}
            testimonials={testimonials}
            enrollment={enrollment}
            isCourseOneActive={isCourseOneActive}
            userPhone={userPhone}
            userId={userId}
            session={session}
            totalHours={totalHours}
            activeStudentCount={activeStudentCount}
        />
    )
}
