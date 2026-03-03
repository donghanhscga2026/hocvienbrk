
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
    supports: string[]
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // 1. Lấy dữ liệu cần thiết trong 1 lần Query - Đã bổ sung include course
    const [enrollment, lesson] = await Promise.all([
        prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: { 
                lessonProgress: { where: { lessonId } },
                course: { select: { id_khoa: true } } // Thêm dòng này để lấy id_khoa
            }
        }),
        prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { order: true, videoUrl: true }
        })
    ])

    if (!enrollment || !lesson) throw new Error("Data not found")

    const progress = enrollment.lessonProgress[0]
    const now = new Date()

    // ... (Phần logic tính điểm giữ nguyên như tôi đã cung cấp ở bước trước)
    let videoScore = 0
    let reflectionScore = 0
    let linkScore = 0
    let supportScore = 0
    let timingScore = 0

    if (!lesson.videoUrl) {
        videoScore = 2
    } else if (progress) {
        const watchPercent = progress.maxTime / (progress.duration || 1)
        videoScore = watchPercent >= 0.9 ? 2 : (watchPercent >= 0.5 ? 1 : 0)
    }

    if (reflection.trim().length > 0) {
        reflectionScore += 1
        if (reflection.trim().length > 50) reflectionScore += 1
    }

    linkScore = Math.min(links.filter(l => l.trim() !== "").length, 3)
    supportScore = Math.min(supports.filter(s => s.trim() !== "").length, 2)

    if (enrollment.startedAt) {
        const deadline = new Date(enrollment.startedAt)
        deadline.setDate(deadline.getDate() + (lesson.order - 1))
        deadline.setHours(23, 59, 59, 999)
        timingScore = now <= deadline ? 1 : -1
    }

    const totalScore = videoScore + reflectionScore + linkScore + supportScore + timingScore

    // 3. Cập nhật Database
    await prisma.lessonProgress.update({
        where: {
            enrollmentId_lessonId: { enrollmentId, lessonId }
        },
        data: {
            assignment: { reflection, links, supports } as any,
            scores: { videoScore, reflectionScore, linkScore, supportScore, timingScore } as any,
            totalScore: Math.max(0, totalScore),
            status: totalScore >= 5 ? "COMPLETED" : "IN_PROGRESS",
            submittedAt: now
        }
    })

    // Sử dụng optional chaining để an toàn hơn
    revalidatePath(`/courses/${enrollment.course?.id_khoa}/learn`, 'page')
    
    return { success: true, score: totalScore }
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
