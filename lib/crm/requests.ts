import { createHmac } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { contactFields } from './validation'
import { CrmActor, canUseCrm, contactScope } from './shared'
import { CrmError } from './service'
import { PARTNER_SOURCE, FEEDBACK_SOURCE, topicScope, requestTopic, requestEvents, partnerOutcome, type RequestTopic } from './request-workflow'
import { learningSummaries } from './learning'
import { requestOrigin } from './request-origin'

export const requestInput = z.object({
  key: z.uuid(), courseId: z.number().int().positive().optional(), lessonId: z.string().max(100).optional(), commentId: z.number().int().positive().optional(),
  feedback: z.boolean().optional(), category: z.enum(['LEARNING', 'SUPPORT', 'CONSULTATION']), content: z.string().trim().min(1).max(4000),
  name: z.string().trim().max(150).default(''), email: z.string().max(254).default(''), phone: z.string().max(40).default(''),
  consent: z.literal(true), website: z.string().max(100).default(''),
}).strict()
export const requestUpdate = z.object({ id: z.uuid(), version: z.number().int().positive(), action: z.enum(['UPDATE', 'SEND_REPLY', 'REMIND']).default('UPDATE'), status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED']).optional(), resolution: z.string().trim().max(4000).optional(), publicReply: z.string().trim().max(4000).optional(), ownerId: z.number().int().nonnegative().nullable().optional(), outcome: z.enum(['PENDING', 'MORE_INFO', 'ACCEPTED', 'DECLINED']).optional() }).strict()

export function requestScope(actor: CrmActor): Prisma.CrmRequestWhereInput {
  if (!canUseCrm(actor.role)) throw new CrmError('Bạn không có quyền sử dụng CRM.', 403)
  return actor.role === 'ADMIN' ? {} : { ownerId: actor.id, OR: [{ course: { teacherId: actor.id } }, { courseId: null }] }
}
export async function readRequests(db: PrismaClient, actor: CrmActor, page: number, status?: string, contactId?: number, requestId?: string, topic?: RequestTopic, ownerId?: number | null) {
  const scope = requestScope(actor)
  if (contactId != null && !await db.crmContact.findFirst({ where: { id: contactId, ...contactScope(actor) }, select: { id: true } })) throw new CrmError('Không có quyền xem hồ sơ.', 404)
  const where = { AND: [scope, ...(topic ? [topicScope(topic)] : [])], ...(ownerId !== undefined ? { ownerId } : {}), ...(requestId ? { id: requestId } : {}), ...(status ? { status } : {}), ...(contactId == null ? {} : { contactId }) }
  const [requests, total] = await Promise.all([
    db.crmRequest.findMany({ where, include: { course: { select: { name_lop: true, id_khoa: true } }, formSubmission: {select:{id:true,formVersion:true,identityStatus:true}} }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20, skip: (page - 1) * 20 }),
    db.crmRequest.count({ where }),
  ])
  const contacts = await db.crmContact.findMany({ where: { AND: [contactScope(actor)], id: { in: requests.map(r => r.contactId).filter((id): id is number => id != null) } }, select: { id: true } })
  const accessible = new Set(contacts.map(c => c.id))
  // Chỉ tra bài học gắn với những yêu cầu đã qua bộ lọc quyền, tránh đọc chéo khóa.
  const lessonPairs = requests.filter(row => row.lessonId && row.courseId != null).map(row => ({ id: row.lessonId!, courseId: row.courseId! }))
  const lessons = lessonPairs.length ? await db.lesson.findMany({ where: { OR: lessonPairs }, select: { id: true, courseId: true, title: true } }) : []
  const lessonTitles = new Map(lessons.map(lesson => [lesson.courseId + ':' + lesson.id, lesson.title]))
  return { requests: requests.map(row => {
    const { key, ipHash, history, ...safe } = row
    void key; void ipHash
    return { ...safe, origin: requestOrigin(row, lessonTitles.get(row.courseId + ':' + row.lessonId) || null), topic: requestTopic(row), events: requestEvents(history), outcome: partnerOutcome(history), contactId: row.contactId != null && accessible.has(row.contactId) ? row.contactId : null }
  }), total }
}
export async function updateRequest(db: PrismaClient, actor: CrmActor, raw: unknown) {
  const input = requestUpdate.parse(raw)
  return db.$transaction(async tx => {
    const previous = await tx.crmRequest.findFirst({ where: { id: input.id, version: input.version, ...requestScope(actor) } })
    if (!previous) throw new CrmError('Yêu cầu đã thay đổi hoặc bạn không có quyền. Hãy tải lại.', 409)
    if (input.action !== 'UPDATE' && (input.ownerId !== undefined || input.outcome !== undefined || input.resolution !== undefined)) throw new CrmError('Lưu xử lý nội bộ trước khi gửi phản hồi hoặc nhắc việc.')
    if (input.action === 'UPDATE' && input.publicReply !== undefined) throw new CrmError('Dùng nút gửi phản hồi để thông báo cho khách.')
    const status = input.status || previous.status
    if (status === 'RESOLVED' && !(input.resolution ?? previous.resolution).trim()) throw new CrmError('Hãy ghi kết quả xử lý trước khi hoàn tất.')
    if (input.outcome !== undefined && previous.source !== PARTNER_SOURCE) throw new CrmError('Kết quả đối tác chỉ áp dụng cho đăng ký đối tác.')
    if (input.ownerId !== undefined) {
      if (actor.role !== 'ADMIN' || previous.courseId != null || await tx.crmFormSubmission.findUnique({ where: { requestId: previous.id }, select: { id: true } })) throw new CrmError('Yêu cầu từ khóa học hoặc Page thuộc người phụ trách nguồn; quản trị viên phân công yêu cầu chung.', 403)
      const owner = input.ownerId == null ? null : await tx.user.findUnique({ where: { id: input.ownerId }, select: { role: true } })
      if (input.ownerId != null && (!owner || !canUseCrm(owner.role))) throw new CrmError('Người phụ trách không có quyền CRM.')
    }
    const now = new Date().toISOString()
    const history = Array.isArray(previous.history) ? previous.history : []
    if (input.action === 'SEND_REPLY') {
      if (!input.publicReply?.trim()) throw new CrmError('Nhập phản hồi trước khi gửi.')
      if (previous.userId == null) throw new CrmError('Khách chưa có tài khoản. Liên hệ qua email/điện thoại và lưu ghi chú nội bộ; hệ thống chưa tự gửi email.')
    }
    if (input.action === 'REMIND') {
      if (previous.ownerId == null) throw new CrmError('Phân công người phụ trách trước khi nhắc việc.')
      const owner = await tx.user.findUnique({ where: { id: previous.ownerId }, select: { role: true } })
      if (!owner || !canUseCrm(owner.role)) throw new CrmError('Người phụ trách không còn quyền CRM.')
      const last = requestEvents(history).filter(event => event.action === 'REMIND').at(-1)
      if (last && Date.now() - new Date(last.changedAt).getTime() < 300000) throw new CrmError('Đã nhắc trong 5 phút gần đây. Vui lòng chờ.', 429)
    }
    const event = { action: input.action, changedBy: actor.id, authorName: actor.name, changedAt: now, status, ownerId: input.ownerId === undefined ? previous.ownerId : input.ownerId, ...(input.outcome ? { outcome: input.outcome } : {}), content: input.action === 'SEND_REPLY' ? input.publicReply : input.resolution || '' }
    const result = await tx.crmRequest.updateMany({ where: { id: input.id, version: input.version, ...requestScope(actor) }, data: { ...(input.action === 'UPDATE' ? { ownerId: input.ownerId, status, resolution: input.resolution } : {}), ...(input.action === 'SEND_REPLY' ? { publicReply: input.publicReply, status } : {}), history: [...history, event], version: { increment: 1 } } })
    if (!result.count) throw new CrmError('Yêu cầu đã thay đổi. Hãy tải lại.', 409)
    if (input.action === 'REMIND' || input.action === 'SEND_REPLY') {
      // Phản hồi cùng nội dung vẫn là lần gửi có chủ đích; dùng cùng key với trigger để không trùng.
      await tx.appNotification.upsert({ where: { eventKey: (input.action === 'REMIND' ? 'request-reminder:' : 'request-updated:') + previous.id + ':' + (previous.version + 1) }, update: { title: input.action === 'REMIND' ? 'Có lời nhắc xử lý yêu cầu được giao' : 'Người phụ trách đã phản hồi yêu cầu của bạn' }, create: { eventKey: (input.action === 'REMIND' ? 'request-reminder:' : 'request-updated:') + previous.id + ':' + (previous.version + 1), recipientId: (input.action === 'REMIND' ? previous.ownerId : previous.userId)!, kind: input.action === 'REMIND' ? 'REQUEST_INCOMING' : 'REQUEST_UPDATED', title: input.action === 'REMIND' ? 'Có lời nhắc xử lý yêu cầu được giao' : 'Người phụ trách đã phản hồi yêu cầu của bạn', courseId: previous.courseId, requestId: previous.id } })
    }
    return { updated: true }
  })
}
export async function requestProfile(db: PrismaClient, actor: CrmActor, requestId: string) {
  const row = await db.crmRequest.findFirst({ where: { id: requestId, ...requestScope(actor) }, select: { userId: true } })
  if (!row) throw new CrmError('Không có quyền xem hồ sơ người gửi.', 404)
  if (row.userId == null) return { profile: null }
  const profile = await db.user.findUnique({ where: { id: row.userId }, select: { id: true, name: true, image: true, role: true } })
  if (!profile) return { profile: null }
  const summaries = await learningSummaries(db, actor, [{ id: profile.id, studentProfile: false, studentUserId: null, linkedUserId: profile.id, ownerId: null }])
  const [teaching, related] = await Promise.all([
    db.course.findMany({ where: { teacherId: profile.id, ...(actor.role === 'ADMIN' ? {} : { status: true }) }, select: { id: true, id_khoa: true, name_lop: true }, take: 50, orderBy: { id: 'desc' } }),
    db.crmRequest.findMany({ where: { userId: profile.id, ...requestScope(actor) }, select: { id: true, category: true, source: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ])
  return { profile: { ...profile, learning: summaries.get(profile.id) || [], teaching, related } }
}
export async function requestSource(db: PrismaClient, actor: CrmActor, id: string) {
  const row = await db.crmRequest.findFirst({ where: { id, ...requestScope(actor) } })
  if (!row) throw new CrmError('Không có quyền xem nguồn yêu cầu.', 404)
  const lesson = row.lessonId && row.courseId != null ? await db.lesson.findFirst({ where: { id: row.lessonId, courseId: row.courseId }, select: { title: true, content: true } }) : null
  const comment = row.commentId != null && row.userId != null && row.lessonId ? await db.lessonComment.findFirst({ where: { id: row.commentId, lessonId: row.lessonId, userId: row.userId }, select: { content: true, createdAt: true } }) : null
  const submission=await db.crmFormSubmission.findFirst({where:{requestId:row.id,...(actor.role==='ADMIN'?{}:{ownerId:actor.id})},select:{definitionSnapshot:true,answers:true,formVersion:true,identityStatus:true,createdAt:true}})
  return { lesson, comment, submission }
}
export async function createRequest(db: PrismaClient, raw: unknown, userId: number | null, address: string, generalContext?: { ownerId: number; source: string }, wi300 = false) {
  const input = requestInput.parse(raw)
  if (userId == null) throw new CrmError('Vui lòng đăng nhập hoặc đăng ký trước khi gửi yêu cầu.', 401)
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
    const preference = wi300 && input.courseId != null ? await tx.systemConfig.findUnique({ where: { key: 'wi300:course-visibility:' + input.courseId }, select: { value: true } }) : null
    const course = input.courseId == null ? null : await tx.course.findFirst({ where: { id: input.courseId, ...(preference?.value === true ? {} : { status: true }) }, select: { id: true, teacherId: true, teacher: { select: { role: true } } } })
    if (input.courseId != null && !course) throw new CrmError('Khóa học không còn nhận yêu cầu.', 404)
    const enrollment = course && user ? await tx.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } }, select: { status: true } }) : null
    if (!input.feedback && (input.category === 'LEARNING' || (input.category === 'SUPPORT' && course)) && (!user || !enrollment || !['ACTIVE', 'PENDING'].includes(enrollment.status))) throw new CrmError('Cần đăng nhập và đăng ký khóa học để gửi hỗ trợ.', 403)
    if (input.lessonId && (!course || !await tx.lesson.findFirst({ where: { id: input.lessonId, courseId: course.id }, select: { id: true } }))) throw new CrmError('Bài học không thuộc khóa này.')
    if (input.lessonId && (!user || enrollment?.status !== 'ACTIVE')) throw new CrmError('Cần quyền học để gửi yêu cầu từ bài học.', 403)
    if (input.commentId && (!input.lessonId || !user || !await tx.lessonComment.findFirst({ where: { id: input.commentId, lessonId: input.lessonId, userId: user.id }, select: { id: true } }))) throw new CrmError('Chỉ gửi yêu cầu từ bình luận của chính bạn.', 403)
    const fields = user ? { name: user.name || 'Thành viên #' + user.id, email: user.email, phone: user.phone } : contactFields.parse({ name: input.name, email: input.email, phone: input.phone, source: 'Yêu cầu tư vấn', needs: '', tags: [], ownerId: null, archived: false })
    const key = hash('request:' + (user?.id ?? 'anonymous:' + fields.email + ':' + fields.phone) + ':' + (input.commentId ? 'comment:' + input.commentId : input.key))
    if (await tx.crmRequest.findUnique({ where: { key } })) return
    const since = new Date(Date.now() - 3600000)
    if (await tx.crmRequest.count({ where: { ipHash, createdAt: { gte: since } } }) >= 10 || await tx.crmRequest.count({ where: { createdAt: { gte: since } } }) >= 1000) throw new CrmError('Có quá nhiều yêu cầu. Vui lòng thử lại sau.', 429)
    const generalOwner = !course && generalContext ? await tx.user.findUnique({ where: { id: generalContext.ownerId }, select: { role: true } }) : null
    if (!course && generalContext && (!generalOwner || !canUseCrm(generalOwner.role))) throw new CrmError('Website chưa có người phụ trách hỗ trợ.', 503)
    const ownerId = course?.teacherId != null && course.teacher && canUseCrm(course.teacher.role) ? course.teacherId : generalOwner && generalContext ? generalContext.ownerId : null
    // An explicit registered student's request may create their private teacher profile.
    const contact = user && enrollment && ownerId != null ? await tx.crmContact.upsert({ where: { ownerId_studentUserId: { ownerId, studentUserId: user.id } }, update: {}, create: { name: fields.name, ownerId, studentUserId: user.id, studentProfile: true, source: 'Học viên khóa học', createdBy: -1 } }) : null
    await tx.crmRequest.create({ data: { key, ipHash, contactId: contact?.id, ownerId, courseId: course?.id, userId: user?.id, lessonId: input.lessonId, commentId: input.commentId, category: input.category, content: input.content, name: fields.name, email: fields.email, phone: fields.phone, source: input.feedback ? FEEDBACK_SOURCE : input.commentId ? 'Bình luận bài học' : input.lessonId ? 'Bài học' : course ? 'Trang khóa học' : generalContext?.source || 'Yêu cầu thành viên' } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 })
  return { received: true }
}
