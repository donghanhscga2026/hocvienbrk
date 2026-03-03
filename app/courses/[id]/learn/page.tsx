import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import CoursePlayer from "@/components/course/CoursePlayer"

export default async function CourseLearnPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = Number(session.user.id)

  // 🔥 BƯỚC 1: lấy course trước
  const course = await prisma.course.findUnique({
    where: { id_khoa: id },
    select: { id: true },
  })

  if (!course) redirect(`/courses/${id}`)

  // 🔥 BƯỚC 2: lấy enrollment bằng courseId
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: course.id,
      },
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      resetAt: true,
      lastLessonId: true,

      course: {
        select: {
          id: true,
          id_khoa: true,
          name_lop: true,
          lessons: {
            select: {
              id: true,
              title: true,
              order: true,
              videoUrl: true,
              isDailyChallenge: true,
            },
            orderBy: { order: "asc" },
          },
        },
      },

      lessonProgress: {
        where: {
          status: { not: "RESET" },
        },
        select: {
          lessonId: true,
          status: true,
          totalScore: true,
          maxTime: true,
          duration: true,
          submittedAt: true,
          assignment: true,
          scores: true,
        },
      },
    },
  })

  if (!enrollment || enrollment.status !== "ACTIVE") {
    redirect(`/courses/${id}`)
  }

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
