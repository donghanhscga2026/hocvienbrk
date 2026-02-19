
import { deleteReservedIdAction, getReservedIds } from "@/app/actions/admin-actions"
import { AddReservedIdForm } from "./add-form"
import { ChangeUserIdForm } from "./change-id-form"

export default async function ReservedIdsPage() {
    const reservedIds = await getReservedIds()

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">💎 Cấp số đẹp cho Học viên</h2>
                <ChangeUserIdForm />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Cột Trái: Danh sách */}
                <div>
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Danh sách ID Đã giữ ({reservedIds.length})</h3>
                    <div className="bg-white border rounded-lg overflow-hidden shadow-sm max-h-[500px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reservedIds.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">{item.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.note}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <form action={async () => {
                                                'use server'
                                                await deleteReservedIdAction(item.id)
                                            }}>
                                                <button className="text-red-600 hover:text-red-900 border px-2 py-1 rounded hover:bg-red-50">Xóa</button>
                                            </form>
                                        </td>
                                    </tr>
                                ))}
                                {reservedIds.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Chưa có ID nào được giữ.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Cột Phải: Thêm mới */}
                <div>
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Giữ thêm số mới</h3>
                    <AddReservedIdForm />
                </div>
            </div>
        </div>
    )
}
