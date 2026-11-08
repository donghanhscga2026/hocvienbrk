import 'server-only'
import { EnrollmentMode, type Prisma } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { readOfferingDetails } from './server'
import { isQuoteService } from './service'
import { captureCheckout, capturePurchase, type PurchaseSnapshot } from './purchase-snapshot'

// Mua kèm ưu đãi (Đợt 2): khách chọn thêm món ngay tại bước thanh toán của món chính.
// Mỗi món kèm là một ghi danh riêng, giá kèm được chốt trong ảnh chụp mua hàng của
// chính món đó nên đơn hàng và hoa hồng vẫn tính theo từng món như khi mua lẻ.
// Khách chỉ chuyển khoản MỘT lần: số tiền trên thanh toán của món chính bằng tiền
// món chính cộng tổng giá kèm. Mối liên kết món chính → món kèm nằm ở dòng
// SystemConfig catalog:attach:<id ghi danh chính>; món kèm chỉ được mở quyền khi
// món chính được kích hoạt (xem syncAttachInTransaction).

export const attachLinkKey = (mainEnrollmentId: number) => `catalog:attach:${mainEnrollmentId}`

const attachLinkSchema = z.object({
  items: z
    .array(
      z.object({
        enrollmentId: z.number().int().positive(),
        courseId: z.number().int().positive(),
        price: z.number().int().nonnegative(),
      }),
    )
    .max(5)
    .default([]),
})
export type AttachLinkItem = z.infer<typeof attachLinkSchema>['items'][number]
type AttachDb = Pick<Prisma.TransactionClient, 'systemConfig'>

export async function readAttachLink(db: AttachDb, mainEnrollmentId: number): Promise<AttachLinkItem[]> {
  const row = await db.systemConfig.findUnique({ where: { key: attachLinkKey(mainEnrollmentId) } })
  if (!row) return []
  const parsed = attachLinkSchema.safeParse(row.value)
  return parsed.success ? parsed.data.items : []
}

export type AttachSelectionItem = { courseId: number; price: number; name: string }

// Chốt danh sách món kèm hợp lệ từ lựa chọn của khách: giá và điều kiện chỉ lấy từ
// cấu hình của món chính và dữ liệu thật của món kèm, không tin phía khách gửi lên.
// Món không còn hợp lệ (đã có quyền, khác người phụ trách, chuyển sang báo giá riêng,
// giá kèm không còn thấp hơn giá lẻ) bị bỏ qua lặng lẽ để không chặn lượt mua món chính.
export async function resolveAttachSelection(args: {
  userId: number
  mainCourseId: number
  mainTeacherId: number | null
  selectedIds: number[]
}): Promise<AttachSelectionItem[]> {
  const { userId, mainCourseId, mainTeacherId, selectedIds } = args
  if (!selectedIds.length) return []
  const details = await readOfferingDetails(mainCourseId)
  if (!details.attachEnabled || !details.attachItems.length) return []
  const wanted = new Set(selectedIds)
  const valid: AttachSelectionItem[] = []
  for (const entry of details.attachItems) {
    if (!wanted.has(entry.courseId) || entry.courseId === mainCourseId) continue
    const target = await prisma.course.findUnique({
      where: { id: entry.courseId },
      select: { id: true, name_lop: true, productGroup: true, phi_coc: true, teacherId: true, type: true },
    })
    if (!target) continue
    if (!['DIGITAL', 'SERVICE'].includes(target.productGroup) || target.type === 'SYS' || target.type === 'LIB') continue
    if (mainTeacherId != null && target.teacherId !== mainTeacherId) continue
    if (target.phi_coc <= entry.price) continue
    if (target.productGroup === 'SERVICE') {
      const targetDetails = await readOfferingDetails(target.id)
      if (isQuoteService(targetDetails)) continue
    }
    const owned = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: target.id } },
      select: { id: true },
    })
    if (owned) continue
    valid.push({ courseId: target.id, price: entry.price, name: target.name_lop || '' })
  }
  return valid
}

// Tạo ghi danh cho từng món kèm trong cùng giao dịch với ghi danh món chính.
// Món kèm ở trạng thái chờ kích hoạt và không có thanh toán riêng: tiền của chúng
// nằm trong số tiền thanh toán của món chính.
export async function createAttachEnrollments(
  tx: Prisma.TransactionClient,
  args: {
    userId: number
    mainEnrollmentId: number
    items: AttachSelectionItem[]
    bank: PurchaseSnapshot['bank']
    gratitudeId: number | null
    referrerId: number | null
    refCode: string | null
  },
): Promise<AttachLinkItem[]> {
  const created: AttachLinkItem[] = []
  for (const item of args.items) {
    const enrollment = await tx.enrollment.create({
      data: {
        userId: args.userId,
        courseId: item.courseId,
        status: 'PENDING',
        studyMode: EnrollmentMode.COMPANION,
        phi_coc: item.price,
        referrerId: args.referrerId,
      },
    })
    const checkout = await captureCheckout(tx, args.userId, item.courseId, {
      price: item.price,
      bank: args.bank,
      gratitudeId: args.gratitudeId,
    })
    await capturePurchase(tx, enrollment.id, { ...checkout, affiliateId: args.referrerId, refCode: args.refCode })
    created.push({ enrollmentId: enrollment.id, courseId: item.courseId, price: item.price })
  }
  if (created.length) {
    const key = attachLinkKey(args.mainEnrollmentId)
    await tx.systemConfig.upsert({ where: { key }, create: { key, value: { items: created } }, update: {} })
  }
  return created
}

// Khi ghi danh món chính đã có quyền, mở quyền cho các món kèm trong cùng giao dịch
// và ghi nhận đơn hàng riêng cho từng món kèm. Trả về id các ghi danh món kèm đã
// bảo đảm có quyền và đơn hàng; chưa kích hoạt món chính thì không làm gì.
export async function syncAttachInTransaction(
  tx: Prisma.TransactionClient,
  mainEnrollmentId: number,
): Promise<number[]> {
  const items = await readAttachLink(tx, mainEnrollmentId)
  if (!items.length) return []
  const main = await tx.enrollment.findUnique({
    where: { id: mainEnrollmentId },
    select: { status: true, activatedAt: true },
  })
  if (!main || !['ACTIVE', 'COMPLETED'].includes(main.status)) return []
  const { createOrderForEnrollment } = await import('@/lib/affiliate/unified-commission')
  const done: number[] = []
  for (const item of items) {
    const enrollment = await tx.enrollment.findUnique({ where: { id: item.enrollmentId } })
    if (!enrollment || ['CANCELLED', 'REJECTED'].includes(enrollment.status)) continue
    if (enrollment.status === 'PENDING') {
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { status: 'ACTIVE', activatedAt: enrollment.activatedAt || main.activatedAt || new Date() },
      })
    }
    const order = await createOrderForEnrollment(enrollment.id, tx)
    if (!order.success) throw new Error(order.error || 'Không ghi nhận được đơn hàng cho món mua kèm.')
    done.push(enrollment.id)
  }
  return done
}

export async function syncAttachPurchase(mainEnrollmentId: number): Promise<number[]> {
  return prisma.$transaction((tx) => syncAttachInTransaction(tx, mainEnrollmentId), { timeout: 20000 })
}

// Tính hoa hồng cho các đơn món kèm đã ghi nhận (gọi sau khi giao dịch kích hoạt xong).
export async function settleAttachOrders(attachEnrollmentIds: number[]): Promise<void> {
  if (!attachEnrollmentIds.length) return
  const { settleEnrollmentOrder } = await import('@/lib/affiliate/unified-commission')
  for (const id of attachEnrollmentIds) {
    try {
      await settleEnrollmentOrder(id)
    } catch (error) {
      console.error('[Attach] settleEnrollmentOrder error:', error)
    }
  }
}

export async function settleAttachPurchases(mainEnrollmentId: number): Promise<void> {
  const ids = await syncAttachPurchase(mainEnrollmentId).catch(() => [] as number[])
  await settleAttachOrders(ids)
}

// Tổng tiền món kèm còn đang chờ kích hoạt cùng món chính — dùng để cộng vào số
// tiền khách còn phải chuyển khi quay lại thanh toán món chính ở lượt sau.
export async function getAttachPendingTotal(mainEnrollmentId: number): Promise<number> {
  const items = await readAttachLink(prisma, mainEnrollmentId)
  if (!items.length) return 0
  const rows = await prisma.enrollment.findMany({
    where: { id: { in: items.map((item) => item.enrollmentId) }, status: 'PENDING' },
    select: { id: true },
  })
  const pending = new Set(rows.map((row) => row.id))
  return items.filter((item) => pending.has(item.enrollmentId)).reduce((sum, item) => sum + item.price, 0)
}
