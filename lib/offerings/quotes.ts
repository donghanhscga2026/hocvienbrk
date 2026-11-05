import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { CrmError } from '@/lib/crm/service'
import { requestScope } from '@/lib/crm/requests'
import type { CrmActor } from '@/lib/crm/shared'
import { offeringDetailsSchema } from './shared'
import { MIN_DIRECT_RATE } from '@/lib/affiliate/config-rules'
import { quoteDraftSchema, quoteKey, quoteSchema, type ServiceQuote } from './quotes-shared'

type Tx = Prisma.TransactionClient
export const quoteRefKey = (id: string) => 'catalog:quote-ref:' + id
const codeKey = (code: string) => 'catalog:quote-code:' + code
const orderKey = (id: number) => 'catalog:quote-order:' + id
export async function readQuote(tx: Pick<Tx, 'systemConfig'>, requestId: string) {
  const record = await tx.systemConfig.findUnique({ where: { key: quoteKey(requestId) } })
  return record ? quoteSchema.parse(record.value) : null
}
async function writeQuote(tx: Tx, quote: ServiceQuote) {
  const value = { ...quote, version: quote.version + 1, updatedAt: new Date().toISOString() }
  await tx.systemConfig.upsert({ where: { key: quoteKey(quote.requestId) }, create: { key: quoteKey(quote.requestId), value }, update: { value } })
  return value
}
async function lock(tx: Tx, key: string) { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))` }
function checkVersion(quote: ServiceQuote | null, version: number) {
  if ((quote?.version || 0) !== version) throw new CrmError('Báo giá đã thay đổi. Tải lại trước khi tiếp tục.', 409)
}
async function notify(tx: Tx, quote: ServiceQuote, recipientId: number, event: string, title: string) {
  await tx.appNotification.upsert({ where: { eventKey: `service-quote:${quote.requestId}:${quote.version}:${event}` }, update: {}, create: {
    eventKey: `service-quote:${quote.requestId}:${quote.version}:${event}`, recipientId, kind: recipientId === quote.buyerId ? 'REQUEST_UPDATED' : 'REQUEST_INCOMING', title, courseId: quote.courseId, requestId: quote.requestId,
  } })
}
export async function quoteRequest(tx: Pick<Tx, 'crmRequest'>, id: string, actor: CrmActor | { id: number }, staff: boolean) {
  const request = await tx.crmRequest.findFirst({ where: { id, ...(staff ? requestScope(actor as CrmActor) : { userId: actor.id }) }, include: { course: { include: { teacherBankAccount: true, teacher: { select: { name: true } } } } } })
  if (!request || !request.course || request.course.productGroup !== 'SERVICE' || request.userId == null || request.ownerId == null || request.ownerId !== request.course.teacherId)
    throw new CrmError('Không tìm thấy yêu cầu dịch vụ trong phạm vi của bạn.', 404)
  return request
}
export async function getQuote(db: PrismaClient, id: string, actor: CrmActor | { id: number }, staff: boolean) {
  const request = await quoteRequest(db, id, actor, staff)
  const quote = await readQuote(db, id)
  if (!quote) {
    const config = await db.systemConfig.findUnique({ where: { key: 'catalog:offering:' + request.courseId } })
    if (offeringDetailsSchema.safeParse(config?.value || {}).data?.service?.saleMode !== 'QUOTE') throw new CrmError('Dịch vụ không dùng báo giá riêng.', 404)
  }
  // Customers never receive unpublished draft details, bank numbers or affiliate metadata.
  if (!staff && (!quote || quote.status === 'DRAFT')) return { quote: null }
  const safe = quote ? { ...quote, affiliateId: undefined, refCode: undefined, gratitudeId: undefined, bank: quote.status === 'ACCEPTED' ? quote.bank : null } : null
  return { quote: staff ? quote : safe, defaults: staff ? { title: request.course!.name_lop, customerName: request.name, scope: request.content } : undefined }
}
export async function saveQuote(db: PrismaClient, actor: CrmActor, requestId: string, version: number, draft: unknown, send: boolean) {
  const input = quoteDraftSchema.parse(draft)
  return db.$transaction(async tx => {
    await lock(tx, quoteKey(requestId))
    const request = await quoteRequest(tx, requestId, actor, true)
    const previous = await readQuote(tx, requestId)
    checkVersion(previous, version)
    if (previous && previous.status !== 'DRAFT') throw new CrmError('Chỉ sửa bản nháp. Thu hồi báo giá chưa xác nhận để sửa.', 409)
    const course = request.course!
    const config = await tx.systemConfig.findUnique({ where: { key: 'catalog:offering:' + course.id } })
    if (offeringDetailsSchema.safeParse(config?.value || {}).data?.service?.saleMode !== 'QUOTE') throw new CrmError('Dịch vụ không dùng báo giá riêng.')
    const bank = course.teacherBankAccount
    if (send && (!bank?.accountNumber || !bank.accountHolder || !bank.bankName || bank.accountType !== 'BANK')) throw new CrmError('Chọn tài khoản ngân hàng nhận chuyển khoản cho dịch vụ trước khi gửi báo giá.')
    const ref = await tx.systemConfig.findUnique({ where: { key: quoteRefKey(requestId) } })
    const data = ref?.value as { affiliateId?: number | null; refCode?: string | null; gratitudeId?: number | null } | null
    const buyer = await tx.user.findUnique({ where: { id: request.userId! }, select: { referrerId: true } })
    const quote: ServiceQuote = {
      requestId, version: previous?.version || 0, status: send ? 'SENT' : 'DRAFT', courseId: course.id, slug: course.id_khoa,
      ownerId: request.ownerId!, buyerId: request.userId!, customerName: request.name, ownerName: course.teacher?.name || 'Người phụ trách',
      ...input, affiliateId: previous ? previous.affiliateId : data?.affiliateId ?? null, refCode: previous ? previous.refCode : data?.refCode ?? null,
      gratitudeId: previous ? previous.gratitudeId : data ? data.gratitudeId ?? null : buyer?.referrerId ?? null,
      bank: bank ? { id: bank.id, accountHolder: bank.accountHolder, accountNumber: bank.accountNumber, bankName: bank.bankName || '' } : null,
      installments: input.installments.map(part => ({ ...part, code: '', orderId: null, paidAt: null, reportedAt: null })), updatedAt: new Date().toISOString(), acceptedAt: null,
    }
    const saved = await writeQuote(tx, quote)
    if (send) await notify(tx, saved, saved.buyerId, 'sent', 'Bạn đã nhận được báo giá dịch vụ')
    return { quote: saved }
  }, { timeout: 15000 })
}
export async function changeQuote(db: PrismaClient, actor: CrmActor | { id: number }, id: string, version: number, action: 'ACCEPT' | 'WITHDRAW' | 'REPORT', staff: boolean, installment = 0) {
  return db.$transaction(async tx => {
    await lock(tx, quoteKey(id))
    await quoteRequest(tx, id, actor, staff)
    const quote = await readQuote(tx, id)
    if (!quote) throw new CrmError('Không tìm thấy báo giá.', 404)
    checkVersion(quote, version)
    if (action === 'WITHDRAW') {
      if (!staff || quote.status !== 'SENT') throw new CrmError('Chỉ thu hồi báo giá chưa xác nhận.', 409)
      quote.status = 'DRAFT'
    } else if (action === 'ACCEPT') {
      if (staff || actor.id !== quote.buyerId || quote.status !== 'SENT' || !quote.bank) throw new CrmError('Không thể xác nhận báo giá này.', 409)
      // An accepted quote is immutable. Each installment has its own real order.
      await tx.productAffiliateConfig.upsert({ where: { productType_productId: { productType: 'COURSE', productId: quote.courseId } }, update: {}, create: { productType: 'COURSE', productId: quote.courseId, directRate: MIN_DIRECT_RATE, isActive: true, createdBy: quote.ownerId } })
      for (const part of quote.installments) {
        const order = await tx.order.create({ data: { buyerId: quote.buyerId, affiliateId: quote.affiliateId, refCode: quote.refCode, totalAmount: part.amount, status: 'PENDING', items: { create: { productType: 'COURSE', productId: quote.courseId, productName: `${quote.title} · ${part.label}`, unitPrice: part.amount, quantity: 1 } } } })
        part.code = 'SQ' + randomBytes(10).toString('hex').toUpperCase()
        part.orderId = order.id
        await tx.systemConfig.create({ data: { key: codeKey(part.code), value: { requestId: id, orderId: order.id } } })
        await tx.systemConfig.create({ data: { key: orderKey(order.id), value: { requestId: id, courseId: quote.courseId, gratitudeId: quote.gratitudeId } } })
      }
      quote.status = 'ACCEPTED'; quote.acceptedAt = new Date().toISOString()
    } else {
      const part = quote.installments[installment]
      if (staff || quote.status !== 'ACCEPTED' || !part || part.paidAt) throw new CrmError('Không thể báo chuyển khoản cho đợt này.', 409)
      if (part.reportedAt) return { updated: true }
      part.reportedAt = new Date().toISOString()
    }
    const saved = await writeQuote(tx, quote)
    await notify(tx, saved, action === 'WITHDRAW' ? saved.buyerId : saved.ownerId, action, action === 'ACCEPT' ? 'Khách đã đồng ý báo giá dịch vụ' : action === 'REPORT' ? 'Khách báo đã chuyển khoản dịch vụ, cần đối soát' : 'Báo giá đã được thu hồi để chỉnh sửa')
    return { updated: true }
  }, { timeout: 20000 })
}
export async function settleQuoteCommission(db: PrismaClient, orderId: number) {
  // Quote commissions, conversion and wallet entries commit together. A failed
  // attempt cannot leave a partial conversion that suppresses the next retry.
  try {
    return await db.$transaction(async tx => {
      await lock(tx, 'quote-commission:' + orderId)
      const result = await (await import('@/lib/affiliate/unified-commission')).processOrderCommission(orderId, tx)
      if (!result.success || result.message === 'No campaign') throw new Error('Hoa hồng chưa xử lý xong.')
      return result
    }, { timeout: 20000 })
  } catch { return { success: false } }
}
export async function confirmQuotePayment(db: PrismaClient, input: { requestId: string; index: number; actor?: CrmActor; receipt: string; amount?: number; bankAccountId?: number }) {
  const orderId = await db.$transaction(async tx => {
    await lock(tx, quoteKey(input.requestId))
    if (input.actor) await quoteRequest(tx, input.requestId, input.actor, true)
    const quote = await readQuote(tx, input.requestId)
    const part = quote?.installments[input.index]
    if (!quote || quote.status !== 'ACCEPTED' || !part?.orderId || !quote.bank) throw new CrmError('Không có đợt thanh toán phù hợp.', 404)
    if (input.bankAccountId != null && input.bankAccountId !== quote.bank.id) throw new CrmError('Tài khoản nhận tiền không khớp báo giá.')
    if (input.amount != null && (!Number.isSafeInteger(input.amount) || input.amount < part.amount)) throw new CrmError('Số tiền chưa đủ cho đợt thanh toán.')
    if (part.paidAt) return part.orderId
    if (quote.installments.slice(0, input.index).some(previous => !previous.paidAt)) throw new CrmError('Cần xác nhận các đợt trước trước khi đối soát đợt này.', 409)
    const key = 'catalog:quote-receipt:' + createHash('sha256').update(quote.bank.id + ':' + input.receipt.trim().toUpperCase()).digest('hex')
    await lock(tx, key)
    const receipt = await tx.systemConfig.findUnique({ where: { key } })
    if (receipt) throw new CrmError('Mã giao dịch đã dùng cho đợt thanh toán khác.', 409)
    await tx.systemConfig.create({ data: { key, value: { orderId: part.orderId, requestId: quote.requestId } } })
    const now = new Date()
    await tx.order.update({ where: { id: part.orderId }, data: { status: 'PAID', paidAt: now } })
    const enrollment = await tx.enrollment.upsert({ where: { userId_courseId: { userId: quote.buyerId, courseId: quote.courseId } },
      create: { userId: quote.buyerId, courseId: quote.courseId, status: 'ACTIVE', studyMode: 'COMPANION', phi_coc: quote.total, activatedAt: now, referrerId: quote.affiliateId }, update: {} })
    if (!['ACTIVE', 'COMPLETED'].includes(enrollment.status)) await tx.enrollment.update({ where: { id: enrollment.id }, data: { status: 'ACTIVE', activatedAt: enrollment.activatedAt || now } })
    // Enrollment links enable existing settlement/commission ownership reports.
    await tx.orderItem.updateMany({ where: { orderId: part.orderId }, data: { enrollmentId: enrollment.id } })
    part.paidAt = now.toISOString()
    const saved = await writeQuote(tx, quote)
    await notify(tx, saved, saved.buyerId, 'paid:' + input.index, `Đã xác nhận thanh toán ${part.label}`)
    return part.orderId
  }, { timeout: 20000 })
  const commission = await settleQuoteCommission(db, orderId)
  return { updated: true, commissionPending: !commission.success }
}
export async function matchQuoteTransfer(db: PrismaClient, input: { content: string; amount: number; receipt: string; bankAccountId: number }) {
  const code = input.content.toUpperCase().match(/SQ[A-F0-9]{20}/)?.[0]
  if (!code) return null
  const row = await db.systemConfig.findUnique({ where: { key: codeKey(code) } })
  if (!row) throw new CrmError('Không tìm thấy mã báo giá cho giao dịch.')
  const index = row.value as { requestId: string; orderId: number }
  const quote = await readQuote(db, index.requestId)
  const partIndex = quote?.installments.findIndex(part => part.code === code) ?? -1
  if (partIndex < 0) throw new CrmError('Mã thanh toán không còn hợp lệ.')
  return confirmQuotePayment(db, { ...input, requestId: index.requestId, index: partIndex })
}
