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

        // Kiểm tra khóa học có tồn tại không
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { phi_coc: true }
        })

        if (!course) throw new Error("Khóa học không tồn tại.")

        // Kiểm tra xem đã đăng ký chưa
        const existing = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: { userId, courseId }
            }
        })

        if (existing) {
            return { success: true, status: existing.status }
        }

        // Tạo bản ghi enrollment mới
        // Nếu khóa học miễn phí (phi_coc === 0), trạng thái là ACTIVE
        // Nếu có phí, trạng thái mặc định là PENDING
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
 * Xác nhận ngày bắt đầu lộ trình học
 */
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

/**
 * Lưu tiến độ video (chạy ngầm)
 */
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
            where: {
                enrollmentId_lessonId: { enrollmentId, lessonId }
            },
            create: {
                enrollmentId,
                lessonId,
                maxTime,
                duration,
                scores: { video: vidScore } as any,
                status: "IN_PROGRESS"
                },
                update: {
                maxTime,
                duration,
                scores: { ...existingScores, video: vidScore } as any,                ...(existing?.status === 'RESET' ? { status: 'IN_PROGRESS' } : {})
            }
        })

        return { success: true, vidScore, percent: Math.round(percent * 100) }
    } catch (error) {
        console.error("Save Video Progress Error:", error)
        return { success: false }
    }
}

/**
 * Nộp bài ghi nhận và tính điểm
 */
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
    const logId = `[SUBMIT-${lessonId}-${Date.now()}]`
    console.log(`${logId} Bắt đầu xử lý. Nội dung dài: ${reflection.length} ký tự.`)
    
    try {
        const session = await auth()
        if (!session?.user?.id) {
            console.warn(`${logId} Thất bại: Không có session.`)
            return { success: false, message: "Phiên đăng nhập hết hạn." }
        }

        const now = new Date()

        // 1. Kiểm tra ngày bắt đầu để tính timing
        let timingScore = 0
        if (startedAt && lessonOrder) {
            console.log(`${logId} Đang tính điểm timing cho bài ${lessonOrder}...`)
            try {
                const startDate = new Date(startedAt)
                if (!isNaN(startDate.getTime())) {
                    if (existingTimingScore === 1 || existingTimingScore === -1) {
                        timingScore = existingTimingScore
                    } else {
                        const deadline = new Date(startDate)
                        deadline.setDate(deadline.getDate() + (lessonOrder - 1))
                        deadline.setHours(23, 59, 59, 999)
                        timingScore = now <= deadline ? 1 : -1
                    }
                }
            } catch (e) {
                console.error(`${logId} Lỗi tính ngày:`, e)
            }
        }

        // 2. Tính toán điểm số
        console.log(`${logId} Đang lấy thông tin bài học từ DB...`)
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { videoUrl: true }
        })
        if (!lesson) return { success: false, message: "Không tìm thấy bài học." }

        // Kiểm tra videoUrl có thực sự là video hay không
        const rawUrl = lesson.videoUrl ? String(lesson.videoUrl).trim() : ""
        
        // Regex kiểm tra xem có phải link YouTube không
        const isYouTube = /youtu\.be\/|youtube\.com\/|v=/.test(rawUrl)

        let videoScore = 0
        if (rawUrl === "" || rawUrl.toLowerCase() === "null" || !isYouTube) {
            // Không có link HOẶC link là tài liệu (Docs) -> auto 2đ
            videoScore = 2
            console.log(`${logId} XÁC NHẬN: Bài học không dùng video (Tài liệu/Docs) -> Tự động tính +2đ`)
        } else {
            // Là link video YouTube -> dùng điểm tích lũy từ client gửi lên
            videoScore = existingVideoScore ?? 0
            console.log(`${logId} XÁC NHẬN: Bài học có video YouTube -> Lấy điểm tích lũy: ${videoScore}đ`)
        }

        const reflectionScore = reflection.trim().length >= 50 ? 2 : reflection.trim().length > 0 ? 1 : 0
        const linkScore = Math.min(links.filter(l => l && l.trim() !== "").length, 3)
        const supportScore = supports.filter(s => s === true).length

        const totalScore = Math.max(0, videoScore + reflectionScore + linkScore + supportScore + timingScore)
        console.log(`${logId} TÍNH ĐIỂM: Video(${videoScore}) + Ref(${reflectionScore}) + Link(${linkScore}) + Support(${supportScore}) + Timing(${timingScore}) = ${totalScore}đ`)

        // 3. Cập nhật Database
        console.log(`${logId} Đang thực hiện UPSERT vào Database...`)
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
        console.log(`${logId} Database cập nhật THÀNH CÔNG.`)

        // 4. Revalidate
        try {
            console.log(`${logId} Đang làm mới cache...`)
            const enrollment = await prisma.enrollment.findUnique({
                where: { id: enrollmentId },
                select: { course: { select: { id_khoa: true } } }
            })
            if (enrollment?.course?.id_khoa) {
                revalidatePath(`/courses/${enrollment.course.id_khoa}/learn`, 'page')
            }
        } catch (revError) {
            console.error(`${logId} Revalidate lỗi (bỏ qua):`, revError)
        }

        console.log(`${logId} Hoàn tất toàn bộ quy trình.`)
        return { success: true, totalScore }

    } catch (error: any) {
        console.error(`${logId} LỖI NGHIÊM TRỌNG:`, error)
        return { success: false, message: "Lỗi hệ thống: " + (error.message || "Unknown error") }
    }
}

/**
 * Lưu nháp bài ghi nhận
 */
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

/**
 * Cập nhật bài học đang học cuối cùng
 */
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
