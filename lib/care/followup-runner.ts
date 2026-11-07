import prisma from '@/lib/prisma'
import { countCareToday } from './queue'
import { notifyUser } from './notify'
import { decideFollowUp, FOLLOW_UP_REASON_LABEL } from './followups'
import { renderCareLibraryTemplate } from './templates-lib'
import { fillCareTemplate } from './templates'

/**
 * Care Engine GĐ2 — xử lý hẹn giờ theo dõi đã tới hạn (chạy trong cùng
 * lượt quét sáng của cron care-reminders, không cần lịch riêng):
 * - học viên đã hoạt động/phản hồi sau khi đặt hẹn → tự hủy, ghi lý do;
 * - chưa phản hồi → gửi nhắc theo câu mẫu đã chọn, vẫn tôn trọng trần
 *   1 nhắc care/ngày/học viên của GĐ1 (đang chạm trần thì để hẹn chờ
 *   lượt quét sau, đếm vào deferredCap).
 * Mặc định dry-run: chỉ đếm, không ghi gì — cùng cơ chế cron GĐ1.
 */

export interface FollowUpRunResult {
  scanned: number
  sent: number
  wouldSend: number
  cancelledAuto: number
  wouldCancel: number
  deferredCap: number
  dryRun: boolean
}

const MAX_DUE = 200

export async function processDueFollowUps(now = new Date(), options: { dryRun?: boolean } = {}): Promise<FollowUpRunResult> {
  const dryRun = options.dryRun === true
  const result: FollowUpRunResult = { scanned: 0, sent: 0, wouldSend: 0, cancelledAuto: 0, wouldCancel: 0, deferredCap: 0, dryRun }
  const due = await prisma.careFollowUp.findMany({
    where: { status: 'PENDING', dueAt: { lte: now } },
    orderBy: { dueAt: 'asc' },
    take: MAX_DUE,
    include: {
      template: { select: { id: true, body: true, isActive: true } },
      student: { select: { name: true } },
      course: { select: { name_khoa: true, name_lop: true } },
    },
  })
  result.scanned = due.length
  if (due.length === 0) return result

  const since = new Date(Math.min(...due.map((f) => f.createdAt.getTime())))
  const studentIds = [...new Set(due.map((f) => f.studentId))]

  // Nạp hoạt động theo lô từ thời điểm đặt hẹn sớm nhất.
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: { in: studentIds } },
    select: { id: true, userId: true, courseId: true },
  })
  const enrollmentOwner = new Map(enrollments.map((e) => [e.id, `${e.userId}`]))
  const enrollmentPair = new Map(enrollments.map((e) => [e.id, `${e.userId}:${e.courseId}`]))

  const [progresses, comments, requests, notifications] = await Promise.all([
    enrollments.length ? prisma.lessonProgress.findMany({
      where: { enrollmentId: { in: enrollments.map((e) => e.id) }, updatedAt: { gte: since } },
      select: { enrollmentId: true, createdAt: true, updatedAt: true },
    }) : Promise.resolve([]),
    prisma.lessonComment.findMany({
      where: { userId: { in: studentIds }, createdAt: { gte: since } },
      select: { userId: true, lessonId: true, createdAt: true },
    }),
    prisma.crmRequest.findMany({
      where: { userId: { in: studentIds }, createdAt: { gte: since } },
      select: { userId: true, courseId: true, createdAt: true },
    }),
    prisma.appNotification.findMany({
      where: { recipientId: { in: studentIds }, eventKey: { startsWith: 'care:' }, createdAt: { gte: since } },
      select: { recipientId: true, eventKey: true, createdAt: true },
    }),
  ])

  const commentLessonIds = [...new Set(comments.map((c) => c.lessonId))]
  const commentLessons = commentLessonIds.length ? await prisma.lesson.findMany({
    where: { id: { in: commentLessonIds } }, select: { id: true, courseId: true },
  }) : []
  const lessonCourse = new Map(commentLessons.map((l) => [l.id, l.courseId]))

  // Mốc hoạt động gần nhất: theo (học viên, khóa) và theo học viên (cho hẹn không gắn khóa).
  const latest = (map: Map<string, number>, key: string, at: number) => { if (at > (map.get(key) ?? 0)) map.set(key, at) }
  const progressPair = new Map<string, number>(); const progressUser = new Map<string, number>()
  for (const p of progresses) {
    const at = Math.max(p.createdAt.getTime(), p.updatedAt.getTime())
    const pair = enrollmentPair.get(p.enrollmentId); const user = enrollmentOwner.get(p.enrollmentId)
    if (pair) latest(progressPair, pair, at)
    if (user) latest(progressUser, user, at)
  }
  const commentPair = new Map<string, number>(); const commentUser = new Map<string, number>()
  for (const c of comments) {
    const at = c.createdAt.getTime()
    latest(commentUser, `${c.userId}`, at)
    const courseId = lessonCourse.get(c.lessonId)
    if (courseId != null) latest(commentPair, `${c.userId}:${courseId}`, at)
  }
  const requestPair = new Map<string, number>(); const requestUser = new Map<string, number>()
  for (const r of requests) {
    if (r.userId == null) continue
    const at = r.createdAt.getTime()
    latest(requestUser, `${r.userId}`, at)
    if (r.courseId != null) latest(requestPair, `${r.userId}:${r.courseId}`, at)
  }
  const careUser = new Map<string, number>()
  for (const n of notifications) {
    if (n.eventKey.startsWith('care-followup:')) continue // nhắc của chính hệ hẹn giờ không tính là "nhắc khác"
    latest(careUser, `${n.recipientId}`, n.createdAt.getTime())
  }

  const pick = (pairMap: Map<string, number>, userMap: Map<string, number>, studentId: number, courseId: number | null): number | null => {
    const value = courseId != null ? pairMap.get(`${studentId}:${courseId}`) : userMap.get(`${studentId}`)
    return value != null ? value : null
  }

  for (const followUp of due) {
    const decision = decideFollowUp({
      createdAt: followUp.createdAt.getTime(),
      dueAt: followUp.dueAt.getTime(),
      lastProgressAt: pick(progressPair, progressUser, followUp.studentId, followUp.courseId),
      lastCommentAt: pick(commentPair, commentUser, followUp.studentId, followUp.courseId),
      lastRequestAt: pick(requestPair, requestUser, followUp.studentId, followUp.courseId),
      lastCareReminderAt: careUser.get(`${followUp.studentId}`) ?? null,
    }, now.getTime())

    if (decision.decision === 'cancel-auto') {
      if (dryRun) { result.wouldCancel++; continue }
      await prisma.careFollowUp.update({
        where: { id: followUp.id },
        data: { status: 'CANCELLED_AUTO', cancelledAt: now, cancelReason: FOLLOW_UP_REASON_LABEL[decision.reason] },
      })
      result.cancelledAuto++
      continue
    }

    // decision === 'send' — trần 1 nhắc care/ngày vẫn áp dụng.
    const alreadyToday = await countCareToday(followUp.studentId, now)
    if (alreadyToday > 0) { result.deferredCap++; continue }
    if (dryRun) { result.wouldSend++; continue }

    const studentName = followUp.student.name || `Học viên #${followUp.studentId}`
    const courseName = followUp.course ? (followUp.course.name_khoa || followUp.course.name_lop || '') : ''
    let message: string
    if (followUp.template && followUp.template.isActive) {
      message = renderCareLibraryTemplate(followUp.template.body, { name: studentName, course: courseName })
    } else if (followUp.note && followUp.note.trim()) {
      message = fillCareTemplate(followUp.note.trim(), { name: studentName, course: courseName })
    } else {
      message = fillCareTemplate('Chào {name}, thầy/cô theo dõi lại việc học của mình ở khóa {course} — mình quay lại học tiếp hôm nay nhé, vướng chỗ nào cứ nhắn lại đây.', { name: studentName, course: courseName })
    }
    const sent = await notifyUser({
      userId: followUp.studentId,
      eventKey: `care-followup:${followUp.id}`,
      kind: 'TASK_DUE',
      title: message,
      courseId: followUp.courseId,
    })
    // created=false nghĩa là lượt chạy trước đã gửi (sập giữa chừng) — vẫn chốt trạng thái SENT.
    await prisma.careFollowUp.update({
      where: { id: followUp.id },
      data: { status: 'SENT', sentAt: now },
    })
    if (followUp.templateId) {
      await prisma.careTemplate.update({ where: { id: followUp.templateId }, data: { usedCount: { increment: 1 } } }).catch(() => undefined)
    }
    if (sent.created) result.sent++
  }
  return result
}
