
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import CoursePlayer from "@/components/course/CoursePlayer"

export default async function CourseLearnPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    // Lấy thông tin Enrollment dựa trên id_khoa
    const course = await (prisma as any).course.findUnique({
        where: { id_khoa: id },
        include: {
            lessons: {
                orderBy: { order: 'asc' }
            }
        }
    })

    if (!course) redirect("/")

    const enrollment = await (prisma as any).enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: parseInt(session.user.id),
                courseId: course.id
            }
        },
        include: {
            lessonProgress: true
        }
    })

    // Nếu chưa đăng ký thì không cho học
    if (!enrollment || enrollment.status !== 'ACTIVE') {
        redirect(`/courses/${id}`)
    }

    return (
        <div className="h-screen h-dvh bg-black overflow-hidden flex flex-col">
            <CoursePlayer
                course={course}
                enrollment={enrollment}
            />
        </div>
    )
}
