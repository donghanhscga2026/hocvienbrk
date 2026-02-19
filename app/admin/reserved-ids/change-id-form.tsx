'use client'

import { useActionState } from "react"
import { changeUserIdAction } from "@/app/actions/admin-actions"

const initialState = {
    message: '',
}

export function ChangeUserIdForm() {
    const [state, formAction, isPending] = useActionState(changeUserIdAction, initialState)

    return (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-blue-700 mb-4">
                Chức năng này cho phép đổi ID của học viên hiện tại sang một ID mới (thường là số đẹp).
                <br />Hệ thống sẽ tự động cập nhật mọi dữ liệu liên quan (lịch sử, giới thiệu...).
            </p>
            <form action={formAction} className="flex gap-4 items-end flex-wrap">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID Hiện tại (Cũ)</label>
                    <input name="currentId" type="number" required placeholder="VD: 123" className="border p-2 rounded w-40" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID Mới (Số đẹp)</label>
                    <input name="newId" type="number" required placeholder="VD: 8888" className="border p-2 rounded w-40 font-bold text-blue-600" />
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition">
                    🚀 Thực hiện Đổi ID
                </button>
            </form>
            {state?.message && (
                <div className={`mt-4 p-3 rounded text-sm ${state.message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {state.message}
                </div>
            )}
        </div>
    )
}
