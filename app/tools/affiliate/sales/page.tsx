import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { AdminSubNav } from "@/components/admin/AdminSubNav"
import { affiliateSubNav } from "../affiliate-nav"
import Link from "next/link"

/**
 * Báo cáo doanh số Affiliate (Affiliate v2).
 * - CTV: xem doanh số của chính mình.
 * - ADMIN: xem toàn sàn, lọc theo CTV / loại sản phẩm / thời gian.
 * Nguồn số liệu: Order (status=PAID) + AffiliateCommission.
 */
export default async function AffiliateSalesPage({
  searchParams
}: {
  searchParams: Promise<{ affiliateId?: string; productType?: string; from?: string; to?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  const userId = Number(session.user.id)
  const isAdmin = session.user.role === 'ADMIN'

  const params = await searchParams
  const filterAffiliateId = params.affiliateId ? Number(params.affiliateId) : null
  const filterProductType = params.productType || ''
  const filterFrom = params.from || ''
  const filterTo = params.to || ''

  const where: any = { status: 'PAID' }
  if (!isAdmin) {
    where.affiliateId = userId
  } else if (filterAffiliateId) {
    where.affiliateId = filterAffiliateId
  }
  if (filterProductType) {
    where.items = { some: { productType: filterProductType as any } }
  }
  if (filterFrom || filterTo) {
    where.paidAt = {}
    if (filterFrom) where.paidAt.gte = new Date(filterFrom)
    if (filterTo) {
      const end = new Date(filterTo)
      end.setDate(end.getDate() + 1)
      where.paidAt.lt = end
    }
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
      buyer: { select: { id: true, name: true } },
      affiliate: { select: { id: true, name: true } }
    },
    orderBy: { paidAt: 'desc' },
    take: 500
  })

  // Tổng hợp
  const totalGmv = orders.reduce((s, o) => s + o.totalAmount, 0)

  // Hoa hồng đã sinh cho các đơn này (theo conversion.orderRecordId)
  const orderIds = orders.map(o => o.id)
  const commissions = orderIds.length
    ? await prisma.affiliateCommission.findMany({
        where: { conversion: { orderRecordId: { in: orderIds } } },
        select: { affiliateId: true, kind: true, netAmount: true, status: true }
      })
    : []
  const totalCommission = commissions.reduce((s, c) => s + c.netAmount, 0)

  // Theo CTV
  const byAffiliate = new Map<number, { name: string; gmv: number; orders: number; commission: number }>()
  for (const o of orders) {
    if (!o.affiliateId) continue
    const cur = byAffiliate.get(o.affiliateId) || { name: o.affiliate?.name || `#${o.affiliateId}`, gmv: 0, orders: 0, commission: 0 }
    cur.gmv += o.totalAmount
    cur.orders += 1
    byAffiliate.set(o.affiliateId, cur)
  }
  for (const c of commissions) {
    const cur = byAffiliate.get(c.affiliateId)
    if (cur) cur.commission += c.netAmount
  }
  const affiliateRows = [...byAffiliate.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.gmv - a.gmv)

  // Theo sản phẩm
  const byProduct = new Map<string, { name: string; type: string; gmv: number; qty: number }>()
  for (const o of orders) {
    for (const it of o.items) {
      const key = `${it.productType}#${it.productId}`
      const cur = byProduct.get(key) || { name: it.productName, type: it.productType, gmv: 0, qty: 0 }
      cur.gmv += it.unitPrice * it.quantity
      cur.qty += it.quantity
      byProduct.set(key, cur)
    }
  }
  const productRows = [...byProduct.values()].sort((a, b) => b.gmv - a.gmv)

  const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'
  const filterQs = (extra: Record<string, string>) => {
    const p = new URLSearchParams()
    if (filterAffiliateId) p.set('affiliateId', String(filterAffiliateId))
    if (filterProductType) p.set('productType', filterProductType)
    if (filterFrom) p.set('from', filterFrom)
    if (filterTo) p.set('to', filterTo)
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v); else p.delete(k)
    }
    const qs = p.toString()
    return qs ? `/tools/affiliate/sales?${qs}` : '/tools/affiliate/sales'
  }

  return (
    <div>
      <AdminSubNav title="Affiliate" items={affiliateSubNav} />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Báo cáo Doanh số Affiliate</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? 'Doanh số toàn sàn từ các đơn hàng có gắn link giới thiệu' : 'Doanh số từ các đơn hàng qua link giới thiệu của bạn'}
          </p>
        </div>

        {/* Bộ lọc (admin) */}
        {isAdmin && (
          <form method="GET" className="flex flex-wrap gap-3 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <input name="affiliateId" placeholder="ID CTV" defaultValue={filterAffiliateId || ''}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl w-28" />
            <select name="productType" defaultValue={filterProductType}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl">
              <option value="">Tất cả loại</option>
              <option value="COURSE">Khóa học</option>
              <option value="PRODUCT">Sản phẩm</option>
              <option value="SERVICE">Dịch vụ</option>
            </select>
            <input type="date" name="from" defaultValue={filterFrom}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <input type="date" name="to" defaultValue={filterTo}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl" />
            <button type="submit" className="px-4 py-2 text-sm bg-gray-900 text-white rounded-xl">Lọc</button>
            <Link href="/tools/affiliate/sales" className="px-4 py-2 text-sm border border-gray-200 rounded-xl">Xóa lọc</Link>
          </form>
        )}

        {/* Thẻ tổng hợp */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Tổng doanh số (GMV)', value: fmt(totalGmv) },
            { label: 'Số đơn hàng', value: String(orders.length) },
            { label: 'Hoa hồng đã sinh', value: fmt(totalCommission) },
            { label: 'Số CTV có đơn', value: String(byAffiliate.size) },
          ].map((c) => (
            <div key={c.label} className="px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <span className="block text-xs text-gray-400 uppercase tracking-wider">{c.label}</span>
              <span className="block text-lg font-bold text-gray-800 mt-1">{c.value}</span>
            </div>
          ))}
        </div>

        {/* Theo CTV */}
        <h2 className="text-lg font-bold text-gray-900 mb-3">Theo cộng tác viên</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100">
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">CTV</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Doanh số</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Số đơn</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Hoa hồng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {affiliateRows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-semibold text-gray-800">
                      {isAdmin ? (
                        <Link href={filterQs({ affiliateId: String(r.id) })} className="text-blue-600 hover:underline">
                          {r.name} <span className="text-gray-400 font-normal">#{r.id}</span>
                        </Link>
                      ) : (
                        <>{r.name} <span className="text-gray-400 font-normal">#{r.id}</span></>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{fmt(r.gmv)}</td>
                    <td className="px-3 py-2 text-right">{r.orders}</td>
                    <td className="px-3 py-2 text-right text-emerald-600 font-semibold">{fmt(r.commission)}</td>
                  </tr>
                ))}
                {affiliateRows.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-10 text-center text-gray-400 italic">Chưa có số liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Theo sản phẩm */}
        <h2 className="text-lg font-bold text-gray-900 mb-3">Theo sản phẩm</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100">
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Sản phẩm</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Loại</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Doanh số</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Số lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productRows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
                    <td className="px-3 py-2 text-gray-500">{r.type}</td>
                    <td className="px-3 py-2 text-right font-bold">{fmt(r.gmv)}</td>
                    <td className="px-3 py-2 text-right">{r.qty}</td>
                  </tr>
                ))}
                {productRows.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-10 text-center text-gray-400 italic">Chưa có số liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 mt-4">
          * Số liệu từ các đơn hàng đã thanh toán (Order PAID). Hoa hồng gồm cả 2 thành phần trực tiếp + tri ân.
        </p>
      </div>
    </div>
  )
}
