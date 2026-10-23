import prisma from "@/lib/prisma"

/**
 * Báo cáo QUYẾT TOÁN hoa hồng theo giảng viên (mô hình vận hành chốt 2026-10-23).
 *
 * Nền tảng KHÔNG giữ tiền: học phí vào thẳng tài khoản của giảng viên.
 * Hệ thống chỉ GHI NHẬN số liệu hoa hồng; báo cáo này tổng hợp theo từng
 * giảng viên để admin xuất gửi giảng viên — giảng viên đối chiếu với khoản
 * thu thực tế của mình rồi tự thanh toán cho người giới thiệu.
 *
 * - Mỗi dòng hoa hồng được quy về khóa học của đơn hàng tương ứng
 *   (đơn hàng hiện tại luôn có đúng 1 khóa học) → giảng viên của khóa đó
 *   là người có nghĩa vụ thanh toán dòng hoa hồng này.
 * - "Đã chốt" = đã qua hạn đối soát 30 ngày (status khác PENDING hoặc
 *   availableAt <= hiện tại). "Chờ đối soát" = PENDING và chưa tới hạn.
 * - Kỳ báo cáo tính theo tháng ĐƠN HÀNG ĐƯỢC THANH TOÁN (order.paidAt,
 *   giờ Việt Nam) để giảng viên đối chiếu khớp với khoản thu trong tài
 *   khoản ngân hàng của mình; hoa hồng không gắn được đơn thì lấy
 *   ngày ghi nhận (createdAt).
 * - TEACHER chỉ xem được phần của chính mình (khóa do mình phụ trách).
 */

export interface SettlementLine {
  commissionId: number
  orderId: number | null
  orderDate: string
  createdAt: string
  availableAt: string | null
  ready: boolean
  kind: string
  percentage: number
  amount: number
  courseId: number | null
  courseName: string
  listedPrice: number
  teacherId: number | null
  teacherName: string
  affiliateId: number
  affiliateName: string
  affiliateEmail: string
  buyerName: string
}

export interface SettlementAffiliateGroup {
  affiliateId: number
  affiliateName: string
  affiliateEmail: string
  count: number
  totalAmount: number
  readyAmount: number
  waitingAmount: number
}

export interface SettlementCourseGroup {
  courseId: number | null
  courseName: string
  totalAmount: number
  affiliates: SettlementAffiliateGroup[]
}

export interface SettlementTeacherGroup {
  teacherId: number | null
  teacherName: string
  totalAmount: number
  readyAmount: number
  waitingAmount: number
  courses: SettlementCourseGroup[]
}

export interface SettlementData {
  period: string
  lines: SettlementLine[]
  teachers: SettlementTeacherGroup[]
  totals: {
    amount: number
    readyAmount: number
    waitingAmount: number
    lineCount: number
    orderCount: number
    teacherCount: number
    affiliateCount: number
  }
}

/** 'YYYY-MM' (giờ VN) của thời điểm hiện tại */
export function currentPeriodSaigon(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Saigon',
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(new Date())
  const y = parts.find(p => p.type === 'year')?.value
  const mo = parts.find(p => p.type === 'month')?.value
  return `${y}-${mo}`
}

function periodWindow(period: string): { gte: Date; lt: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(period)) return null
  const [y, m] = period.split('-').map(Number)
  const gte = new Date(`${period}-01T00:00:00+07:00`)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  const lt = new Date(`${next}-01T00:00:00+07:00`)
  return { gte, lt }
}

export async function getSettlementData(opts: {
  period: string // 'YYYY-MM' hoặc 'all'
  viewerId: number
  viewerRole: string
}): Promise<SettlementData> {
  const { period, viewerId, viewerRole } = opts
  const isAdmin = viewerRole === 'ADMIN'
  const win = period === 'all' ? null : periodWindow(period)
  const now = new Date()

  const commissions = await prisma.affiliateCommission.findMany({
    where: {
      status: { not: 'CANCELLED' }
    },
    include: {
      conversion: { select: { orderRecordId: true, enrollmentId: true, customerId: true } }
    },
    orderBy: { createdAt: 'asc' }
  })

  // Quy mỗi hoa hồng về 1 Order: qua conversion.orderRecordId,
  // dự phòng qua enrollmentId của OrderItem (hoa hồng thời engine cũ).
  const orderIds = new Set<number>()
  const enrollmentIds = new Set<number>()
  for (const cm of commissions) {
    if (cm.conversion?.orderRecordId) orderIds.add(cm.conversion.orderRecordId)
    else if (cm.conversion?.enrollmentId) enrollmentIds.add(cm.conversion.enrollmentId)
  }
  const extraItems = enrollmentIds.size
    ? await prisma.orderItem.findMany({
        where: { enrollmentId: { in: [...enrollmentIds] } },
        select: { enrollmentId: true, orderId: true }
      })
    : []
  const orderByEnrollment = new Map<number, number>()
  for (const it of extraItems) {
    if (it.enrollmentId) {
      orderByEnrollment.set(it.enrollmentId, it.orderId)
      orderIds.add(it.orderId)
    }
  }

  const orders = orderIds.size
    ? await prisma.order.findMany({
        where: { id: { in: [...orderIds] } },
        include: {
          items: true,
          buyer: { select: { id: true, name: true } }
        }
      })
    : []
  const orderMap = new Map(orders.map(o => [o.id, o]))

  const courseIds = new Set<number>()
  for (const o of orders) for (const it of o.items) if (it.productType === 'COURSE') courseIds.add(it.productId)
  const courses = courseIds.size
    ? await prisma.course.findMany({
        where: { id: { in: [...courseIds] } },
        select: { id: true, name_khoa: true, name_lop: true, teacherId: true }
      })
    : []
  const courseMap = new Map(courses.map(cs => [cs.id, cs]))

  const userIds = new Set<number>()
  for (const cm of commissions) userIds.add(cm.affiliateId)
  for (const cs of courses) if (cs.teacherId) userIds.add(cs.teacherId)
  const users = userIds.size
    ? await prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true, email: true } })
    : []
  const userMap = new Map(users.map(u => [u.id, u]))

  const lines: SettlementLine[] = []
  for (const cm of commissions) {
    let orderId: number | null = cm.conversion?.orderRecordId ?? null
    if (!orderId && cm.conversion?.enrollmentId) orderId = orderByEnrollment.get(cm.conversion.enrollmentId) ?? null
    const order = orderId ? orderMap.get(orderId) : undefined
    const item = order?.items?.[0]
    const course = item && item.productType === 'COURSE' ? courseMap.get(item.productId) : undefined
    const teacherId = course?.teacherId ?? null

    // TEACHER chỉ xem phần của mình
    if (!isAdmin && teacherId !== viewerId) continue

    const affiliate = userMap.get(cm.affiliateId)
    const teacher = teacherId ? userMap.get(teacherId) : undefined
    const ready = cm.status !== 'PENDING' || (!!cm.availableAt && cm.availableAt <= now)

    // Kỳ theo ngày thanh toán của đơn (khớp sao kê ngân hàng của giảng viên)
    const effectiveDate = order?.paidAt ?? cm.createdAt
    if (win && !(effectiveDate >= win.gte && effectiveDate < win.lt)) continue

    lines.push({
      commissionId: cm.id,
      orderId,
      orderDate: effectiveDate.toISOString(),
      createdAt: cm.createdAt.toISOString(),
      availableAt: cm.availableAt ? cm.availableAt.toISOString() : null,
      ready,
      kind: String(cm.kind),
      percentage: cm.percentage,
      amount: cm.netAmount,
      courseId: course?.id ?? null,
      courseName: course ? (course.name_khoa || course.name_lop) : (item?.productName || '—'),
      listedPrice: order?.totalAmount ?? 0,
      teacherId,
      teacherName: teacher?.name || 'Chưa xác định',
      affiliateId: cm.affiliateId,
      affiliateName: affiliate?.name || `#${cm.affiliateId}`,
      affiliateEmail: affiliate?.email || '',
      buyerName: order?.buyer?.name || '—'
    })
  }

  // Nhóm: Giảng viên → Khóa học → Người giới thiệu
  const teacherMap = new Map<string, SettlementTeacherGroup & { courseMap: Map<string, SettlementCourseGroup & { affMap: Map<number, SettlementAffiliateGroup> }> }>()
  for (const ln of lines) {
    const tKey = String(ln.teacherId ?? 'null')
    if (!teacherMap.has(tKey)) {
      teacherMap.set(tKey, {
        teacherId: ln.teacherId,
        teacherName: ln.teacherName,
        totalAmount: 0,
        readyAmount: 0,
        waitingAmount: 0,
        courses: [],
        courseMap: new Map()
      })
    }
    const tg = teacherMap.get(tKey)!
    tg.totalAmount += ln.amount
    if (ln.ready) tg.readyAmount += ln.amount; else tg.waitingAmount += ln.amount

    const cKey = String(ln.courseId ?? 'null')
    if (!tg.courseMap.has(cKey)) {
      tg.courseMap.set(cKey, { courseId: ln.courseId, courseName: ln.courseName, totalAmount: 0, affiliates: [], affMap: new Map() })
    }
    const cg = tg.courseMap.get(cKey)!
    cg.totalAmount += ln.amount
    if (!cg.affMap.has(ln.affiliateId)) {
      cg.affMap.set(ln.affiliateId, {
        affiliateId: ln.affiliateId,
        affiliateName: ln.affiliateName,
        affiliateEmail: ln.affiliateEmail,
        count: 0,
        totalAmount: 0,
        readyAmount: 0,
        waitingAmount: 0
      })
    }
    const ag = cg.affMap.get(ln.affiliateId)!
    ag.count += 1
    ag.totalAmount += ln.amount
    if (ln.ready) ag.readyAmount += ln.amount; else ag.waitingAmount += ln.amount
  }

  const teachers: SettlementTeacherGroup[] = [...teacherMap.values()]
    .map(tg => ({
      teacherId: tg.teacherId,
      teacherName: tg.teacherName,
      totalAmount: tg.totalAmount,
      readyAmount: tg.readyAmount,
      waitingAmount: tg.waitingAmount,
      courses: [...tg.courseMap.values()]
        .map(cg => ({
          courseId: cg.courseId,
          courseName: cg.courseName,
          totalAmount: cg.totalAmount,
          affiliates: [...cg.affMap.values()].sort((a, b) => b.totalAmount - a.totalAmount)
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  const totals = {
    amount: lines.reduce((s, l) => s + l.amount, 0),
    readyAmount: lines.filter(l => l.ready).reduce((s, l) => s + l.amount, 0),
    waitingAmount: lines.filter(l => !l.ready).reduce((s, l) => s + l.amount, 0),
    lineCount: lines.length,
    orderCount: new Set(lines.map(l => l.orderId).filter(x => x != null)).size,
    teacherCount: teachers.length,
    affiliateCount: new Set(lines.map(l => l.affiliateId)).size
  }

  return { period, lines, teachers, totals }
}
