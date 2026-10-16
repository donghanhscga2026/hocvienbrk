import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/**
 * Cron vinh danh Affiliate (Affiliate v2 — GĐ4).
 * Chạy đầu mỗi tháng: tổng hợp GMV tháng trước theo CTV → ghi LeaderboardSnapshot,
 * đồng thời trao huy hiệu theo mốc (idempotent theo userId+badgeId+period).
 *
 * Mốc huy hiệu mặc định (VÍ DỤ — admin chỉnh sau trong bảng Badge):
 *   Đồng: 10 triệu · Bạc: 50 triệu · Vàng: 200 triệu · Kim cương: 500 triệu
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Tháng trước (YYYY-MM)
    const now = new Date()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const period = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    const from = new Date(prev.getFullYear(), prev.getMonth(), 1)
    const to = new Date(prev.getFullYear(), prev.getMonth() + 1, 1)

    // Bỏ qua nếu đã có snapshot cho kỳ này (idempotent)
    const existing = await prisma.leaderboardSnapshot.findFirst({ where: { period } })
    if (existing) {
      return NextResponse.json({ success: true, message: `Period ${period} already processed` })
    }

    // Tổng hợp GMV theo affiliate từ Order PAID
    const groups = await prisma.order.groupBy({
      by: ['affiliateId'],
      where: { status: 'PAID', affiliateId: { not: null }, paidAt: { gte: from, lt: to } },
      _sum: { totalAmount: true },
      _count: { id: true }
    })

    const ranked = groups
      .filter((g) => g.affiliateId)
      .map((g) => ({
        userId: g.affiliateId as number,
        gmv: g._sum.totalAmount ?? 0,
        orders: g._count.id
      }))
      .filter((g) => g.gmv > 0)
      .sort((a, b) => b.gmv - a.gmv)

    // Ghi snapshot
    await prisma.leaderboardSnapshot.createMany({
      data: ranked.map((r, idx) => ({
        userId: r.userId,
        period,
        rank: idx + 1,
        gmv: r.gmv
      }))
    })

    // Seed 4 huy hiệu mặc định nếu chưa có (idempotent theo name)
    const badgeDefs = [
      { name: 'Đồng', description: 'GMV từ 10 triệu trong tháng', minGmv: 10000000, icon: '🥉', tier: 1 },
      { name: 'Bạc', description: 'GMV từ 50 triệu trong tháng', minGmv: 50000000, icon: '🥈', tier: 2 },
      { name: 'Vàng', description: 'GMV từ 200 triệu trong tháng', minGmv: 200000000, icon: '🥇', tier: 3 },
      { name: 'Kim cương', description: 'GMV từ 500 triệu trong tháng', minGmv: 500000000, icon: '💎', tier: 4 }
    ]
    const badges = []
    for (const def of badgeDefs) {
      const badge = await prisma.badge.upsert({
        where: { name: def.name },
        update: {},
        create: { ...def, isActive: true }
      })
      badges.push(badge)
    }

    // Trao huy hiệu (idempotent theo userId+badgeId+period)
    let awarded = 0
    for (const r of ranked) {
      for (const badge of badges) {
        if (r.gmv >= badge.minGmv) {
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

    console.log(`[AffiliateLeaderboard] Period ${period}: ${ranked.length} affiliates, ${awarded} badges`)
    return NextResponse.json({ success: true, period, affiliates: ranked.length, badgesAwarded: awarded })
  } catch (error) {
    console.error('[AffiliateLeaderboard] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
