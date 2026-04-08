import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { deleteReservedIdAction, getReservedIds } from "@/app/actions/admin-actions"
import { AddReservedIdForm } from "./components/AddReservedIdForm"
import { ChangeUserIdForm } from "./components/ChangeUserIdForm"
import ToolHeader from "@/components/tools/ToolHeader"

export default async function ReservedIdsPage() {
    const reservedIds = await getReservedIds()

    return (
        <div className="min-h-screen bg-gray-50">
            <ToolHeader title="SỐ ĐẸP" />

            <div className="p-4 max-w-4xl mx-auto space-y-6">
                <div>
                    <h2 className="text-lg font-bold mb-3 text-gray-800">Cấp số đẹp cho Học viên</h2>
                    <ChangeUserIdForm />
                </div>

                <div>
                    <h3 className="text-lg font-bold mb-3 text-gray-800">Danh sách ID Đã giữ ({reservedIds.length})</h3>
                    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reservedIds.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-sm font-bold text-purple-600 w-20">{item.id}</td>
                                        <td className="px-3 py-2 text-sm text-gray-500">{item.note || '-'}</td>
                                        <td className="px-3 py-2 text-right text-sm">
                                            <form action={async () => {
                                                'use server'
                                                await deleteReservedIdAction(item.id)
                                            }}>
                                                <button className="text-red-600 hover:text-red-900 border px-2 py-1 rounded text-xs hover:bg-red-50">Xóa</button>
                                            </form>
                                        </td>
                                    </tr>
                                ))}
                                {reservedIds.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-3 py-4 text-center text-sm text-gray-500">Chưa có ID nào được giữ.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold mb-3 text-gray-800">Giữ thêm số mới</h3>
                    <AddReservedIdForm />
                </div>
            </div>
        </div>
    )
}