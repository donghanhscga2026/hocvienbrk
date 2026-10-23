import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { BADGE_CATALOG, isEarned, titleForBadgeCount, type BadgeMetric } from "@/lib/badges/catalog"
import { measureMember } from "@/lib/badges/engine"
import { RefreshBadgesButton } from "@/components/badges/RefreshBadgesButton"

/**
 * Trang thành viên: huy hiệu và danh hiệu của tôi. Huy hiệu được trao
 * tự động từ hoạt động thật (học tập, nội dung, kinh doanh, cuộc đua);
 * trang này hiện cả tiến độ tới các huy hiệu chưa đạt. GĐ3 (24/10/2026).
 */
const CATEGORY_LABELS: Record<string, string> = {
  LEARNING: 'Học tập',
  CONTENT: 'Nội dung',
  BUSINESS: 'Kinh doanh',
  RACE: 'Cuộc đua',
}

function formatProgress(def: (typeof BADGE_CATALOG)[number], value: number): string {
  if (def.metric === 'RACE_BEST_RANK') {
    return value > 0 ? `Hạng tốt nhất hiện tại: ${value} (cần vào top ${def.threshold})` : `Chưa có cuộc đua đã kết thúc (cần vào top ${def.threshold})`
  }
  const shown = def.metric === 'REVENUE_TOTAL' ? value.toLocaleString('vi-VN') + 'đ' : value.toLocaleString('vi-VN')
  const target = def.metric === 'REVENUE_TOTAL' ? def.threshold.toLocaleString('vi-VN') + 'đ' : def.threshold.toLocaleString('vi-VN')
  return `${shown} / ${target}`
}

export default async function HuyHieuPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = Number(session.user.id)

  const owned = await prisma.userBadge.findMany({
    where: { userId, badge: { code: { in: BADGE_CATALOG.map((b) => b.code) } } },
    include: { badge: { select: { code: true } } },
  })
  const ownedCodes = new Set(owned.map((o) => o.badge.code))
  const title = titleForBadgeCount(ownedCodes.size)
  const metrics = await measureMember(userId)

  const categories = ['LEARNING', 'CONTENT', 'BUSINESS', 'RACE'] as const

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Huy hiệu của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Danh hiệu hiện tại: <b className="text-gray-900">{title}</b> · Đã đạt {ownedCodes.size}/{BADGE_CATALOG.length} huy hiệu.
            Huy hiệu được trao tự động từ hoạt động thật của bạn trên hệ thống.
          </p>
        </div>
        <RefreshBadgesButton />
      </div>

      {categories.map((cat) => (
        <section key={cat} className="mt-8">
          <h2 className="font-bold text-gray-900">{CATEGORY_LABELS[cat]}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {BADGE_CATALOG.filter((b) => b.category === cat).map((def) => {
              const has = ownedCodes.has(def.code)
              const value = metrics[def.metric as BadgeMetric]
              const earnedNow = isEarned(def, value)
              return (
                <div key={def.code} className={`rounded-2xl border p-4 ${has ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white opacity-90'}`}>
                  <p className="text-2xl">{def.icon}</p>
                  <p className="font-semibold text-gray-900 mt-1">{def.name}</p>
                  <p className="text-sm text-gray-500">{def.description}</p>
                  <p className="text-xs mt-2">
                    {has
                      ? <span className="font-semibold text-amber-700">Đã đạt</span>
                      : earnedNow
                        ? <span className="text-emerald-700 font-medium">Đủ điều kiện — bấm Cập nhật để nhận</span>
                        : <span className="text-gray-400">{formatProgress(def, value)}</span>}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
