import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/**
 * Cron vinh danh Affiliate (Affiliate v2 — GĐ4 + cập nhật hằng ngày).
 *
 * Mỗi lần chạy (lịch chính: Vercel Cron 08:20 mỗi sáng trong vercel.json;
 * bộ lập lịch GitHub cũng gọi cùng endpoint này):
 *  1. Chốt kỳ tháng trước nếu chưa có snapshot: tổng hợp GMV + hoa hồng
 *     theo CTV → ghi LeaderboardSnapshot, đồng thời trao huy hiệu.
 *     Idempotent — kỳ đã chốt không bao giờ bị ghi lại.
 *  2. Tính lại snapshot của kỳ tháng hiện tại (số liệu tạm tính): xóa các
 *     dòng cũ của kỳ hiện tại rồi ghi lại từ số liệu mới nhất, để trang
 *     /vinh-danh hiện cuộc đua đang diễn ra. Kỳ tạm tính KHÔNG trao huy
 *     hiệu — huy hiệu chỉ trao khi chốt kỳ ở bước 1.
 *
 * Huy hiệu affiliate chỉ gồm 4 mốc theo code dưới đây. Bảng Badge còn chứa
 * huy hiệu của các tính năng khác (học tập, video...) với thresholdGmv = 0
 * — tuyệt đối không xét các huy hiệu đó ở đây, tránh trao nhầm hàng loạt.
 *
 * Mốc huy hiệu mặc định (admin chỉnh sau trong bảng Badge):
 *   Đồng: 10 triệu · Bạc: 50 triệu · Vàng: 200 triệu · Kim cương: 500 triệu
 */
const AFFILIATE_BADGE_CODES = ['DONG', 'BAC', 'VANG', 'KIM_CUONG']

type PeriodRow = {
  userId: number
  gmv: number
  orders: number
  commission: number
}

function periodOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(year: number, monthIdx: number): { from: Date; to: Date } {
  return { from: new Date(year, monthIdx, 1), to: new Date(year, monthIdx + 1, 1) }
}

/**
 * Tổng hợp một kỳ từ Order/Commission — cùng công thức cho cả kỳ chốt
 * (tháng trước) và kỳ tạm tính (tháng hiện tại):
 * - GMV: tổng totalAmount các Order PAID có affiliateId, paidAt trong kỳ.
 * - Hoa hồng: tổng netAmount các dòng hoa hồng chưa bị thu hồi (status khác
 *   CANCELLED) thuộc các đơn PAID có paidAt trong kỳ.
 * - Người hưởng hoa hồng nhưng không có doanh số qua link (gmv = 0) vẫn có
 *   dòng riêng xếp sau nhóm GMV, để mục Top hoa hồng không sót ai.
 */
async function computePeriod(from: Date, to: Date): Promise<PeriodRow[]> {
  const groups = await prisma.order.groupBy({
    by: ['affiliateId'],
    where: { status: 'PAID', affiliateId: { not: null }, paidAt: { gte: from, lt: to } },
    _sum: { totalAmount: true },
    _count: { id: true }
  })

  const ranked: PeriodRow[] = groups
    .filter((g) => g.affiliateId)
    .map((g) => ({
      userId: g.affiliateId as number,
      gmv: g._sum.totalAmount ?? 0,
      orders: g._count.id,
      commission: 0
    }))
    .filter((g) => g.gmv > 0)
    .sort((a, b) => b.gmv - a.gmv)

  const commissionGroups = await prisma.affiliateCommission.groupBy({
    by: ['affiliateId'],
    where: {
      status: { not: 'CANCELLED' },
      conversion: {
        orderRecord: { status: 'PAID', paidAt: { gte: from, lt: to } }
      }
    },
    _sum: { netAmount: true }
  })
  const commissionOf = new Map(
    commissionGroups.map((g) => [g.affiliateId, g._sum.netAmount ?? 0])
  )
  for (const r of ranked) {
    r.commission = commissionOf.get(r.userId) ?? 0
  }

  const rankedIds = new Set(ranked.map((r) => r.userId))
  const commissionOnly: PeriodRow[] = [...commissionOf.entries()]
    .filter(([userId, amount]) => !rankedIds.has(userId) && amount > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([userId, amount]) => ({ userId, gmv: 0, orders: 0, commission: amount }))

  return [...ranked, ...commissionOnly]
}

function snapshotData(period: string, rows: PeriodRow[]) {
  return rows.map((r, idx) => ({
    userId: r.userId,
    period,
    rank: idx + 1,
    gmv: r.gmv,
    orderCount: r.orders,
    commissionEarned: r.commission
  }))
}

/** Chốt kỳ tháng trước (nếu chưa chốt) + trao huy hiệu affiliate. */
async function finalizePrevMonth(now: Date) {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const period = periodOf(prev)
  const { from, to } = monthRange(prev.getFullYear(), prev.getMonth())

  const existing = await prisma.leaderboardSnapshot.findFirst({ where: { period } })
  if (existing) {
    return { period, finalized: false, affiliates: 0, badgesAwarded: 0 }
  }

  const rows = await computePeriod(from, to)
  await prisma.leaderboardSnapshot.createMany({ data: snapshotData(period, rows) })

  // Seed 4 huy hiệu mặc định nếu chưa có (idempotent theo code)
  // Hướng A (19/10/2026): bảng Badge có icon + isActive; ngưỡng GMV = thresholdGmv.
  const badgeDefs = [
    { code: 'DONG', name: 'Đồng', description: 'GMV từ 10 triệu trong tháng', thresholdGmv: 10000000, icon: '🥉', tier: 1 },
    { code: 'BAC', name: 'Bạc', description: 'GMV từ 50 triệu trong tháng', thresholdGmv: 50000000, icon: '🥈', tier: 2 },
    { code: 'VANG', name: 'Vàng', description: 'GMV từ 200 triệu trong tháng', thresholdGmv: 200000000, icon: '🥇', tier: 3 },
    { code: 'KIM_CUONG', name: 'Kim cương', description: 'GMV từ 500 triệu trong tháng', thresholdGmv: 500000000, icon: '💎', tier: 4 }
  ]
  for (const def of badgeDefs) {
    await prisma.badge.upsert({
      where: { code: def.code },
      update: {},
      create: { ...def, isActive: true }
    })
  }
  // Chỉ xét 4 huy hiệu affiliate đang bật — không đụng huy hiệu tính năng khác.
  const badges = await prisma.badge.findMany({
    where: { isActive: true, code: { in: AFFILIATE_BADGE_CODES } }
  })

  // Trao huy hiệu (idempotent theo userId+badgeId+period)
  let awarded = 0
  for (const r of rows) {
    if (r.gmv <= 0) continue
    for (const badge of badges) {
      if (r.gmv >= badge.thresholdGmv) {
        const exists = await prisma.userBadge.findFirst({
          where: { userId: r.userId, badgeId: badge.id, period }
        })
        if (!exists) {
          await prisma.userBadge.create({
            data: { userId: r.userId, badgeId: badge.id, period }
          })
          awarded++
        }
      }
    }
  }

  console.log(`[AffiliateLeaderboard] Chốt kỳ ${period}: ${rows.length} CTV, ${awarded} huy hiệu`)
  return { period, finalized: true, affiliates: rows.length, badgesAwarded: awarded }
}

/** Tính lại snapshot tạm tính của kỳ tháng hiện tại (không trao huy hiệu). */
async function refreshCurrentMonth(now: Date) {
  const period = periodOf(now)
  const { from, to } = monthRange(now.getFullYear(), now.getMonth())

  const rows = await computePeriod(from, to)
  await prisma.$transaction([
    prisma.leaderboardSnapshot.deleteMany({ where: { period } }),
    prisma.leaderboardSnapshot.createMany({ data: snapshotData(period, rows) })
  ])

  console.log(`[AffiliateLeaderboard] Tạm tính kỳ ${period}: ${rows.length} CTV`)
  return { period, affiliates: rows.length }
}

async function handleCron(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const finalized = await finalizePrevMonth(now)
    const current = await refreshCurrentMonth(now)
    return NextResponse.json({ success: true, finalized, current })
  } catch (error) {
    console.error('[AffiliateLeaderboard] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Vercel Cron gọi bằng GET; bộ lập lịch ngoài có thể gọi POST — cả hai dùng chung một xử lý.
export const GET = handleCron
export const POST = handleCron
