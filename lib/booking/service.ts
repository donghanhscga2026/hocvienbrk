/**
 * Service đặt lịch hẹn coach 1:1 — tầng nghiệp vụ chạm DB.
 * Logic giờ thuần nằm ở ./slots.ts; thông báo ở ./notify.ts.
 *
 * An toàn chống trùng: mọi thao tác ghi booking (giữ chỗ, xác nhận) đều
 * chạy trong transaction có pg_advisory_xact_lock toàn cục — khối lượng
 * đặt lịch 1:1 thấp nên khóa toàn cục là phương án đơn giản và chắc chắn
 * (đúng khuôn CRM intake đang chạy production).
 */
import prisma from '@/lib/prisma'
import {
  addDaysVN,
  generateDaySlots,
  parseFormSchema,
  resolveWindows,
  sanitizeAnswers,
  slotStartUtc,
  validateAvailabilityRules,
  validateFormAnswers,
  vnDateString,
  type AvailabilityRuleInput,
  type DaySlot,
  type FormField,
} from './slots'

export type { AvailabilityRuleInput } from './slots'
import { notifyBookingCreated, formatVnDateTime } from './notify'

export class BookingError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export interface BookingActor {
  id: number
  role: string
  name: string
}

const BOOKING_LOCK = 70420911
const HOLD_MINUTES = 10
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function isExpertRole(role: string): boolean {
  return role === 'ADMIN' || role === 'TEACHER'
}

function assertCanManage(actor: BookingActor, expertId: number): void {
  if (actor.role === 'ADMIN') return
  if (actor.role === 'TEACHER' && actor.id === expertId) return
  throw new BookingError('Bạn không có quyền quản lý lịch của chuyên gia này.', 403)
}

export function generateBookingCode(): string {
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return `BK-${suffix}`
}

export function generateSessionCode(): string {
  let code = ''
  for (let i = 0; i < 10; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return code
}

function dateOnly(dateVN: string): Date {
  return new Date(`${dateVN}T00:00:00.000Z`)
}

function activeBookingOr() {
  return [
    { status: { in: ['CONFIRMED', 'PENDING'] as ('CONFIRMED' | 'PENDING')[] } },
    { status: 'HELD' as const, holdExpiresAt: { gt: new Date() } },
  ]
}

// ─── Phía khách (công khai) ───

export async function getPublicSession(code: string) {
  const session = await prisma.bookingSession.findUnique({
    where: { code },
    include: {
      expert: { select: { id: true, name: true, image: true } },
      course: { select: { id: true, name_khoa: true, name_lop: true } },
    },
  })
  if (!session || session.status !== 'ACTIVE') return null
  return {
    code: session.code,
    title: session.title,
    description: session.description,
    coverUrl: session.coverUrl,
    durationMin: session.durationMin,
    mode: session.mode,
    price: session.price,
    maxDaysAhead: session.maxDaysAhead,
    expert: {
      id: session.expert.id,
      name: session.expert.name || 'Chuyên gia',
      image: session.expert.image,
    },
    courseName: session.course ? session.course.name_khoa || session.course.name_lop : null,
    formFields: parseFormSchema(session.formSchema),
  }
}

export type PublicSession = NonNullable<Awaited<ReturnType<typeof getPublicSession>>>

interface DayContextSession {
  expertId: number
  durationMin: number
  bufferMin: number
  minNoticeHours: number
}

async function loadDayContext(session: DayContextSession, dateVN: string): Promise<DaySlot[]> {
  const [rules, exceptionRow, busyRows] = await Promise.all([
    prisma.expertAvailability.findMany({ where: { expertId: session.expertId } }),
    prisma.availabilityException.findUnique({
      where: { expertId_date: { expertId: session.expertId, date: dateOnly(dateVN) } },
    }),
    prisma.booking.findMany({
      where: {
        expertId: session.expertId,
        startsAt: { gte: slotStartUtc(dateVN, 0), lt: slotStartUtc(addDaysVN(dateVN, 1), 0) },
        OR: activeBookingOr(),
      },
      select: { startsAt: true, endsAt: true },
    }),
  ])
  const windows = resolveWindows(
    dateVN,
    rules,
    exceptionRow
      ? { dateVN, isOff: exceptionRow.isOff, startMin: exceptionRow.startMin, endMin: exceptionRow.endMin }
      : null,
  )
  return generateDaySlots({
    dateVN,
    durationMin: session.durationMin,
    bufferMin: session.bufferMin,
    minNoticeHours: session.minNoticeHours,
    now: new Date(),
    windows,
    busy: busyRows,
  })
}

export async function getSlotsForDate(code: string, dateVN: string): Promise<{ date: string; slots: DaySlot[] }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVN)) throw new BookingError('Ngày không hợp lệ.')
  const session = await prisma.bookingSession.findUnique({ where: { code } })
  if (!session || session.status !== 'ACTIVE') throw new BookingError('Phiên hẹn không tồn tại hoặc đã tạm dừng.', 404)
  const todayVN = vnDateString(new Date())
  if (dateVN < todayVN || dateVN > addDaysVN(todayVN, session.maxDaysAhead)) {
    return { date: dateVN, slots: [] }
  }
  const slots = await loadDayContext(session, dateVN)
  return { date: dateVN, slots }
}

export interface HoldInput {
  code: string
  dateVN: string
  startMin: number
  source?: string
  tags?: string
}

export async function holdSlot(input: HoldInput) {
  const session = await prisma.bookingSession.findUnique({ where: { code: input.code } })
  if (!session || session.status !== 'ACTIVE') throw new BookingError('Phiên hẹn không tồn tại hoặc đã tạm dừng.', 404)
  const slots = await loadDayContext(session, input.dateVN)
  const slot = slots.find((s) => s.startMin === input.startMin)
  if (!slot || !slot.available) throw new BookingError('Khung giờ này không còn trống, vui lòng chọn khung giờ khác.', 409)

  const startsAt = new Date(slot.startsAt)
  const endsAt = new Date(slot.endsAt)
  const booking = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK})`
    const conflict = await tx.booking.findFirst({
      where: {
        expertId: session.expertId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        OR: activeBookingOr(),
      },
      select: { id: true },
    })
    if (conflict) throw new BookingError('Khung giờ này vừa có người đặt, vui lòng chọn khung giờ khác.', 409)
    return tx.booking.create({
      data: {
        code: generateBookingCode(),
        sessionId: session.id,
        expertId: session.expertId,
        guestName: '',
        guestEmail: '',
        startsAt,
        endsAt,
        status: 'HELD',
        holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
        source: input.source?.slice(0, 200) || null,
        tags: input.tags?.slice(0, 200) || null,
      },
    })
  })
  return {
    bookingCode: booking.code,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    holdExpiresAt: booking.holdExpiresAt?.toISOString() || null,
  }
}

export interface ConfirmInput {
  bookingCode: string
  name: string
  email: string
  phone?: string
  answers: Record<string, unknown>
  userId?: number | null
  website?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function confirmBooking(input: ConfirmInput) {
  // Honeypot chống bot — giả vờ nhận thành công, không ghi gì (khuôn CRM).
  if (input.website) return { received: true as const }

  const name = (input.name || '').trim().slice(0, 150)
  const email = (input.email || '').trim().slice(0, 254)
  const phone = (input.phone || '').trim().slice(0, 40)
  if (!name) throw new BookingError('Vui lòng nhập họ và tên.')
  if (!EMAIL_RE.test(email)) throw new BookingError('Địa chỉ email chưa hợp lệ.')

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK})`
    const booking = await tx.booking.findUnique({ where: { code: input.bookingCode } })
    if (!booking) throw new BookingError('Không tìm thấy lượt giữ chỗ.', 404)
    if (booking.status !== 'HELD') throw new BookingError('Lượt giữ chỗ này đã được xử lý.', 409)
    if (!booking.holdExpiresAt || booking.holdExpiresAt.getTime() <= Date.now()) {
      throw new BookingError('Thời gian giữ chỗ đã hết, vui lòng chọn lại khung giờ.', 410)
    }
    const session = await tx.bookingSession.findUnique({ where: { id: booking.sessionId } })
    if (!session) throw new BookingError('Phiên hẹn không còn tồn tại.', 404)

    const fields = parseFormSchema(session.formSchema)
    const errors = validateFormAnswers(fields, input.answers || {})
    if (errors.length > 0) throw new BookingError(errors.join(' '), 422)
    const answers = sanitizeAnswers(fields, input.answers || {})

    // Đồng bộ CRM: tìm hồ sơ theo email/SĐT trong phạm vi chuyên gia phụ
    // trách; không ghi đè danh tính có sẵn (đúng quy ước CRM intake).
    let contact = await tx.crmContact.findFirst({
      where: { ownerId: session.expertId, email: { equals: email, mode: 'insensitive' } },
    })
    if (!contact && phone) {
      contact = await tx.crmContact.findFirst({ where: { ownerId: session.expertId, phone } })
    }
    if (!contact) {
      contact = await tx.crmContact.create({
        data: {
          name,
          email,
          phone: phone || null,
          source: 'Đặt lịch hẹn 1:1',
          needs: '',
          tags: ['dat-lich-1-1'],
          ownerId: session.expertId,
          createdBy: -1,
        },
      })
    }

    const status = session.autoConfirm ? ('CONFIRMED' as const) : ('PENDING' as const)
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        guestName: name,
        guestEmail: email,
        guestPhone: phone || null,
        formAnswers: answers,
        status,
        userId: input.userId ?? booking.userId,
        contactId: contact.id,
        holdExpiresAt: null,
      },
    })

    await tx.crmActivity.create({
      data: {
        contactId: contact.id,
        type: 'BOOKING',
        authorId: -1,
        authorName: 'Hệ thống đặt lịch',
        content: `Đặt lịch hẹn "${session.title}" lúc ${formatVnDateTime(updated.startsAt)} (mã ${updated.code}, trạng thái ${status === 'CONFIRMED' ? 'đã xác nhận' : 'chờ xác nhận'}).`,
      },
    })
    if (status === 'CONFIRMED') {
      await tx.crmTask.create({
        data: {
          contactId: contact.id,
          title: `Buổi hẹn 1:1: ${session.title} — ${name}`,
          dueAt: updated.startsAt,
          createdBy: session.expertId,
        },
      })
    }
    return { booking: updated, session }
  })

  const expert = await prisma.user.findUnique({
    where: { id: result.session.expertId },
    select: { name: true },
  })
  await notifyBookingCreated({
    bookingId: result.booking.id,
    bookingCode: result.booking.code,
    guestName: result.booking.guestName,
    guestEmail: result.booking.guestEmail,
    guestUserId: result.booking.userId,
    expertId: result.session.expertId,
    expertName: expert?.name || 'Chuyên gia',
    sessionTitle: result.session.title,
    meetingUrl: result.session.meetingUrl,
    startsAt: result.booking.startsAt,
    endsAt: result.booking.endsAt,
    status: result.booking.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
  })

  return {
    received: false as const,
    bookingCode: result.booking.code,
    status: result.booking.status,
    startsAt: result.booking.startsAt.toISOString(),
    endsAt: result.booking.endsAt.toISOString(),
    meetingUrl: result.booking.status === 'CONFIRMED' ? result.session.meetingUrl : null,
  }
}

// ─── Phía chuyên gia / quản trị ───

export interface SessionInput {
  code?: string
  title: string
  description?: string
  coverUrl?: string | null
  durationMin: number
  mode: 'ZOOM' | 'MEET' | 'OFFLINE'
  meetingUrl?: string | null
  courseId?: number | null
  isPrivate: boolean
  autoConfirm: boolean
  cancelBeforeHours: number
  minNoticeHours: number
  maxDaysAhead: number
  bufferMin: number
  formFields: FormField[]
  status: 'ACTIVE' | 'PAUSED'
}

function validateSessionInput(data: SessionInput): void {
  if (!data.title?.trim()) throw new BookingError('Phiên hẹn cần có tiêu đề.')
  if (data.durationMin < 10 || data.durationMin > 240) throw new BookingError('Thời lượng mỗi buổi phải từ 10 đến 240 phút.')
  if (data.bufferMin < 0 || data.bufferMin > 120) throw new BookingError('Thời gian đệm phải từ 0 đến 120 phút.')
  if (data.minNoticeHours < 0 || data.minNoticeHours > 168) throw new BookingError('Thời gian đặt trước tối thiểu chưa hợp lệ.')
  if (data.maxDaysAhead < 1 || data.maxDaysAhead > 180) throw new BookingError('Số ngày mở lịch tối đa phải từ 1 đến 180.')
  if (data.cancelBeforeHours < 0 || data.cancelBeforeHours > 168) throw new BookingError('Hạn hủy lịch chưa hợp lệ.')
}

function normalizeSessionCode(raw: string): string {
  const code = raw.trim().toUpperCase()
  if (!/^[A-Z0-9_-]{4,40}$/.test(code)) {
    throw new BookingError('Mã phiên phải dài 4–40 ký tự, chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.')
  }
  return code
}

export async function listSessions(actor: BookingActor) {
  if (!isExpertRole(actor.role)) throw new BookingError('Bạn không có quyền quản lý lịch hẹn.', 403)
  return prisma.bookingSession.findMany({
    where: actor.role === 'ADMIN' ? {} : { expertId: actor.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      expert: { select: { id: true, name: true } },
      course: { select: { id: true, name_khoa: true, name_lop: true } },
    },
  })
}

export async function createSession(actor: BookingActor, expertId: number, data: SessionInput) {
  assertCanManage(actor, expertId)
  validateSessionInput(data)
  const code = data.code?.trim() ? normalizeSessionCode(data.code) : generateSessionCode()
  const existing = await prisma.bookingSession.findUnique({ where: { code }, select: { id: true } })
  if (existing) throw new BookingError('Mã phiên này đã có người dùng, vui lòng chọn mã khác.', 409)
  return prisma.bookingSession.create({
    data: {
      code,
      expertId,
      courseId: data.courseId ?? null,
      title: data.title.trim().slice(0, 200),
      description: (data.description || '').slice(0, 5000),
      coverUrl: data.coverUrl || null,
      durationMin: data.durationMin,
      mode: data.mode,
      meetingUrl: data.meetingUrl || null,
      price: 0,
      isPrivate: data.isPrivate,
      formSchema: data.formFields as unknown as object,
      autoConfirm: data.autoConfirm,
      cancelBeforeHours: data.cancelBeforeHours,
      minNoticeHours: data.minNoticeHours,
      maxDaysAhead: data.maxDaysAhead,
      bufferMin: data.bufferMin,
      status: data.status,
    },
  })
}

export async function updateSession(actor: BookingActor, sessionId: number, data: SessionInput) {
  const session = await prisma.bookingSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new BookingError('Không tìm thấy phiên hẹn.', 404)
  assertCanManage(actor, session.expertId)
  validateSessionInput(data)
  return prisma.bookingSession.update({
    where: { id: sessionId },
    data: {
      title: data.title.trim().slice(0, 200),
      description: (data.description || '').slice(0, 5000),
      coverUrl: data.coverUrl || null,
      durationMin: data.durationMin,
      mode: data.mode,
      meetingUrl: data.meetingUrl || null,
      courseId: data.courseId ?? null,
      isPrivate: data.isPrivate,
      formSchema: data.formFields as unknown as object,
      autoConfirm: data.autoConfirm,
      cancelBeforeHours: data.cancelBeforeHours,
      minNoticeHours: data.minNoticeHours,
      maxDaysAhead: data.maxDaysAhead,
      bufferMin: data.bufferMin,
      status: data.status,
    },
  })
}

export async function listAvailability(actor: BookingActor, expertId: number) {
  assertCanManage(actor, expertId)
  const [rules, exceptions] = await Promise.all([
    prisma.expertAvailability.findMany({ where: { expertId }, orderBy: [{ weekday: 'asc' }, { startMin: 'asc' }] }),
    prisma.availabilityException.findMany({
      where: { expertId, date: { gte: dateOnly(vnDateString(new Date())) } },
      orderBy: { date: 'asc' },
      take: 100,
    }),
  ])
  return {
    rules,
    exceptions: exceptions.map((row) => ({
      id: row.id,
      dateVN: row.date.toISOString().slice(0, 10),
      isOff: row.isOff,
      startMin: row.startMin,
      endMin: row.endMin,
      note: row.note,
    })),
  }
}

export async function replaceAvailability(actor: BookingActor, expertId: number, rules: AvailabilityRuleInput[]) {
  assertCanManage(actor, expertId)
  const errors = validateAvailabilityRules(rules)
  if (errors.length > 0) throw new BookingError(errors.join(' '))
  await prisma.$transaction(async (tx) => {
    await tx.expertAvailability.deleteMany({ where: { expertId } })
    if (rules.length > 0) {
      await tx.expertAvailability.createMany({ data: rules.map((r) => ({ expertId, ...r })) })
    }
  })
}

export interface ExceptionInput {
  dateVN: string
  isOff: boolean
  startMin?: number | null
  endMin?: number | null
  note?: string
}

export async function upsertException(actor: BookingActor, expertId: number, input: ExceptionInput) {
  assertCanManage(actor, expertId)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateVN)) throw new BookingError('Ngày ngoại lệ không hợp lệ.')
  if (!input.isOff && (input.startMin == null || input.endMin == null || input.endMin <= input.startMin)) {
    throw new BookingError('Ngày mở lịch riêng cần có giờ bắt đầu và kết thúc hợp lệ.')
  }
  const date = dateOnly(input.dateVN)
  const data = {
    isOff: input.isOff,
    startMin: input.isOff ? null : (input.startMin ?? null),
    endMin: input.isOff ? null : (input.endMin ?? null),
    note: (input.note || '').slice(0, 200),
  }
  return prisma.availabilityException.upsert({
    where: { expertId_date: { expertId, date } },
    update: data,
    create: { expertId, date, ...data },
  })
}

export async function deleteException(actor: BookingActor, expertId: number, dateVN: string) {
  assertCanManage(actor, expertId)
  await prisma.availabilityException.deleteMany({ where: { expertId, date: dateOnly(dateVN) } })
}

export async function listBookings(actor: BookingActor, opts: { fromVN?: string; toVN?: string; status?: string } = {}) {
  if (!isExpertRole(actor.role)) throw new BookingError('Bạn không có quyền xem danh sách lịch hẹn.', 403)
  const todayVN = vnDateString(new Date())
  const from = opts.fromVN && /^\d{4}-\d{2}-\d{2}$/.test(opts.fromVN) ? opts.fromVN : todayVN
  const to = opts.toVN && /^\d{4}-\d{2}-\d{2}$/.test(opts.toVN) ? opts.toVN : addDaysVN(from, 30)
  return prisma.booking.findMany({
    where: {
      ...(actor.role === 'ADMIN' ? {} : { expertId: actor.id }),
      startsAt: { gte: slotStartUtc(from, 0), lt: slotStartUtc(addDaysVN(to, 1), 0) },
      ...(opts.status ? { status: opts.status as never } : { status: { not: 'HELD' as const } }),
      guestEmail: { not: '' },
    },
    orderBy: { startsAt: 'asc' },
    take: 300,
    include: {
      session: { select: { id: true, title: true, code: true } },
      expert: { select: { id: true, name: true } },
    },
  })
}

const BOOKING_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED', 'NO_SHOW'],
  HELD: ['CANCELLED'],
}

export async function setBookingStatus(actor: BookingActor, bookingId: number, next: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) throw new BookingError('Không tìm thấy lịch hẹn.', 404)
  assertCanManage(actor, booking.expertId)
  const allowed = BOOKING_TRANSITIONS[booking.status] || []
  if (!allowed.includes(next)) {
    throw new BookingError(`Không thể chuyển lịch hẹn từ trạng thái ${booking.status} sang ${next}.`)
  }
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: next as never },
  })
  // Duyệt tay: khi xác nhận một lịch đang chờ, sinh việc chuẩn bị trong
  // CRM giống luồng tự động xác nhận.
  if (booking.status === 'PENDING' && next === 'CONFIRMED' && booking.contactId) {
    const session = await prisma.bookingSession.findUnique({ where: { id: booking.sessionId }, select: { title: true } })
    await prisma.crmTask.create({
      data: {
        contactId: booking.contactId,
        title: `Buổi hẹn 1:1: ${session?.title || 'Phiên hẹn'} — ${booking.guestName}`,
        dueAt: booking.startsAt,
        createdBy: booking.expertId,
      },
    })
  }
  return updated
}
