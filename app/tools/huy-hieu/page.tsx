import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { BADGE_CATALOG } from "@/lib/badges/catalog"
import { AwardAllButton } from "@/components/badges/RefreshBadgesButton"

/**
 * Quản trị huy hiệu: xem bộ huy hiệu đợt đầu, số người đã đạt từng
 * chiếc, các lượt trao gần nhất và chạy trao toàn hệ thống. Chỉ ADMIN.
 * GĐ3 (24/10/2026).
 */
export default async function ToolsHuyHieuPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  if (session.user.role !== 'ADMIN') {
    return <div className="p-6 max-w-3xl mx-auto"><p className="text-gray-500">Bạn không có quyền xem trang này.</p></div>
  }

  const codes = BADGE_CATALOG.map((b) => b.code)
  const [counts, recent] = await Promise.all([
    prisma.userBadge.groupBy({ by: ['badgeId'], where: { badge: { code: { in: codes } } }, _count: { id: true } }),
    prisma.userBadge.findMany({
      where: { badge: { code: { in: codes } } },
      orderBy: { awardedAt: 'desc' },
      take: 20,
      include: { badge: { select: { name: true, icon: true } }, user: { select: { name: true, email: true } } },
    }),
  ])
  const badges = await prisma.badge.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } })
  const countByCode = new Map<string, number>()
  const codeById = new Map(badges.map((b) => [b.id, b.code]))
  for (const c of counts) {
    const code = codeById.get(c.badgeId)
    if (code) countByCode.set(code, c._count.id)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Huy hiệu học tập và thành tích</h1>
          <p className="text-sm text-gray-500 mt-1">Bộ {BADGE_CATALOG.length} huy hiệu đợt đầu, trao tự động từ dữ liệu thật (bài học, ngày học, video kênh liên kết, sổ cái doanh số, cuộc đua). Cron chạy định kỳ; nút bên cạnh chạy ngay.</p>
        </div>
        <AwardAllButton />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
        {BADGE_CATALOG.map((def) => (
          <div key={def.code} className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-2xl">{def.icon}</p>
            <p className="font-semibold text-gray-900 mt-1">{def.name}</p>
            <p className="text-sm text-gray-500">{def.description}</p>
            <p className="text-xs text-gray-400 mt-2">Đã có {countByCode.get(def.code) ?? 0} thành viên đạt · Mã {def.code}</p>
          </div>
        ))}
      </div>

      <h2 className="font-bold text-gray-900 mt-8">Lượt trao gần nhất</h2>
      {recent.length === 0 && <p className="text-sm text-gray-400 mt-2">Chưa có lượt trao nào.</p>}
      {recent.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
          {recent.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{r.badge.icon} {r.badge.name} → <b>{r.user.name ?? r.user.email}</b> (HV {r.userId})</span>
              <span className="text-gray-400">{r.awardedAt.toISOString().slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
