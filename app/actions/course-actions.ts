'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role, Prisma, EnrollmentMode } from "@prisma/client"
import type { Enrollment } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { cookies, headers } from "next/headers"
import { createPaymentQR } from "@/lib/vietqr"
import { resolveBankBin } from "@/lib/bank-bin"
import { resolveRefToUserId } from "@/lib/affiliate/resolve-ref-helper"
import { toTitleCase } from "@/lib/utils/text-format"

/**
 * Đăng ký khóa học mới
 */
export async function enrollInCourseAction(
    courseId: number,
    clientRef?: number | null,
    useVoucher: boolean = false,
    voucherAmountToUse: number = 0,
    useVndWallet: boolean = false
) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Vui lòng đăng nhập để tiếp tục.")

        const userId = Number(session.user.id)

        // Tài khoản test không được phép tham gia hay kích hoạt khóa học
        const { isTestAccount } = await import('@/lib/test-account')
        if (isTestAccount(userId)) {
            throw new Error("Tài khoản test này không được phép tham gia hay kích hoạt khóa học.")
        }

        // [OPTIMIZE] 4 truy vấn độc lập (chỉ cần userId/courseId đã biết trước) —
        // chạy song song thay vì tuần tự để giảm độ trễ trên đường dẫn mua/đăng ký
        // khóa học, hành động được gọi nhiều nhất của toàn hệ thống.
        const [course, user, brkWallet, existing] = await Promise.all([
            prisma.course.findUnique({
                where: { id: courseId },
                select: {
                    phi_coc: true,
                    id_khoa: true,
                    name_lop: true,
                    noidung_email: true,
                    type: true,
                    teacherId: true,
                    requiresReferralActivation: true,
                    referralActivationThreshold: true,
                    feeType: true,
                    voucherConfig: true,
                    allowMbvDeduction: true,
                    teacherBankAccount: {
                        select: { accountNumber: true, accountHolder: true, bankName: true, qrCodeUrl: true }
                    }
                }
            }),
            // Lấy thông tin user
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, phone: true, email: true, referrerId: true }
            }),
            // Lấy wallet + enrollment TRƯỚC khi trừ ví (dùng cho chống trừ kép)
            prisma.brkWallet.findUnique({ where: { userId } }),
            prisma.enrollment.findUnique({
                where: { userId_courseId: { userId, courseId } }
            })
        ])

        if (!course) throw new Error("Khóa học không tồn tại.")

        // Xử lý riêng cho loại khóa học LIB
        let effectivePhiCoc = course.phi_coc
        let isLibAllowed = false
        let voucherDeducted = 0
        let cashDeducted = 0
        let voucherApplied = false

        if (course.type === 'LIB') {
            if (!user?.email) throw new Error("Chưa có email tài khoản. Vui lòng cập nhật email.")
            const libAccess = await prisma.courseLibAccess.findUnique({
                where: { courseId_email: { courseId, email: user.email } }
            })
            if (!libAccess) throw new Error("Bạn chưa được cấp quyền truy cập tài liệu này. Vui lòng liên hệ Admin.")

            // Bypass phi_coc, chuyển thẳng trạng thái ACTIVE
            effectivePhiCoc = 0
            isLibAllowed = true
        } else if (course.allowMbvDeduction && course.voucherConfig === 'WALLET' && (useVoucher || useVndWallet)) {
            // Tính tổng đã trừ ví MBV / VNĐ từ trước cho khóa này (có thể đã trừ nhiều lần / từng phần)
            const [mbvTxAgg, cashTxAgg] = brkWallet?.id
                ? await Promise.all([
                    prisma.brkTransaction.aggregate({ where: { walletId: brkWallet.id, refId: `course_${courseId}` }, _sum: { amount: true } }),
                    prisma.brkTransaction.aggregate({ where: { walletId: brkWallet.id, refId: `course_cash_${courseId}` }, _sum: { amount: true } })
                ])
                : [null, null]

            const alreadyDeductedMbv = Math.floor(Math.abs(Number(mbvTxAgg?._sum.amount) || 0))
            const alreadyDeductedCash = Math.floor(Math.abs(Number(cashTxAgg?._sum.amount) || 0))
            effectivePhiCoc = Math.max(0, course.phi_coc - alreadyDeductedMbv - alreadyDeductedCash)

            // 1. Trừ tiếp MBV nếu user chọn dùng ví và vẫn còn thiếu học phí (chống trừ kép: chỉ trừ đúng phần còn thiếu)
            if (useVoucher && voucherAmountToUse > 0 && effectivePhiCoc > 0) {
                const mbvBalance = Number(brkWallet?.mbvBalance || 0)
                const actualDeduct = Math.floor(Math.min(mbvBalance, voucherAmountToUse, effectivePhiCoc))
                if (actualDeduct > 0) {
                    voucherDeducted = actualDeduct
                    effectivePhiCoc = Math.max(0, effectivePhiCoc - voucherDeducted)
                    voucherApplied = true
                    const { debitMbvWallet } = await import('@/lib/brk/wallet-service')
                    await debitMbvWallet(userId, voucherDeducted, `Thanh toán khóa học ${course.id_khoa}`, `course_${courseId}`, userId)
                }
            }

            // 2. Trừ tiếp ví VNĐ nếu user chọn và vẫn còn thiếu học phí
            if (useVndWallet && effectivePhiCoc > 0) {
                const vndBalance = Number(brkWallet?.balance || 0)
                cashDeducted = Math.floor(Math.min(vndBalance, effectivePhiCoc))
                if (cashDeducted > 0) {
                    effectivePhiCoc = Math.max(0, effectivePhiCoc - cashDeducted)
                    const { debitBrkCashBalance } = await import('@/lib/brk/wallet-service')
                    await debitBrkCashBalance(userId, cashDeducted, `Thanh toán khóa học ${course.id_khoa} (ví VNĐ)`, `course_cash_${courseId}`, userId)
                }
            }
        }

        if (existing && existing.status !== 'REJECTED') {
            if (existing.status === 'PENDING') {
                const isAutoActiveExisting = effectivePhiCoc === 0

                // Xoá bản ghi payment cũ
                await prisma.payment.deleteMany({
                    where: { enrollmentId: existing.id }
                })
                
                // Cập nhật số tiền cọc (phi_coc) mới và tự động ACTIVE nếu số tiền sau giảm = 0đ
                const updatedEnrollment = await prisma.enrollment.update({
                    where: { id: existing.id },
                    data: {
                        phi_coc: effectivePhiCoc,
                        status: isAutoActiveExisting ? 'ACTIVE' : 'PENDING'
                    }
                })

                if (isAutoActiveExisting) {
                    const { sendTelegram, sendActivationEmail } = await import("@/lib/notifications")
                    const msgAdmin = `🎁 <b>KÍCH HOẠT VÍ MBV 100%</b>\n\n` +
                        `👤 Thành viên: <b>${user?.name}</b> (#${user?.id})\n` +
                        `🎓 Khóa học: <b>${course.name_lop} (${course.id_khoa})</b>\n` +
                        `💳 Trừ ví MBV: ${voucherDeducted.toLocaleString('vi-VN')} VNĐ\n` +
                        (cashDeducted > 0 ? `💳 Trừ ví VNĐ: ${cashDeducted.toLocaleString('vi-VN')} VNĐ\n` : '') +
                        `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
                    await sendTelegram(msgAdmin, 'ACTIVATE');

                    if (user?.email) {
                        await sendActivationEmail(user.email, user.name || '', user.id, course.name_lop || course.id_khoa, course.noidung_email);
                    }
                    return { success: true, status: 'ACTIVE', enrollment: updatedEnrollment }
                }

                // Sinh bản ghi payment mới với QR mới theo cấu hình giáo viên hiện tại
                const bankAcc = course.teacherBankAccount
                if (effectivePhiCoc > 0 && bankAcc?.accountNumber && bankAcc?.accountHolder) {
                    let qrCodeUrl = null
                    let transferContent = null

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
                        console.error("Failed to regenerate QR:", qrError)
                    }

                    const cleanPhone = user?.phone ? user.phone.replace(/\D/g, '').slice(-6) : ''
                    if (!transferContent) {
                        transferContent = `SDT ${cleanPhone} HV ${userId} COC ${course.id_khoa}`.toUpperCase()
                    }

                    if (!qrCodeUrl) {
                        const bankId = resolveBankBin(bankAcc.bankName)
                        qrCodeUrl = `https://img.vietqr.io/image/${bankId}-${bankAcc.accountNumber}-qr_only.png?amount=${effectivePhiCoc}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bankAcc.accountHolder)}`
                    }

                    const newPayment = await prisma.payment.create({
                        data: {
                            enrollmentId: existing.id,
                            amount: effectivePhiCoc,
                            status: 'PENDING',
                            transferContent: transferContent,
                            qrCodeUrl: qrCodeUrl,
                            bankName: bankAcc.bankName || 'Sacombank',
                            accountNumber: bankAcc.accountNumber,
                            phone: user?.phone
                        }
                    })

                    return {
                        success: true,
                        status: 'PENDING',
                        enrollment: {
                            ...updatedEnrollment,
                            payment: newPayment
                        }
                    }
                }

                return { success: true, status: 'PENDING', enrollment: updatedEnrollment }
            } else {
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
        }

        // [ENROLL-DEBUG] Đọc affiliate cookie
        let enrollmentReferrerId: number | null = null
        let enrollmentRawRefCode: string | null = null
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
                            enrollmentRawRefCode = affData.r
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

        // Chống self-referral: referrerId không được trùng userId (tránh vòng lặp cây chia sẻ)
        if (enrollmentReferrerId === userId) {
            enrollmentReferrerId = user?.referrerId ?? null
            console.log('[ENROLL-DEBUG] Self-referral detected, fallback to user.referrerId =', enrollmentReferrerId)
        }

        const isAutoActive = effectivePhiCoc === 0
        let studyMode: EnrollmentMode = course.feeType === 'MIEN_PHI' ? EnrollmentMode.FREE : EnrollmentMode.COMPANION

        if (course.requiresReferralActivation && course.referralActivationThreshold > 0 && course.feeType !== 'MIEN_PHI') {
            const referrerActiveCount = await prisma.enrollment.count({
                where: {
                    referrerId: userId,
                    courseId,
                    status: 'ACTIVE'
                }
            })
            studyMode = referrerActiveCount >= course.referralActivationThreshold ? EnrollmentMode.COMPANION : EnrollmentMode.AUDITOR
        }

        let newEnrollment: Enrollment | null = null
        try {
            newEnrollment = await prisma.enrollment.create({
                data: {
                    userId,
                    courseId,
                    status: isAutoActive ? "ACTIVE" : "PENDING",
                    studyMode,
                    phi_coc: effectivePhiCoc,
                    referrerId: enrollmentReferrerId,
                }
            })
        } catch (createErr: any) {
            if (createErr?.code === 'P2002') {
                const existingRace = await prisma.enrollment.findUnique({
                    where: { userId_courseId: { userId, courseId } },
                    include: { payment: true }
                })
                return { success: true, status: existingRace!.status, enrollment: existingRace }
            }
            throw createErr
        }

        // Award voucher từ course
        const { awardVoucher } = await import('@/lib/voucher/voucher-service')
        const awards = await prisma.courseVoucherAward.findMany({
            where: { courseId },
            include: { voucher: true }
        })
        for (const award of awards) {
            await awardVoucher(userId, award.voucherId, courseId)
        }

        // Track affiliate conversion for purchase
        if (enrollmentReferrerId) {
            try {
                const { trackAffiliateConversion } = await import('@/lib/affiliate/tracking')
                let finalRefCode = ""
                try {
                    const cookieStore = await cookies()
                    const refCookie = cookieStore.get('aff_ref')
                    if (refCookie?.value) {
                        try {
                            const decoded = decodeURIComponent(refCookie.value)
                            const affData = JSON.parse(decoded)
                            if (affData?.r) finalRefCode = affData.r
                        } catch {
                            finalRefCode = refCookie.value
                        }
                    }
                } catch {}

                if (!finalRefCode) {
                    const defaultLink = await prisma.affiliateLink.findFirst({
                        where: { userId: enrollmentReferrerId, name: "Default" }
                    })
                    finalRefCode = defaultLink?.code || `default-${enrollmentReferrerId}`
                }

                await trackAffiliateConversion({
                    refCode: finalRefCode,
                    userId,
                    type: 'PURCHASE',
                    enrollmentId: newEnrollment.id,
                    orderAmount: effectivePhiCoc
                })
                console.log(`[Enroll-Track] Tracked conversion for user #${userId} under refCode ${finalRefCode}`)
            } catch (trackErr) {
                console.error('[Enroll-Track] Failed to track conversion:', trackErr)
            }
        }

        // Auto-sync vào hệ thống YTB (onSystem=3) nếu là khóa của teacher 327 (không áp dụng SYS)
        if (course.teacherId === 327 && course.type !== 'SYS') {
            const { syncUserToYtbSystem } = await import("@/lib/system-closure-helpers")
            await syncUserToYtbSystem(userId, course.teacherId)
        }

        const { sendTelegram, sendActivationEmail } = await import("@/lib/notifications")

        if (isAutoActive) {
            // Gửi thông báo kích hoạt MIỄN PHÍ
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://giautoandien.io.vn'
            const refLink = enrollmentRawRefCode ? `\n🔗 Link ref: ${appUrl}/khoa-hoc/${course.id_khoa}?ref=${enrollmentRawRefCode}` : ''
            const msgAdmin = `🎁 <b>KÍCH HOẠT MIỄN PHÍ</b>\n\n` +
                `👤 Thành viên: <b>${user?.name}</b> (#${user?.id})\n` +
                `🎓 Khóa học: <b>${course.name_lop} (${course.id_khoa})</b>${refLink}\n` +
                `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
            await sendTelegram(msgAdmin, 'ACTIVATE');

            const { logActivity } = await import('@/lib/activity-logger')
            if (user?.id) await logActivity({
                userId: user.id,
                action: 'ENROLL_FREE',
                detail: `Kích hoạt miễn phí: ${course.name_lop} (${course.id_khoa})`,
                metadata: { courseId, idKhoa: course.id_khoa, studentName: user?.name || null, referrerId: enrollmentReferrerId || null }
            })

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

        const missingBankAccount = effectivePhiCoc > 0 && !course.teacherBankAccount

        // Lấy enrollment + payment đầy đủ để trả về cho client
        const enrolledData = await prisma.enrollment.findUnique({
            where: { id: newEnrollment.id },
            select: {
                id: true,
                status: true,
                studyMode: true,
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
        return {
            success: true,
            status: newEnrollment.status,
            enrollment: enrolledData,
            warning: missingBankAccount ? "Khóa học chưa được cấu hình tài khoản ngân hàng. Vui lòng liên hệ Admin để được hỗ trợ." : undefined,
            voucherApplied,
            voucherAmount: voucherDeducted,
            studyMode
        }
    } catch (error: any) {
        console.error("Enroll Course Error:", error)
        return { success: false, message: error.message || "Không thể đăng ký khóa học." }
    }
}

/**
 * Xác nhận ngày bắt đầu hoặc Đặt lại lộ trình
 */
export async function confirmStartDateAction(courseId: number, date: string | Date) {
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
 * Nộp bài ghi nhận và tính điểm
 */
export async function submitAssignmentAction({
    enrollmentId, lessonId, reflection, links, supports,
    isUpdate = false, lessonOrder,
    currentMaxTime, currentDuration,
}: {
    enrollmentId: number, lessonId: string, reflection: string, links: string[], supports: boolean[],
    isUpdate?: boolean, lessonOrder?: number,
    currentMaxTime?: number, currentDuration?: number,
}) {
    const logId = `[SUBMIT-${lessonId}]`
    const __t0 = Date.now() // [PERF-TEST] tạm đo, sẽ xoá sau khi có số liệu
    console.log(`[PERF-TEST] SUBMIT_START t=${__t0}`)
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, message: "Phiên đăng nhập hết hạn." }

        const now = new Date()
        let timingScore = 0

        // 1. Lấy startedAt trực tiếp từ DB — không tin giá trị từ client
        //    để tránh lỗi sai lệch khi client gửi startedAt cũ (trước khi reset)
        //    hoặc bị giả mạo.
        if (lessonOrder) {
            const enrollmentForTiming = await prisma.enrollment.findUnique({
                where: { id: enrollmentId },
                select: { startedAt: true }
            })
            const startDate = enrollmentForTiming?.startedAt

            if (startDate) {
                // Tính deadline hoàn toàn bằng UTC thuần:
                //   deadline = startedAt + (lessonOrder - 1) ngày + 16:59:59.999
                //   = 23:59:59.999 giờ Việt Nam (UTC+7) của ngày tương ứng.
                //
                // startedAt luôn được lưu là UTC midnight (00:00:00.000Z) của
                // NGÀY VN mà học viên chọn (confirmStartDateAction dùng
                // `new Date("YYYY-MM-DD")`, ví dụ "2026-08-12" -> lưu thành
                // 2026-08-12T00:00:00.000Z) — bản thân giá trị này đã là một
                // "nhãn ngày VN", KHÔNG phải một thời điểm UTC cần quy đổi thêm.
                // Vì vậy chỉ cần cộng thẳng (lessonOrder-1) ngày rồi cộng
                // 16:59:59.999 UTC (= 23:59:59.999 VN) là ra đúng hạn nộp.
                //
                // (Bug cũ: có thêm 1 bước "quy đổi ngày VN" bằng
                // Math.floor((startUTC+7h)/1day)*1day-7h trước khi cộng
                // 16:59:59 — làm cộng dồn offset +7h hai lần, khiến hạn nộp
                // bị tính sớm hơn 7 tiếng, tức 16:59:59 VN thay vì 23:59:59 VN.
                // Phát hiện ngày 2026-08-14 khi nhiều học viên nộp bài đúng
                // ngày nhưng sau 17h VN vẫn bị tính nộp muộn.)
                const startUTC = startDate.getTime()

                const deadlineUTC = startUTC
                    + (lessonOrder - 1) * 86400000  // cộng (N-1) ngày
                    + 16 * 3600000                  // 16:59:59.999 UTC
                    + 59 * 60000                    // = 23:59:59.999 VN
                    + 59 * 1000
                    + 999

                const isCurrentlyOnTime = now.getTime() <= deadlineUTC

                console.log(`${logId} TIMING: startDate=${startDate.toISOString()} lessonOrder=${lessonOrder} deadlineUTC=${new Date(deadlineUTC).toISOString()} nowUTC=${now.toISOString()} onTime=${isCurrentlyOnTime}`)

                if (isCurrentlyOnTime) {
                    timingScore = 1
                } else if (isUpdate) {
                    // Cập nhật sau hạn: chỉ giữ "đúng hạn" nếu bài GỐC đã từng đạt
                    // hoàn thành (>=5đ, status COMPLETED) trước hạn — khi đó chặn
                    // luôn không cho sửa nữa (như cũ).
                    const existingStatus = await prisma.lessonProgress.findUnique({
                        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
                        select: { status: true }
                    })
                    if (existingStatus?.status === 'COMPLETED') {
                        return { success: false, message: "Bài học đã hết hạn cập nhật." }
                    }
                    timingScore = -1
                } else {
                    timingScore = -1
                }
            }
        }

        // 2. Lấy thông tin bài học + enrollment MỘT LẦN — dùng lại cho chấm điểm và thông báo Telegram bên dưới
        const [lesson, enrollmentInfo] = await Promise.all([
            prisma.lesson.findUnique({ where: { id: lessonId }, select: { videoUrl: true, title: true } }),
            prisma.enrollment.findUnique({
                where: { id: enrollmentId },
                select: { user: { select: { name: true, id: true } }, course: { select: { name_lop: true } } }
            })
        ])
        if (!lesson) return { success: false, message: "Không tìm thấy bài học." }

        // 3. Tính toán các đầu điểm
        const rawUrl = lesson.videoUrl ? String(lesson.videoUrl).trim() : ""
        const isYouTube = /youtu\.be\/|youtube\.com\/|v=|live\//.test(rawUrl)

        // [PERF] Điểm video được tính trực tiếp từ vị trí phát video ngay lúc bấm
        // "Ghi nhận kết quả" (client gửi kèm currentMaxTime/currentDuration) —
        // không còn đọc lại LessonProgress đã lưu từ trước.
        let videoScore = 2 // Không dùng video YouTube -> Auto +2
        if (rawUrl !== "" && rawUrl.toLowerCase() !== "null" && isYouTube) {
            const percent = currentDuration && currentDuration > 0 ? (currentMaxTime ?? 0) / currentDuration : 0
            videoScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
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

        // [PERF] Thông báo Telegram + ghi log hoạt động không cần chặn response
        // trả về cho client (client đã tự cập nhật UI optimistic) — chạy SAU khi
        // response đã gửi đi bằng after() của Next.js, thay vì await trực tiếp.
        console.log(`🔍 Kiểm tra trạng thái bài học: ${updatedProgress.status}, Điểm: ${totalScore}`);
        if (updatedProgress.status === 'COMPLETED') {
            after(async () => {
                const __tAfterStart = Date.now()
                console.log(`[PERF-TEST] AFTER_CALLBACK_START t=${__tAfterStart} (+${__tAfterStart - __t0}ms since SUBMIT_START)`)
                try {
                    const { sendTelegram } = await import("@/lib/notifications")

                    const msgAdmin = `📚 <b>HOÀN THÀNH BÀI HỌC</b>\n\n` +
                        `👤 Thành viên: <b>${enrollmentInfo?.user?.name}</b> (#${enrollmentInfo?.user?.id})\n` +
                        `🎓 Khóa học: ${enrollmentInfo?.course?.name_lop}\n` +
                        `📖 Bài học: <b>${lesson.title}</b>\n` +
                        `🏆 Điểm số: <b>${totalScore}đ</b>\n` +
                        `📅 Thời gian: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;

                    console.log(`📡 Đang gửi thông báo Telegram LESSON đến ChatID: ${process.env.TELEGRAM_CHAT_ID_LESSON}`);
                    await sendTelegram(msgAdmin, 'LESSON');
                    console.log(`✅ Đã gửi thông báo Telegram LESSON thành công!`);

                    const { logActivity } = await import('@/lib/activity-logger')
                    if (enrollmentInfo?.user?.id) await logActivity({
                        userId: enrollmentInfo.user.id,
                        action: 'LESSON_COMPLETE',
                        detail: `Hoàn thành bài: ${lesson.title} (${totalScore}đ)`,
                        metadata: { enrollmentId, lessonTitle: lesson.title, score: totalScore, courseName: enrollmentInfo?.course?.name_lop || null, studentName: enrollmentInfo?.user?.name || null }
                    })
                } catch (teleError: any) {
                    console.error(`❌ Lỗi khi gửi thông báo Telegram LESSON:`, teleError.message);
                }
                console.log(`[PERF-TEST] AFTER_CALLBACK_DONE t=${Date.now()} (+${Date.now() - __t0}ms since SUBMIT_START)`)
            })
        }

        console.log(`[PERF-TEST] SUBMIT_RETURN t=${Date.now()} (+${Date.now() - __t0}ms since SUBMIT_START)`)
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
    const __t0 = Date.now() // [PERF-TEST] tạm đo, sẽ xoá sau khi có số liệu
    console.log(`[PERF-TEST] DRAFT_SAVE_START t=${__t0}`)
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
        console.log(`[PERF-TEST] DRAFT_SAVE_END t=${Date.now()} (+${Date.now() - __t0}ms)`)
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

        const pin = parseInt(formData.get('pin') as string) || 0
        const courseData: Record<string, unknown> = {
            id_khoa: id_khoa.toUpperCase(),
            name_lop: toTitleCase(name_lop),
            name_khoa: formData.get('name_khoa') ? toTitleCase(formData.get('name_khoa') as string) : null,
            category: categoryName,
            categoryId,
            type: (formData.get('type') as string) || 'NORMAL',
            status: formData.get('status') === 'true',
            pin,
            date_join: formData.get('date_join') as string || null,
            mo_ta_ngan: formData.get('mo_ta_ngan') as string || null,
            mo_ta_dai: formData.get('mo_ta_dai') as string || null,
            link_anh_bia: formData.get('link_anh_bia') as string || null,
            phi_coc: parseInt(formData.get('phi_coc') as string) || 0,
            feeType: (formData.get('feeType') as string) || 'MIEN_PHI',
            requiresReferralActivation: formData.get('requiresReferralActivation') === 'true',
            referralActivationThreshold: parseInt(formData.get('referralActivationThreshold') as string) || 0,
            noidung_stk: formData.get('noidung_stk') as string || null,
            link_zalo: formData.get('link_zalo') as string || null,
            file_email: formData.get('file_email') as string || null,
            noidung_email: formData.get('noidung_email') as string || null,
            voucherConfig: (formData.get('voucherConfig') as string) || 'WALLET',
            allowMbvDeduction: formData.get('allowMbvDeduction') !== 'false',
        }
 
        // ✅ Enforce a maximum of 3 pinned courses on course creation
        if (pin > 0) {
            const pinnedCount = await prisma.course.count({
               where: { pin: { gt: 0 } }
            })
            if (pinnedCount >= 3) {
               return { success: false, error: 'Chỉ được ghim tối đa 3 khóa học. Vui lòng bỏ ghim một khóa trước khi ghim khóa khác.' }
            }
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
            data: courseData as Prisma.CourseCreateInput
        })

        // Create accepted voucher records
        const acceptedVoucherIdsRaw = formData.get('acceptedVoucherIds') as string
        if (acceptedVoucherIdsRaw) {
            try {
                const ids = JSON.parse(acceptedVoucherIdsRaw) as number[]
                if (ids.length > 0) {
                    await prisma.courseAcceptedVoucher.createMany({
                        data: ids.map(voucherId => ({ courseId: newCourse.id, voucherId }))
                    })
                }
            } catch {}
        }

        // Create award voucher records
        const awardVoucherIdsRaw = formData.get('awardVoucherIds') as string
        if (awardVoucherIdsRaw) {
            try {
                const ids = JSON.parse(awardVoucherIdsRaw) as number[]
                if (ids.length > 0) {
                    await prisma.courseVoucherAward.createMany({
                        data: ids.map(voucherId => ({ courseId: newCourse.id, voucherId }))
                    })
                }
            } catch {}
        }

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

// ==========================================
// CHECK ENROLLMENT STATUS - Kiểm tra trạng thái ghi danh (cho polling)
// ==========================================
export async function checkEnrollmentStatusAction(courseId: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { status: null }
        const userId = Number(session.user.id)
        const enrollment = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId, courseId } },
            select: { status: true }
        })
        return { status: enrollment?.status ?? null }
    } catch {
        return { status: null }
    }
}

/**
 * Lấy số dư ví Voucher của User hiện tại
 */
export async function getBrkVoucherBalanceAction() {
    try {
        const session = await auth()
        if (!session?.user?.id) return 0
        const userId = Number(session.user.id)
        const wallet = await prisma.brkWallet.findUnique({
            where: { userId },
            select: { voucherBalance: true }
        })
        return Number(wallet?.voucherBalance || 0)
    } catch {
        return 0
    }
}

/**
 * Lấy số dư ví MBV (Merit Bank Voucher) của User hiện tại
 */
export async function getBrkMbvBalanceAction() {
    try {
        const session = await auth()
        if (!session?.user?.id) return 0
        const userId = Number(session.user.id)
        const wallet = await prisma.brkWallet.findUnique({
            where: { userId },
            select: { mbvBalance: true }
        })
        return Number(wallet?.mbvBalance || 0)
    } catch {
        return 0
    }
}

/**
 * Lấy số dư ví VNĐ (balance) của User hiện tại
 */
export async function getBrkVndWalletBalanceAction() {
    try {
        const session = await auth()
        if (!session?.user?.id) return 0
        const userId = Number(session.user.id)
        const wallet = await prisma.brkWallet.findUnique({
            where: { userId },
            select: { balance: true }
        })
        return Number(wallet?.balance || 0)
    } catch {
        return 0
    }
}

