import ImportedPage from './ImportedPage'
import {getSession} from '@/lib/get-session'
import prisma from '@/lib/prisma'
import MainHeader from '@/components/layout/MainHeader'
import MessageCard from '@/components/home/MessageCard'
import HomePageClient from '@/components/home/HomePageClient'
import FooterSection from '@/components/home/FooterSection'
import SetHomeSlug from '@/components/home/SetHomeSlug'
import {getCoursesForProfile,getSurveyForProfile,getPostsForProfile} from '@/app/actions/site-profile-actions'
import {getHeroMessageForProfile} from '@/app/actions/message-actions'
import {getRoadmapPoints} from '@/app/actions/roadmap-actions'
import {getCourseWhereForProfile,getSiteRuntimeConfig} from '@/lib/site-profile/config'
import type {DomainModules} from '@/lib/website/domain-shared'

/** Giữ mẫu trang cá nhân hiện có; domain chỉ đọc dữ liệu thuộc website, không dùng dữ liệu dự phòng. */
export default async function ProfileHome({profile,customDomain=false,modules}:{profile:any;customDomain?:boolean;modules?:DomainModules}) {
    const imported=await ImportedPage({profile,coursesEnabled:modules?.courses!==false})
    if(imported)return imported
    const config=getSiteRuntimeConfig(profile)
    const courseWhere=getCourseWhereForProfile(profile)
    const slug=profile.slug
    const session=await getSession()
    const teachers=[profile.userId,...(profile.members || []).map((m:{userId:number})=>m.userId)].filter((v):v is number=>typeof v==='number')
    const [
        courses,
        survey,
        message,
        userRecord,
        enrollments,
        posts
    ] = await Promise.all([
        customDomain ? (modules?.courses===false ? [] : prisma.course.findMany({
            where:courseWhere,
            include:{courseCategory:true,teacherBankAccount:true,_count:{select:{enrollments:{where:{status:'ACTIVE'}},lessons:true}}},
            orderBy:[{pin:'asc'},{id:'asc'}]
        }).then(rows=>rows.map(c=>({...c,activeStudentCount:c._count.enrollments})))) : getCoursesForProfile(profile),
        customDomain ? null : getSurveyForProfile(profile),
        customDomain ? null : getHeroMessageForProfile(slug),
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
                where: { userId: parseInt(session.user.id), ...(customDomain ? {courseId:{in:modules?.courses===false ? [] : undefined},course:courseWhere} : {}) },
                select: {
                    id: true,
                    courseId: true,
                    status: true,
                    startedAt: true,
                    hiddenFromGifts: true,
                    payment: { select: { id: true, status: true, proofImage: true, qrCodeUrl: true, transferContent: true, amount: true, bankName: true, accountNumber: true } },
                    course: { select: { _count: { select: { lessons: true } } } },
                    _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } }
                }
            })
            : [],
        customDomain ? (!config.modules.community ? [] : prisma.post.findMany({where:{published:true,authorId:{in:teachers},...(profile.communityCategoryId ? {categoryId:profile.communityCategoryId} : {})},take:Math.min(60,profile.communityLimit || 10),orderBy:[{pin:'desc'},{createdAt:'desc'}],include:{author:{select:{name:true,image:true}},_count:{select:{comments:true}}}})) : getPostsForProfile(profile)
    ])

    const myCourseIds = new Set<number>()
    const enrollmentsMap: Record<number, {
        status: string
        startedAt: Date | null
        completedCount: number
        totalLessons: number
        enrollmentId?: number
        payment?: { id: number; status: string; proofImage?: string | null }
        hiddenFromGifts: boolean
    }> = {}

    enrollments.forEach((e: any) => {
        if (e.status === 'ACTIVE' || e.status === 'COMPLETED') {
            if (!e.hiddenFromGifts) {
                myCourseIds.add(e.courseId)
            }
        }
        enrollmentsMap[e.courseId] = {
            status: e.status,
            startedAt: e.startedAt,
            completedCount: e._count?.lessonProgress || 0,
            totalLessons: e.course?._count?.lessons || 0,
            enrollmentId: e.id,
            payment: e.payment,
            hiddenFromGifts: e.hiddenFromGifts || false
        }
    })

    const myCourses = courses.filter((c: any) => myCourseIds.has(c.id))

    // Tách active vs completed
    const myActiveCourses = myCourses
        .filter((c: any) => enrollmentsMap[c.id]?.status === 'ACTIVE')
        .sort((a: any, b: any) => {
            const dateA = enrollmentsMap[a.id]?.startedAt ? new Date(enrollmentsMap[a.id].startedAt!).getTime() : 0
            const dateB = enrollmentsMap[b.id]?.startedAt ? new Date(enrollmentsMap[b.id].startedAt!).getTime() : 0
            return dateB - dateA
        })
    const myCompletedCourses = myCourses
        .filter((c: any) => enrollmentsMap[c.id]?.status === 'COMPLETED')

    const otherCourses = courses.filter((c: any) => !myCourseIds.has(c.id))

    const groupedOtherCourses = otherCourses.reduce((acc: any[], course: any) => {
        const category = course.courseCategory?.name || course.category || "Khác"
        const existingGroup = acc.find(g => g.category === category)
        if (existingGroup) {
            existingGroup.courses.push(course)
        } else {
            acc.push({ category, courses: [course] })
        }
        return acc
    }, []).sort((a: any, b: any) => {
        const orderA = a.courses[0]?.courseCategory?.order ?? 0
        const orderB = b.courses[0]?.courseCategory?.order ?? 0
        return orderA - orderB
    })

    // Sort courses trong mỗi category: pin ASC → createdAt DESC
    groupedOtherCourses.forEach((g: any) => {
        g.courses.sort((a: any, b: any) => {
            if (a.pin !== b.pin) return a.pin - b.pin
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
    })

    const userName = userRecord?.name ?? null
    const userId = userRecord?.id ?? null
    const userPhone = userRecord?.phone ?? null
    const userRoadmap = userRecord?.roadmap
    const customPath = userRoadmap?.customPath ?? null
    const userGoal = userRoadmap?.goal ?? null
    const targetPointId = userRoadmap?.targetPointId ?? 1

    const roadmapPoints = customDomain ? [] : await getRoadmapPoints()

    const { resetSurveyAction } = await import('@/app/actions/survey-actions')

    return (
        <main className="min-h-screen" style={{
            backgroundColor: customDomain ? undefined : profile.backgroundColor || undefined
        }}>
            {!customDomain && <SetHomeSlug slug={slug} />}

            {!customDomain && <MainHeader
                title={profile.title || 'TRANG CHỦ'}
                profile={profile}
            />}

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
                myActiveCourses={myActiveCourses}
                myCompletedCourses={myCompletedCourses}
                groupedOtherCourses={groupedOtherCourses}
                posts={posts}
                session={session}
                enrollmentsMap={enrollmentsMap}
                userPhone={userPhone}
                userId={userId}
                customPath={customPath as number[] | null}
                userGoal={userGoal}
                targetPointId={targetPointId}
                roadmapPoints={roadmapPoints || []}
                survey={survey}
                resetSurveyAction={resetSurveyAction}
                showAllCourses={true}
            />

            {!customDomain && <FooterSection profile={profile} />}
        </main>
    )
}
