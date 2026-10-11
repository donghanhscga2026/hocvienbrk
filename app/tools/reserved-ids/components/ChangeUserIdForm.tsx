'use client'

import { useActionState, useState } from 'react'
import { changeUserIdAction } from '@/app/actions/admin-actions'
import type { UserIdChangeState } from '@/lib/user-id-change'

const initialState: UserIdChangeState = { message: '' }
const dataNames: Record<string, string> = {
    'AppNotification.recipientId': 'Thông báo của thành viên',
    'Course.teacherId': 'Khóa học đang giảng dạy',
    'Enrollment.userId': 'Khóa học đã đăng ký',
    'Enrollment.referrerId': 'Lượt đăng ký qua giới thiệu',
    'CrmContact.ownerId': 'Khách hàng đang phụ trách',
    'CrmContact.studentUserId': 'Hồ sơ học viên trong CRM',
    'CrmContact.linkedUserId': 'Hồ sơ liên kết trong CRM',
    'CrmContact.createdBy': 'Hồ sơ CRM đã tạo',
    'CrmRequest.userId': 'Yêu cầu đã gửi',
    'CrmRequest.ownerId': 'Yêu cầu đang được giao',
    'CrmForm.ownerId': 'Biểu mẫu đang quản lý',
    'CrmFormSubmission.ownerId': 'Lượt gửi biểu mẫu',
    'CrmActivity.authorId': 'Hoạt động chăm sóc đã ghi',
    'CrmTask.createdBy': 'Công việc chăm sóc đã tạo',
    'EmailLog.userId': 'Lịch sử email',
    'User.referrerId': 'Thành viên đã giới thiệu',
    'UserBankAccount.userId': 'Tài khoản ngân hàng',
    'user_closure.ancestor_id': 'Liên kết nhân mạch bên dưới',
    'user_closure.descendant_id': 'Liên kết nhân mạch bên trên',
    'activity_log.userId': 'Lịch sử hoạt động',
}

export function ChangeUserIdForm() {
    const [state, formAction, isPending] = useActionState(changeUserIdAction, initialState)
    const [currentId, setCurrentId] = useState('')
    const [newId, setNewId] = useState('')
    // Sửa một trong hai số sẽ làm bản kiểm tra cũ mất hiệu lực ngay trên giao diện.
    const plan = state.plan
    const matches = plan && String(plan.currentId) === currentId && String(plan.newId) === newId
    const canExecute = matches && !state.completed && !plan.blockers.length && !!plan.token

    return (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-6">
            <p className="mb-4 text-sm text-blue-800">Kiểm tra tài khoản và dữ liệu liên quan trước khi đổi số. Sau khi đổi, thành viên cần đăng nhập lại và cập nhật các liên kết đang dùng ID cũ.</p>
            <form action={formAction} className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                    ID hiện tại
                    <input name="currentId" type="text" inputMode="numeric" pattern="[1-9][0-9]*" required value={currentId} readOnly={isPending} onChange={event => setCurrentId(event.target.value)} placeholder="3698" className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                    ID mới
                    <input name="newId" type="text" inputMode="numeric" pattern="[1-9][0-9]*" required value={newId} readOnly={isPending} onChange={event => setNewId(event.target.value)} placeholder="3687" className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-semibold text-blue-700" />
                </label>
                <input type="hidden" name="token" value={canExecute ? plan.token : ''} />
                <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                    <button name="mode" value="preview" disabled={isPending} className="rounded-lg bg-blue-700 px-4 py-2.5 font-medium text-white disabled:opacity-50">{isPending ? 'Đang xử lý…' : 'Kiểm tra trước'}</button>
                    {canExecute && <button name="mode" value="execute" disabled={isPending} className="rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white disabled:opacity-50">Xác nhận đổi {currentId} → {newId}</button>}
                </div>
            </form>
            {state.message && <p role={state.message.startsWith('Error') ? 'alert' : 'status'} className={`mt-4 rounded-lg p-3 text-sm ${state.message.startsWith('Error') ? 'bg-red-50 text-red-800' : 'bg-white text-slate-800'}`}>{state.message.replace(/^(Error|Success):\s*/, '')}</p>}
            {matches && <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <p className="font-semibold text-slate-900">{plan.name || 'Thành viên'} · {plan.currentId} → {plan.newId}</p>
                <p className="mt-1 break-all text-slate-600">{plan.email}</p>
                {!!plan.blockers.length && <ul className="mt-3 list-disc space-y-2 pl-5 text-red-700">{plan.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul>}
                {!!plan.counts.length && <div className="mt-3 max-h-64 overflow-auto">
                    <table className="w-full text-left"><caption className="mb-2 text-left text-slate-600">{state.completed ? 'Đối chiếu sau khi đổi' : 'Dữ liệu liên quan sẽ chuyển theo tài khoản'}</caption>
                        <thead><tr><th className="py-2 pr-3">Dữ liệu</th><th className="px-2">ID cũ</th><th className="px-2">ID mới{state.completed ? ' sau đổi' : ' hiện có'}</th></tr></thead>
                        <tbody>{plan.counts.map(count => <tr key={count.label} className="border-t border-slate-100"><td className="break-all py-2 pr-3">{dataNames[count.label] || (count.label.includes('.') ? 'Dữ liệu hồ sơ liên quan' : count.label)}</td><td className="px-2">{state.completed ? 0 : count.before}</td><td className="px-2">{count.after}</td></tr>)}</tbody>
                    </table>
                </div>}
            </div>}
        </section>
    )
}
