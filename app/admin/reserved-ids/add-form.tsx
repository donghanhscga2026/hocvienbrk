'use client'

import { useActionState } from "react"
import { addReservedIdAction } from "@/app/actions/admin-actions"

const initialState = {
    message: '',
}

export function AddReservedIdForm() {
    const [state, formAction, isPending] = useActionState(addReservedIdAction, initialState)

    return (
        <div className="bg-gray-50 border p-6 rounded-lg shadow-sm">
            <form action={formAction} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID cần giữ</label>
                    <input name="id" type="number" required placeholder="VD: 6868" className="border p-2 rounded w-full" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (Tùy chọn)</label>
                    <input name="note" type="text" placeholder="VD: Để dành cho VIP..." className="border p-2 rounded w-full" />
                </div>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium mt-2">
                    ➕ Thêm vào danh sách
                </button>
            </form>
            {state?.message && (
                <div className={`mt-4 p-3 rounded text-sm ${state.message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {state.message}
                </div>
            )}
            <div className="mt-4 text-sm text-gray-500 bg-white p-3 rounded border">
                <strong>Lưu ý:</strong> Khi bạn thêm một số vào đây, các user đăng ký mới sẽ <u>tự động bỏ qua</u> số này. Bạn có thể dùng chức năng &quot;Cấp số đẹp&quot; ở trên để gán số này cho user cụ thể sau.
            </div>
        </div>
    )
}
