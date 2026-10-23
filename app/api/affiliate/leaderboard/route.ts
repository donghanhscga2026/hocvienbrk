import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/**
 * GET /api/affiliate/leaderboard?period=YYYY-MM
 * Bảng vinh danh công khai. Tôn trọng lựa chọn ẩn tên của CTV
 * (user.showOnLeaderboard = false → hiển thị "CTV ẩn danh").
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || latestPeriod()

    const snapshots = await prisma.leaderboardSnapshot.findMany({
      where: { period },
      include: {
        user: { select: { id: true, name: true, showOnLeaderboard: true } }
      },
      orderBy: { rank: 'asc' },
      take: 100
    })

    // Huy hiệu của các CTV trong kỳ
    const userIds = snapshots.map(s => s.userId)
    const userBadges = userIds.length
      ? await prisma.userBadge.findMany({
          where: { userId: { in: userIds }, period },
          include: { badge: { select: { id: true, name: true, icon: true } } }
        })
      : []
    const badgeMap = new Map<number, Array<{ name: string; icon: string | null }>>()
    for (const ub of userBadges) {
      const arr = badgeMap.get(ub.userId) || []
      arr.push({ name: ub.badge.name, icon: ub.badge.icon })
      badgeMap.set(ub.userId, arr)
    }

    return NextResponse.json({
      period,
      entries: snapshots.map(s => ({
        rank: s.rank,
        gmv: Number(s.gmv),
        name: s.user.showOnLeaderboard ? (s.user.name || `CTV #${s.userId}`) : 'CTV ẩn danh',
        badges: badgeMap.get(s.userId) || []
      }))
    })
  } catch (error) {
    console.error('[API] Leaderboard error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function latestPeriod(): string {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
}
