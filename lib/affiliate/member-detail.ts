import prisma from "@/lib/prisma"

/**
 * Chi tiết hoa hồng của MỘT thành viên (trang admin xem từng CTV).
 *
 * Trả lời 3 câu hỏi: thành viên có tổng bao nhiêu hoa hồng (trực tiếp /
 * tri ân, đã chốt / chờ đối soát), đến từ những khóa nào, và từng giao
 * dịch cụ thể ra sao. Số liệu lấy từ AffiliateCommission (bảng ghi nhận),
 * KHÔNG tính các dòng đã thu hồi (CANCELLED) — chỉ đếm riêng để đối chiếu.
 * Tổng hoa hồng (mọi kỳ) khớp số dư ghi nhận trong ví của thành viên.
 *
 * Kỳ lọc theo ngày thanh toán của đơn (order.paidAt) như báo cáo
 * quyết toán; mặc định xem tất cả các kỳ.
 */

export interface MemberCommissionLine {
  commissionId: number
  orderId: number | null
  orderDate: string
  availableAt: string | null
  ready: boolean
  kind: string
  percentage: number
  amount: number
  courseId: number | null
  courseName: string
  teacherName: string
  listedPrice: number
  buyerName: string
}

export interface MemberCourseGroup {
  courseId: number | null
  courseName: string
  teacherName: string
  lineCount: number
  orderCount: number
  gmv: number
  directAmount: number
  gratitudeAmount: number
  totalAmount: number
}

export interface MemberCommissionDetail {
  member: { id: number; name: string; email: string; role: string }
  wallet: { pendingBalance: number; balance: number } | null
  period: string
  lines: MemberCommissionLine[]
  courses: MemberCourseGroup[]
  totals: {
    direct: number
    gratitude: number
    total: number
    ready: number
    waiting: number
    lineCount: number
    orderCount: number
    cancelledCount: number
    cancelledAmount: number
  }
}

function periodWindow(period: string): { gte: Date; lt: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(period)) return null
  const [y, m] = period.split('-').map(Number)
  const gte = new Date(`${period}-01T00:00:00+07:00`)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  const lt = new Date(`${next}-01T00:00:00+07:00`)
  return { gte, lt }
}

export async function getMemberCommissionDetail(opts: {
  memberId: number
  period: string // 'YYYY-MM' hoặc 'all'
}): Promise<MemberCommissionDetail | null> {
  const { memberId, period } = opts
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { id: true, name: true, email: true, role: true }
  })
  if (!member) return null

  const wallet = await prisma.affiliateWallet.findUnique({
    where: { userId: memberId },
    select: { pendingBalance: true, balance: true }
  })

  const allCommissions = await prisma.affiliateCommission.findMany({
    where: { affiliateId: memberId },
    include: {
      conversion: { select: { orderRecordId: true, enrollmentId: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const cancelled = allCommissions.filter(cm => cm.status === 'CANCELLED')
  const commissions = allCommissions.filter(cm => cm.status !== 'CANCELLED')

  // Quy mỗi hoa hồng về đơn + khóa học (giống lib/affiliate/settlement.ts)
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
        include: { items: true, buyer: { select: { id: true, name: true } } }
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
  const teacherIds = new Set<number>()
  for (const cs of courses) if (cs.teacherId) teacherIds.add(cs.teacherId)
  const teachers = teacherIds.size
    ? await prisma.user.findMany({ where: { id: { in: [...teacherIds] } }, select: { id: true, name: true } })
    : []
  const teacherMap = new Map(teachers.map(t => [t.id, t.name]))

  const win = period === 'all' ? null : periodWindow(period)
  const now = new Date()
  const lines: MemberCommissionLine[] = []
  for (const cm of commissions) {
    let orderId: number | null = cm.conversion?.orderRecordId ?? null
    if (!orderId && cm.conversion?.enrollmentId) orderId = orderByEnrollment.get(cm.conversion.enrollmentId) ?? null
    const order = orderId ? orderMap.get(orderId) : undefined
    const item = order?.items?.[0]
    const course = item && item.productType === 'COURSE' ? courseMap.get(item.productId) : undefined
    const effectiveDate = order?.paidAt ?? cm.createdAt
    if (win && !(effectiveDate >= win.gte && effectiveDate < win.lt)) continue
    lines.push({
      commissionId: cm.id,
      orderId,
      orderDate: effectiveDate.toISOString(),
      availableAt: cm.availableAt ? cm.availableAt.toISOString() : null,
      ready: cm.status !== 'PENDING' || (!!cm.availableAt && cm.availableAt <= now),
      kind: String(cm.kind),
      percentage: cm.percentage,
      amount: cm.netAmount,
      courseId: course?.id ?? null,
      courseName: course ? (course.name_khoa || course.name_lop) : (item?.productName || '—'),
      teacherName: course?.teacherId ? (teacherMap.get(course.teacherId) || '') : '',
      listedPrice: order?.totalAmount ?? 0,
      buyerName: order?.buyer?.name || '—'
    })
  }
  lines.sort((a, b) => (a.orderDate < b.orderDate ? 1 : -1))

  // Nhóm theo khóa học
  const courseGroups = new Map<string, MemberCourseGroup & { orderSet: Set<number> }>()
  for (const ln of lines) {
    const key = String(ln.courseId ?? 'null')
    if (!courseGroups.has(key)) {
      courseGroups.set(key, {
        courseId: ln.courseId,
        courseName: ln.courseName,
        teacherName: ln.teacherName,
        lineCount: 0,
        orderCount: 0,
        gmv: 0,
        directAmount: 0,
        gratitudeAmount: 0,
        totalAmount: 0,
        orderSet: new Set()
      })
    }
    const g = courseGroups.get(key)!
    g.lineCount += 1
    if (ln.orderId && !g.orderSet.has(ln.orderId)) {
      g.orderSet.add(ln.orderId)
      g.gmv += ln.listedPrice
    }
    if (ln.kind === 'DIRECT') g.directAmount += ln.amount; else g.gratitudeAmount += ln.amount
    g.totalAmount += ln.amount
  }
  const coursesOut: MemberCourseGroup[] = [...courseGroups.values()]
    .map(g => ({
      courseId: g.courseId,
      courseName: g.courseName,
      teacherName: g.teacherName,
      lineCount: g.lineCount,
      orderCount: g.orderSet.size,
      gmv: g.gmv,
      directAmount: g.directAmount,
      gratitudeAmount: g.gratitudeAmount,
      totalAmount: g.totalAmount
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  const totals = {
    direct: lines.filter(l => l.kind === 'DIRECT').reduce((s, l) => s + l.amount, 0),
    gratitude: lines.filter(l => l.kind !== 'DIRECT').reduce((s, l) => s + l.amount, 0),
    total: lines.reduce((s, l) => s + l.amount, 0),
    ready: lines.filter(l => l.ready).reduce((s, l) => s + l.amount, 0),
    waiting: lines.filter(l => !l.ready).reduce((s, l) => s + l.amount, 0),
    lineCount: lines.length,
    orderCount: new Set(lines.map(l => l.orderId).filter(x => x != null)).size,
    cancelledCount: cancelled.length,
    cancelledAmount: cancelled.reduce((s, cm) => s + cm.netAmount, 0)
  }

  return {
    member: { id: member.id, name: member.name, email: member.email, role: member.role },
    wallet: wallet ? { pendingBalance: wallet.pendingBalance, balance: wallet.balance } : null,
    period,
    lines,
    courses: coursesOut,
    totals
  }
}
