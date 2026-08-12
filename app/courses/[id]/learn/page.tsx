import { getSession } from "@/lib/get-session"
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
  const session = await getSession()
  if (!session?.user?.id) redirect("/login")

  const userId = Number(session.user.id)

  // Lấy course trước (để kiểm tra tồn tại) — lấy đủ field ngay từ đây để
  // enrollment bên dưới không phải fetch lại cùng 1 dòng course lần nữa.
  const course = await prisma.course.findUnique({
    where: { id_khoa: id },
    select: { id: true, type: true, id_khoa: true, name_lop: true },
  })

  if (!course) redirect(`/courses/${id}`)

  if (course.type === 'LIB') {
    if (!session?.user?.email) redirect(`/courses/${id}?error=lib_access_denied`)
    const hasAccess = await prisma.courseLibAccess.findUnique({
      where: {
        courseId_email: {
          courseId: course.id,
          email: session.user.email
        }
      }
    })
    if (!hasAccess) redirect(`/courses/${id}?error=lib_access_denied`)
  }

  // [PERF] enrollment và lessons độc lập với nhau (chỉ cần course.id) — chạy
  // song song thay vì lồng lessons vào trong course để tránh fetch lại
  // id/id_khoa/name_lop của course lần thứ 2.
  const [enrollment, lessons] = await Promise.all([
    prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
      select: {
        id: true,
        status: true,
        studyMode: true,
        startedAt: true,
        resetAt: true,
        lastLessonId: true,

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
    }),
    prisma.lesson.findMany({
      where: { courseId: course.id },
      select: {
        id: true,
        title: true,
        order: true,
        type: true, // [FIX] Cần field type để check TEXT type
        videoUrl: true,
        content: true,
        isDailyChallenge: true,
      },
      orderBy: { order: "asc" },
    }),
  ])

  if (!enrollment || enrollment.status !== "ACTIVE") {
    redirect(`/khoa-hoc/${id}`)
  }

  return (
    <div className="h-screen h-dvh bg-black overflow-hidden flex flex-col">
      <CoursePlayer
        course={{ id: course.id, id_khoa: course.id_khoa, name_lop: course.name_lop, type: course.type, lessons }}
        enrollment={enrollment}
        session={session}
      />
    </div>
  )
}
