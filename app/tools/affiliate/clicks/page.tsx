'use server'

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { AdminSubNav } from "@/components/admin/AdminSubNav"
import { affiliateSubNav } from "../affiliate-nav"

export default async function AffiliateClicksPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  const days = 14
  const clicks = await prisma.affiliateClick.findMany({
    where: { createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      link: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      }
    }
  })

  const totalClicks = clicks.length
  const uniqueRefs = new Set(clicks.map(c => c.link.user.id)).size
  const uniqueIps = new Set(clicks.map(c => c.ipAddress)).size

  return (
    <div>
      <AdminSubNav title="Affiliate" items={affiliateSubNav} />

      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Lịch sử Click Affiliate</h1>
          <p className="text-gray-600">
            {totalClicks} clicks từ {uniqueRefs} người giới thiệu · {uniqueIps} IP khác nhau · {days} ngày gần nhất
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Thời gian</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Người giới thiệu</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">IP</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">User-Agent</th>
                </tr>
              </thead>
              <tbody>
                {clicks.map(click => (
                  <tr key={click.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {click.createdAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      #{click.link.user.id} {click.link.user.name || ''}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {click.link.user.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">
                      {click.ipAddress}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-gray-400 text-xs" title={click.userAgent || ''}>
                      {click.userAgent || '-'}
                    </td>
                  </tr>
                ))}
                {clicks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      Chưa có click nào trong {days} ngày qua
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
