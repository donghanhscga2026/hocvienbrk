
'use server'

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// --- UTILS ---
function calculateTimingScore(deadlineDate: Date, submittedAt: Date): number {
    const deadline = new Date(deadlineDate)
    deadline.setHours(23, 59, 59, 999)
    return submittedAt <= deadline ? 1 : -1
}

export async function getEnrollmentStatus(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) return null

    const enrollment = await (prisma as any).enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: parseInt(session.user.id),
                courseId: courseId
            }
        },
        include: {
            lessonProgress: { select: { status: true } },
            course: { select: { lessons: { select: { id: true } } } }
        }
    })

    if (!enrollment) return null

    const completedCount = enrollment.lessonProgress.filter((p: any) => p.status === 'COMPLETED').length
    const totalLessons = enrollment.course?.lessons?.length ?? 0

    return {
        status: enrollment.status as string,
        startedAt: enrollment.startedAt as Date | null,
        completedCount,
        totalLessons
    }
}

export async function enrollInCourseAction(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Bạn cần đăng nhập để đăng ký khóa học.")
    }

    const userId = parseInt(session.user.id)

    // Lấy thông tin khóa học để check phí
    const course = await (prisma as any).course.findUnique({
        where: { id: courseId }
    })

    if (!course) throw new Error("Không tìm thấy khóa học.")

    // Nếu phí = 0 -> Active luôn
    // Nếu phí > 0 -> Status = PENDING
    const initialStatus = course.phi_coc === 0 ? 'ACTIVE' : 'PENDING'

    const enrollment = await (prisma as any).enrollment.upsert({
        where: {
            userId_courseId: {
                userId,
                courseId
            }
        },
        update: {}, // Không đổi nếu đã tồn tại (hoặc có thể cập nhật nếu cần)
        create: {
            userId,
            courseId,
            status: initialStatus
        }
    })

    revalidatePath("/")
    revalidatePath(`/courses/${course.id_khoa}`)

    return {
        success: true,
        status: enrollment.status,
        courseId: course.id_khoa
    }
}

export async function confirmStartDateAction(courseId: number, startDate: Date) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const userId = parseInt(session.user.id)

    // Kiểm tra ngày bắt đầu không được là quá khứ (cho phép hôm nay)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectedDate = new Date(startDate)
    selectedDate.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
        throw new Error("Ngày bắt đầu không được ở trong quá khứ.")
    }

    // Tìm enrollment trước
    const enrollment = await (prisma as any).enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: { id: true }
    })

    if (!enrollment) {
        throw new Error("Không tìm thấy enrollment.")
    }

    // Đánh dấu tất cả progress hiện tại thành RESET (lưu vào lịch sử)
    await (prisma as any).lessonProgress.updateMany({
        where: { 
            enrollmentId: enrollment.id,
            status: { not: 'RESET' } // Chưa bị reset trước đó
        },
        data: { status: 'RESET' }
    })

    // Cập nhật startedAt và resetAt để bắt đầu lộ trình mới
    await (prisma as any).enrollment.update({
        where: { userId_courseId: { userId, courseId } },
        data: { 
            startedAt: startDate,
            resetAt: new Date() // Đánh dấu thời điểm reset lộ trình
        }
    })

    revalidatePath(`/courses/[id]/learn`, 'layout')
    revalidatePath('/')
    return { success: true }
}

export async function updateLastLessonAction(enrollmentId: number, lessonId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    await (prisma as any).enrollment.update({
        where: { id: enrollmentId },
        data: { lastLessonId: lessonId }
    })

    return { success: true }
}

export async function setChallengeDurationAction(courseId: number, days: number) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const userId = parseInt(session.user.id)

    await (prisma as any).enrollment.update({
        where: { userId_courseId: { userId, courseId } },
        data: { challengeDays: days }
    })

    revalidatePath(`/courses/[id]/learn`, 'layout')
    return { success: true }
}

export async function getEnrollmentWithProgress(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) return null

    const userId = parseInt(session.user.id)

    const enrollment = await (prisma as any).enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        include: {
            course: {
                include: {
                    lessons: {
                        orderBy: { order: 'asc' }
                    }
                }
            },
            lessonProgress: true
        }
    })

    return enrollment
}

export async function saveVideoProgressAction({
    enrollmentId,
    lessonId,
    maxTime,
    duration
}: {
    enrollmentId: number,
    lessonId: string,
    maxTime: number,
    duration: number
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const percent = duration > 0 ? maxTime / duration : 0
    const vidScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0

    // Tìm progress chưa bị reset
    const existing = await (prisma as any).lessonProgress.findFirst({
        where: {
            enrollmentId,
            lessonId,
            status: { not: 'RESET' }
        },
        select: { scores: true }
    })
    const existingScores = (existing?.scores as any) ?? {}

    // Kiểm tra có progress active không
    const activeProgress = await (prisma as any).lessonProgress.findFirst({
        where: {
            enrollmentId,
            lessonId,
            status: { not: 'RESET' }
        }
    })

    if (activeProgress) {
        // Cập nhật progress hiện có
        await (prisma as any).lessonProgress.update({
            where: { id: activeProgress.id },
            data: {
                maxTime,
                duration,
                scores: { ...existingScores, vid: vidScore }
            }
        })
    } else {
        // Tạo progress mới (giữ nguyên record RESET cũ để admin xem lịch sử)
        await (prisma as any).lessonProgress.create({
            data: {
                enrollmentId,
                lessonId,
                maxTime,
                duration,
                scores: { vid: vidScore }
            }
        })
    }

    return { success: true, vidScore, percent: Math.round(percent * 100) }
}


export async function submitAssignmentAction({
    enrollmentId,
    lessonId,
    reflection,
    links,
    supports
}: {
    enrollmentId: number,
    lessonId: string,
    reflection: string,
    links: string[],
    supports: boolean[]
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")
    const userId = parseInt(session.user.id)

    // Batch 1: Lấy enrollment + lesson song song
    const [enrollment, lesson] = await Promise.all([
        (prisma as any).enrollment.findUnique({
            where: { id: enrollmentId },
            include: { course: true }
        }),
        (prisma as any).lesson.findUnique({
            where: { id: lessonId }
        })
    ])

    if (!enrollment || !lesson || !enrollment.startedAt) {
        throw new Error("Dữ liệu không hợp lệ hoặc chưa xác nhận ngày bắt đầu.")
    }

    const validLinks = links.filter((l: string) => l && l.trim().length > 0)

    // Batch 2: Kiểm tra link trùng + lấy video score song song
    const [otherProgresses, existingProgress] = await Promise.all([
        (prisma as any).lessonProgress.findMany({
            where: {
                enrollment: { userId },
                NOT: { lessonId }
            },
            select: { assignment: true }
        }),
        (prisma as any).lessonProgress.findFirst({
            where: {
                enrollmentId,
                lessonId,
                status: { not: 'RESET' } // Chỉ lấy progress chưa bị reset
            },
            select: { scores: true }
        })
    ])

    const allPastLinks = otherProgresses.flatMap((p: any) => p.assignment?.links || [])

    const currentUniqueLinks = new Set(validLinks)
    if (currentUniqueLinks.size < validLinks.length) {
        throw new Error("Phát hiện các link trùng nhau trong cùng một bài nộp. Vui lòng nộp các link khác nhau.")
    }

    const duplicates = validLinks.filter((link: string) => allPastLinks.includes(link))
    if (duplicates.length > 0) {
        throw new Error(`Phát hiện link đã nộp trong các bài trước: ${duplicates.join(', ')}. Vui lòng nộp nội dung mới.`)
    }

    // Tính điểm
    let refScore = 0
    if (reflection.trim().length >= 50) refScore = 2
    else if (reflection.trim().length > 0) refScore = 1

    const pracScore = Math.min(validLinks.length, 3)
    const supportScore = supports.filter((s: boolean) => s === true).length

    const deadlineDate = new Date(enrollment.startedAt)
    deadlineDate.setDate(deadlineDate.getDate() + (lesson.order - 1))
    const submittedAt = new Date()
    const timingScore = calculateTimingScore(deadlineDate, submittedAt)

    // Bài không có video YouTube (null hoặc link khác như Docs) -> mặc định +2
    const isYoutubeVideo = !!lesson.videoUrl && /youtu\.be\/|youtube\.com\/|v=/.test(lesson.videoUrl)
    const vidScore = !isYoutubeVideo
        ? 2
        : ((existingProgress?.scores as any)?.vid ?? 0)

    const totalScore = vidScore + refScore + pracScore + supportScore + timingScore

    // Xử lý tạo/cập nhật progress
    // Nếu đã có progress chưa bị reset -> cập nhật
    // Nếu chưa có hoặc đã bị reset -> tạo mới
    const activeProgress = await (prisma as any).lessonProgress.findFirst({
        where: {
            enrollmentId,
            lessonId,
            status: { not: 'RESET' }
        }
    })

    if (activeProgress) {
        // Cập nhật progress hiện có
        await (prisma as any).lessonProgress.update({
            where: { id: activeProgress.id },
            data: {
                scores: { vid: vidScore, ref: refScore, prac: pracScore, support: supportScore, timing: timingScore },
                totalScore: Math.max(0, totalScore),
                assignment: { reflection, links: validLinks, supports },
                status: 'COMPLETED',
                submittedAt
            }
        })
    } else {
        // Tạo progress mới (giữ nguyên record RESET cũ để admin xem lịch sử)
        await (prisma as any).lessonProgress.create({
            data: {
                enrollmentId,
                lessonId,
                scores: { vid: vidScore, ref: refScore, prac: pracScore, support: supportScore, timing: timingScore },
                totalScore: Math.max(0, totalScore),
                assignment: { reflection, links: validLinks, supports },
                status: 'COMPLETED',
                submittedAt
            }
        })
    }

    revalidatePath(`/courses/[id]/learn`, 'layout')
    return { success: true, totalScore }
}

export async function saveAssignmentDraftAction({
    enrollmentId,
    lessonId,
    reflection,
    links,
    supports
}: {
    enrollmentId: number,
    lessonId: string,
    reflection: string,
    links: string[],
    supports: boolean[]
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const validLinks = links.filter((l: string) => l && l.trim().length > 0)

    // Lấy lesson hiện tại để kiểm tra deadline
    const lesson = await (prisma as any).lesson.findUnique({
        where: { id: lessonId },
        select: { order: true }
    })

    // Lấy enrollment để kiểm tra startedAt
    const enrollment = await (prisma as any).enrollment.findUnique({
        where: { id: enrollmentId },
        select: { startedAt: true }
    })

    // Lấy progress hiện tại (chưa bị reset)
    const existingProgress = await (prisma as any).lessonProgress.findFirst({
        where: {
            enrollmentId,
            lessonId,
            status: { not: 'RESET' }
        }
    })

    const isCompleted = existingProgress?.status === 'COMPLETED'
    let canUpdateScore = true

    // Nếu đã hoàn thành, kiểm tra deadline
    if (isCompleted && enrollment?.startedAt && lesson) {
        const deadline = new Date(enrollment.startedAt)
        deadline.setDate(deadline.getDate() + (lesson.order - 1))
        deadline.setHours(23, 59, 59, 999)

        // Nếu đã trễ hạn thì không cho cập nhật điểm
        if (new Date() > deadline) {
            canUpdateScore = false
        }
    }

    // Nếu đã hoàn thành và trễ hạn: chỉ lưu assignment, không lưu scores/status
    if (isCompleted && !canUpdateScore) {
        if (existingProgress) {
            await (prisma as any).lessonProgress.update({
                where: { id: existingProgress.id },
                data: {
                    assignment: { reflection, links: validLinks, supports }
                }
            })
        }
    } else {
        // Bình thường: lưu cả assignment
        if (existingProgress) {
            await (prisma as any).lessonProgress.update({
                where: { id: existingProgress.id },
                data: {
                    assignment: { reflection, links: validLinks, supports }
                }
            })
        } else {
            // Tạo mới (giữ nguyên record RESET cũ để admin xem lịch sử)
            await (prisma as any).lessonProgress.create({
                data: {
                    enrollmentId,
                    lessonId,
                    assignment: { reflection, links: validLinks, supports }
                }
            })
        }
    }

    return { success: true }
}
