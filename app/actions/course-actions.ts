'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { cookies, headers } from "next/headers"
import { createPaymentQR } from "@/lib/vietqr"
import { resolveBankBin } from "@/lib/bank-bin"
import { resolveRefToUserId } from "@/lib/affiliate/resolve-ref-helper"

/**
 * Đăng ký khóa học mới
 */
export async function enrollInCourseAction(courseId: number, clientRef?: number | null) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Vui lòng đăng nhập để tiếp tục.")

        const userId = Number(session.user.id)

        // Tài khoản test #2689 không được phép tham gia hay kích hoạt khóa học
        if (userId === 2689) {
            throw new Error("Tài khoản test này không được phép tham gia hay kích hoạt khóa học.")
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: {
                phi_coc: true,
                vipExempt: true,
                id_khoa: true,
                name_lop: true,
                noidung_email: true,
                type: true,
                teacherId: true,
                teacherBankAccount: {
                    select: { accountNumber: true, accountHolder: true, bankName: true, qrCodeUrl: true }
                }
            }
        })

        if (!course) throw new Error("Khóa học không tồn tại.")

        // Lấy thông tin user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, phone: true, email: true, referrerId: true }
        })

        // Xử lý riêng cho loại khóa học LIB
        let effectivePhiCoc = course.phi_coc
        let isLibAllowed = false

        if (course.type === 'LIB') {
            if (!user?.email) throw new Error("Chưa có email tài khoản. Vui lòng cập nhật email.")
            const libAccess = await prisma.courseLibAccess.findUnique({
                where: { courseId_email: { courseId, email: user.email } }
            })
            if (!libAccess) throw new Error("Bạn chưa được cấp quyền truy cập tài liệu này. Vui lòng liên hệ Admin.")

            // Bypass phi_coc, chuyển thẳng trạng thái ACTIVE
            effectivePhiCoc = 0
            isLibAllowed = true
        } else if (course.type !== 'SYS') {
            // Kiểm tra xem user có active course 1 không (Chỉ áp dụng khóa thường/Challenge, không áp dụng SYS)
            const vipEnrollment = await prisma.enrollment.findFirst({
                where: {
                    userId,
                    courseId: 1,
                    status: 'ACTIVE'
                }
            })
            if (vipEnrollment && !course.vipExempt) effectivePhiCoc = 0
        }

        const existing = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId, courseId } }
        })

        if (existing) {
            const existingWithPayment = await prisma.enrollment.findUnique({
                where: { id: existing.id },
                select: {
                    id: true,
                    status: true,
                    payment: {
                        select: {
                            id: true, status: true, amount: true,
                            qrCodeUrl: true, transferContent: true,
                            bankName: true, accountNumber: true, proofImage: true
                        }
                    }
                }
            })
            return { success: true, status: existing.status, enrollment: existingWithPayment }
        }

        // [ENROLL-DEBUG] Đọc affiliate cookie
        let enrollmentReferrerId: number | null = null
        console.log('[ENROLL-DEBUG] clientRef provided:', clientRef ?? 'null')

        // Ưu tiên 1: clientRef từ client-side (document.cookie - ổn định nhất)
        if (clientRef && clientRef > 0) {
            enrollmentReferrerId = clientRef
            console.log('[ENROLL-DEBUG] Using clientRef:', clientRef)
        } else {
            console.log('[ENROLL-DEBUG] ===== START cookie read =====')
            console.log('[ENROLL-DEBUG] User ID:', userId, 'Course ID:', courseId)
            console.log('[ENROLL-DEBUG] user.referrerId from DB:', user?.referrerId)
            try {
                const cookieStore = await cookies()
                const refCookie = cookieStore.get('aff_ref')
                console.log('[ENROLL-DEBUG] refCookie found:', !!refCookie, 'value:', refCookie?.value)
                if (refCookie?.value) {
                    let rawRef = refCookie.value
                    try {
                        const decoded = decodeURIComponent(refCookie.value)
                        const affData = JSON.parse(decoded)
                        console.log('[ENROLL-DEBUG] Parsed affData:', JSON.stringify(affData))
                        if (affData?.r) {
                            rawRef = affData.r
                        }
                    } catch (parseErr) {
                        console.log('[ENROLL-DEBUG] JSON parse error:', parseErr)
                    }

                    let refId = parseInt(rawRef)
                    console.log('[ENROLL-DEBUG] rawRef:', rawRef, 'parsedInt:', refId)
                    if (isNaN(refId) || refId <= 0) {
                        const resolved = await resolveRefToUserId(rawRef)
                        console.log('[ENROLL-DEBUG] resolveRefToUserId result:', resolved)
                        if (resolved) refId = resolved
                    }
                    if (refId > 0) enrollmentReferrerId = refId
                }
            } catch (cookieErr) {
                console.log('[ENROLL-DEBUG] cookies() threw:', cookieErr)
            }
            console.log('[ENROLL-DEBUG] enrollmentReferrerId after cookie:', enrollmentReferrerId)

            // Fallback 1: nếu cookie ko đọc được → query DB AffiliateClick theo IP
            if (enrollmentReferrerId === null || enrollmentReferrerId === undefined) {
                try {
                    const hdrs = await headers()
                    const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
                    if (ip && ip !== 'unknown') {
                        console.log('[ENROLL-DEBUG] DB CLICK FALLBACK: querying IP:', ip)
                        const recentClick = await prisma.affiliateClick.findFirst({
                            where: { ipAddress: ip },
                            orderBy: { createdAt: 'desc' },
                            include: { link: true }
                        })
                        if (recentClick?.link?.userId) {
                            enrollmentReferrerId = recentClick.link.userId
                            console.log('[ENROLL-DEBUG] DB CLICK FALLBACK: found clickId', recentClick.id, 'referrer =', enrollmentReferrerId)
                        } else {
                            console.log('[ENROLL-DEBUG] DB CLICK FALLBACK: no recent click found for IP')
                        }
                    } else {
                        console.log('[ENROLL-DEBUG] DB CLICK FALLBACK: no valid IP from headers')
                    }
                } catch (ipErr) {
                    console.log('[ENROLL-DEBUG] DB CLICK FALLBACK error:', ipErr)
                }
            }

            // Fallback 2: nếu tất cả đều fail → dùng user.referrerId từ DB (chỉ khi user ko click bất kỳ link nào)
            if ((enrollmentReferrerId === null || enrollmentReferrerId === undefined) && user?.referrerId) {
                enrollmentReferrerId = user.referrerId
                console.log('[ENROLL-DEBUG] FALLBACK used: user.referrerId =', user.referrerId)
            }
        }
        console.log('[ENROLL-DEBUG] FINAL enrollmentReferrerId:', enrollmentReferrerId)
        console.log('[ENROLL-DEBUG] ===== END cookie read =====')

        const isAutoActive = effectivePhiCoc === 0
        const newEnrollment = await prisma.enrollment.create({
            data: {
                userId,
                courseId,
                status: isAutoActive ? "ACTIVE" : "PENDING",
                referrerId: enrollmentReferrerId,
            }
        })

        // Auto-sync vào hệ thống YTB (onSystem=3) nếu là khóa của teacher 327 (không áp dụng SYS)
        if (course.teacherId === 327 && course.type !== 'SYS') {
            const { syncUserToYtbSystem } = await import("@/lib/system-closure-helpers")
            await syncUserToYtbSystem(userId, course.teacherId)
        }

        const { sendTelegram, sendActivationEmail } = await import("@/lib/notifications")

        if (isAutoActive) {
            // Gửi thông báo kích hoạt MIỄN PHÍ
            const msgAdmin = `🎁 <b>KÍCH HOẠT MIỄN PHÍ</b>\n\n` +
                `👤 Học viên: <b>${user?.name}</b> (#${user?.id})\n` +
                `🎓 Khóa học: <b>${course.name_lop} (${course.id_khoa})</b>\n` +
                `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
            await sendTelegram(msgAdmin, 'ACTIVATE');

            if (user?.email) {
                await sendActivationEmail(user.email, user.name || '', user.id, course.name_lop || course.id_khoa, course.noidung_email);
            }
        }

        const bankAcc = course.teacherBankAccount
        if (effectivePhiCoc > 0 && bankAcc?.accountNumber && bankAcc?.accountHolder) {
            let qrCodeUrl = null
            let transferContent = null

            if (bankAcc.accountNumber) {
                try {
                    const qrResult = await createPaymentQR({
                        phone: user?.phone || '',
                        userId: userId,
                        courseId: courseId,
                        courseCode: course.id_khoa,
                        accountNo: bankAcc.accountNumber,
                        accountName: bankAcc.accountHolder,
                        acqId: bankAcc.bankName || 'SACOMBANK',
                        amount: effectivePhiCoc
                    })
                    qrCodeUrl = qrResult.qrCodeUrl
                    transferContent = qrResult.transferContent
                } catch (qrError) {
                    console.error("Failed to generate QR:", qrError)
                }
            }

            const cleanPhone = user?.phone ? user.phone.replace(/\D/g, '').slice(-6) : ''
            if (!transferContent) {
                transferContent = `SDT ${cleanPhone} HV ${userId} COC ${course.id_khoa}`.toUpperCase()
            }

            if (!qrCodeUrl) {
                const bankId = resolveBankBin(bankAcc.bankName)
                qrCodeUrl = `https://img.vietqr.io/image/${bankId}-${bankAcc.accountNumber}-qr_only.png?amount=${effectivePhiCoc}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bankAcc.accountHolder)}`
            }

            await prisma.payment.create({
                data: {
                    enrollmentId: newEnrollment.id,
                    amount: effectivePhiCoc,
                    status: 'PENDING',
                    transferContent: transferContent,
                    qrCodeUrl: qrCodeUrl,
                    bankName: bankAcc.bankName || 'Sacombank',
                    accountNumber: bankAcc.accountNumber,
                    phone: user?.phone
                }
            })
        }

        // Lấy enrollment + payment đầy đủ để trả về cho client
        const enrolledData = await prisma.enrollment.findUnique({
            where: { id: newEnrollment.id },
            select: {
                id: true,
                status: true,
                payment: {
                    select: {
                        id: true,
                        status: true,
                        amount: true,
                        qrCodeUrl: true,
                        transferContent: true,
                        bankName: true,
                        accountNumber: true,
                        proofImage: true
                    }
                }
            }
        })

        revalidatePath('/')
        revalidatePath('/courses')
        return { success: true, status: newEnrollment.status, enrollment: enrolledData }
    } catch (error: any) {
        console.error("Enroll Course Error:", error)
        return { success: false, message: error.message || "Không thể đăng ký khóa học." }
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
        } catch (e) { }

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
    existingVideoScore, existingTimingScore,
    clientTimeZone = 'Asia/Ho_Chi_Minh' // Mặc định là giờ VN nếu không có
}: {
    enrollmentId: number, lessonId: string, reflection: string, links: string[], supports: boolean[],
    isUpdate?: boolean, lessonOrder?: number, startedAt?: any,
    existingVideoScore?: number, existingTimingScore?: number,
    clientTimeZone?: string
}) {
    const logId = `[SUBMIT-${lessonId}]`
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, message: "Phiên đăng nhập hết hạn." }

        const now = new Date()
        let timingScore = 0

        // 1. Tính timingScore dựa trên múi giờ địa phương của học viên
        if (startedAt && lessonOrder) {
            const startDate = new Date(startedAt)
            if (!isNaN(startDate.getTime())) {
                // Lấy thời điểm hiện tại theo múi giờ học viên
                const nowStr = new Date().toLocaleString('en-US', { timeZone: clientTimeZone });
                const nowLocal = new Date(nowStr);

                // Tạo Deadline theo múi giờ học viên
                const deadlineStr = new Date(startDate).toLocaleString('en-US', { timeZone: clientTimeZone });
                const deadlineLocal = new Date(deadlineStr);
                deadlineLocal.setDate(deadlineLocal.getDate() + (lessonOrder - 1));
                deadlineLocal.setHours(23, 59, 59, 999);

                const isCurrentlyOnTime = nowLocal.getTime() <= deadlineLocal.getTime();

                if (isUpdate) {
                    timingScore = isCurrentlyOnTime ? 1 : (existingTimingScore ?? -1);
                } else {
                    timingScore = isCurrentlyOnTime ? 1 : -1;
                }

                if (isUpdate && !isCurrentlyOnTime) {
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
        const isYouTube = /youtu\.be\/|youtube\.com\/|v=|live\//.test(rawUrl)

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
                    `📅 Thời gian: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;

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
        } catch (e) { }

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
    } catch (error) { }
}

// ==========================================
// CREATE COURSE - Tạo khóa học mới (ADMIN + TEACHER)
// ==========================================
export async function createCourseAction(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const isAdmin = session.user.role === Role.ADMIN
    const userId = parseInt(session.user.id)

    // ✅ Validate required fields
    const id_khoa = formData.get('id_khoa') as string
    const name_lop = formData.get('name_lop') as string

    if (!id_khoa?.trim()) return { success: false, error: "Mã khóa học là bắt buộc" }
    if (!name_lop?.trim()) return { success: false, error: "Tên lớp học là bắt buộc" }

    // ✅ Xác định teacherId: Mặc định là chính mình, cho phép chọn người khác nếu là ADMIN/TEACHER
    let teacherId: number | null = userId
    const teacherIdFromForm = formData.get('teacherId') as string

    if (teacherIdFromForm) {
        teacherId = parseInt(teacherIdFromForm)
    }

    try {
        // ✅ Check unique id_khoa
        const existing = await prisma.course.findUnique({ where: { id_khoa } })
        if (existing) return { success: false, error: `Mã khóa "${id_khoa}" đã tồn tại` }

        // ✅ Parse all 21 fields từ FormData
        const categoryIdStr = formData.get('categoryId') as string
        const categoryId = categoryIdStr ? parseInt(categoryIdStr) : null
        let categoryName = 'Khác'
        if (categoryId) {
            const cat = await prisma.courseCategory.findUnique({ where: { id: categoryId } })
            if (cat) categoryName = cat.name
        }

        const courseData: any = {
            id_khoa: id_khoa.toUpperCase(),
            name_lop,
            name_khoa: formData.get('name_khoa') as string || null,
            category: categoryName,
            categoryId,
            type: (formData.get('type') as any) || 'NORMAL',
            status: formData.get('status') === 'true',
            pin: parseInt(formData.get('pin') as string) || 0,
            date_join: formData.get('date_join') as string || null,
            mo_ta_ngan: formData.get('mo_ta_ngan') as string || null,
            mo_ta_dai: formData.get('mo_ta_dai') as string || null,
            link_anh_bia: formData.get('link_anh_bia') as string || null,
            phi_coc: parseInt(formData.get('phi_coc') as string) || 0,
            vipExempt: formData.get('vipExempt') === 'true',
            noidung_stk: formData.get('noidung_stk') as string || null,
            link_zalo: formData.get('link_zalo') as string || null,
            file_email: formData.get('file_email') as string || null,
            noidung_email: formData.get('noidung_email') as string || null,
        }

            // ✅ Gán teacherId nếu có
            if (teacherId) {
                courseData.teacherId = teacherId
            }

            const teacherBankAccountIdStr = formData.get('teacherBankAccountId') as string
            if (teacherBankAccountIdStr) {
                courseData.teacherBankAccountId = parseInt(teacherBankAccountIdStr)
            }

        const newCourse = await prisma.course.create({
            data: courseData
        })

        revalidatePath('/tools/courses')

        // ✅ Auto-create first lesson (TEXT type with course info template)
        try {
            const defaultContent = `📌 THÔNG TIN KHAI GIẢNG & LƯU Ý

🗓 Ngày khai giảng: [Điền ngày]
⏰ Giờ học: [Điền giờ]
📍 Địa điểm: [Điền địa điểm]

⚠️ NHỮNG ĐIỂM CẦN CHÚ Ý TRƯỚC KHI HỌC:
1. Chuẩn bị [tài liệu/giấy bút...]
2. Đọc kỹ [quy định/hướng dẫn...]
3. Liên hệ [Zalo/Email] nếu có thắc mắc

📜 QUY TẮC HỌC:
- [Quy tắc 1]
- [Quy tắc 2]
- [Quy tắc 3]`

            await prisma.lesson.create({
                data: {
                    courseId: newCourse.id,
                    title: 'Bài 1: Thông tin khai giảng',
                    order: 1,
                    type: 'TEXT' as any,
                    content: defaultContent
                }
            })
            console.log('✅ Auto-created first lesson for course:', newCourse.id_khoa)
        } catch (lessonError: any) {
            console.error('Failed to create default lesson:', lessonError.message)
            // Don't fail course creation if lesson creation fails
        }

        return { success: true, course: newCourse, message: 'Đã tạo khóa học thành công!' }
    } catch (error: any) {
        return { success: false, error: error.message || 'Lỗi khi tạo khóa học' }
    }
}

// ==========================================
// DELETE COURSE - Xóa khóa học (Check quyền)
// ==========================================
export async function deleteCourseAction(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const isAdmin = session.user.role === Role.ADMIN
    const userId = parseInt(session.user.id)

    try {
        // ✅ Check course tồn tại + quyền xóa
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { teacherId: true, name_lop: true }
        })

        if (!course) return { success: false, error: "Không tìm thấy khóa học" }

        // ✅ TEACHER chỉ được xóa course của mình
        if (!isAdmin && course.teacherId !== userId) {
            return { success: false, error: "Bạn không có quyền xóa khóa học này" }
        }

        // ✅ Xóa course (cascade xóa lessons, enrollments...)
        await prisma.course.delete({ where: { id: courseId } })

        revalidatePath('/tools/courses')
        return { success: true, message: `Đã xóa khóa học "${course.name_lop}"` }
    } catch (error: any) {
        return { success: false, error: error.message || 'Lỗi khi xóa khóa học' }
    }
}

// ==========================================
// GET TEACHERS - Lấy danh sách TEACHER (cho ADMIN chọn)
// ==========================================
export async function getTeachersAction() {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const isAdmin = session.user.role === Role.ADMIN
    const isTeacher = session.user.role === Role.TEACHER

    if (!isAdmin && !isTeacher) return { success: false, error: "Unauthorized" }

    try {
        const teachers = await prisma.user.findMany({
            where: { role: { in: [Role.TEACHER, Role.ADMIN] } },
            select: { id: true, name: true, email: true }
        })
        return { success: true, teachers }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ==========================================
// GET COURSE LESSONS - Lấy danh sách bài học của khóa học
// ==========================================
export async function getCourseLessonsAction(courseId: number) {
    return await prisma.lesson.findMany({
        where: { courseId },
        orderBy: { order: 'asc' },
        select: { id: true, title: true, order: true }
    })
}
