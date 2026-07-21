import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { AdminSubNav } from "@/components/admin/AdminSubNav"
import { affiliateSubNav } from "../affiliate-nav"

export default async function AffiliateConversionsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  // 1. Lấy tất cả conversions từ trước đến nay (giới hạn 200 bản ghi gần nhất)
  const conversions = await prisma.affiliateConversion.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      link: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } }
        }
      },
      campaign: true
    }
  })

  // 2. Lấy thông tin khách hàng (học viên mới)
  const customerIds = conversions.map(c => c.customerId)
  const customers = await prisma.user.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, email: true, phone: true }
  })
  const customerMap = new Map(customers.map(c => [c.id, c]))

  // 3. Lấy tất cả enrollment của các customer này để đối chiếu khóa học và trạng thái kích hoạt
  const customerEnrollments = await prisma.enrollment.findMany({
    where: { userId: { in: customerIds } },
    include: { course: true }
  })
  
  // Group enrollments theo userId
  const userEnrollmentsMap = new Map<number, any[]>()
  for (const e of customerEnrollments) {
    if (!userEnrollmentsMap.has(e.userId)) {
      userEnrollmentsMap.set(e.userId, [])
    }
    userEnrollmentsMap.get(e.userId)!.push(e)
  }

  // Thống kê nhanh
  const totalConversions = conversions.length
  let activeCount = 0
  let pendingCount = 0
  let noEnrollCount = 0

  const tableData = conversions.map((c, index) => {
    const customer = customerMap.get(c.customerId)
    const enrolls = customer ? (userEnrollmentsMap.get(customer.id) || []) : []
    // Ưu tiên tìm enrollment của khóa học BRK #22, fallback về enrollment đầu tiên
    const enrollment = enrolls.find(e => e.courseId === 22) || enrolls[0] || null

    if (enrollment) {
      if (enrollment.status === 'ACTIVE') activeCount++
      else pendingCount++
    } else {
      noEnrollCount++
    }

    return {
      stt: index + 1,
      id: c.id,
      createdAt: c.createdAt,
      customer: customer ? {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      } : {
        id: c.customerId,
        name: `Học viên #${c.customerId}`,
        email: '---',
        phone: '---'
      },
      linkCode: c.link?.code || 'N/A',
      referrer: c.link?.user ? {
        id: c.link.user.id,
        name: c.link.user.name,
        email: c.link.user.email,
        phone: c.link.user.phone
      } : null,
      course: enrollment?.course ? {
        id: enrollment.course.id,
        name: enrollment.course.name_khoa || enrollment.course.name_lop
      } : null,
      status: enrollment ? enrollment.status : 'NO_ENROLL',
      activatedAt: enrollment && enrollment.status === 'ACTIVE' ? enrollment.activatedAt : null
    }
  })

  return (
    <div>
      <AdminSubNav title="Affiliate" items={affiliateSubNav} />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Header & Thống kê nhanh */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lịch sử Đăng ký Affiliate</h1>
            <p className="text-sm text-gray-500 mt-1">
              Ghi nhận danh sách học viên đăng ký tài khoản và khóa học qua link ref giới thiệu
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-3 sm:gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <div className="px-4 py-2 bg-white rounded-xl shadow-xs border border-gray-100 text-center">
              <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider font-semibold">Tổng số</span>
              <span className="block text-lg font-bold text-gray-800 mt-0.5">{totalConversions}</span>
            </div>
            <div className="px-4 py-2 bg-white rounded-xl shadow-xs border border-gray-100 text-center">
              <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider text-emerald-500 font-semibold">Đã kích hoạt</span>
              <span className="block text-lg font-bold text-emerald-600 mt-0.5">{activeCount}</span>
            </div>
            <div className="px-4 py-2 bg-white rounded-xl shadow-xs border border-gray-100 text-center">
              <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider text-amber-500 font-semibold">Chờ duyệt</span>
              <span className="block text-lg font-bold text-amber-600 mt-0.5">{pendingCount}</span>
            </div>
          </div>
        </div>

        {/* Bảng Danh Sách */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100">
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 w-12">STT</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 min-w-[150px]">Học viên đăng ký</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 w-36">Ngày đăng ký</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 w-36">Link Ref sử dụng</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 min-w-[140px]">Người giới thiệu</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 min-w-[150px]">Khóa học</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-500 w-32">Kích hoạt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* STT */}
                    <td className="px-3 py-2 whitespace-nowrap text-gray-400 font-medium font-mono text-[11px]">
                      {row.stt}
                    </td>

                    {/* Học viên */}
                    <td className="px-3 py-2">
                      <div className="font-bold text-gray-800 text-[12px]">
                        {row.customer.name} <span className="text-gray-400 text-[10px] font-normal">#{row.customer.id}</span>
                      </div>
                      {row.customer.phone && (
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          📞 {row.customer.phone}
                        </div>
                      )}
                    </td>

                    {/* Ngày đăng ký */}
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600 text-[11px]">
                      {row.createdAt.toLocaleString('vi-VN', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    {/* Link Ref */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-mono font-medium">
                        🔗 ?ref={row.linkCode}
                      </span>
                    </td>

                    {/* Người giới thiệu */}
                    <td className="px-3 py-2 text-[11px]">
                      {row.referrer ? (
                        <div>
                          <div className="font-semibold text-gray-800">
                            {row.referrer.name} <span className="text-gray-400 text-[10px] font-normal">#{row.referrer.id}</span>
                          </div>
                          {row.referrer.phone && (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              📞 {row.referrer.phone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">N/A</span>
                      )}
                    </td>

                    {/* Khóa học */}
                    <td className="px-3 py-2 text-[11px]">
                      {row.course ? (
                        <div className="max-w-[180px]" title={row.course.name}>
                          <p className="font-medium text-gray-800 truncate">{row.course.name}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5 font-mono">ID: #{row.course.id}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">Chưa đăng ký</span>
                      )}
                    </td>

                    {/* Trạng thái kích hoạt */}
                    <td className="px-3 py-2 whitespace-nowrap text-center text-[10px]">
                      {row.status === 'ACTIVE' && (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                            🟢 Đã kích hoạt
                          </span>
                          {row.activatedAt && (
                            <p className="text-[9px] text-gray-400 font-mono">
                              {row.activatedAt.toLocaleString('vi-VN', {
                                timeZone: 'Asia/Ho_Chi_Minh',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                      )}
                      {row.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                          🟡 Chờ duyệt
                        </span>
                      )}
                      {row.status === 'NO_ENROLL' && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                          ⚫ Chưa mua khóa
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {tableData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-gray-400 italic">
                      Chưa có lượt đăng ký giới thiệu nào được lưu trữ
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
