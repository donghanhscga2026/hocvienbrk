'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { getGieoHatSummary, toVnDateString } from "@/lib/course/gieo-hat"
import { decideFinalize } from "@/lib/course/gieo-hat-decision"
import { generateTransferContent, generateVietQR } from "@/lib/vietqr"
import { resolveBankBin } from "@/lib/bank-bin"
import { requireDomainEnrollment } from "@/lib/website/domain-context"
import { getCourseAuthContext, canManageCourse } from "@/lib/course/permissions"

/**
 * Gieo hạt cam kết — GĐ2: chốt số phía học viên, duyệt phía giảng viên.
 *
 * Quy tắc đã chốt (kế hoạch Gieo hạt cam kết, mục 8):
 * - Học viên giữ nguyên hoặc tăng số tiền → tự duyệt ngay, sinh nội dung
 *   chuyển khoản CC và mã QR. Giảm → bắt buộc lý do, giảng viên duyệt.
 * - Người duyệt: giảng viên của khóa (Course.teacherId), admin/root dự
 *   phòng (theo helper quyền dùng chung lib/course/permissions).
 * - Tiền về thẳng tài khoản giảng viên của khóa; giảng viên xác nhận đã
 *   nhận bằng tay ở bản này (đối soát tự động để GĐ3).
 */

function parseLessonOrders(raw: unknown): number[] {
    if (!Array.isArray(raw)) return []
    return raw.filter((n): n is number => typeof n === "number" && Number.isFinite(n))
}

function getTiming(scores: unknown): number | null {
    if (scores && typeof scores === "object" && "timing" in scores) {
        const t = (scores as { timing?: unknown }).timing
        return typeof t === "number" ? t : null
    }
    return null
}

/** Guard phía học viên: session + enrollment thuộc về user đang đăng nhập. */
async function requireOwnEnrollment(enrollmentId: number) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Phiên đăng nhập hết hạn." as const }
    const userId = Number(session.user.id)
    await requireDomainEnrollment(enrollmentId, userId)
    const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId, userId },
        select: {
            id: true,
            userId: true,
            courseId: true,
            user: { select: { phone: true } },
            course: {
                select: {
                    id: true,
                    id_khoa: true,
                    teacherBankAccount: {
                        select: { accountNumber: true, accountHolder: true, bankName: true },
                    },
                },
            },
        },
    })
    if (!enrollment) return { error: "Không tìm thấy ghi danh." as const }
    return { error: null, userId, enrollment }
}

// ==========================================
// HỌC VIÊN — Chốt số gieo hạt
// ==========================================
export async function finalizeGieoHatAction(
    enrollmentId: number,
    proposedAmount: number,
    studentNote?: string | null
) {
    try {
        const guard = await requireOwnEnrollment(enrollmentId)
        if (guard.error) return { success: false as const, error: guard.error }
        const { userId, enrollment } = guard

        // Server tự tính lại toàn bộ — không tin bất kỳ con số nào từ client.
        const summary = await getGieoHatSummary(enrollmentId)
        if (!summary) return { success: false as const, error: "Không tìm thấy ghi danh." }
        if (!summary.enabled) {
            return { success: false as const, error: "Khóa học này chưa bật tính năng gieo hạt." }
        }
        if (summary.reason === "NOT_STARTED") {
            return { success: false as const, error: "Bạn chưa chọn ngày bắt đầu học nên chưa chốt được gieo hạt." }
        }
        if (summary.reason === "ENROLLMENT_NOT_ACTIVE") {
            return { success: false as const, error: "Ghi danh chưa kích hoạt nên chưa chốt được gieo hạt." }
        }

        // Đang có đợt chốt xử lý dở (chờ duyệt hoặc đã duyệt chưa trả) → chặn
        // tạo trùng. Đợt REJECTED không chặn: bài của nó đã được tính lại.
        const active = await prisma.gieoHatSettlement.findFirst({
            where: { enrollmentId, status: { in: ["PROPOSED", "APPROVED"] } },
            select: { id: true },
        })
        if (active) {
            return {
                success: false as const,
                error: "Bạn đang có một đợt chốt gieo hạt chưa xử lý xong. Hoàn tất đợt đó trước khi chốt đợt mới.",
            }
        }

        const violatingItems = summary.items.filter(i => i.status === "LATE" || i.status === "MISSING")
        const note = (studentNote || "").trim()
        const decision = decideFinalize({
            computedAmount: summary.computedAmount,
            violatingCount: violatingItems.length,
            proposedAmount,
            studentNote: note,
        })
        if (decision.mode === "INVALID") {
            return { success: false as const, error: decision.reason || "Số tiền đề nghị không hợp lệ." }
        }
        if (decision.mode === "EMPTY") {
            return { success: false as const, error: "Chưa có khoản gieo hạt nào cần chốt." }
        }

        const bankAcc = enrollment.course.teacherBankAccount
        const isAutoApproved = decision.mode === "AUTO_APPROVED"
        const transferContent = isAutoApproved
            ? generateTransferContent({
                  phone: enrollment.user.phone,
                  userId,
                  courseCode: enrollment.course.id_khoa,
                  bankName: bankAcc?.bankName,
                  kind: "CC",
              })
            : null
        // Số cuối = 0 (học viên không phạm buổi nào phải tính tiền nhưng vẫn
        // chốt để khóa các bài đã liệt kê) → không có gì để chuyển khoản,
        // đóng đợt luôn ở trạng thái PAID như khi giảng viên duyệt 0đ.
        const zeroFinal = isAutoApproved && proposedAmount === 0

        const settlement = await prisma.gieoHatSettlement.create({
            data: {
                enrollmentId,
                courseId: enrollment.courseId,
                userId,
                // periodTo là nhãn ngày VN (hết hôm qua) — lưu UTC midnight
                // của ngày đó, cùng convention với Enrollment.startedAt.
                periodTo: new Date(`${summary.periodTo}T00:00:00.000Z`),
                lessonOrders: violatingItems.map(i => i.order),
                lateCount: summary.lateCount,
                missingCount: summary.missingCount,
                computedAmount: summary.computedAmount,
                proposedAmount,
                studentNote: note || null,
                finalAmount: isAutoApproved ? proposedAmount : null,
                status: isAutoApproved ? (zeroFinal ? "PAID" : "APPROVED") : "PROPOSED",
                transferContent,
                paidConfirmedAt: zeroFinal ? new Date() : null,
            },
            select: { id: true, status: true },
        })
        return { success: true as const, settlementId: settlement.id, status: settlement.status }
    } catch (error: any) {
        console.error("finalizeGieoHatAction error:", error)
        return { success: false as const, error: error?.message || "Không chốt được gieo hạt. Bạn thử lại sau nhé." }
    }
}

// ==========================================
// HỌC VIÊN — Báo đã chuyển khoản
// ==========================================
export async function markGieoHatTransferredAction(settlementId: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false as const, error: "Phiên đăng nhập hết hạn." }
        const userId = Number(session.user.id)

        const settlement = await prisma.gieoHatSettlement.findUnique({
            where: { id: settlementId },
            select: { id: true, status: true, studentMarkedPaidAt: true, enrollmentId: true, userId: true },
        })
        if (!settlement || settlement.userId !== userId) {
            return { success: false as const, error: "Không tìm thấy đợt chốt gieo hạt." }
        }
        await requireDomainEnrollment(settlement.enrollmentId, userId)
        if (settlement.status !== "APPROVED") {
            return { success: false as const, error: "Đợt chốt này chưa ở trạng thái chờ chuyển khoản." }
        }
        if (!settlement.studentMarkedPaidAt) {
            await prisma.gieoHatSettlement.update({
                where: { id: settlementId },
                data: { studentMarkedPaidAt: new Date() },
            })
        }
        return { success: true as const }
    } catch (error: any) {
        console.error("markGieoHatTransferredAction error:", error)
        return { success: false as const, error: error?.message || "Không ghi nhận được. Bạn thử lại sau nhé." }
    }
}

// ==========================================
// HỌC VIÊN — Thông tin thanh toán (QR) của đợt đã duyệt
// ==========================================
export async function getGieoHatPaymentInfoAction(settlementId: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false as const, error: "Phiên đăng nhập hết hạn." }
        const userId = Number(session.user.id)

        const settlement = await prisma.gieoHatSettlement.findUnique({
            where: { id: settlementId },
            select: {
                id: true,
                status: true,
                finalAmount: true,
                transferContent: true,
                userId: true,
                course: {
                    select: {
                        teacherBankAccount: {
                            select: { accountNumber: true, accountHolder: true, bankName: true },
                        },
                    },
                },
            },
        })
        if (!settlement || settlement.userId !== userId) {
            return { success: false as const, error: "Không tìm thấy đợt chốt gieo hạt." }
        }
        if (settlement.status !== "APPROVED") {
            return { success: false as const, error: "Đợt chốt này chưa được duyệt." }
        }

        const bankAcc = settlement.course.teacherBankAccount
        const finalAmount = settlement.finalAmount ?? 0
        if (!bankAcc?.accountNumber || !bankAcc?.accountHolder || !settlement.transferContent) {
            // Khóa chưa cấu hình tài khoản nhận → panel báo rõ thay vì hiện QR.
            return {
                success: true as const,
                bankConfigured: false as const,
                finalAmount,
                transferContent: settlement.transferContent,
            }
        }

        // Sinh ảnh VietQR bằng đúng nội dung CC đã lưu lúc duyệt (không sinh
        // lại nội dung mới). Lỗi API VietQR → dự phòng ảnh img.vietqr.io như
        // luồng đăng ký khóa học đang dùng.
        let qrCodeUrl: string | null = null
        try {
            const qrResult = await generateVietQR({
                accountNo: bankAcc.accountNumber,
                accountName: bankAcc.accountHolder,
                acqId: bankAcc.bankName || "SACOMBANK",
                amount: finalAmount,
                addInfo: settlement.transferContent,
            })
            qrCodeUrl = qrResult.qrDataURL
        } catch (qrError) {
            console.error("getGieoHatPaymentInfoAction VietQR error:", qrError)
        }
        if (!qrCodeUrl) {
            const bankId = resolveBankBin(bankAcc.bankName)
            qrCodeUrl = `https://img.vietqr.io/image/${bankId}-${bankAcc.accountNumber}-qr_only.png?amount=${finalAmount}&addInfo=${encodeURIComponent(settlement.transferContent)}&accountName=${encodeURIComponent(bankAcc.accountHolder)}`
        }

        return {
            success: true as const,
            bankConfigured: true as const,
            finalAmount,
            transferContent: settlement.transferContent,
            qrCodeUrl,
            bankName: bankAcc.bankName || "",
            accountNumber: bankAcc.accountNumber,
            accountHolder: bankAcc.accountHolder,
        }
    } catch (error: any) {
        console.error("getGieoHatPaymentInfoAction error:", error)
        return { success: false as const, error: error?.message || "Không tải được mã QR. Bạn thử lại sau nhé." }
    }
}

// ==========================================
// GIẢNG VIÊN / ADMIN — Danh sách duyệt
// ==========================================
export interface GieoHatReviewItem {
    id: number
    courseId: number
    courseName: string
    courseCode: string
    enrollmentId: number
    studentId: number
    studentName: string
    studentPhone: string
    computedAmount: number
    proposedAmount: number | null
    finalAmount: number | null
    studentNote: string | null
    lateCount: number
    missingCount: number
    lessonCount: number
    createdAt: string
    studentMarkedPaidAt: string | null
}

/** Phạm vi khóa được duyệt: admin → tất cả; giảng viên → khóa của mình. */
async function getReviewScope() {
    const ctx = await getCourseAuthContext()
    if (!ctx || (!ctx.isAdmin && !ctx.isTeacher)) return null
    return ctx
}

function toReviewItem(s: any): GieoHatReviewItem {
    return {
        id: s.id,
        courseId: s.courseId,
        courseName: s.course?.name_lop || s.course?.id_khoa || "",
        courseCode: s.course?.id_khoa || "",
        enrollmentId: s.enrollmentId,
        studentId: s.userId,
        studentName: s.user?.name || "",
        studentPhone: s.user?.phone || "",
        computedAmount: s.computedAmount,
        proposedAmount: s.proposedAmount,
        finalAmount: s.finalAmount,
        studentNote: s.studentNote,
        lateCount: s.lateCount,
        missingCount: s.missingCount,
        lessonCount: parseLessonOrders(s.lessonOrders).length,
        createdAt: new Date(s.createdAt).toISOString(),
        studentMarkedPaidAt: s.studentMarkedPaidAt ? new Date(s.studentMarkedPaidAt).toISOString() : null,
    }
}

const REVIEW_SELECT = {
    id: true,
    courseId: true,
    enrollmentId: true,
    userId: true,
    lessonOrders: true,
    lateCount: true,
    missingCount: true,
    computedAmount: true,
    proposedAmount: true,
    finalAmount: true,
    studentNote: true,
    createdAt: true,
    studentMarkedPaidAt: true,
    user: { select: { name: true, phone: true } },
    course: { select: { name_lop: true, id_khoa: true } },
} as const

export async function listGieoHatForReviewAction(courseId?: number) {
    try {
        const ctx = await getReviewScope()
        if (!ctx) return { success: false as const, error: "Bạn không có quyền duyệt gieo hạt." }

        // Danh sách khóa trong phạm vi (cho bộ lọc) — chỉ khóa đã bật gieo hạt.
        const courses = await prisma.course.findMany({
            where: {
                gieoHatEnabled: true,
                ...(ctx.isAdmin ? {} : { teacherId: ctx.userId }),
            },
            select: { id: true, name_lop: true, id_khoa: true },
            orderBy: { id: "asc" },
        })

        if (courseId) {
            const target = await prisma.course.findUnique({
                where: { id: courseId },
                select: { teacherId: true },
            })
            if (!target || !canManageCourse(ctx, target.teacherId)) {
                return { success: false as const, error: "Bạn không có quyền duyệt gieo hạt của khóa này." }
            }
        }

        const courseScope = courseId
            ? { courseId }
            : { courseId: { in: courses.map(c => c.id) } }

        const [pendingReview, awaitingConfirm] = await Promise.all([
            prisma.gieoHatSettlement.findMany({
                where: { ...courseScope, status: "PROPOSED" },
                select: REVIEW_SELECT,
                orderBy: { createdAt: "asc" },
            }),
            prisma.gieoHatSettlement.findMany({
                where: { ...courseScope, status: "APPROVED", studentMarkedPaidAt: { not: null } },
                select: REVIEW_SELECT,
                orderBy: { studentMarkedPaidAt: "asc" },
            }),
        ])

        return {
            success: true as const,
            courses: courses.map(c => ({ id: c.id, name: c.name_lop || c.id_khoa, code: c.id_khoa })),
            pendingReview: pendingReview.map(toReviewItem),
            awaitingConfirm: awaitingConfirm.map(toReviewItem),
        }
    } catch (error: any) {
        console.error("listGieoHatForReviewAction error:", error)
        return { success: false as const, error: error?.message || "Không tải được danh sách duyệt gieo hạt." }
    }
}

// ==========================================
// GIẢNG VIÊN / ADMIN — Chi tiết bảng kê của 1 đợt chốt
// ==========================================
export async function getGieoHatSettlementDetailAction(settlementId: number) {
    try {
        const ctx = await getReviewScope()
        if (!ctx) return { success: false as const, error: "Bạn không có quyền xem đợt chốt này." }

        const settlement = await prisma.gieoHatSettlement.findUnique({
            where: { id: settlementId },
            select: {
                id: true,
                courseId: true,
                enrollmentId: true,
                userId: true,
                periodTo: true,
                lessonOrders: true,
                lateCount: true,
                missingCount: true,
                computedAmount: true,
                proposedAmount: true,
                finalAmount: true,
                studentNote: true,
                status: true,
                reviewNote: true,
                createdAt: true,
                user: { select: { name: true, phone: true } },
                course: { select: { name_lop: true, id_khoa: true, teacherId: true } },
                enrollment: { select: { startedAt: true } },
            },
        })
        if (!settlement) return { success: false as const, error: "Không tìm thấy đợt chốt gieo hạt." }
        if (!canManageCourse(ctx, settlement.course.teacherId)) {
            return { success: false as const, error: "Bạn không có quyền xem đợt chốt của khóa này." }
        }

        const orders = parseLessonOrders(settlement.lessonOrders).sort((a, b) => a - b)
        const startedAt = settlement.enrollment.startedAt
        const [lessons, progresses] = await Promise.all([
            prisma.lesson.findMany({
                where: { courseId: settlement.courseId, order: { in: orders } },
                select: { id: true, order: true, title: true },
            }),
            prisma.lessonProgress.findMany({
                where: { enrollmentId: settlement.enrollmentId, status: { not: "RESET" } },
                select: { lessonId: true, status: true, scores: true },
            }),
        ])
        const lessonByOrder = new Map(lessons.map(l => [l.order, l]))
        const progressByLesson = new Map(progresses.map(p => [p.lessonId, p]))

        // Trạng thái từng bài tính lại từ dữ liệu nộp thật tại thời điểm xem,
        // hạn nộp theo đúng convention của lib/course/gieo-hat.ts (ngày bắt
        // đầu VN + (order-1) ngày).
        const items = orders.map(order => {
            const lesson = lessonByOrder.get(order)
            const progress = lesson ? progressByLesson.get(lesson.id) : undefined
            const completed = progress?.status === "COMPLETED"
            const status = !lesson
                ? "MISSING"
                : completed && getTiming(progress?.scores) === -1
                  ? "LATE"
                  : completed
                    ? "ON_TIME"
                    : "MISSING"
            return {
                order,
                title: lesson?.title || `Bài ${order}`,
                deadline: startedAt
                    ? toVnDateString(new Date(new Date(startedAt).getTime() + (order - 1) * 86400000))
                    : "",
                status: status as "LATE" | "MISSING" | "ON_TIME",
            }
        })

        return {
            success: true as const,
            settlement: {
                id: settlement.id,
                status: settlement.status,
                studentId: settlement.userId,
                studentName: settlement.user?.name || "",
                studentPhone: settlement.user?.phone || "",
                courseName: settlement.course?.name_lop || settlement.course?.id_khoa || "",
                periodTo: toVnDateString(settlement.periodTo),
                lateCount: settlement.lateCount,
                missingCount: settlement.missingCount,
                computedAmount: settlement.computedAmount,
                proposedAmount: settlement.proposedAmount,
                finalAmount: settlement.finalAmount,
                studentNote: settlement.studentNote,
                reviewNote: settlement.reviewNote,
                createdAt: new Date(settlement.createdAt).toISOString(),
            },
            items,
        }
    } catch (error: any) {
        console.error("getGieoHatSettlementDetailAction error:", error)
        return { success: false as const, error: error?.message || "Không tải được chi tiết đợt chốt." }
    }
}

// ==========================================
// GIẢNG VIÊN / ADMIN — Duyệt / trả lại 1 đề nghị
// ==========================================
export async function reviewGieoHatAction(
    settlementId: number,
    decision: "APPROVE" | "REJECT",
    finalAmount?: number | null,
    note?: string | null
) {
    try {
        const ctx = await getReviewScope()
        if (!ctx) return { success: false as const, error: "Bạn không có quyền duyệt gieo hạt." }

        const settlement = await prisma.gieoHatSettlement.findUnique({
            where: { id: settlementId },
            select: {
                id: true,
                status: true,
                userId: true,
                proposedAmount: true,
                computedAmount: true,
                transferContent: true,
                course: {
                    select: {
                        id_khoa: true,
                        teacherId: true,
                        teacherBankAccount: { select: { bankName: true } },
                    },
                },
                user: { select: { phone: true } },
            },
        })
        if (!settlement) return { success: false as const, error: "Không tìm thấy đợt chốt gieo hạt." }
        if (!canManageCourse(ctx, settlement.course.teacherId)) {
            return { success: false as const, error: "Bạn không có quyền duyệt gieo hạt của khóa này." }
        }
        if (settlement.status !== "PROPOSED") {
            return { success: false as const, error: "Đợt chốt này đã được xử lý rồi." }
        }

        const reviewNote = (note || "").trim()
        const now = new Date()

        if (decision === "REJECT") {
            if (!reviewNote) {
                return { success: false as const, error: "Trả lại đề nghị cần ghi rõ lý do để học viên hiểu và chốt lại." }
            }
            await prisma.gieoHatSettlement.update({
                where: { id: settlementId },
                data: { status: "REJECTED", reviewedBy: ctx.userId, reviewedAt: now, reviewNote },
            })
            return { success: true as const, status: "REJECTED" as const }
        }

        const final = finalAmount ?? settlement.proposedAmount ?? settlement.computedAmount
        if (!Number.isFinite(final) || !Number.isInteger(final) || final < 0) {
            return { success: false as const, error: "Số tiền cuối cùng phải là số nguyên từ 0 trở lên." }
        }

        if (final === 0) {
            // Duyệt 0đ: không có gì để chuyển khoản → đóng đợt luôn.
            await prisma.gieoHatSettlement.update({
                where: { id: settlementId },
                data: {
                    status: "PAID",
                    finalAmount: 0,
                    reviewedBy: ctx.userId,
                    reviewedAt: now,
                    reviewNote: reviewNote || null,
                    paidConfirmedBy: ctx.userId,
                    paidConfirmedAt: now,
                },
            })
            return { success: true as const, status: "PAID" as const }
        }

        const transferContent =
            settlement.transferContent ||
            generateTransferContent({
                phone: settlement.user.phone,
                userId: settlement.userId,
                courseCode: settlement.course.id_khoa,
                bankName: settlement.course.teacherBankAccount?.bankName,
                kind: "CC",
            })
        await prisma.gieoHatSettlement.update({
            where: { id: settlementId },
            data: {
                status: "APPROVED",
                finalAmount: final,
                reviewedBy: ctx.userId,
                reviewedAt: now,
                reviewNote: reviewNote || null,
                transferContent,
            },
        })
        return { success: true as const, status: "APPROVED" as const }
    } catch (error: any) {
        console.error("reviewGieoHatAction error:", error)
        return { success: false as const, error: error?.message || "Không xử lý được đề nghị. Bạn thử lại sau nhé." }
    }
}

// ==========================================
// GIẢNG VIÊN / ADMIN — Xác nhận đã nhận tiền
// ==========================================
export async function confirmGieoHatReceivedAction(settlementId: number) {
    try {
        const ctx = await getReviewScope()
        if (!ctx) return { success: false as const, error: "Bạn không có quyền xác nhận gieo hạt." }

        const settlement = await prisma.gieoHatSettlement.findUnique({
            where: { id: settlementId },
            select: {
                id: true,
                status: true,
                course: { select: { teacherId: true } },
            },
        })
        if (!settlement) return { success: false as const, error: "Không tìm thấy đợt chốt gieo hạt." }
        if (!canManageCourse(ctx, settlement.course.teacherId)) {
            return { success: false as const, error: "Bạn không có quyền xác nhận gieo hạt của khóa này." }
        }
        if (settlement.status !== "APPROVED") {
            return { success: false as const, error: "Đợt chốt này chưa ở trạng thái chờ xác nhận tiền về." }
        }

        const now = new Date()
        await prisma.gieoHatSettlement.update({
            where: { id: settlementId },
            data: { status: "PAID", paidConfirmedBy: ctx.userId, paidConfirmedAt: now },
        })
        return { success: true as const }
    } catch (error: any) {
        console.error("confirmGieoHatReceivedAction error:", error)
        return { success: false as const, error: error?.message || "Không xác nhận được. Bạn thử lại sau nhé." }
    }
}
