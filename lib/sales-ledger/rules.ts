/**
 * Luật ghi sổ cái doanh số — logic thuần, test độc lập. GĐ2A (23/10/2026).
 *
 * Nguyên tắc:
 * - Chỉ đơn PAID mới sinh dòng ACCRUAL. Đơn REFUNDED/CANCELLED sinh dòng
 *   REVERSAL đối ứng với ACCRUAL đã ghi (xử lý ở tầng đồng bộ).
 * - TEACHER: theo từng dòng hàng là khóa học — giảng viên của khóa đó
 *   được ghi GMV của dòng hàng (đơn giá × số lượng). Giảng viên tự mua
 *   khóa của mình thì không ghi (không phải doanh số tạo ra cho chính mình).
 * - AFFILIATE: tổng GMV các dòng hàng mà người affiliate KHÔNG phải là
 *   giảng viên của dòng hàng đó (giữ luật loại trừ giảng viên tự quảng
 *   bá khóa mình đã có ở engine hoa hồng), và khác người mua.
 * - dedupeKey xác định duy nhất một dòng sổ: {orderId}:{role}:{courseId|ALL}:{type}
 *   → đồng bộ chạy lại bao nhiêu lần cũng không ghi trùng.
 */

export type LedgerRole = 'TEACHER' | 'AFFILIATE'
export type LedgerType = 'ACCRUAL' | 'REVERSAL'

export interface LedgerEntryDraft {
    userId: number
    role: LedgerRole
    type: LedgerType
    orderId: number
    courseId: number | null
    amount: number
    dedupeKey: string
    occurredAt: Date
}

export interface OrderForLedger {
    id: number
    buyerId: number
    affiliateId: number | null
    totalAmount: number
    paidAt: Date | null
    createdAt: Date
    items: { productType: string; productId: number; unitPrice: number; quantity: number }[]
}

export function dedupeKey(orderId: number, role: LedgerRole, courseId: number | null, type: LedgerType): string {
    return `${orderId}:${role}:${courseId ?? 'ALL'}:${type}`
}

/** Tính các dòng sổ cho một đơn PAID. teacherByCourse: courseId → teacherId (null = chưa gán). */
export function accrualEntriesForOrder(
    order: OrderForLedger,
    teacherByCourse: Map<number, number | null>,
): LedgerEntryDraft[] {
    const occurredAt = order.paidAt ?? order.createdAt
    const entries: LedgerEntryDraft[] = []
    const courseItems = order.items.filter((i) => i.productType === 'COURSE')

    for (const item of courseItems) {
        const teacherId = teacherByCourse.get(item.productId) ?? null
        const amount = item.unitPrice * item.quantity
        if (teacherId && teacherId !== order.buyerId && amount > 0) {
            entries.push({
                userId: teacherId, role: 'TEACHER', type: 'ACCRUAL',
                orderId: order.id, courseId: item.productId, amount,
                dedupeKey: dedupeKey(order.id, 'TEACHER', item.productId, 'ACCRUAL'),
                occurredAt,
            })
        }
    }

    if (order.affiliateId && order.affiliateId !== order.buyerId) {
        let affiliateAmount = 0
        for (const item of courseItems) {
            const teacherId = teacherByCourse.get(item.productId) ?? null
            if (teacherId !== order.affiliateId) affiliateAmount += item.unitPrice * item.quantity
        }
        if (affiliateAmount > 0) {
            entries.push({
                userId: order.affiliateId, role: 'AFFILIATE', type: 'ACCRUAL',
                orderId: order.id, courseId: null, amount: affiliateAmount,
                dedupeKey: dedupeKey(order.id, 'AFFILIATE', null, 'ACCRUAL'),
                occurredAt,
            })
        }
    }
    return entries
}

/** Dòng REVERSAL đối ứng từ một dòng ACCRUAL đã ghi (giữ nguyên số tiền). */
export function reversalForAccrual(accrual: {
    userId: number; role: LedgerRole; orderId: number; courseId: number | null; amount: number; occurredAt: Date
}, reversedAt: Date): LedgerEntryDraft {
    return {
        userId: accrual.userId,
        role: accrual.role,
        type: 'REVERSAL',
        orderId: accrual.orderId,
        courseId: accrual.courseId,
        amount: accrual.amount,
        dedupeKey: dedupeKey(accrual.orderId, accrual.role, accrual.courseId, 'REVERSAL'),
        occurredAt: reversedAt,
    }
}
