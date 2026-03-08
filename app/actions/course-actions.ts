'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { createPaymentQR } from "@/lib/vietqr"

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
            select: { 
                phi_coc: true,
                id_khoa: true,
                name_lop: true,
                stk: true,
                name_stk: true,
                bank_stk: true,
                noidung_email: true
            }
        })

        if (!course) throw new Error("Khóa học không tồn tại.")

        // Lấy thông tin user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, phone: true, email: true }
        })

        // Kiểm tra xem user có active course 1 không
        const vipEnrollment = await prisma.enrollment.findFirst({
            where: {
                userId,
                courseId: 1,
                status: 'ACTIVE'
            }
        })

        const effectivePhiCoc = vipEnrollment ? 0 : course.phi_coc

        const existing = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId, courseId } }
        })

        if (existing) return { success: true, status: existing.status }

        const isAutoActive = effectivePhiCoc === 0
        const newEnrollment = await prisma.enrollment.create({
            data: {
                userId,
                courseId,
                status: isAutoActive ? "ACTIVE" : "PENDING"
            }
        })

        const { sendTelegram, sendActivationEmail } = await import("@/lib/notifications")

        if (isAutoActive) {
            // Gửi thông báo kích hoạt MIỄN PHÍ
            const msgAdmin = `🎁 <b>KÍCH HOẠT MIỄN PHÍ</b>\n\n` +
                             `👤 Học viên: <b>${user?.name}</b> (#${user?.id})\n` +
                             `🎓 Khóa học: <b>${course.name_lop} (${course.id_khoa})</b>\n` +
                             `📅 Thời gian: ${new Date().toLocaleString('vi-VN')}`;
            await sendTelegram(msgAdmin, 'ACTIVATE');

            if (user?.email) {
                await sendActivationEmail(user.email, user.name || '', user.id, course.name_lop || course.id_khoa, course.noidung_email);
            }
        }

        if (effectivePhiCoc > 0 && course.stk && course.name_stk) {
            let qrCodeUrl = null
            let transferContent = null

            // Tạo QR code nếu có đủ thông tin
            if (user?.phone && course.stk) {
                try {
                    const qrResult = await createPaymentQR({
                        phone: user.phone,
                        userId: userId,
                        courseId: courseId,
                        courseCode: course.id_khoa,
                        accountNo: course.stk,
                        accountName: course.name_stk,
                        acqId: course.bank_stk || 'SACOMBANK',
                        amount: effectivePhiCoc
                    })
                    qrCodeUrl = qrResult.qrCodeUrl
                    transferContent = qrResult.transferContent
                } catch (qrError) {
                    console.error("Failed to generate QR:", qrError)
                }
            }

            // Fallback content nếu không tạo được qua API
            if (!transferContent) {
                const cleanPhone = user?.phone ? user.phone.replace(/\D/g, '').slice(-6) : ''
                transferContent = `SDT ${cleanPhone} HV ${userId} COC ${course.id_khoa}`.toUpperCase()
            }


            await prisma.payment.create({
                data: {
                    enrollmentId: newEnrollment.id,
                    amount: effectivePhiCoc,
                    status: 'PENDING',
                    transferContent: transferContent,
                    qrCodeUrl: qrCodeUrl,
                    bankName: course.bank_stk || 'Sacombank',
                    accountNumber: course.stk,
                    phone: user?.phone // Lưu thêm phone vào Payment record
                }
            })
        }

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
 * Lưu tiến độ video (Hỗ trợ đa video/playlist)
 */
export async function saveVideoProgressAction({
    enrollmentId, lessonId, maxTime, duration, lastIndex, playlistScores
}: {
    enrollmentId: number, lessonId: string, maxTime: number, duration: number,
    lastIndex?: number, playlistScores?: any
}) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false }

        // [PLAYLIST LOGIC] Nếu có playlistScores, tính vidScore dựa trên tổng thể
        let vidScore = 0
        if (playlistScores) {
            let totalMax = 0
            let totalDur = 0
            Object.values(playlistScores).forEach((p: any) => {
                totalMax += p.maxTime || 0
                totalDur += p.duration || 0
            })
            const percent = totalDur > 0 ? totalMax / totalDur : 0
            vidScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
        } else {
            // Logic cũ cho 1 video
            const percent = duration > 0 ? maxTime / duration : 0
            vidScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
        }

        const existing = await prisma.lessonProgress.findUnique({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            select: { scores: true, status: true }
        })

        const existingScores = existing?.status === 'RESET' ? {} : (existing?.scores as any ?? {})
        
        const updatedScores = { 
            ...existingScores, 
            video: vidScore,
            lastVideoIndex: lastIndex ?? existingScores.lastVideoIndex ?? 0,
            playlist: playlistScores ?? existingScores.playlist ?? null
        }

        await prisma.lessonProgress.upsert({
            where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
            create: {
                enrollmentId, lessonId, maxTime, duration,
                scores: updatedScores as any,
                status: "IN_PROGRESS"
            },
            update: {
                maxTime, duration,
                scores: updatedScores as any,
                ...(existing?.status === 'RESET' ? { status: 'IN_PROGRESS' } : {})
            }
        })

        return { success: true, vidScore }
    } catch (error) {
        console.error("Save Video Progress Error:", error)
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
                const deadline = new Date(startDate)
                deadline.setDate(deadline.getDate() + (lessonOrder - 1))
                deadline.setHours(23, 59, 59, 999)
                
                const isCurrentlyOnTime = now.getTime() <= deadline.getTime()

                if (isUpdate) {
                    // CẬP NHẬT: 
                    // Nếu bây giờ vẫn trong hạn -> LUÔN tính là +1 (để gỡ điểm nếu trước đó trễ)
                    // Nếu bây giờ đã quá hạn -> GIỮ NGUYÊN điểm cũ (để bảo vệ nếu trước đó đã đạt +1)
                    if (isCurrentlyOnTime) {
                        timingScore = 1
                    } else {
                        timingScore = existingTimingScore ?? -1
                    }
                } else {
                    // NỘP MỚI: Tính theo thời điểm hiện tại
                    timingScore = isCurrentlyOnTime ? 1 : -1
                }

                // Chặn cập nhật nếu đã quá hạn và đã hoàn thành (Bảo vệ tính nghiêm túc)
                if (isUpdate && !isCurrentlyOnTime) {
                    const existingStatus = await prisma.lessonProgress.findUnique({
                        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
                        select: { status: true }
                    })
                    if (existingStatus?.status === 'COMPLETED') {
                        // Nếu đã xong và đã quá hạn thì không cho sửa nữa để tránh hack điểm
                        // (Trừ khi timingScore cũ là -1 và giờ muốn nộp lại? Không, đã quá hạn thì luôn là -1)
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

        let videoScore = 0
        if (rawUrl === "" || rawUrl.toLowerCase() === "null" || !isYouTube) {
            videoScore = 2 // Không dùng video Youtube -> Auto +2
        } else {
            // Lấy dữ liệu mới nhất
            const currentProg = await prisma.lessonProgress.findUnique({
                where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
                select: { scores: true, maxTime: true, duration: true }
            })
            const scoresJson = (currentProg?.scores as any) || {}
            
            // ƯU TIÊN 1: Tính từ Playlist detail nếu có
            if (scoresJson.playlist) {
                let totalMax = 0
                let totalDur = 0
                Object.values(scoresJson.playlist).forEach((p: any) => {
                    totalMax += p.maxTime || 0
                    totalDur += p.duration || 0
                })
                const percent = totalDur > 0 ? totalMax / totalDur : 0
                videoScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
            } 
            // ƯU TIÊN 2: Nếu mất playlist detail nhưng có maxTime/duration tổng ở ngoài (trường hợp bị ghi đè)
            else if (currentProg?.duration && currentProg.duration > 0) {
                const percent = currentProg.maxTime / currentProg.duration
                videoScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
            }
            // ƯU TIÊN 3: Dùng điểm gửi từ client
            else {
                videoScore = existingVideoScore ?? 0
            }
        }

        const reflectionScore = reflection.trim().length >= 50 ? 2 : reflection.trim().length > 0 ? 1 : 0
        const linkScore = Math.min(links.filter(l => l && l.trim() !== "").length, 3)
        const supportScore = supports.filter(s => s === true).length

        const totalScore = Math.max(0, videoScore + reflectionScore + linkScore + supportScore + timingScore)

        console.log(`${logId} POINT: V:${videoScore} R:${reflectionScore} L:${linkScore} S:${supportScore} T:${timingScore} => TOTAL:${totalScore}`)

        // 4. Lưu Database
        const updatedProgress = await prisma.lessonProgress.upsert({
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

        // Gửi thông báo Hoàn thành bài tập qua Telegram (Group LESSON)
        console.log(`🔍 Kiểm tra trạng thái bài học: ${updatedProgress.status}, Điểm: ${totalScore}`);
        if (updatedProgress.status === 'COMPLETED') {
            try {
                const { sendTelegram } = await import("@/lib/notifications")
                const enrollment = await prisma.enrollment.findUnique({
                    where: { id: enrollmentId },
                    include: { 
                        user: { select: { name: true, id: true } },
                        course: { select: { name_lop: true } }
                    }
                })
                const lesson = await prisma.lesson.findUnique({
                    where: { id: lessonId },
                    select: { title: true }
                })

                const msgAdmin = `📚 <b>HOÀN THÀNH BÀI HỌC</b>\n\n` +
                                 `👤 Học viên: <b>${enrollment?.user?.name}</b> (#${enrollment?.user?.id})\n` +
                                 `🎓 Khóa học: ${enrollment?.course?.name_lop}\n` +
                                 `📖 Bài học: <b>${lesson?.title}</b>\n` +
                                 `🏆 Điểm số: <b>${totalScore}đ</b>\n` +
                                 `📅 Thời gian: ${now.toLocaleString('vi-VN')}`;
                
                console.log(`📡 Đang gửi thông báo Telegram LESSON đến ChatID: ${process.env.TELEGRAM_CHAT_ID_LESSON}`);
                await sendTelegram(msgAdmin, 'LESSON');
                console.log(`✅ Đã gửi thông báo Telegram LESSON thành công!`);
            } catch (teleError: any) {
                console.error(`❌ Lỗi khi gửi thông báo Telegram LESSON:`, teleError.message);
            }
        }

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
