/**
 * Gieo hạt cam kết — GĐ3: đối soát tự động nội dung chuyển khoản CC.
 *
 * Nội dung gieo hạt theo mẫu `SDT <6 số cuối> HV <mã học viên> CC <mã khóa>`
 * (xem lib/vietqr.ts generateTransferContent kind "CC"). Hai kênh tiền về
 * (webhook SePay + quét email Gmail) dùng chung file này để nhận diện và
 * tự đóng đợt chốt APPROVED → PAID khi tiền về đủ.
 *
 * Nguyên tắc an toàn:
 * - Nội dung có mẫu COC (học phí) KHÔNG BAO GIỜ được coi là gieo hạt.
 * - Chỉ đóng PAID khi số tiền >= số cuối (finalAmount). Thiếu tiền thì giữ
 *   nguyên cho giảng viên xử lý tay như GĐ2.
 * - Phép đóng PAID idempotent: updateMany có điều kiện status = APPROVED,
 *   giao dịch trùng (webhook retry / 2 kênh cùng thấy) tự thành no-op.
 * - paidConfirmedBy để trống (null) là dấu "tự động đối soát": GĐ2 chỉ ghi
 *   paidConfirmedBy khi có người thật xác nhận (hoặc duyệt 0đ), nên một đợt
 *   PAID với paidConfirmedBy = null chỉ có thể do đối soát tự động đóng.
 */

export interface GieoHatTransferRef {
    userId: number
    courseCode: string
}

/**
 * Nhận diện nội dung chuyển khoản gieo hạt. Trả null nếu không phải nội
 * dung CC (kể cả khi là nội dung học phí COC hoặc nội dung rác).
 * Regex không neo đầu: nội dung có thể có tiền tố "SEVQR " khi tài khoản
 * nhận là VietinBank.
 */
export function parseGieoHatContent(content: string): GieoHatTransferRef | null {
    if (!content) return null
    const text = String(content)

    // Nội dung học phí (có mẫu COC) không bao giờ là gieo hạt — chặn trước
    // để tránh nhận nhầm các mã khóa bắt đầu bằng "CC" trong nội dung COC.
    if (/COC[\s\._]*[A-Z0-9]/i.test(text)) return null

    const userIdMatch = text.match(/HV[\s\._]*(\d+)/i)
    if (!userIdMatch) return null
    const userId = parseInt(userIdMatch[1], 10)
    if (!Number.isFinite(userId) || userId <= 0) return null

    // Mẫu CC phải đứng độc lập (ký tự trước không phải chữ cái) để không
    // bắt nhầm chuỗi "CC" nằm giữa một từ/mã khác.
    const codeMatch = text.match(/(?:^|[^A-Z])CC[\s\._]*([A-Z0-9][A-Z0-9_-]*)/i)
    if (!codeMatch) return null
    const courseCode = codeMatch[1].toUpperCase()
    if (!courseCode) return null

    return { userId, courseCode }
}

export type GieoHatMatchOutcome = "MATCHED" | "UNDERPAID" | "NOT_FOUND" | "AMBIGUOUS"

export interface GieoHatMatchCandidate {
    id: number
    finalAmount: number | null
}

/**
 * Hàm quyết định thuần (test độc lập được): cho danh sách đợt chốt APPROVED
 * chưa trả của đúng 1 học viên + 1 khóa và số tiền vừa về, quyết định kết
 * quả đối soát. Tại một thời điểm mỗi enrollment tối đa 1 đợt APPROVED
 * chưa trả (GĐ2 đã chặn chốt trùng) nên > 1 ứng viên là bất thường →
 * AMBIGUOUS, không tự đóng, để giảng viên xử lý tay.
 */
export function decideGieoHatMatch(
    candidates: GieoHatMatchCandidate[],
    amount: number
): { outcome: GieoHatMatchOutcome; settlementId?: number } {
    if (!candidates || candidates.length === 0) return { outcome: "NOT_FOUND" }
    if (candidates.length > 1) return { outcome: "AMBIGUOUS" }
    const candidate = candidates[0]
    const finalAmount = candidate.finalAmount
    if (finalAmount == null || finalAmount <= 0) return { outcome: "NOT_FOUND" }
    if (amount >= finalAmount) return { outcome: "MATCHED", settlementId: candidate.id }
    return { outcome: "UNDERPAID", settlementId: candidate.id }
}

export interface GieoHatAutoConfirmResult {
    outcome: GieoHatMatchOutcome
    settlementId?: number
    /** Đợt đã ở PAID từ trước (kênh/giao dịch khác xử lý) — no-op an toàn. */
    alreadyPaid?: boolean
    message: string
}

/**
 * Đối soát 1 giao dịch tiền về với các đợt chốt gieo hạt đang APPROVED.
 * Dùng chung cho webhook SePay và kênh Gmail. Không ném lỗi ra ngoài:
 * mọi kết quả đều trả về dạng cấu trúc để kênh gọi ghi log/đánh dấu
 * ProcessedTransaction theo convention của kênh đó.
 */
export async function tryAutoConfirmGieoHat(opts: {
    userId: number
    courseCode: string
    amount: number
    transferTime?: Date | null
    source: "SEPAY" | "EMAIL"
    /** Webhook SePay biết tài khoản nhận thuộc giảng viên nào — khóa scope thêm cho chắc. */
    teacherId?: number
}): Promise<GieoHatAutoConfirmResult> {
    const tag = `[GIEO-HAT-AUTO][${opts.source}]`
    try {
        const { default: prisma } = await import("@/lib/prisma")

        const course = await prisma.course.findFirst({
            where: { id_khoa: { equals: opts.courseCode, mode: "insensitive" } },
            select: { id: true, id_khoa: true, teacherId: true },
        })
        if (!course) {
            const message = `Không tìm thấy khóa có mã ${opts.courseCode} cho giao dịch gieo hạt của HV ${opts.userId}`
            console.log(`${tag} NOT_FOUND — ${message}`)
            return { outcome: "NOT_FOUND", message }
        }
        if (opts.teacherId != null && course.teacherId !== opts.teacherId) {
            const message = `Khóa ${course.id_khoa} không thuộc giảng viên nhận tiền #${opts.teacherId} — bỏ qua đối soát gieo hạt của HV ${opts.userId}`
            console.log(`${tag} NOT_FOUND — ${message}`)
            return { outcome: "NOT_FOUND", message }
        }

        const candidates = await prisma.gieoHatSettlement.findMany({
            where: { userId: opts.userId, courseId: course.id, status: "APPROVED" },
            select: { id: true, finalAmount: true },
        })
        const decision = decideGieoHatMatch(candidates, opts.amount)

        if (decision.outcome === "NOT_FOUND") {
            const message = `Không có đợt gieo hạt nào đang chờ tiền về của HV ${opts.userId} khóa ${course.id_khoa}`
            console.log(`${tag} NOT_FOUND — ${message}`)
            return { outcome: "NOT_FOUND", message }
        }
        if (decision.outcome === "AMBIGUOUS") {
            const message = `HV ${opts.userId} khóa ${course.id_khoa} có ${candidates.length} đợt gieo hạt APPROVED chưa trả — cần đối soát thủ công`
            console.warn(`${tag} AMBIGUOUS — ${message}`)
            return { outcome: "AMBIGUOUS", message }
        }
        if (decision.outcome === "UNDERPAID") {
            const candidate = candidates[0]
            const message = `Giao dịch gieo hạt của HV ${opts.userId} khóa ${course.id_khoa} thiếu tiền: nhận ${opts.amount.toLocaleString("vi-VN")}đ, cần ${Number(candidate.finalAmount).toLocaleString("vi-VN")}đ — giữ nguyên chờ giảng viên xử lý`
            console.log(`${tag} UNDERPAID — ${message}`)
            return { outcome: "UNDERPAID", settlementId: decision.settlementId, message }
        }

        // MATCHED — đóng PAID có điều kiện status vẫn APPROVED (idempotent).
        // paidConfirmedBy để null = dấu tự động đối soát.
        const updated = await prisma.gieoHatSettlement.updateMany({
            where: { id: decision.settlementId, status: "APPROVED" },
            data: {
                status: "PAID",
                paidConfirmedAt: opts.transferTime ?? new Date(),
                paidConfirmedBy: null,
            },
        })
        if (updated.count === 0) {
            const message = `Đợt gieo hạt #${decision.settlementId} của HV ${opts.userId} khóa ${course.id_khoa} đã được đóng PAID trước đó — bỏ qua trùng lặp`
            console.log(`${tag} MATCHED (đã xử lý) — ${message}`)
            return { outcome: "MATCHED", settlementId: decision.settlementId, alreadyPaid: true, message }
        }
        const message = `Đã tự động đối soát gieo hạt: HV ${opts.userId} khóa ${course.id_khoa}, số tiền ${opts.amount.toLocaleString("vi-VN")}đ, đợt #${decision.settlementId} → PAID`
        console.log(`${tag} MATCHED — ${message}`)
        return { outcome: "MATCHED", settlementId: decision.settlementId, message }
    } catch (error: any) {
        const message = `Lỗi đối soát gieo hạt cho HV ${opts.userId} mã khóa ${opts.courseCode}: ${error?.message || "unknown"}`
        console.error(`${tag} ERROR — ${message}`)
        return { outcome: "NOT_FOUND", message }
    }
}
