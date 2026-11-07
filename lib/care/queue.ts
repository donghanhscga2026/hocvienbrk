import prisma from '@/lib/prisma'
import type { CrmActor } from '@/lib/crm/shared'
import { computeCurrentDayOrder } from '@/lib/course/deadline'
import {
  CARE_RULE_META, type CareRuleId, careSkipKey, computeDailyStreak, decideCareSignals,
  vnDateString, vnDayStartUtc, vnHour,
} from './rules'
import { careReminderText, formatMoneyVnd } from './templates'

/**
 * Dựng hàng đợi "Cần chăm hôm nay": nạp dữ liệu theo lô cho mọi ghi danh
 * trong phạm vi (không truy vấn từng học viên), chạy 6 luật thuần ở
 * lib/care/rules.ts rồi giải trạng thái từng dòng (đã nhắc hôm nay / bị
 * trần 1 nhắc mỗi ngày / đã bỏ qua / người thật đang xử lý).
 */

export type CareRowStatus = 'pending' | 'reminded' | 'capped' | 'skipped' | 'takeover'

export interface CareRow {
  userId: number
  userName: string
  courseId: number
  courseName: string
  teacherId: number | null
  enrollmentId: number | null
  ruleId: CareRuleId
  ruleName: string
  score: number
  signal: string
  detail: string
  message: string
  status: CareRowStatus
}

export interface CareQueueResult {
  date: string
  stats: {
    total: number
    highRisk: number
    remindedToday: number
    capped: number
    takeover: number
    byRule: Record<CareRuleId, number>
  }
  rows: CareRow[]
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const MAX_ENROLLMENTS = 1500
const MAX_ROWS = 300

/** Phạm vi khóa của actor: admin = tất cả; giảng viên = khóa mình dạy. null = tất cả. */
export function careScopeCourseIds(actor: CrmActor): Promise<number[] | null> {
  if (actor.role === 'ADMIN') return Promise.resolve(null)
  return prisma.course.findMany({ where: { teacherId: actor.id }, select: { id: true } }).then((rows) => rows.map((r) => r.id))
}

interface Unit {
  userId: number
  userName: string
  courseId: number
  enrollmentId: number | null
  enrollmentStatus: string
  activatedAt: Date | null
  enrolledAt: Date | null
  startedAt: Date | null
}

export async function buildCareQueue(courseIds: number[] | null, now = new Date()): Promise<CareQueueResult> {
  const today = vnDateString(now)
  const empty: CareQueueResult = {
    date: today,
    stats: { total: 0, highRisk: 0, remindedToday: 0, capped: 0, takeover: 0, byRule: { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0 } },
    rows: [],
  }
  const courses = await prisma.course.findMany({
    where: courseIds ? { id: { in: courseIds } } : undefined,
    select: { id: true, name_khoa: true, name_lop: true, teacherId: true },
  })
  if (courses.length === 0) return empty
  const courseMap = new Map(courses.map((c) => [c.id, c]))
  const scopedIds = courses.map((c) => c.id)

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: { in: scopedIds }, OR: [{ status: 'ACTIVE' }, { payment: { status: 'PENDING' } }] },
    orderBy: { createdAt: 'desc' },
    take: MAX_ENROLLMENTS,
    select: {
      id: true, userId: true, courseId: true, status: true, createdAt: true, activatedAt: true, startedAt: true,
      user: { select: { id: true, name: true } },
    },
  })

  const openRequests = await prisma.crmRequest.findMany({
    where: { courseId: { in: scopedIds }, status: 'NEW', userId: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, userId: true, courseId: true, createdAt: true },
  })

  // Đơn vị chấm luật: mỗi (học viên, khóa) từ ghi danh; yêu cầu CRM của
  // người chưa có ghi danh tương ứng vẫn tạo 1 đơn vị riêng cho luật R5.
  const units = new Map<string, Unit>()
  for (const e of enrollments) {
    units.set(`${e.userId}:${e.courseId}`, {
      userId: e.userId, userName: e.user.name || `Học viên #${e.userId}`, courseId: e.courseId,
      enrollmentId: e.id, enrollmentStatus: e.status, activatedAt: e.activatedAt ?? e.createdAt,
      enrolledAt: e.createdAt, startedAt: e.startedAt,
    })
  }
  const requestOnlyUserIds = new Set<number>()
  for (const r of openRequests) {
    if (r.userId == null || r.courseId == null) continue
    const key = `${r.userId}:${r.courseId}`
    if (!units.has(key)) {
      requestOnlyUserIds.add(r.userId)
      units.set(key, {
        userId: r.userId, userName: `Học viên #${r.userId}`, courseId: r.courseId,
        enrollmentId: null, enrollmentStatus: 'NONE', activatedAt: null, enrolledAt: null, startedAt: null,
      })
    }
  }
  if (requestOnlyUserIds.size > 0) {
    const users = await prisma.user.findMany({ where: { id: { in: [...requestOnlyUserIds] } }, select: { id: true, name: true } })
    const names = new Map(users.map((u) => [u.id, u.name]))
    for (const unit of units.values()) {
      if (unit.enrollmentId === null && names.get(unit.userId)) unit.userName = names.get(unit.userId) as string
    }
  }
  if (units.size === 0) return empty

  const enrollmentIds = enrollments.map((e) => e.id)
  const userIds = [...new Set([...units.values()].map((u) => u.userId))]

  const [progresses, lessons, payments, baselines, recentComments, recentRequests, careNotifications] = await Promise.all([
    enrollmentIds.length ? prisma.lessonProgress.findMany({
      where: { enrollmentId: { in: enrollmentIds } },
      select: { enrollmentId: true, lessonId: true, status: true, submittedAt: true, updatedAt: true, createdAt: true },
    }) : Promise.resolve([]),
    prisma.lesson.findMany({
      where: { courseId: { in: scopedIds } },
      select: { id: true, courseId: true, order: true, title: true, isDailyChallenge: true },
    }),
    enrollmentIds.length ? prisma.payment.findMany({
      where: { enrollmentId: { in: enrollmentIds }, status: 'PENDING' },
      select: { enrollmentId: true, amount: true, createdAt: true },
    }) : Promise.resolve([]),
    prisma.learnerBaseline.findMany({
      where: { kind: 'A', OR: [...units.values()].map((u) => ({ userId: u.userId, courseId: u.courseId })) },
      select: { userId: true, courseId: true },
    }),
    prisma.lessonComment.findMany({
      where: { userId: { in: userIds }, createdAt: { gte: new Date(now.getTime() - 35 * DAY_MS) } },
      select: { userId: true, lessonId: true, createdAt: true },
    }),
    prisma.crmRequest.findMany({
      where: { userId: { in: userIds }, courseId: { in: scopedIds }, createdAt: { gte: new Date(now.getTime() - DAY_MS) } },
      select: { userId: true, courseId: true },
    }),
    prisma.appNotification.findMany({
      where: { recipientId: { in: userIds }, eventKey: { startsWith: 'care:' }, createdAt: { gte: new Date(now.getTime() - 72 * HOUR_MS) } },
      select: { recipientId: true, eventKey: true, createdAt: true },
    }),
  ])

  const lessonMap = new Map(lessons.map((l) => [l.id, l]))
  const dailyCourseIds = new Set(lessons.filter((l) => l.isDailyChallenge).map((l) => l.courseId))

  const progressByEnrollment = new Map<number, typeof progresses>()
  for (const p of progresses) {
    const list = progressByEnrollment.get(p.enrollmentId) ?? []
    list.push(p)
    progressByEnrollment.set(p.enrollmentId, list)
  }
  const paymentByEnrollment = new Map(payments.map((p) => [p.enrollmentId, p]))
  const baselineA = new Set(baselines.map((b) => `${b.userId}:${b.courseId}`))

  // Hoạt động bình luận gần nhất theo (học viên, khóa) + dấu takeover 24 giờ.
  const lastCommentAt = new Map<string, number>()
  const takeoverPairs = new Set<string>()
  for (const c of recentComments) {
    const lesson = lessonMap.get(c.lessonId)
    if (!lesson) continue
    const key = `${c.userId}:${lesson.courseId}`
    const at = c.createdAt.getTime()
    if (at > (lastCommentAt.get(key) ?? 0)) lastCommentAt.set(key, at)
    if (at >= now.getTime() - DAY_MS) takeoverPairs.add(key)
  }
  for (const r of recentRequests) {
    if (r.userId != null && r.courseId != null) takeoverPairs.add(`${r.userId}:${r.courseId}`)
  }

  // Trạng thái nhắc care: hôm nay đã nhắc luật nào, trần toàn cục, lần nhắc R4 gần nhất.
  const remindedToday = new Set<string>()
  const anyCareToday = new Set<number>()
  const lastPaymentReminderAt = new Map<string, number>()
  for (const n of careNotifications) {
    const parts = n.eventKey.split(':')
    if (parts.length < 5) continue
    const [, ruleId, uid, cid, date] = parts
    if (date === today) {
      remindedToday.add(`${uid}:${cid}:${ruleId}`)
      anyCareToday.add(Number(uid))
    }
    if (ruleId === 'R4') {
      const key = `${uid}:${cid}`
      const at = n.createdAt.getTime()
      if (at > (lastPaymentReminderAt.get(key) ?? 0)) lastPaymentReminderAt.set(key, at)
    }
  }

  const oldestRequestByPair = new Map<string, Date>()
  for (const r of openRequests) {
    if (r.userId == null || r.courseId == null) continue
    const key = `${r.userId}:${r.courseId}`
    if (!oldestRequestByPair.has(key)) oldestRequestByPair.set(key, r.createdAt)
  }

  const hourNow = vnHour(now)
  const rows: CareRow[] = []
  for (const unit of units.values()) {
    const course = courseMap.get(unit.courseId)
    if (!course) continue
    const pairKey = `${unit.userId}:${unit.courseId}`
    const unitProgress = unit.enrollmentId != null ? (progressByEnrollment.get(unit.enrollmentId) ?? []) : []

    let currentDayOrder: number | null = null
    let submittedToday = false
    let dailyStreak = 0
    if (dailyCourseIds.has(unit.courseId) && unit.startedAt) {
      currentDayOrder = computeCurrentDayOrder(unit.startedAt, now)
      const completedOrders: number[] = []
      for (const p of unitProgress) {
        if (p.status !== 'COMPLETED') continue
        const lesson = lessonMap.get(p.lessonId)
        if (!lesson || lesson.courseId !== unit.courseId || !lesson.isDailyChallenge) continue
        completedOrders.push(lesson.order)
        if (lesson.order === currentDayOrder && vnDateString(p.submittedAt ?? p.updatedAt) === today) submittedToday = true
      }
      dailyStreak = computeDailyStreak(completedOrders, currentDayOrder)
    }

    let lastActivityAt: number | null = null
    for (const p of unitProgress) {
      const at = Math.max(p.createdAt.getTime(), p.updatedAt.getTime())
      if (lastActivityAt === null || at > lastActivityAt) lastActivityAt = at
    }
    const commentAt = lastCommentAt.get(pairKey)
    if (commentAt != null && (lastActivityAt === null || commentAt > lastActivityAt)) lastActivityAt = commentAt

    const payment = unit.enrollmentId != null ? paymentByEnrollment.get(unit.enrollmentId) : undefined
    const oldestRequest = oldestRequestByPair.get(pairKey)
    const lastR4 = lastPaymentReminderAt.get(pairKey)

    const signals = decideCareSignals({
      enrollmentStatus: unit.enrollmentStatus,
      hoursSinceActivation: unit.activatedAt ? (now.getTime() - unit.activatedAt.getTime()) / HOUR_MS : null,
      enrolledDaysAgo: unit.enrolledAt ? Math.floor((now.getTime() - unit.enrolledAt.getTime()) / DAY_MS) : 0,
      progressCount: unitProgress.length,
      isDailyCourse: dailyCourseIds.has(unit.courseId),
      vnHour: hourNow,
      submittedToday,
      dailyStreak,
      daysSinceLastActivity: lastActivityAt !== null ? Math.floor((now.getTime() - lastActivityAt) / DAY_MS) : null,
      pendingPaymentHours: payment ? (now.getTime() - payment.createdAt.getTime()) / HOUR_MS : null,
      hoursSinceLastPaymentReminder: lastR4 != null ? (now.getTime() - lastR4) / HOUR_MS : null,
      openRequestHours: oldestRequest ? (now.getTime() - oldestRequest.getTime()) / HOUR_MS : null,
      hasBaselineA: baselineA.has(pairKey),
    })

    const courseName = course.name_khoa || course.name_lop || `khóa học #${course.id}`
    for (const signal of signals) {
      const f = signal.facts
      let signalText = ''
      let detail = ''
      const vars: Record<string, string | number> = { name: unit.userName, course: courseName }
      if (signal.ruleId === 'R1') {
        signalText = `Chưa học bài nào — đã kích hoạt ${f.days} ngày`
        detail = 'Chưa có tiến độ bài học nào trong khóa'
        vars.days = f.days
      } else if (signal.ruleId === 'R2') {
        signalText = `Hôm nay chưa nộp bài — đang giữ chuỗi ${f.streak} ngày`
        detail = currentDayOrder ? `Bài hôm nay: Ngày ${currentDayOrder}` : ''
        vars.streak = f.streak
        vars.lesson = currentDayOrder ? `Ngày ${currentDayOrder}` : 'bài hôm nay'
      } else if (signal.ruleId === 'R3') {
        signalText = `Im lặng ${f.silentDays} ngày — trước đó vẫn đang học`
        detail = 'Không có hoạt động học nào trong 7 ngày qua'
        vars.days = f.silentDays
      } else if (signal.ruleId === 'R4') {
        signalText = `Thanh toán chờ ${f.hours} giờ chưa hoàn tất`
        detail = payment ? `Số tiền chờ: ${formatMoneyVnd(payment.amount)}` : ''
        vars.hours = f.hours
        if (payment) vars.amount = formatMoneyVnd(payment.amount)
      } else if (signal.ruleId === 'R5') {
        signalText = `Yêu cầu hỗ trợ chờ ${f.hours} giờ chưa xử lý`
        detail = 'Yêu cầu đang ở trạng thái Mới gửi trong CRM'
        vars.hours = f.hours
      } else {
        signalText = `Chưa ghi Điểm A — đã ghi danh ${f.days} ngày`
        detail = 'Chưa có mốc điểm bắt đầu để đo tiến bộ'
        vars.days = f.days
      }
      rows.push({
        userId: unit.userId,
        userName: unit.userName,
        courseId: unit.courseId,
        courseName,
        teacherId: course.teacherId,
        enrollmentId: unit.enrollmentId,
        ruleId: signal.ruleId,
        ruleName: CARE_RULE_META[signal.ruleId].name,
        score: signal.score,
        signal: signalText,
        detail,
        message: careReminderText(signal.ruleId, vars),
        status: 'pending',
      })
    }
  }

  rows.sort((a, b) => b.score - a.score || a.userId - b.userId)

  // "Bỏ qua hôm nay" nằm ở ActivityLog CARE_SKIP với detail là khóa định danh.
  if (rows.length > 0) {
    const skipKeys = rows.map((r) => careSkipKey(r.userId, r.courseId, r.ruleId, today))
    const skips = await prisma.activityLog.findMany({
      where: { action: 'CARE_SKIP', detail: { in: skipKeys }, createdAt: { gte: vnDayStartUtc(today) } },
      select: { detail: true },
    })
    const skipped = new Set(skips.map((s) => s.detail))
    for (const row of rows) {
      const pairKey = `${row.userId}:${row.courseId}`
      if (remindedToday.has(`${row.userId}:${row.courseId}:${row.ruleId}`)) row.status = 'reminded'
      else if (skipped.has(careSkipKey(row.userId, row.courseId, row.ruleId, today))) row.status = 'skipped'
      else if (takeoverPairs.has(pairKey)) row.status = 'takeover'
      else if (anyCareToday.has(row.userId)) row.status = 'capped'
    }
  }

  const byRule: Record<CareRuleId, number> = { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0 }
  for (const row of rows) byRule[row.ruleId]++
  return {
    date: today,
    stats: {
      total: rows.length,
      highRisk: rows.filter((r) => r.score >= 75).length,
      remindedToday: rows.filter((r) => r.status === 'reminded').length,
      capped: rows.filter((r) => r.status === 'capped').length,
      takeover: rows.filter((r) => r.status === 'takeover').length,
      byRule,
    },
    rows: rows.slice(0, MAX_ROWS),
  }
}

/** Số thông báo care đã gửi cho 1 học viên trong hôm nay (giờ VN) — dùng cho trần 1/ngày. */
export async function countCareToday(userId: number, now = new Date()): Promise<number> {
  const today = vnDateString(now)
  const rows = await prisma.appNotification.findMany({
    where: { recipientId: userId, eventKey: { startsWith: 'care:' }, createdAt: { gte: vnDayStartUtc(today) } },
    select: { eventKey: true },
  })
  return rows.filter((r) => r.eventKey.split(':')[2] === String(userId) && r.eventKey.endsWith(`:${today}`)).length
}
