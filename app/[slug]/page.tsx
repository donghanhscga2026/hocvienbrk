import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { auth } from '@/auth'

import MainHeader from '@/components/layout/MainHeader'
import MessageCard from '@/components/home/MessageCard'
import HomePageClient from '@/components/home/HomePageClient'
import FooterSection from '@/components/home/FooterSection'
import SetHomeSlug from '@/components/home/SetHomeSlug'

import prisma from '@/lib/prisma'
import { getSiteProfile, getCoursesForProfile, getSurveyForProfile, getPostsForProfile, incrementProfileView } from '@/app/actions/site-profile-actions'
import { getHeroMessageForProfile } from '@/app/actions/message-actions'

interface PageProps {
    params: Promise<{ slug: string }>
}

// SEO Metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    
    const profile = await getSiteProfile(slug)
    
    if (!profile) return { title: 'Không tìm thấy' }
    
    return {
        title: profile.metaTitle || profile.title || slug,
        description: profile.metaDescription || profile.subtitle || undefined,
        openGraph: {
            title: profile.metaTitle || profile.title || undefined,
            description: profile.metaDescription || undefined,
            images: profile.metaImage ? [profile.metaImage] :
                profile.heroImage ? [profile.heroImage] : undefined,
        },
    }
}

export default async function TeacherHomePage({ params }: PageProps) {
    const { slug } = await params
    const session = await auth()
    
    // 1. Lấy profile
    const profile = await getSiteProfile(slug)
    
    if (!profile) {
        notFound()
    }
    
    // 2. Tăng view count (async, không block render)
    incrementProfileView(slug).catch(console.error)
    
    // 3. Lấy các data cần thiết (parallel)
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
    
    // 4. Xử lý enrollments map
    const myCourseIds = new Set<number>()
    const enrollmentsMap: Record<number, {
        status: string
        startedAt: Date | null
        completedCount: number
        totalLessons: number
        enrollmentId?: number
        payment?: {
            id: number
            status: string
            proofImage?: string | null
        }
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
    
    // 5. Phân loại courses
    const myCourses = courses.filter((c: any) => myCourseIds.has(c.id))
    const otherCourses = courses.filter((c: any) => !myCourseIds.has(c.id))
    
    // 6. Group courses theo category
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
    
    // 7. User data
    const userName = userRecord?.name ?? null
    const userId = userRecord?.id ?? null
    const userPhone = userRecord?.phone ?? null
    const userRoadmap = userRecord?.roadmap
    const customPath = userRoadmap?.customPath ?? null
    const userGoal = userRoadmap?.goal ?? null
    const targetPointId = userRoadmap?.targetPointId ?? 1
    
    // 8. Roadmap points
    const roadmapPoints = await prisma.roadmapPoint.findMany({
        orderBy: { pointId: 'asc' }
    })
    
    // 9. Reset survey action
    const { resetSurveyAction } = await import('@/app/actions/survey-actions')
    
    return (
        <main className="min-h-screen" style={{
            backgroundColor: profile.backgroundColor || undefined
        }}>
            {/* Set Home Slug - Cập nhật localStorage khi load trang */}
            <SetHomeSlug slug={slug} />
            
            {/* Header */}
            <MainHeader
                title={profile.title || 'TRANG CHỦ'}
                profile={profile}
            />
            
            {/* Hero Section - Full width, Server-side render */}
            <MessageCard
                profile={profile}
                session={session}
                userName={userName || ''}
                userId={userId !== null ? String(userId) : ''}
                isDefault={profile.isDefault || false}
                messageImageUrl={message?.imageUrl || null}
            />
            
            {/* Home Page Client - Survey + Community + Courses */}
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
            
            {/* Footer */}
            <FooterSection profile={profile} />
        </main>
    )
}
