import prisma from '@/lib/prisma'
import { accrualEntriesForOrder, reversalForAccrual, type LedgerEntryDraft } from './rules'

/**
 * Đồng bộ sổ cái doanh số từ bảng Order — idempotent, chạy lại an toàn.
 * Thiết kế có chủ đích: KHÔNG hook vào các luồng thanh toán (SePay, duyệt
 * tay, VietQR...) — đồng bộ quét theo trạng thái đơn nên bao phủ mọi kênh
 * và tự lành khi có đơn đổi trạng thái. Gọi từ cron /api/cron/sales-ledger
 * hoặc nút "Đồng bộ ngay" ở trang quản trị.
 */

export interface SyncResult {
    scannedPaid: number
    accrualsCreated: number
    reversalsCreated: number
}

async function insertMissing(entries: LedgerEntryDraft[]): Promise<number> {
    if (entries.length === 0) return 0
    const existing = await prisma.memberSalesLedger.findMany({
        where: { dedupeKey: { in: entries.map((e) => e.dedupeKey) } },
        select: { dedupeKey: true },
    })
    const have = new Set(existing.map((e) => e.dedupeKey))
    const missing = entries.filter((e) => !have.has(e.dedupeKey))
    if (missing.length === 0) return 0
    await prisma.memberSalesLedger.createMany({
        data: missing.map((e) => ({
            userId: e.userId, role: e.role, type: e.type, orderId: e.orderId,
            courseId: e.courseId, amount: e.amount, dedupeKey: e.dedupeKey, occurredAt: e.occurredAt,
        })),
        skipDuplicates: true,
    })
    return missing.length
}

export async function syncSalesLedger(batchSize = 200): Promise<SyncResult> {
    let accrualsCreated = 0
    let scannedPaid = 0
    let cursor = 0

    // Lượt 1: đơn PAID → ACCRUAL còn thiếu
    for (;;) {
        const orders = await prisma.order.findMany({
            where: { status: 'PAID', id: { gt: cursor } },
            orderBy: { id: 'asc' },
            take: batchSize,
            include: { items: { select: { productType: true, productId: true, unitPrice: true, quantity: true } } },
        })
        if (orders.length === 0) break
        cursor = orders[orders.length - 1].id
        scannedPaid += orders.length

        const courseIds = [...new Set(orders.flatMap((o) => o.items.filter((i) => i.productType === 'COURSE').map((i) => i.productId)))]
        const courses = courseIds.length
            ? await prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, teacherId: true } })
            : []
        const teacherByCourse = new Map(courses.map((c) => [c.id, c.teacherId]))

        const drafts = orders.flatMap((o) => accrualEntriesForOrder(o, teacherByCourse))
        accrualsCreated += await insertMissing(drafts)
        if (orders.length < batchSize) break
    }

    // Lượt 2: đơn đã rời trạng thái PAID (REFUNDED/CANCELLED) nhưng còn
    // ACCRUAL chưa có REVERSAL đối ứng → ghi REVERSAL theo đúng số tiền gốc.
    const orphanAccruals = await prisma.memberSalesLedger.findMany({
        where: {
            type: 'ACCRUAL',
            orderId: {
                in: (await prisma.order.findMany({
                    where: { status: { in: ['REFUNDED', 'CANCELLED'] } },
                    select: { id: true },
                })).map((o) => o.id),
            },
        },
        select: { userId: true, role: true, orderId: true, courseId: true, amount: true, occurredAt: true, dedupeKey: true },
    })
    let reversalsCreated = 0
    if (orphanAccruals.length > 0) {
        const existingReversals = await prisma.memberSalesLedger.findMany({
            where: { type: 'REVERSAL', orderId: { in: [...new Set(orphanAccruals.map((a) => a.orderId))] } },
            select: { dedupeKey: true },
        })
        const haveReversal = new Set(existingReversals.map((r) => r.dedupeKey))
        const now = new Date()
        const drafts = orphanAccruals
            .map((a) => reversalForAccrual({ userId: a.userId, role: a.role, orderId: a.orderId, courseId: a.courseId, amount: a.amount, occurredAt: a.occurredAt }, now))
            .filter((d) => !haveReversal.has(d.dedupeKey))
        reversalsCreated = await insertMissing(drafts)
    }

    return { scannedPaid, accrualsCreated, reversalsCreated }
}
