import { Metadata } from 'next'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import MainHeader from '@/components/layout/MainHeader'
import MessageCard from '@/components/home/MessageCard'
import HomePageClient from '@/components/home/HomePageClient'
import FooterSection from '@/components/home/FooterSection'
import SetHomeSlug from '@/components/home/SetHomeSlug'
import { getSiteProfile, getCoursesForProfile, getSurveyForProfile, getPostsForProfile, incrementProfileView } from '@/app/actions/site-profile-actions'
import { getHeroMessageForProfile } from '@/app/actions/message-actions'

const DEFAULT_OG_TITLE = 'BRK - Ngân hàng Phước Báu'
const DEFAULT_OG_DESCRIPTION = 'Môi trường chia sẻ cùng nhau học tập nâng cao nhận thức và năng lực tạo lập giá trị từ gốc, tích tạo phước báu thuận theo nhân quả'
const DEFAULT_OG_IMAGE = 'https://giautoandien.io.vn/og-image.png'

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params

    const profile = await getSiteProfile(slug)

    if (!profile) return { title: 'Không tìm thấy' }

    const ogTitle = profile.metaTitle || profile.title || DEFAULT_OG_TITLE
    const ogDescription = profile.metaDescription || profile.subtitle || DEFAULT_OG_DESCRIPTION
    const ogImage = profile.metaImage || profile.heroImage || DEFAULT_OG_IMAGE

    return {
        title: ogTitle,
        description: ogDescription,
        openGraph: {
            title: ogTitle,
            description: ogDescription,
            images: [ogImage],
        },
        twitter: {
            card: 'summary_large_image',
            title: ogTitle,
            description: ogDescription,
            images: [ogImage],
        },
    }
}

export default async function PageSlugPage({ params }: PageProps) {
    const { slug } = await params
    const session = await auth()

    const profile = await getSiteProfile(slug)

    if (!profile) notFound()

    incrementProfileView(slug).catch(console.error)

    const [
        courses,
        survey,
        message,
        userRecord,
        enrollments,
        posts
    ] = await Promise.all([
        getCoursesForProfile(profile),
        getSurveyForProfile(profile),
        getHeroMessageForProfile(slug),
        session?.user?.id
            ? prisma.user.findUnique({
                where: { id: parseInt(session.user.id) },
                select: {
                    name: true, id: true, image: true, phone: true, roadmap: true
                }
            })
            : null,
        session?.user?.id
            ? prisma.enrollment.findMany({
                where: { userId: parseInt(session.user.id) },
                select: {
                    id: true,
                    courseId: true,
                    status: true,
                    startedAt: true,
                    payment: { select: { id: true, status: true, proofImage: true } },
                    course: { select: { _count: { select: { lessons: true } } } },
                    _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } }
                }
            })
            : [],
        getPostsForProfile(profile)
    ])

    const myCourseIds = new Set<number>()
    const enrollmentsMap: Record<number, {
        status: string
        startedAt: Date | null
        completedCount: number
        totalLessons: number
        enrollmentId?: number
        payment?: { id: number; status: string; proofImage?: string | null }
    }> = {}

    enrollments.forEach((e: any) => {
        if (e.status === 'ACTIVE' || e.status === 'COMPLETED') {
            myCourseIds.add(e.courseId)
        }
        enrollmentsMap[e.courseId] = {
            status: e.status,
            startedAt: e.startedAt,
            completedCount: e._count?.lessonProgress || 0,
            totalLessons: e.course?._count?.lessons || 0,
            enrollmentId: e.id,
            payment: e.payment
        }
    })

    const myCourses = courses.filter((c: any) => myCourseIds.has(c.id))
    const otherCourses = courses.filter((c: any) => !myCourseIds.has(c.id))

    const groupedOtherCourses = otherCourses.reduce((acc: any[], course: any) => {
        const category = course.category || "Khác"
        const existingGroup = acc.find(g => g.category === category)
        if (existingGroup) {
            existingGroup.courses.push(course)
        } else {
            acc.push({ category, courses: [course] })
        }
        return acc
    }, [])

    const userName = userRecord?.name ?? null
    const userId = userRecord?.id ?? null
    const userPhone = userRecord?.phone ?? null
    const userRoadmap = userRecord?.roadmap
    const customPath = userRoadmap?.customPath ?? null
    const userGoal = userRoadmap?.goal ?? null
    const targetPointId = userRoadmap?.targetPointId ?? 1

    const roadmapPoints = await prisma.roadmapPoint.findMany({
        orderBy: { id: 'asc' }
    })

    const { resetSurveyAction } = await import('@/app/actions/survey-actions')

    return (
        <main className="min-h-screen" style={{
            backgroundColor: profile.backgroundColor || undefined
        }}>
            <SetHomeSlug slug={slug} />

            <MainHeader
                title={profile.title || 'TRANG CHỦ'}
                profile={profile}
            />

            <MessageCard
                profile={profile}
                session={session}
                userName={userName || ''}
                userId={userId !== null ? String(userId) : ''}
                isDefault={profile.isDefault || false}
                messageImageUrl={message?.imageUrl || null}
                messageContent={(message as any)?.content || null}
            />

            <HomePageClient
                profile={profile}
                courses={courses}
                myCourses={myCourses}
                groupedOtherCourses={groupedOtherCourses}
                posts={posts}
                session={session}
                enrollmentsMap={enrollmentsMap}
                isCourseOneActive={enrollmentsMap[1]?.status === 'ACTIVE'}
                userPhone={userPhone}
                userId={userId}
                customPath={customPath as number[] | null}
                userGoal={userGoal}
                targetPointId={targetPointId}
                roadmapPoints={roadmapPoints || []}
                survey={survey}
                resetSurveyAction={resetSurveyAction}
            />

            <FooterSection profile={profile} />
        </main>
    )
}
