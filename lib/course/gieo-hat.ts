import prisma from "@/lib/prisma"
import { computeCurrentDayOrder, toVnMidnightUTC } from "@/lib/course/deadline"

/**
 * Gieo hạt cam kết — tính số buổi nộp muộn / chưa nộp của 1 enrollment tính
 * đến hết ngày hôm qua (giờ VN) và số tiền gieo hạt tương ứng.
 *
 * Quy tắc (kế hoạch tính năng Gieo hạt cam kết, duyệt 05/11/2026):
 * - Hạn nộp của bài "Ngày N" dùng chung công thức ở lib/course/deadline.ts:
 *   ngày bắt đầu của từng học viên (Enrollment.startedAt) + (N-1) ngày, hết
 *   23:59:59 giờ VN. Bài được xét khi hạn của nó <= hết hôm qua, tức
 *   order < computeCurrentDayOrder(startedAt, now).
 * - Nộp muộn: có LessonProgress COMPLETED và scores.timing = -1 (hệ thống
 *   tự chấm lúc nộp bài trong submitAssignmentAction).
 * - Chưa nộp: không có LessonProgress COMPLETED.
 * - Bài đã nằm trong 1 lần chốt (GieoHatSettlement) APPROVED/PAID thì không
 *   tính lại — hiển thị riêng dạng SETTLED (kèm ngày chốt).
 * - Bài đang nằm trong 1 lần chốt PROPOSED (chờ giảng viên duyệt) thì hiển
 *   thị dạng PENDING_REVIEW và không cộng vào số tiền mới.
 * - 2 công tắc gieoHatCountLate / gieoHatCountMissing tắt loại nào thì bài
 *   thuộc loại đó vẫn liệt kê nhưng counted = false (không cộng tiền).
 */

export interface GieoHatSettings {
    enabled: boolean
    rate: number
    countLate: boolean
    countMissing: boolean
    dailyOnly: boolean
}

export interface GieoHatLessonInput {
    id: string
    order: number
    title: string
    isDailyChallenge: boolean
}

export interface GieoHatProgressInput {
    lessonId: string
    status: string
    scores: unknown
}

export interface GieoHatSettlementInput {
    id: number
    status: string
    lessonOrders: unknown
    createdAt: Date | string
    computedAmount: number
    proposedAmount: number | null
    finalAmount: number | null
    studentNote?: string | null
    reviewNote?: string | null
    reviewedAt?: Date | string | null
    transferContent?: string | null
    studentMarkedPaidAt?: Date | string | null
}

export type GieoHatItemStatus = "LATE" | "MISSING" | "SETTLED" | "PENDING_REVIEW"

export interface GieoHatItem {
    order: number
    lessonId: string
    title: string
    /** Hạn nộp dạng ngày VN "YYYY-MM-DD" */
    deadline: string
    status: GieoHatItemStatus
    /** Có cộng vào số tiền máy tính kỳ này không */
    counted: boolean
    /** Ngày chốt (VN "YYYY-MM-DD") — chỉ có khi status = SETTLED */
    settledDate?: string
}

export interface GieoHatPendingSettlement {
    id: number
    createdAt: string
    computedAmount: number
    proposedAmount: number | null
    lessonCount: number
}

/** Đợt chốt đang xử lý (PROPOSED chờ duyệt hoặc APPROVED chưa trả) — GĐ2. */
export interface GieoHatActiveSettlement {
    id: number
    status: "PROPOSED" | "APPROVED"
    createdAt: string
    computedAmount: number
    proposedAmount: number | null
    finalAmount: number | null
    studentNote: string | null
    transferContent: string | null
    studentMarkedPaidAt: string | null
    lessonCount: number
}

/** Đợt chốt gần nhất bị giảng viên trả lại — GĐ2. */
export interface GieoHatRejectedSettlement {
    id: number
    reviewedAt: string | null
    reviewNote: string | null
    computedAmount: number
    proposedAmount: number | null
}

export interface GieoHatSummary {
    enabled: boolean
    /** Lý do không tính được (chưa bắt đầu học / enrollment không ACTIVE...) */
    reason?: string
    rate: number
    /** Mốc tính: hết ngày hôm qua giờ VN, dạng "YYYY-MM-DD" */
    periodTo: string
    items: GieoHatItem[]
    lateCount: number
    missingCount: number
    computedAmount: number
    settledItems: GieoHatItem[]
    pendingSettlement: GieoHatPendingSettlement | null
    /** Đợt chốt đang xử lý (GĐ2) — null khi học viên được chốt đợt mới. */
    activeSettlement: GieoHatActiveSettlement | null
    /** Đợt chốt gần nhất bị trả lại (GĐ2) — để panel báo lý do cho học viên. */
    lastRejected: GieoHatRejectedSettlement | null
}

/** Định dạng 1 thời điểm về ngày VN "YYYY-MM-DD" (Asia/Ho_Chi_Minh). */
export function toVnDateString(date: Date | string): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date(date))
    const get = (type: string) => parts.find(p => p.type === type)?.value || ""
    return `${get("year")}-${get("month")}-${get("day")}`
}

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

/**
 * Hàm thuần: tính gieo hạt từ dữ liệu đã nạp sẵn (không chạm DB) để dễ kiểm
 * chứng độc lập. startedAt là mốc bắt đầu học của enrollment; now là thời
 * điểm tính (mặc định hiện tại) — mốc chốt luôn là hết ngày hôm qua giờ VN.
 */
export function computeGieoHatFromData(
    settings: GieoHatSettings,
    lessons: GieoHatLessonInput[],
    progresses: GieoHatProgressInput[],
    settlements: GieoHatSettlementInput[],
    startedAt: Date | string | null,
    now: Date | string = new Date()
): GieoHatSummary {
    // Mốc "hết hôm qua" giờ VN: toVnMidnightUTC trả về NHÃN ngày VN (mốc
    // 00:00 UTC của ngày VN đó) nên ngày hôm qua = nhãn hôm nay trừ 1 ngày.
    const todayVnMidnight = toVnMidnightUTC(now)
    const periodTo = toVnDateString(new Date(todayVnMidnight - 86400000))

    const base: GieoHatSummary = {
        enabled: settings.enabled,
        rate: settings.rate,
        periodTo,
        items: [],
        lateCount: 0,
        missingCount: 0,
        computedAmount: 0,
        settledItems: [],
        pendingSettlement: null,
        activeSettlement: null,
        lastRejected: null,
    }
    if (!settings.enabled) return { ...base, reason: "DISABLED" }
    if (!startedAt) return { ...base, reason: "NOT_STARTED" }

    const progressByLesson = new Map(progresses.map(p => [p.lessonId, p]))

    // Bài đã chốt ở các lần trước (APPROVED/PAID) và bài đang chờ duyệt (PROPOSED).
    const settledOrderToDate = new Map<number, string>()
    const pendingOrders = new Set<number>()
    let pendingSettlement: GieoHatPendingSettlement | null = null
    // GĐ2: đợt đang xử lý (PROPOSED/APPROVED mới nhất) + đợt bị trả lại gần
    // nhất. Đợt REJECTED không vào 2 map khóa bài ở trên nên các bài của nó
    // được tính lại bình thường ở kỳ này — đúng ý nghĩa "trả lại, chốt lại".
    let activeSettlement: GieoHatActiveSettlement | null = null
    let lastRejected: GieoHatRejectedSettlement | null = null
    for (const s of settlements) {
        const orders = parseLessonOrders(s.lessonOrders)
        if (s.status === "APPROVED" || s.status === "PAID") {
            for (const o of orders) settledOrderToDate.set(o, toVnDateString(s.createdAt))
        } else if (s.status === "PROPOSED") {
            for (const o of orders) pendingOrders.add(o)
            if (!pendingSettlement || s.id > pendingSettlement.id) {
                pendingSettlement = {
                    id: s.id,
                    createdAt: new Date(s.createdAt).toISOString(),
                    computedAmount: s.computedAmount,
                    proposedAmount: s.proposedAmount,
                    lessonCount: orders.length,
                }
            }
        }
        if (s.status === "PROPOSED" || s.status === "APPROVED") {
            if (!activeSettlement || s.id > activeSettlement.id) {
                activeSettlement = {
                    id: s.id,
                    status: s.status,
                    createdAt: new Date(s.createdAt).toISOString(),
                    computedAmount: s.computedAmount,
                    proposedAmount: s.proposedAmount,
                    finalAmount: s.finalAmount,
                    studentNote: s.studentNote ?? null,
                    transferContent: s.transferContent ?? null,
                    studentMarkedPaidAt: s.studentMarkedPaidAt
                        ? new Date(s.studentMarkedPaidAt).toISOString()
                        : null,
                    lessonCount: orders.length,
                }
            }
        } else if (s.status === "REJECTED") {
            if (!lastRejected || s.id > lastRejected.id) {
                lastRejected = {
                    id: s.id,
                    reviewedAt: s.reviewedAt ? new Date(s.reviewedAt).toISOString() : null,
                    reviewNote: s.reviewNote ?? null,
                    computedAmount: s.computedAmount,
                    proposedAmount: s.proposedAmount,
                }
            }
        }
    }

    // Bài đã đến hạn tính đến hết hôm qua: order < "Ngày thứ mấy hôm nay".
    const currentDayOrder = computeCurrentDayOrder(startedAt, now)
    const dueLessons = lessons
        .filter(l => (settings.dailyOnly ? l.isDailyChallenge : true))
        .filter(l => l.order >= 1 && l.order < currentDayOrder)
        .sort((a, b) => a.order - b.order)

    const rate = Math.max(0, Math.floor(settings.rate) || 0)
    let lateCount = 0
    let missingCount = 0

    for (const lesson of dueLessons) {
        // Hạn nộp = startedAt + (order-1) ngày, hết 23:59:59 VN → ngày VN
        // tương ứng là ngày bắt đầu VN + (order-1) ngày.
        const deadline = toVnDateString(
            new Date(new Date(startedAt).getTime() + (lesson.order - 1) * 86400000)
        )

        if (settledOrderToDate.has(lesson.order)) {
            base.settledItems.push({
                order: lesson.order,
                lessonId: lesson.id,
                title: lesson.title,
                deadline,
                status: "SETTLED",
                counted: false,
                settledDate: settledOrderToDate.get(lesson.order),
            })
            continue
        }
        if (pendingOrders.has(lesson.order)) {
            base.items.push({
                order: lesson.order,
                lessonId: lesson.id,
                title: lesson.title,
                deadline,
                status: "PENDING_REVIEW",
                counted: false,
            })
            continue
        }

        const progress = progressByLesson.get(lesson.id)
        const completed = progress?.status === "COMPLETED"
        if (completed && getTiming(progress.scores) === -1) {
            const counted = settings.countLate
            if (counted) lateCount++
            base.items.push({
                order: lesson.order,
                lessonId: lesson.id,
                title: lesson.title,
                deadline,
                status: "LATE",
                counted,
            })
        } else if (!completed) {
            const counted = settings.countMissing
            if (counted) missingCount++
            base.items.push({
                order: lesson.order,
                lessonId: lesson.id,
                title: lesson.title,
                deadline,
                status: "MISSING",
                counted,
            })
        }
        // COMPLETED đúng hạn (timing != -1) → không phạm, không liệt kê.
    }

    base.lateCount = lateCount
    base.missingCount = missingCount
    base.computedAmount = (lateCount + missingCount) * rate
    base.pendingSettlement = pendingSettlement
    base.activeSettlement = activeSettlement
    base.lastRejected = lastRejected
    return base
}

/**
 * Nạp dữ liệu thật của 1 enrollment rồi tính. Trả null khi enrollment không
 * tồn tại. Chỉ tính khi enrollment ACTIVE và khóa bật gieoHatEnabled.
 */
export async function getGieoHatSummary(enrollmentId: number): Promise<GieoHatSummary | null> {
    const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        select: {
            id: true,
            status: true,
            startedAt: true,
            courseId: true,
            course: {
                select: {
                    gieoHatEnabled: true,
                    gieoHatRate: true,
                    gieoHatCountLate: true,
                    gieoHatCountMissing: true,
                    gieoHatDailyOnly: true,
                },
            },
        },
    })
    if (!enrollment) return null

    const settings: GieoHatSettings = {
        enabled: enrollment.course.gieoHatEnabled,
        rate: enrollment.course.gieoHatRate,
        countLate: enrollment.course.gieoHatCountLate,
        countMissing: enrollment.course.gieoHatCountMissing,
        dailyOnly: enrollment.course.gieoHatDailyOnly,
    }
    if (!settings.enabled) {
        return computeGieoHatFromData(settings, [], [], [], enrollment.startedAt)
    }
    if (enrollment.status !== "ACTIVE") {
        return {
            ...computeGieoHatFromData(settings, [], [], [], enrollment.startedAt),
            reason: "ENROLLMENT_NOT_ACTIVE",
        }
    }

    const [lessons, progresses, settlements] = await Promise.all([
        prisma.lesson.findMany({
            where: { courseId: enrollment.courseId },
            select: { id: true, order: true, title: true, isDailyChallenge: true },
            orderBy: { order: "asc" },
        }),
        prisma.lessonProgress.findMany({
            where: { enrollmentId, status: { not: "RESET" } },
            select: { lessonId: true, status: true, scores: true },
        }),
        prisma.gieoHatSettlement.findMany({
            where: { enrollmentId },
            select: {
                id: true,
                status: true,
                lessonOrders: true,
                createdAt: true,
                computedAmount: true,
                proposedAmount: true,
                finalAmount: true,
                studentNote: true,
                reviewNote: true,
                reviewedAt: true,
                transferContent: true,
                studentMarkedPaidAt: true,
            },
            orderBy: { id: "asc" },
        }),
    ])

    return computeGieoHatFromData(settings, lessons, progresses, settlements, enrollment.startedAt)
}
