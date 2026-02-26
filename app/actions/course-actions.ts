
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

    await (prisma as any).enrollment.update({
        where: { userId_courseId: { userId, courseId } },
        data: { startedAt: startDate }
    })

    revalidatePath(`/courses/[id]/learn`, 'layout')
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

    // Threshold-based scoring: >= 95% = 2đ, >= 50% = 1đ (fix lỗi 98% chỉ ra 1đ)
    const percent = duration > 0 ? maxTime / duration : 0
    const vidScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0

    const existingScores = await getExistingScores(enrollmentId, lessonId)

    await (prisma as any).lessonProgress.upsert({
        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
        update: {
            maxTime,
            duration,
            scores: { ...existingScores, vid: vidScore }
        },
        create: {
            enrollmentId,
            lessonId,
            maxTime,
            duration,
            scores: { vid: vidScore }
        }
    })

    return { success: true, vidScore, percent: Math.round(percent * 100) }
}

async function getExistingScores(enrollmentId: number, lessonId: string) {
    const progress = await (prisma as any).lessonProgress.findUnique({
        where: { enrollmentId_lessonId: { enrollmentId, lessonId } }
    })
    return (progress?.scores as any) || {}
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

    // 1. Lấy thông tin Enrollment & Lesson
    const enrollment = await (prisma as any).enrollment.findUnique({
        where: { id: enrollmentId },
        include: { course: true }
    })
    const lesson = await (prisma as any).lesson.findUnique({
        where: { id: lessonId }
    })

    if (!enrollment || !lesson || !enrollment.startedAt) {
        throw new Error("Dữ liệu không hợp lệ hoặc chưa xác nhận ngày bắt đầu.")
    }

    // - Practice (Links): Mỗi link 1đ, max 3đ
    const validLinks = links.filter(l => l && l.trim().length > 0)

    // 2. Kiểm tra trùng Link thực hành toàn hệ thống của User
    const otherProgresses = await (prisma as any).lessonProgress.findMany({
        where: {
            enrollment: { userId: userId },
            NOT: { lessonId: lessonId } // Không check bài hiện tại nếu đang update (hoặc cứ check hết)
        }
    })

    const allPastLinks = otherProgresses.flatMap((p: any) => p.assignment?.links || [])

    // Kiểm tra trùng link ngay trong bài nộp hiện tại
    const currentUniqueLinks = new Set(validLinks)
    if (currentUniqueLinks.size < validLinks.length) {
        throw new Error("Phát hiện các link trùng nhau trong cùng một bài nộp. Vui lòng nộp các link khác nhau.")
    }

    const duplicates = validLinks.filter(link => allPastLinks.includes(link))

    if (duplicates.length > 0) {
        throw new Error(`Phát hiện link đã nộp trong các bài trước: ${duplicates.join(', ')}. Vui lòng nộp nội dung mới.`)
    }

    // 3. Tính toán điểm
    // - Reflection (Tâm đắc ngộ): min 50 ký tự -> 2đ, dưới 50 -> 1đ, trống -> 0đ
    let refScore = 0
    if (reflection.trim().length >= 50) refScore = 2
    else if (reflection.trim().length > 0) refScore = 1

    // - Practice (Links): Mỗi link 1đ, max 3đ
    const pracScore = Math.min(validLinks.length, 3)

    // - Support: Mỗi checkbox 1đ, max 2đ
    const supportScore = supports.filter(s => s === true).length

    // - Timing Score: Deadline = startedAt + (order - 1) ngày
    const deadlineDate = new Date(enrollment.startedAt)
    deadlineDate.setDate(deadlineDate.getDate() + (lesson.order - 1))

    const submittedAt = new Date()
    const timingScore = calculateTimingScore(deadlineDate, submittedAt)

    // - Video Score: Lấy từ kết quả autoSave trước đó (nếu có)
    const existingProgress = await (prisma as any).lessonProgress.findUnique({
        where: { enrollmentId_lessonId: { enrollmentId, lessonId } }
    })
    const vidScore = (existingProgress?.scores as any)?.vid || 0

    const totalScore = vidScore + refScore + pracScore + supportScore + timingScore

    // 4. Cập nhật Database
    await (prisma as any).lessonProgress.upsert({
        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
        update: {
            scores: { vid: vidScore, ref: refScore, prac: pracScore, support: supportScore, timing: timingScore },
            totalScore: Math.max(0, totalScore), // Không để điểm âm
            assignment: { reflection, links: validLinks, supports },
            status: "COMPLETED",
            submittedAt
        },
        create: {
            enrollmentId,
            lessonId,
            scores: { vid: vidScore, ref: refScore, prac: pracScore, support: supportScore, timing: timingScore },
            totalScore: Math.max(0, totalScore),
            assignment: { reflection, links: validLinks, supports },
            status: "COMPLETED",
            submittedAt
        }
    })

    revalidatePath(`/courses/[id]/learn`, 'layout')
    return { success: true, totalScore }
}
