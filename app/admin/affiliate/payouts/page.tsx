'use server'

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { approvePayout, rejectPayout } from "@/app/actions/affiliate-actions"
import { AdminSubNav, affiliateSubNav } from "../../AdminNav"

async function getPayouts() {
    const payouts = await prisma.affiliatePayout.findMany({
        include: {
            user: {
                select: { id: true, name: true, email: true, phone: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
    return payouts
}

export default async function AdminAffiliatePayoutsPage() {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/')
    }

    const payouts = await getPayouts()

    const pendingPayouts = payouts.filter(p => p.status === 'PENDING')
    const completedPayouts = payouts.filter(p => p.status === 'COMPLETED')

    return (
        <div>
            <AdminSubNav title="Affiliate" items={affiliateSubNav} />
            
            <div className="p-6">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold">Quản lý Rút Tiền</h1>
                    <p className="text-gray-600">Duyệt và xử lý yêu cầu rút tiền của CTV</p>
                </div>

                {/* Pending Payouts */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">
                    Yêu cầu chờ duyệt ({pendingPayouts.length})
                </h2>
                
                {pendingPayouts.length === 0 ? (
                    <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500">
                        Không có yêu cầu nào đang chờ
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">CTV</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Ngân hàng</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Số tiền</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Thực nhận</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Ngày yêu cầu</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {pendingPayouts.map(payout => (
                                    <tr key={payout.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium">#{payout.user.id} - {payout.user.name || 'N/A'}</p>
                                                <p className="text-sm text-gray-500">{payout.user.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{payout.bankName}</p>
                                            <p className="text-sm text-gray-500">{payout.bankAccount}</p>
                                            <p className="text-sm text-gray-500">{payout.accountHolder}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="font-medium">{payout.amount.toLocaleString('vi-VN')}đ</p>
                                            {payout.taxAmount > 0 && (
                                                <p className="text-xs text-gray-500">Thuế: {payout.taxAmount.toLocaleString('vi-VN')}đ</p>
                                            )}
                                            <p className="text-xs text-gray-500">Phí: {payout.feeAmount.toLocaleString('vi-VN')}đ</p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="font-medium text-green-600">
                                                {payout.netAmount.toLocaleString('vi-VN')}đ
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                                            {new Date(payout.createdAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <form action={async () => {
                                                    'use server'
                                                    await approvePayout(payout.id)
                                                }}>
                                                    <button
                                                        type="submit"
                                                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                                    >
                                                        Duyệt
                                                    </button>
                                                </form>
                                                <form action={async () => {
                                                    'use server'
                                                    await rejectPayout(payout.id, 'Yêu cầu bị từ chối bởi admin')
                                                }}>
                                                    <button
                                                        type="submit"
                                                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                                    >
                                                        Từ chối
                                                    </button>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Completed Payouts */}
            <div>
                <h2 className="text-lg font-semibold mb-4">
                    Lịch sử đã xử lý
                </h2>
                
                {completedPayouts.length === 0 ? (
                    <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500">
                        Chưa có yêu cầu nào được xử lý
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">CTV</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Ngân hàng</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Số tiền</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Trạng thái</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Ngày xử lý</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {completedPayouts.slice(0, 20).map(payout => (
                                    <tr key={payout.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium">#{payout.user.id} - {payout.user.name || 'N/A'}</p>
                                                <p className="text-sm text-gray-500">{payout.user.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{payout.bankName}</p>
                                            <p className="text-sm text-gray-500">{payout.bankAccount}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="font-medium">{payout.netAmount.toLocaleString('vi-VN')}đ</p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                payout.status === 'COMPLETED' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {payout.status === 'COMPLETED' ? 'Đã chi' : 'Từ chối'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                                            {payout.processedAt 
                                                ? new Date(payout.processedAt).toLocaleDateString('vi-VN')
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
        </div>
    )
}
