import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import CoursePlayer from "@/components/course/CoursePlayer"

type PlaylistItem = {
  type: 'video' | 'doc'
  title: string
  url: string
  id?: string | null
}

function extractVideoId(url: string) {
  if (!url) return null
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?v=)|(shorts\/)|(live\/)|(\&v=))([^#\&\?]*).*/
  const match = url.match(regExp)
  if (match && match.length > 0) {
    const id = match[match.length - 1]
    return (id && id.length === 11) ? id : null
  }
  return null
}

function parsePlaylist(videoUrl: string | null): PlaylistItem[] {
  if (!videoUrl) return []
  return videoUrl.split('|').map((item, index) => {
    const videoMatch = item.match(/^\[(.*?)\](.*)$/)
    if (videoMatch) return { type: 'video' as const, title: videoMatch[1], url: videoMatch[2].trim(), id: extractVideoId(videoMatch[2].trim()) }
    const docMatch = item.match(/^\((.*?)\)(.*)$/)
    if (docMatch) return { type: 'doc' as const, title: docMatch[1], url: docMatch[2].trim() }
    return { type: 'video' as const, title: `Phần ${index + 1}`, url: item.trim(), id: extractVideoId(item.trim()) }
  })
}

export default async function CourseLearnPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = Number(session.user.id)

  // Lấy course trước (để kiểm tra tồn tại)
  const course = await prisma.course.findUnique({
    where: { id_khoa: id },
    select: { id: true },
  })

  if (!course) redirect(`/courses/${id}`)

  // Lấy enrollment bằng courseId (giữ nguyên query gốc)
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
              content: true,
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

  const lessonsWithPlaylist = enrollment.course.lessons.map((lesson: any) => ({
    ...lesson,
    playlist: parsePlaylist(lesson.videoUrl)
  }))

  return (
    <div className="h-screen h-dvh bg-black overflow-hidden flex flex-col">
      <CoursePlayer
        course={{ ...enrollment.course, lessons: lessonsWithPlaylist }}
        enrollment={enrollment}
        session={session}
      />
    </div>
  )
}
