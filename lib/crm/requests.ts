import { createHmac } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { contactFields } from './validation'
import { CrmActor, canUseCrm, contactScope } from './shared'
import { CrmError } from './service'

export const requestInput = z.object({
  key: z.uuid(), courseId: z.number().int().positive().optional(), lessonId: z.string().max(100).optional(), commentId: z.number().int().positive().optional(),
  category: z.enum(['LEARNING', 'SUPPORT', 'CONSULTATION']), content: z.string().trim().min(1).max(4000),
  name: z.string().trim().max(150).default(''), email: z.string().max(254).default(''), phone: z.string().max(40).default(''),
  consent: z.literal(true), website: z.string().max(100).default(''),
}).strict()
export const requestUpdate = z.object({ id: z.uuid(), version: z.number().int().positive(), status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED']), resolution: z.string().trim().max(4000), publicReply: z.string().trim().max(4000).optional(), ownerId: z.number().int().nonnegative().nullable().optional() }).strict()

export function requestScope(actor: CrmActor): Prisma.CrmRequestWhereInput {
  if (!canUseCrm(actor.role)) throw new CrmError('Bạn không có quyền sử dụng CRM.', 403)
  return actor.role === 'ADMIN' ? {} : { ownerId: actor.id, OR: [{ course: { teacherId: actor.id } }, { courseId: null }] }
}
export async function readRequests(db: PrismaClient, actor: CrmActor, page: number, status?: string, contactId?: number, requestId?: string) {
  const scope = requestScope(actor)
  if (contactId != null && !await db.crmContact.findFirst({ where: { id: contactId, ...contactScope(actor) }, select: { id: true } })) throw new CrmError('Không có quyền xem hồ sơ.', 404)
  const where = { AND: [scope], ...(requestId ? { id: requestId } : {}), ...(status ? { status } : {}), ...(contactId == null ? {} : { contactId }) }
  const [requests, total] = await Promise.all([
    db.crmRequest.findMany({ where, include: { course: { select: { name_lop: true, id_khoa: true } }, formSubmission: {select:{id:true,formVersion:true,identityStatus:true}} }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20, skip: (page - 1) * 20 }),
    db.crmRequest.count({ where }),
  ])
  const contacts = await db.crmContact.findMany({ where: { AND: [contactScope(actor)], id: { in: requests.map(r => r.contactId).filter((id): id is number => id != null) } }, select: { id: true } })
  const accessible = new Set(contacts.map(c => c.id))
  return { requests: requests.map(row => {
    const { key, ipHash, history, ...safe } = row
    void key; void ipHash; void history
    return { ...safe, contactId: row.contactId != null && accessible.has(row.contactId) ? row.contactId : null }
  }), total }
}
export async function updateRequest(db: PrismaClient, actor: CrmActor, raw: unknown) {
  const input = requestUpdate.parse(raw)
  if (input.status === 'RESOLVED' && !input.resolution) throw new CrmError('Hãy ghi kết quả xử lý trước khi hoàn tất.')
  const previous = await db.crmRequest.findFirst({ where: { id: input.id, version: input.version, ...requestScope(actor) } })
  if (!previous) throw new CrmError('Yêu cầu đã thay đổi hoặc bạn không có quyền. Hãy tải lại.', 409)
  if (input.ownerId !== undefined) {
    if (actor.role !== 'ADMIN' || previous.courseId != null || await db.crmFormSubmission.findUnique({where:{requestId:previous.id},select:{id:true}})) throw new CrmError('Yêu cầu từ form riêng luôn thuộc chủ Page; chỉ quản trị viên phân công yêu cầu chung.', 403)
    const owner = input.ownerId == null ? null : await db.user.findUnique({ where: { id: input.ownerId }, select: { role: true } })
    if (input.ownerId != null && (!owner || !canUseCrm(owner.role))) throw new CrmError('Người phụ trách không có quyền CRM.')
  }
  const history = Array.isArray(previous.history) ? previous.history : []
  const result = await db.crmRequest.updateMany({ where: { id: input.id, version: input.version, ...requestScope(actor) }, data: { ownerId: input.ownerId, status: input.status, resolution: input.resolution, publicReply: input.publicReply, history: [...history, { ownerId: previous.ownerId, status: previous.status, resolution: previous.resolution, publicReply: previous.publicReply, changedBy: actor.id, changedAt: new Date().toISOString() }], version: { increment: 1 } } })
  if (!result.count) throw new CrmError('Yêu cầu đã thay đổi hoặc bạn không có quyền. Hãy tải lại.', 409)
  return { updated: true }
}
export async function requestSource(db: PrismaClient, actor: CrmActor, id: string) {
  const row = await db.crmRequest.findFirst({ where: { id, ...requestScope(actor) } })
  if (!row) throw new CrmError('Không có quyền xem nguồn yêu cầu.', 404)
  const lesson = row.lessonId && row.courseId != null ? await db.lesson.findFirst({ where: { id: row.lessonId, courseId: row.courseId }, select: { title: true, content: true } }) : null
  const comment = row.commentId != null && row.userId != null && row.lessonId ? await db.lessonComment.findFirst({ where: { id: row.commentId, lessonId: row.lessonId, userId: row.userId }, select: { content: true, createdAt: true } }) : null
  const submission=await db.crmFormSubmission.findFirst({where:{requestId:row.id,...(actor.role==='ADMIN'?{}:{ownerId:actor.id})},select:{definitionSnapshot:true,answers:true,formVersion:true,identityStatus:true,createdAt:true}})
  return { lesson, comment, submission }
}
export async function createRequest(db: PrismaClient, raw: unknown, userId: number | null, address: string) {
  const input = requestInput.parse(raw)
  if (input.website) return { received: true }
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) throw new CrmError('Form chưa được cấu hình.', 503)
  const hash = (value: string) => createHmac('sha256', secret).update(value).digest('hex')
  // Stable identity scopes idempotency, but anonymous identity never links an account.
  const ipHash = hash('request-rate:' + new Date().toISOString().slice(0, 10) + ':' + address)
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420305)`
    const user = userId == null ? null : await tx.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true } })
    if (userId != null && !user) throw new CrmError('Vui lòng đăng nhập lại.', 401)
    const course = input.courseId == null ? null : await tx.course.findFirst({ where: { id: input.courseId, status: true }, select: { id: true, teacherId: true, teacher: { select: { role: true } } } })
    if (input.courseId != null && !course) throw new CrmError('Khóa học không còn nhận yêu cầu.', 404)
    const enrollment = course && user ? await tx.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } }, select: { status: true } }) : null
    if (input.category !== 'CONSULTATION' && (!user || !enrollment || !['ACTIVE', 'PENDING'].includes(enrollment.status))) throw new CrmError('Cần đăng nhập và đăng ký khóa học để gửi hỗ trợ.', 403)
    if (input.lessonId && (!course || !await tx.lesson.findFirst({ where: { id: input.lessonId, courseId: course.id }, select: { id: true } }))) throw new CrmError('Bài học không thuộc khóa này.')
    if (input.lessonId && (!user || enrollment?.status !== 'ACTIVE')) throw new CrmError('Cần quyền học để gửi yêu cầu từ bài học.', 403)
    if (input.commentId && (!input.lessonId || !user || !await tx.lessonComment.findFirst({ where: { id: input.commentId, lessonId: input.lessonId, userId: user.id }, select: { id: true } }))) throw new CrmError('Chỉ gửi yêu cầu từ bình luận của chính bạn.', 403)
    const fields = user ? { name: user.name || 'Thành viên #' + user.id, email: user.email, phone: user.phone } : contactFields.parse({ name: input.name, email: input.email, phone: input.phone, source: 'Yêu cầu tư vấn', needs: '', tags: [], ownerId: null, archived: false })
    const key = hash('request:' + (user?.id ?? 'anonymous:' + fields.email + ':' + fields.phone) + ':' + (input.commentId ? 'comment:' + input.commentId : input.key))
    if (await tx.crmRequest.findUnique({ where: { key } })) return
    const since = new Date(Date.now() - 3600000)
    if (await tx.crmRequest.count({ where: { ipHash, createdAt: { gte: since } } }) >= 10 || await tx.crmRequest.count({ where: { createdAt: { gte: since } } }) >= 1000) throw new CrmError('Có quá nhiều yêu cầu. Vui lòng thử lại sau.', 429)
    const ownerId = course?.teacherId != null && course.teacher && canUseCrm(course.teacher.role) ? course.teacherId : null
    // An explicit registered student's request may create their private teacher profile.
    const contact = user && enrollment && ownerId != null ? await tx.crmContact.upsert({ where: { ownerId_studentUserId: { ownerId, studentUserId: user.id } }, update: {}, create: { name: fields.name, ownerId, studentUserId: user.id, studentProfile: true, source: 'Học viên khóa học', createdBy: -1 } }) : null
    await tx.crmRequest.create({ data: { key, ipHash, contactId: contact?.id, ownerId, courseId: course?.id, userId: user?.id, lessonId: input.lessonId, commentId: input.commentId, category: input.category, content: input.content, name: fields.name, email: fields.email, phone: fields.phone, source: input.commentId ? 'Bình luận bài học' : input.lessonId ? 'Bài học' : 'Trang khóa học' } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 })
  return { received: true }
}
