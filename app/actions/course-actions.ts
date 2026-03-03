'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function confirmStartDateAction(courseId: number, date: any) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, message: "Unauthorized" }

        const startDate = new Date(date)
        if (isNaN(startDate.getTime())) {
            return { success: false, message: "Ngày bắt đầu không hợp lệ." }
        }

        const userId = Number(session.user.id)

        await prisma.enrollment.update({
            where: {
                userId_courseId: {
                    userId: userId,
                    courseId: courseId
                }
            },
            data: {
                startedAt: startDate
            }
        })

        try {
            revalidatePath(`/courses`)
            revalidatePath(`/courses/${courseId}/learn`)
        } catch (e) {
            console.error("Revalidate error in confirmStartDateAction:", e)
        }

        return { success: true }
    } catch (error: any) {
        console.error("Confirm Start Date Error:", error)
        return { success: false, message: "Lỗi hệ thống khi xác nhận ngày bắt đầu: " + (error.message || "") }
    }
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
    startedAt?: any,
    existingVideoScore?: number,
    existingTimingScore?: number
}) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, message: "Phiên đăng nhập hết hạn." }

        const now = new Date()

        // 1. Kiểm tra ngày bắt đầu
        let timingScore = 0
        if (startedAt && lessonOrder) {
            try {
                const startDate = new Date(startedAt)
                if (!isNaN(startDate.getTime())) {
                    // Nếu đã có điểm timing từ trước -> GIỮ NGUYÊN
                    if (existingTimingScore === 1 || existingTimingScore === -1) {
                        timingScore = existingTimingScore
                    } else {
                        const deadline = new Date(startDate)
                        deadline.setDate(deadline.getDate() + (lessonOrder - 1))
                        deadline.setHours(23, 59, 59, 999)
                        timingScore = now <= deadline ? 1 : -1
                    }

                    // Chặn cập nhật nếu đã quá hạn và đã hoàn thành
                    if (isUpdate && now > (new Date(new Date(startDate).setDate(new Date(startDate).getDate() + (lessonOrder - 1))).setHours(23, 59, 59, 999))) {
                        const existingStatus = await prisma.lessonProgress.findUnique({
                            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
                            select: { status: true }
                        })
                        if (existingStatus?.status === 'COMPLETED') {
                            return { success: false, message: "Bài học đã hết hạn cập nhật." }
                        }
                    }
                }
            } catch (e) {
                console.error("Date calculation error:", e)
            }
        }

        // 2. Tính toán điểm số
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { videoUrl: true }
        })
        if (!lesson) return { success: false, message: "Không tìm thấy bài học." }

        let videoScore = 0
        if (!lesson.videoUrl) {
            videoScore = 2
        } else if (existingVideoScore !== undefined) {
            videoScore = existingVideoScore
        }

        const reflectionScore = reflection.trim().length >= 50 ? 2 : reflection.trim().length > 0 ? 1 : 0
        const linkScore = Math.min(links.filter(l => l && l.trim() !== "").length, 3)
        const supportScore = supports.filter(s => s === true).length

        const totalScore = Math.max(0, videoScore + reflectionScore + linkScore + supportScore + timingScore)

        // 3. Cập nhật Database
        await prisma.lessonProgress.upsert({
            where: {
                enrollmentId_lessonId: { enrollmentId, lessonId }
            },
            create: {
                enrollmentId,
                lessonId,
                assignment: { reflection, links, supports } as any,
                scores: { video: videoScore, reflection: reflectionScore, link: linkScore, support: supportScore, timing: timingScore } as any,
                totalScore,
                status: totalScore >= 5 ? "COMPLETED" : "IN_PROGRESS",
                submittedAt: now
            },
            update: {
                assignment: { reflection, links, supports } as any,
                scores: { video: videoScore, reflection: reflectionScore, link: linkScore, support: supportScore, timing: timingScore } as any,
                totalScore,
                status: totalScore >= 5 ? "COMPLETED" : "IN_PROGRESS",
                submittedAt: now
            }
        })

        // 4. Revalidate an toàn
        try {
            const enrollment = await prisma.enrollment.findUnique({
                where: { id: enrollmentId },
                select: { course: { select: { id_khoa: true } } }
            })
            if (enrollment?.course?.id_khoa) {
                revalidatePath(`/courses/${enrollment.course.id_khoa}/learn`, 'page')
            }
        } catch (revError) {
            console.error("Revalidate Error:", revError)
        }

        return { success: true, totalScore }

    } catch (error: any) {
        console.error("CRITICAL ERROR in submitAssignmentAction:", error)
        return { success: false, message: "Lỗi hệ thống: " + (error.message || "Unknown error") }
    }
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
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false }

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
    } catch (error) {
        console.error("Draft Save Error:", error)
        return { success: false }
    }
}

export async function updateLastLessonAction(enrollmentId: number, lessonId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return

        await prisma.enrollment.update({
            where: { id: enrollmentId },
            data: { lastLessonId: lessonId }
        })
    } catch (error) {
        console.error("Update Last Lesson Error:", error)
    }
}
