/**
 * Quyết định duyệt khi học viên chốt số gieo hạt — hàm thuần, không chạm DB,
 * tách riêng để kiểm chứng độc lập (xem kế hoạch Gieo hạt cam kết, điểm 2 đã
 * chốt: giữ nguyên hoặc tăng thì tự duyệt ngay; giảm mới cần giảng viên duyệt
 * và bắt buộc ghi lý do).
 *
 * - INVALID: số đề nghị không phải số nguyên >= 0, hoặc giảm mà thiếu lý do.
 * - EMPTY: không có bài phạm nào và số máy tính = 0 → không có gì để chốt.
 * - AUTO_APPROVED: đề nghị >= số máy tính.
 * - NEEDS_REVIEW: đề nghị < số máy tính, đã có lý do.
 */
export type GieoHatFinalizeMode = "AUTO_APPROVED" | "NEEDS_REVIEW" | "INVALID" | "EMPTY"

export interface GieoHatFinalizeDecision {
    mode: GieoHatFinalizeMode
    reason?: string
}

export function decideFinalize(input: {
    computedAmount: number
    violatingCount: number
    proposedAmount: number
    studentNote?: string | null
}): GieoHatFinalizeDecision {
    const { computedAmount, violatingCount, proposedAmount } = input
    if (!Number.isFinite(proposedAmount) || !Number.isInteger(proposedAmount) || proposedAmount < 0) {
        return { mode: "INVALID", reason: "Số tiền đề nghị phải là số nguyên từ 0 trở lên." }
    }
    if (violatingCount <= 0 && computedAmount <= 0) {
        return { mode: "EMPTY", reason: "Chưa có khoản gieo hạt nào cần chốt." }
    }
    if (proposedAmount < computedAmount) {
        const note = (input.studentNote || "").trim()
        if (!note) {
            return {
                mode: "INVALID",
                reason: "Bạn đang đề nghị giảm so với số máy tính — cần ghi lý do để giảng viên duyệt.",
            }
        }
        return { mode: "NEEDS_REVIEW" }
    }
    return { mode: "AUTO_APPROVED" }
}
