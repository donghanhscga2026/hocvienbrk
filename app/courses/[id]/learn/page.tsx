
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import CoursePlayer from "@/components/course/CoursePlayer"

export default async function CourseLearnPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    // Lấy thông tin Enrollment + lessonProgress trong 1 query
    const enrollment = await (prisma as any).enrollment.findFirst({
        where: {
            userId: parseInt(session.user.id),
            course: { id_khoa: id },
            status: 'ACTIVE'
        },
        select: {
            id: true,
            status: true,
            startedAt: true,
            resetAt: true,
            lastLessonId: true,
            createdAt: true,
            course: {
                include: {
                    lessons: {
                        orderBy: { order: 'asc' }
                    }
                }
            },
            lessonProgress: {
                where: {
                    status: { not: 'RESET' } // Chỉ lấy progress chưa bị reset
                },
                select: {
                    lessonId: true,
                    status: true,
                    scores: true,
                    totalScore: true,
                    assignment: true,
                    maxTime: true,
                    duration: true,
                    submittedAt: true,
                    updatedAt: true,
                    createdAt: true
                }
            }
        }
    })

    if (!enrollment || !enrollment.course) redirect(`/courses/${id}`)

    return (
        <div className="h-screen h-dvh bg-black overflow-hidden flex flex-col">
            <CoursePlayer
                course={enrollment.course}
                enrollment={enrollment}
                session={session}
            />
        </div>
    )
}
