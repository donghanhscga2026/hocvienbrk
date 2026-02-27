
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
        include: {
            course: {
                include: {
                    lessons: {
                        orderBy: { order: 'asc' }
                    }
                }
            },
            lessonProgress: {
                select: {
                    lessonId: true,
                    status: true,
                    scores: true,
                    totalScore: true,
                    assignment: true,
                    maxTime: true,
                    duration: true,
                    submittedAt: true,
                    updatedAt: true
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
            />
        </div>
    )
}
