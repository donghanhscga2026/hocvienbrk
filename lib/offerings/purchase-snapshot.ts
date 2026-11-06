import 'server-only'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

type DB = Pick<Prisma.TransactionClient, 'systemConfig'>
const bankSchema = z.object({ id: z.number().int(), accountNumber: z.string(), accountHolder: z.string(), bankName: z.string().nullable(), qrCodeUrl: z.string().nullable() })
const snapshotSchema = z.object({
  price: z.number().finite().nonnegative(), bank: bankSchema.nullable(),
  gratitudeId: z.number().int().nonnegative().nullable(),
  affiliateId: z.number().int().nonnegative().nullable().optional(), refCode: z.string().nullable().optional(),
})
export type PurchaseSnapshot = z.infer<typeof snapshotSchema>
export const purchaseKey = (id: number) => 'catalog:purchase:' + id
export const checkoutKey = (userId: number, courseId: number) => `catalog:checkout:${userId}:${courseId}`
export async function readPurchase(db: DB, enrollmentId: number) {
  const row = await db.systemConfig.findUnique({ where: { key: purchaseKey(enrollmentId) } })
  return row ? snapshotSchema.parse(row.value) : null
}
export async function captureCheckout(tx: Prisma.TransactionClient, userId: number, courseId: number, candidate: PurchaseSnapshot) {
  const key = checkoutKey(userId, courseId)
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
  const row = await tx.systemConfig.upsert({ where: { key }, create: { key, value: snapshotSchema.parse(candidate) }, update: {} })
  return snapshotSchema.parse(row.value)
}
export async function capturePurchase(tx: DB, enrollmentId: number, snapshot: PurchaseSnapshot) {
  const key = purchaseKey(enrollmentId), value = snapshotSchema.parse(snapshot)
  await tx.systemConfig.upsert({ where: { key }, create: { key, value }, update: {} })
}
export async function orderGratitude(db: DB, order: { id: number; buyer?: { referrerId: number | null } | null; items: { enrollmentId?: number | null }[] }) {
  const quote = await db.systemConfig.findUnique({ where: { key: 'catalog:quote-order:' + order.id } })
  if (quote) return (quote.value as { gratitudeId?: number | null }).gratitudeId ?? null
  const enrollmentId = order.items.find(item => item.enrollmentId != null)?.enrollmentId
  const purchase = enrollmentId != null ? await readPurchase(db, enrollmentId) : null
  return purchase ? purchase.gratitudeId : order.buyer?.referrerId ?? null
}
