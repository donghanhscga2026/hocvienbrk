'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

/**
 * Đăng ký khóa học mới
 */
export async function enrollInCourseAction(courseId: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Vui lòng đăng nhập để tiếp tục.")

        const userId = Number(session.user.id)

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { phi_coc: true }
        })

        if (!course) throw new Error("Khóa học không tồn tại.")

        const existing = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId, courseId } }
        })

        if (existing) return { success: true, status: existing.status }

        const newEnrollment = await prisma.enrollment.create({
            data: {
                userId,
                courseId,
                status: course.phi_coc === 0 ? "ACTIVE" : "PENDING"
            }
        })

        revalidatePath('/')
        revalidatePath('/courses')
        return { success: true, status: newEnrollment.status }
    } catch (error: any) {
        console.error("Enroll Course Error:", error)
        throw new Error(error.message || "Không thể đăng ký khóa học.")
    }
}

/**
 * Xác nhận ngày bắt đầu hoặc Đặt lại lộ trình
 */
export async function confirmStartDateAction(courseId: number, date: any) {
    const logId = `[RESET-COURSE-${courseId}-${Date.now()}]`
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, message: "Unauthorized" }

        const startDate = new Date(date)
        if (isNaN(startDate.getTime())) return { success: false, message: "Ngày bắt đầu không hợp lệ." }

        const userId = Number(session.user.id)
        const now = new Date()

        const enrollment = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId, courseId } },
            select: { id: true }
        })

        if (!enrollment) throw new Error("Không tìm thấy thông tin đăng ký khóa học.")

        await prisma.$transaction([
            prisma.enrollment.update({
                where: { id: enrollment.id },
                data: { startedAt: startDate, resetAt: now, lastLessonId: null }
            }),
            prisma.lessonProgress.updateMany({
                where: { enrollmentId: enrollment.id, status: { not: 'RESET' } },
                data: { status: 'RESET' }
            })
        ])

        try {
            revalidatePath(`/courses`)
            revalidatePath(`/courses/${courseId}/learn`)
        } catch (e) {}

        return { success: true }
    } catch (error: any) {
        console.error(`${logId} LỖI KHI RESET LỘ TRÌNH:`, error)
        return { success: false, message: "Lỗi hệ thống khi đặt lại ngày bắt đầu." }
    }
}

/**
 * Lưu tiến độ video
 */
export async function saveVideoProgressAction({
    enrollmentId, lessonId, maxTime, duration
}: {
    enrollmentId: number, lessonId: string, maxTime: number, duration: number
}) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false }

        const percent = duration > 0 ? maxTime / duration : 0
        const vidScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0

        const existing = await prisma.lessonProgress.findUnique({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            select: { scores: true, status: true }
        })

        const existingScores = existing?.status === 'RESET' ? {} : (existing?.scores as any ?? {})

        await prisma.lessonProgress.upsert({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            create: {
                enrollmentId, lessonId, maxTime, duration,
                scores: { video: vidScore } as any,
                status: "IN_PROGRESS"
            },
            update: {
                maxTime, duration,
                scores: { ...existingScores, video: vidScore } as any,
                ...(existing?.status === 'RESET' ? { status: 'IN_PROGRESS' } : {})
            }
        })

        return { success: true, vidScore }
    } catch (error) {
        return { success: false }
    }
}

/**
 * Nộp bài ghi nhận và tính điểm
 */
export async function submitAssignmentAction({
    enrollmentId, lessonId, reflection, links, supports,
    isUpdate = false, lessonOrder, startedAt,
    existingVideoScore, existingTimingScore
}: {
    enrollmentId: number, lessonId: string, reflection: string, links: string[], supports: boolean[],
    isUpdate?: boolean, lessonOrder?: number, startedAt?: any,
    existingVideoScore?: number, existingTimingScore?: number
}) {
    const logId = `[SUBMIT-${lessonId}]`
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, message: "Phiên đăng nhập hết hạn." }

        const now = new Date()
        let timingScore = 0

        // 1. Tính timingScore (Dựa trên ngày Việt Nam)
        if (startedAt && lessonOrder) {
            const startDate = new Date(startedAt)
            if (!isNaN(startDate.getTime())) {
                if (existingTimingScore === 1 || existingTimingScore === -1) {
                    timingScore = existingTimingScore
                } else {
                    const deadline = new Date(startDate)
                    deadline.setDate(deadline.getDate() + (lessonOrder - 1))
                    deadline.setHours(23, 59, 59, 999)
                    
                    // So sánh Timestamp để chính xác tuyệt đối
                    timingScore = now.getTime() <= deadline.getTime() ? 1 : -1
                }

                // Chặn cập nhật nếu đã quá hạn
                if (isUpdate && timingScore === -1) {
                    const existingStatus = await prisma.lessonProgress.findUnique({
                        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
                        select: { status: true }
                    })
                    if (existingStatus?.status === 'COMPLETED') {
                        return { success: false, message: "Bài học đã hết hạn cập nhật." }
                    }
                }
            }
        }

        // 2. Lấy thông tin bài học
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { videoUrl: true }
        })
        if (!lesson) return { success: false, message: "Không tìm thấy bài học." }

        // 3. Tính toán các đầu điểm
        const rawUrl = lesson.videoUrl ? String(lesson.videoUrl).trim() : ""
        const isYouTube = /youtu\.be\/|youtube\.com\/|v=/.test(rawUrl)

        let videoScore = (rawUrl === "" || rawUrl.toLowerCase() === "null" || !isYouTube) 
            ? 2 
            : (existingVideoScore ?? 0)

        const reflectionScore = reflection.trim().length >= 50 ? 2 : reflection.trim().length > 0 ? 1 : 0
        const linkScore = Math.min(links.filter(l => l && l.trim() !== "").length, 3)
        const supportScore = supports.filter(s => s === true).length

        const totalScore = Math.max(0, videoScore + reflectionScore + linkScore + supportScore + timingScore)

        console.log(`${logId} POINT: V:${videoScore} R:${reflectionScore} L:${linkScore} S:${supportScore} T:${timingScore} => TOTAL:${totalScore}`)

        // 4. Lưu Database
        await prisma.lessonProgress.upsert({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            create: {
                enrollmentId, lessonId,
                assignment: { reflection, links, supports } as any,
                scores: { video: videoScore, reflection: reflectionScore, link: linkScore, support: supportScore, timing: timingScore } as any,
                totalScore, status: totalScore >= 5 ? "COMPLETED" : "IN_PROGRESS", submittedAt: now
            },
            update: {
                assignment: { reflection, links, supports } as any,
                scores: { video: videoScore, reflection: reflectionScore, link: linkScore, support: supportScore, timing: timingScore } as any,
                totalScore, status: totalScore >= 5 ? "COMPLETED" : "IN_PROGRESS", submittedAt: now
            }
        })

        // 5. Revalidate
        try {
            const enrollment = await prisma.enrollment.findUnique({
                where: { id: enrollmentId },
                select: { course: { select: { id_khoa: true } } }
            })
            if (enrollment?.course?.id_khoa) {
                revalidatePath(`/courses/${enrollment.course.id_khoa}/learn`, 'page')
            }
        } catch (e) {}

        return { success: true, totalScore }
    } catch (error: any) {
        console.error(`${logId} ERROR:`, error)
        return { success: false, message: "Lỗi hệ thống khi lưu kết quả." }
    }
}

/**
 * Lưu nháp bài ghi nhận
 */
export async function saveAssignmentDraftAction({
    enrollmentId, lessonId, reflection, links, supports
}: {
    enrollmentId: number, lessonId: string, reflection: string, links: string[], supports: boolean[]
}) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false }

        const validLinks = links.filter((l: string) => l && l.trim().length > 0)

        await prisma.lessonProgress.upsert({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            create: {
                enrollmentId, lessonId,
                assignment: { reflection, links: validLinks, supports } as any,
                status: "IN_PROGRESS"
            },
            update: {
                assignment: { reflection, links: validLinks, supports } as any
            }
        })
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}

/**
 * Cập nhật bài học cuối cùng
 */
export async function updateLastLessonAction(enrollmentId: number, lessonId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return
        await prisma.enrollment.update({
            where: { id: enrollmentId },
            data: { lastLessonId: lessonId }
        })
    } catch (error) {}
}
