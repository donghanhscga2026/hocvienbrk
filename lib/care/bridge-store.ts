import { createHash } from 'node:crypto'
import prisma from '@/lib/prisma'
import type { CrmActor } from '@/lib/crm/shared'
import { CrmError } from '@/lib/crm/service'
import { careScopeCourseIds } from './queue'
import { vnDateString, vnDayStartUtc } from './rules'
import {
  CARE_BRIDGE_DAILY_LIMIT, buildZaloIdempotencyKey, canTransitionCommand, decideClaim,
  isBridgeOnline, type ZaloCommandStatus,
} from './bridge'

/**
 * Care Engine GĐ4 — tầng dữ liệu của kênh Zalo (Care Bridge).
 * Trạng thái cầu nối (công tắc tắt khẩn cấp + nhịp tim) lưu trong
 * SystemConfig (model key-value sẵn có) ở khóa duy nhất bên dưới —
 * không cần thêm bảng settings riêng.
 */

export const BRIDGE_STATE_KEY = 'care.zaloBridge.state'

export interface BridgeState {
  killSwitch: boolean
  lastHeartbeatAt: string | null
  bridgeVersion: string | null
  updatedAt: string | null
}

const DEFAULT_STATE: BridgeState = { killSwitch: false, lastHeartbeatAt: null, bridgeVersion: null, updatedAt: null }

export async function getBridgeState(): Promise<BridgeState> {
  const row = await prisma.systemConfig.findUnique({ where: { key: BRIDGE_STATE_KEY } })
  if (!row || typeof row.value !== 'object' || row.value === null) return { ...DEFAULT_STATE }
  const value = row.value as Record<string, unknown>
  return {
    killSwitch: value.killSwitch === true,
    lastHeartbeatAt: typeof value.lastHeartbeatAt === 'string' ? value.lastHeartbeatAt : null,
    bridgeVersion: typeof value.bridgeVersion === 'string' ? value.bridgeVersion : null,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
  }
}

async function saveBridgeState(patch: Partial<BridgeState>): Promise<BridgeState> {
  const current = await getBridgeState()
  const next: BridgeState = { ...current, ...patch, updatedAt: new Date().toISOString() }
  const value: Record<string, string | boolean | null> = {
    killSwitch: next.killSwitch, lastHeartbeatAt: next.lastHeartbeatAt,
    bridgeVersion: next.bridgeVersion, updatedAt: next.updatedAt,
  }
  await prisma.systemConfig.upsert({
    where: { key: BRIDGE_STATE_KEY },
    create: { key: BRIDGE_STATE_KEY, value },
    update: { value },
  })
  return next
}

/**
 * Bật/tắt công tắc tắt khẩn cấp: bật → mọi lệnh QUEUED chuyển HELD (giữ
 * lại, bridge không lấy được); tắt → HELD quay lại QUEUED. Trả số lệnh
 * đã chuyển để UI báo cáo.
 */
export async function setBridgeKillSwitch(on: boolean): Promise<{ state: BridgeState; moved: number }> {
  const state = await saveBridgeState({ killSwitch: on })
  const moved = await prisma.zaloCareCommand.updateMany({
    where: { status: on ? 'QUEUED' : 'HELD' },
    data: { status: on ? 'HELD' : 'QUEUED' },
  })
  return { state, moved: moved.count }
}

/** Nhịp tim từ bridge: ghi mốc + phiên bản, giữ nguyên công tắc khẩn cấp. */
export async function recordBridgeHeartbeat(version: string | null): Promise<BridgeState> {
  return saveBridgeState({ lastHeartbeatAt: new Date().toISOString(), bridgeVersion: version })
}

export interface ClaimedCommand {
  id: number
  idempotencyKey: string
  studentId: number
  studentName: string
  phone: string | null
  courseId: number | null
  ruleId: string | null
  body: string
}

export interface ClaimResult {
  held: boolean
  reason: 'kill-switch' | 'daily-cap' | null
  killSwitch: boolean
  sentToday: number
  dailyLimit: number
  commands: ClaimedCommand[]
}

/**
 * Bridge đến lấy lệnh: tôn trọng công tắc khẩn cấp + trần ngày. Chuyển
 * QUEUED → IN_FLIGHT trong 1 giao dịch có điều kiện trạng thái để 2
 * bridge chạy song song cũng không lấy trùng 1 lệnh.
 */
export async function claimCommands(requestedLimit: number, now = new Date()): Promise<ClaimResult> {
  const state = await getBridgeState()
  const dayStart = vnDayStartUtc(vnDateString(now))
  const sentToday = await prisma.zaloCareCommand.count({
    where: { createdAt: { gte: dayStart }, status: { in: ['IN_FLIGHT', 'SENT'] } },
  })
  const decision = decideClaim({ killSwitch: state.killSwitch, sentOrInFlightToday: sentToday, requestedLimit })
  if (decision.held || decision.allowed <= 0) {
    return { held: true, reason: decision.reason, killSwitch: state.killSwitch, sentToday, dailyLimit: CARE_BRIDGE_DAILY_LIMIT, commands: [] }
  }
  const claimed: ClaimedCommand[] = await prisma.$transaction(async (tx) => {
    const queued = await tx.zaloCareCommand.findMany({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
      take: decision.allowed,
      select: { id: true },
    })
    if (queued.length === 0) return []
    const ids = queued.map((q) => q.id)
    await tx.zaloCareCommand.updateMany({
      where: { id: { in: ids }, status: 'QUEUED' },
      data: { status: 'IN_FLIGHT', claimedAt: now },
    })
    const rows = await tx.zaloCareCommand.findMany({
      where: { id: { in: ids }, status: 'IN_FLIGHT', claimedAt: now },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, idempotencyKey: true, studentId: true, courseId: true, ruleId: true, body: true,
        student: { select: { name: true, phone: true } },
      },
    })
    return rows.map((r) => ({
      id: r.id, idempotencyKey: r.idempotencyKey, studentId: r.studentId,
      studentName: r.student.name || `Học viên #${r.studentId}`, phone: r.student.phone,
      courseId: r.courseId, ruleId: r.ruleId, body: r.body,
    }))
  })
  return { held: false, reason: null, killSwitch: state.killSwitch, sentToday, dailyLimit: CARE_BRIDGE_DAILY_LIMIT, commands: claimed }
}

/** Bridge báo kết quả 1 lệnh: chỉ áp dụng khi lệnh đang IN_FLIGHT. */
export async function reportCommand(input: {
  commandId: number
  ok: boolean
  error?: string | null
  zaloUserId?: string | null
}): Promise<{ applied: boolean; status: ZaloCommandStatus | null; reason: string }> {
  const command = await prisma.zaloCareCommand.findUnique({ where: { id: input.commandId }, select: { id: true, status: true } })
  if (!command) return { applied: false, status: null, reason: 'not-found' }
  const current = command.status as ZaloCommandStatus
  const next: ZaloCommandStatus = input.ok ? 'SENT' : 'FAILED'
  if (!canTransitionCommand(current, next)) return { applied: false, status: current, reason: 'invalid-state' }
  const updated = await prisma.zaloCareCommand.updateMany({
    where: { id: input.commandId, status: 'IN_FLIGHT' },
    data: {
      status: next,
      sentAt: input.ok ? new Date() : undefined,
      error: input.ok ? null : (input.error || 'Bridge báo gửi thất bại.').slice(0, 500),
      zaloUserId: input.zaloUserId ? input.zaloUserId.slice(0, 100) : undefined,
    },
  })
  if (updated.count === 0) return { applied: false, status: current, reason: 'invalid-state' }
  return { applied: true, status: next, reason: 'ok' }
}

/** Số lệnh Zalo của 1 học viên đã sinh hôm nay (giờ VN), trừ lệnh đã hủy/lỗi — dùng cho trần 1 nhắc/ngày liên kênh. */
export async function countZaloTodayForStudent(userId: number, now = new Date()): Promise<number> {
  return prisma.zaloCareCommand.count({
    where: {
      studentId: userId,
      createdAt: { gte: vnDayStartUtc(vnDateString(now)) },
      status: { in: ['QUEUED', 'IN_FLIGHT', 'SENT', 'HELD'] },
    },
  })
}

/** Tổng lệnh Zalo đã sinh hôm nay — dùng cho trần khối lượng ngày ở chiều enqueue. */
export async function countZaloToday(now = new Date()): Promise<number> {
  return prisma.zaloCareCommand.count({
    where: { createdAt: { gte: vnDayStartUtc(vnDateString(now)) }, status: { in: ['QUEUED', 'IN_FLIGHT', 'SENT', 'HELD'] } },
  })
}

export interface EnqueueInput {
  studentId: number
  courseId: number | null
  ruleId: string | null
  body: string
  createdById: number
}

/**
 * Sinh 1 lệnh gửi Zalo với khóa chống trùng theo ngày. Nếu lệnh của
 * chính tín hiệu này đã tồn tại hôm nay: lệnh còn hiệu lực (QUEUED /
 * IN_FLIGHT / SENT / HELD) → trả existed; lệnh cũ FAILED/CANCELLED →
 * sinh lệnh thử lại với attempt tăng dần.
 */
export async function enqueueZaloCommand(input: EnqueueInput, now = new Date()): Promise<
  { created: true; commandId: number; idempotencyKey: string } | { created: false; reason: 'existed'; commandId: number; idempotencyKey: string }
> {
  const vnDate = vnDateString(now)
  for (let attempt = 1; attempt <= 5; attempt++) {
    const idempotencyKey = buildZaloIdempotencyKey({
      ruleId: input.ruleId, userId: input.studentId, courseId: input.courseId, vnDate, attempt,
    })
    const existing = await prisma.zaloCareCommand.findUnique({ where: { idempotencyKey }, select: { id: true, status: true } })
    if (existing) {
      if (existing.status === 'FAILED' || existing.status === 'CANCELLED') continue
      return { created: false, reason: 'existed', commandId: existing.id, idempotencyKey }
    }
    const state = await getBridgeState()
    const created = await prisma.zaloCareCommand.create({
      data: {
        studentId: input.studentId, courseId: input.courseId, ruleId: input.ruleId,
        body: input.body, status: state.killSwitch ? 'HELD' : 'QUEUED',
        idempotencyKey, createdById: input.createdById,
      },
      select: { id: true },
    })
    return { created: true, commandId: created.id, idempotencyKey }
  }
  const idempotencyKey = buildZaloIdempotencyKey({ ruleId: input.ruleId, userId: input.studentId, courseId: input.courseId, vnDate, attempt: 5 })
  const last = await prisma.zaloCareCommand.findUnique({ where: { idempotencyKey }, select: { id: true } })
  return { created: false, reason: 'existed', commandId: last?.id ?? 0, idempotencyKey }
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

/** Các dạng số điện thoại VN tương đương để khớp học viên: 0xxxxxxxxx ↔ 84xxxxxxxxx ↔ +84xxxxxxxxx. */
export function phoneVariants(raw: string): string[] {
  const digits = raw.replace(/[^\d]/g, '')
  const variants = new Set<string>()
  if (!digits) return []
  variants.add(digits)
  if (digits.startsWith('84') && digits.length >= 11) variants.add('0' + digits.slice(2))
  if (digits.startsWith('0') && digits.length >= 10) variants.add('84' + digits.slice(1))
  if (digits.length >= 9) variants.add('0' + digits.slice(-9))
  return [...variants]
}

export interface InboundResult {
  duplicated: boolean
  inboundId: number | null
  crmRequestId: string | null
  studentId: number | null
  matchedBy: 'phone' | 'zalo-history' | 'zalo-command' | null
}

/**
 * Nhận 1 tin Zalo đến từ bridge: chống trùng bằng zaloMsgId (unique ở
 * DB), khớp học viên theo số điện thoại → lịch sử hội thoại Zalo → lệnh
 * gửi đã thành công cho chính zaloUserId đó; rồi tạo CrmRequest loại
 * SUPPORT nguồn "Zalo (Care Bridge)" để giảng viên xử lý trong CRM.
 * Chưa khớp được thì studentId để trống, chờ gán tay trong CRM.
 */
export async function receiveInbound(input: {
  zaloMsgId: string
  zaloUserId: string
  text: string
  phone?: string | null
}): Promise<InboundResult> {
  const zaloMsgId = input.zaloMsgId.slice(0, 200)
  const zaloUserId = input.zaloUserId.slice(0, 100)
  const existing = await prisma.zaloCareInbound.findUnique({ where: { zaloMsgId }, select: { id: true, crmRequestId: true, studentId: true } })
  if (existing) return { duplicated: true, inboundId: existing.id, crmRequestId: existing.crmRequestId, studentId: existing.studentId, matchedBy: null }

  let student: { id: number; name: string | null; phone: string | null } | null = null
  let matchedBy: InboundResult['matchedBy'] = null
  if (input.phone) {
    const variants = phoneVariants(input.phone)
    if (variants.length > 0) {
      student = await prisma.user.findFirst({ where: { phone: { in: variants } }, select: { id: true, name: true, phone: true } })
      if (student) matchedBy = 'phone'
    }
  }
  let courseId: number | null = null
  if (!student) {
    const previous = await prisma.zaloCareInbound.findFirst({
      where: { zaloUserId, studentId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { studentId: true, courseId: true },
    })
    if (previous?.studentId) {
      student = await prisma.user.findUnique({ where: { id: previous.studentId }, select: { id: true, name: true, phone: true } })
      if (student) { matchedBy = 'zalo-history'; courseId = previous.courseId }
    }
  }
  if (!student) {
    const sent = await prisma.zaloCareCommand.findFirst({
      where: { zaloUserId, status: 'SENT' },
      orderBy: { sentAt: 'desc' },
      select: { studentId: true, courseId: true },
    })
    if (sent) {
      student = await prisma.user.findUnique({ where: { id: sent.studentId }, select: { id: true, name: true, phone: true } })
      if (student) { matchedBy = 'zalo-command'; courseId = sent.courseId }
    }
  }

  const text = input.text.slice(0, 4000)
  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.crmRequest.create({
      data: {
        key: sha256('zalo-care-inbound:' + zaloMsgId),
        ipHash: sha256('zalo:' + zaloUserId),
        category: 'SUPPORT',
        source: 'Zalo (Care Bridge)',
        content: text,
        name: student?.name || 'Học viên qua Zalo',
        phone: student?.phone || (input.phone ? input.phone.slice(0, 30) : null),
        userId: student?.id ?? null,
        courseId,
      },
      select: { id: true },
    })
    const inbound = await tx.zaloCareInbound.create({
      data: { zaloMsgId, zaloUserId, studentId: student?.id ?? null, courseId, text, crmRequestId: request.id },
      select: { id: true },
    })
    return { requestId: request.id, inboundId: inbound.id }
  })
  return { duplicated: false, inboundId: result.inboundId, crmRequestId: result.requestId, studentId: student?.id ?? null, matchedBy }
}

export interface BridgePanelData {
  state: BridgeState & { online: boolean }
  dailyLimit: number
  sentToday: number
  counts: Record<ZaloCommandStatus, number>
  commands: {
    id: number; studentId: number; studentName: string; courseId: number | null; courseName: string | null
    ruleId: string | null; body: string; status: ZaloCommandStatus; error: string | null
    createdAt: string; sentAt: string | null
  }[]
  inbounds: {
    id: number; zaloUserId: string; studentId: number | null; studentName: string | null
    courseId: number | null; courseName: string | null; text: string; crmRequestId: string | null; createdAt: string
  }[]
  canControl: boolean
}

/** Dữ liệu panel "Kênh Zalo" trong CRM, giới hạn theo phạm vi khóa của actor (admin = tất cả). */
export async function getBridgePanel(actor: CrmActor, now = new Date()): Promise<BridgePanelData> {
  const courseIds = await careScopeCourseIds(actor)
  const scope = courseIds ? { courseId: { in: courseIds } } : {}
  const state = await getBridgeState()
  const dayStart = vnDayStartUtc(vnDateString(now))
  const [grouped, sentToday, commandRows, inboundRows] = await Promise.all([
    prisma.zaloCareCommand.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
    prisma.zaloCareCommand.count({ where: { ...scope, createdAt: { gte: dayStart }, status: 'SENT' } }),
    prisma.zaloCareCommand.findMany({
      where: scope, orderBy: { createdAt: 'desc' }, take: 50,
      select: {
        id: true, studentId: true, courseId: true, ruleId: true, body: true, status: true, error: true, createdAt: true, sentAt: true,
        student: { select: { name: true } }, course: { select: { name_khoa: true, name_lop: true } },
      },
    }),
    prisma.zaloCareInbound.findMany({
      where: scope, orderBy: { createdAt: 'desc' }, take: 20,
      select: {
        id: true, zaloUserId: true, studentId: true, courseId: true, text: true, crmRequestId: true, createdAt: true,
        student: { select: { name: true } }, course: { select: { name_khoa: true, name_lop: true } },
      },
    }),
  ])
  const counts: Record<ZaloCommandStatus, number> = { QUEUED: 0, IN_FLIGHT: 0, SENT: 0, FAILED: 0, HELD: 0, CANCELLED: 0 }
  for (const g of grouped) counts[g.status as ZaloCommandStatus] = g._count._all
  return {
    state: { ...state, online: isBridgeOnline(state.lastHeartbeatAt, now) },
    dailyLimit: CARE_BRIDGE_DAILY_LIMIT,
    sentToday,
    counts,
    commands: commandRows.map((c) => ({
      id: c.id, studentId: c.studentId, studentName: c.student.name || `Học viên #${c.studentId}`,
      courseId: c.courseId, courseName: c.course ? (c.course.name_khoa || c.course.name_lop) : null,
      ruleId: c.ruleId, body: c.body, status: c.status as ZaloCommandStatus, error: c.error,
      createdAt: c.createdAt.toISOString(), sentAt: c.sentAt ? c.sentAt.toISOString() : null,
    })),
    inbounds: inboundRows.map((i) => ({
      id: i.id, zaloUserId: i.zaloUserId, studentId: i.studentId,
      studentName: i.student ? (i.student.name || `Học viên #${i.studentId}`) : null,
      courseId: i.courseId, courseName: i.course ? (i.course.name_khoa || i.course.name_lop) : null,
      text: i.text, crmRequestId: i.crmRequestId, createdAt: i.createdAt.toISOString(),
    })),
    canControl: actor.role === 'ADMIN',
  }
}

/** Hủy tay 1 lệnh đang chờ (QUEUED/HELD) trong phạm vi actor. */
export async function cancelZaloCommand(actor: CrmActor, commandId: number): Promise<{ status: ZaloCommandStatus }> {
  const command = await prisma.zaloCareCommand.findUnique({ where: { id: commandId }, select: { id: true, status: true, courseId: true } })
  if (!command) throw new CrmError('Không tìm thấy lệnh gửi Zalo.', 404)
  const courseIds = await careScopeCourseIds(actor)
  if (courseIds && (command.courseId == null || !courseIds.includes(command.courseId))) {
    throw new CrmError('Lệnh này không thuộc phạm vi phụ trách của bạn.', 403)
  }
  const current = command.status as ZaloCommandStatus
  if (!canTransitionCommand(current, 'CANCELLED')) {
    throw new CrmError('Chỉ hủy được lệnh đang chờ hoặc đang bị giữ.', 409)
  }
  await prisma.zaloCareCommand.updateMany({ where: { id: commandId, status: current }, data: { status: 'CANCELLED' } })
  return { status: 'CANCELLED' }
}
