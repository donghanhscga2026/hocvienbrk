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
    const { id } = await params

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
    const { id } = await params
    const session = await auth()

    const course = await prisma.course.findUnique({
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

    const testimonials = await (prisma as any).courseTestimonial.findMany({
        where: { courseId, isActive: true },
        take: 3,
        orderBy: { isFeatured: 'desc' }
    })

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
        />
    )
}
