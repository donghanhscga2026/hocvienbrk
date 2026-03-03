
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

    const existing = await prisma.lessonProgress.findUnique({
        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
        select: { scores: true, status: true }
    })

    // Nếu status đang là RESET, ta coi như bắt đầu làm lại (xóa điểm rác cũ)
    const existingScores = existing?.status === 'RESET' ? {} : (existing?.scores as any ?? {})

    await prisma.lessonProgress.upsert({
        where: {
            enrollmentId_lessonId: { enrollmentId, lessonId }
        },
        create: {
            enrollmentId,
            lessonId,
            maxTime,
            duration,
            scores: { vid: vidScore } as any,
            status: "IN_PROGRESS"
        },
        update: {
            maxTime,
            duration,
            scores: { ...existingScores, vid: vidScore } as any,
            // Nếu học viên xem video lại bài cũ đã RESET, đánh dấu state thành đang học
            ...(existing?.status === 'RESET' ? { status: 'IN_PROGRESS' } : {})
        }
    })

    return { success: true, vidScore, percent: Math.round(percent * 100) }
}

export async function submitAssignmentAction({
    enrollmentId,
    lessonId,
    reflection,
    links,
    supports,
    isUpdate = false,
    lessonOrder,
    startedAt,
    existingVideoScore,
    existingTimingScore
}: {
    enrollmentId: number,
    lessonId: string,
    reflection: string,
    links: string[],
    supports: boolean[],
    isUpdate?: boolean,
    lessonOrder?: number,
    startedAt?: string | null,
    existingVideoScore?: number,
    existingTimingScore?: number
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const now = new Date()

    // 1. Kiểm tra nếu là Update thì có cho phép không
    if (isUpdate && startedAt && lessonOrder) {
        const deadline = new Date(startedAt)
        deadline.setDate(deadline.getDate() + (lessonOrder - 1))
        deadline.setHours(23, 59, 59, 999)
        
        if (now > deadline) {
            // Nếu đã quá hạn, ta chỉ cho phép update nếu trạng thái HIỆN TẠI chưa hoàn thành (đang nộp muộn để xong bài)
            // Nếu đã COMPLETED rồi thì KHÓA LUÔN.
            const existing = await prisma.lessonProgress.findUnique({
                where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
                select: { status: true }
            })
            if (existing?.status === 'COMPLETED') {
                return { success: false, message: "Bài học đã hết hạn cập nhật." }
            }
        }
    }

    let videoScore = 0
    let reflectionScore = 0
    let linkScore = 0
    let supportScore = 0
    let timingScore = 0

    // Lấy lesson từ DB chỉ để kiểm tra videoUrl
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { videoUrl: true }
    })

    if (!lesson) throw new Error("Lesson not found")

    // Tính videoScore - ưu tiên dữ liệu từ client
    if (!lesson.videoUrl) {
        videoScore = 2
    } else if (existingVideoScore !== undefined) {
        if (isUpdate) {
            // Nếu đã đạt max 2đ từ trước → giữ nguyên
            if (existingVideoScore === 2) {
                videoScore = 2
            } else {
                // Nếu chưa đạt max → sẽ được tính lại ở client khi xem video
                // Ở đây giữ nguyên điểm cũ
                videoScore = existingVideoScore
            }
        } else {
            videoScore = existingVideoScore
        }
    }

    // Tính reflectionScore
    if (reflection.trim().length > 0) {
        reflectionScore += 1
        if (reflection.trim().length > 50) reflectionScore += 1
    }

    // Tính linkScore và supportScore
    linkScore = Math.min(links.filter(l => l.trim() !== "").length, 3)
    supportScore = supports.filter(s => s === true).length

    // Tính timingScore
    if (startedAt && lessonOrder) {
        // Nếu đã có điểm timing từ trước (1 hoặc -1) -> GIỮ NGUYÊN, không tính lại
        if (existingTimingScore === 1 || existingTimingScore === -1) {
            timingScore = existingTimingScore
        } else {
            // Nếu chưa có điểm (lần đầu nộp) -> tính dựa trên deadline
            const deadline = new Date(startedAt)
            deadline.setDate(deadline.getDate() + (lessonOrder - 1))
            deadline.setHours(23, 59, 59, 999)
            
            // Nộp trước hoặc đúng 23:59 ngày hết hạn -> +1, ngược lại -> -1
            timingScore = now <= deadline ? 1 : -1
        }
    }

    const totalScore = videoScore + reflectionScore + linkScore + supportScore + timingScore

    // Cập nhật Database
    await prisma.lessonProgress.upsert({
        where: {
            enrollmentId_lessonId: { enrollmentId, lessonId }
        },
        create: {
            enrollmentId,
            lessonId,
            assignment: { reflection, links, supports } as any,
            scores: { videoScore, reflectionScore, linkScore, supportScore, timingScore } as any,
            totalScore: Math.max(0, totalScore),
            status: totalScore >= 5 ? "COMPLETED" : "IN_PROGRESS",
            submittedAt: now
        },
        update: {
            assignment: { reflection, links, supports } as any,
            scores: { videoScore, reflectionScore, linkScore, supportScore, timingScore } as any,
            totalScore: Math.max(0, totalScore),
            status: totalScore >= 5 ? "COMPLETED" : "IN_PROGRESS",
            submittedAt: now
        }
    })

    // Lấy course id_khoa để revalidate
    const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        select: { course: { select: { id_khoa: true } } }
    })

    const result = { success: true, totalScore }
    
    // Revalidate sau khi return để không chặn response
    if (enrollment?.course?.id_khoa) {
        revalidatePath(`/courses/${enrollment.course.id_khoa}/learn`, 'page')
    }

    return result
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

    await prisma.lessonProgress.upsert({
        where: {
            enrollmentId_lessonId: { enrollmentId, lessonId }
        },
        create: {
            enrollmentId,
            lessonId,
            assignment: { reflection, links: validLinks, supports } as any,
            status: "IN_PROGRESS"
        },
        update: {
            assignment: { reflection, links: validLinks, supports } as any
        }
    })

    return { success: true }
}
