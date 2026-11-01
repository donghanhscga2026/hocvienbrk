'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    getMyEmailStatusAction,
    disconnectMyEmailSenderAction,
} from '@/app/actions/teacher-email-actions'

type Status = {
    sender: { email: string; isActive: boolean; dailyLimit: number; sentToday: number } | null
    dailyLimit: number
    sentToday: number
    remaining: number
}

function MailboxContent() {
    const params = useSearchParams()
    const justConnected = params.get('connected') === '1'

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [status, setStatus] = useState<Status | null>(null)
    const [busy, setBusy] = useState(false)

    const load = async () => {
        const res = await getMyEmailStatusAction()
        if (res.success) {
            setStatus({ sender: res.sender, dailyLimit: res.dailyLimit, sentToday: res.sentToday, remaining: res.remaining })
            setError('')
        } else {
            setError(res.error || 'Không tải được trạng thái hộp thư')
        }
        setLoading(false)
    }

    useEffect(() => {
        void load()
    }, [])

    const handleDisconnect = async () => {
        if (!confirm('Ngắt kết nối Gmail này? Sau khi ngắt, bạn sẽ không gửi được email cho học viên cho tới khi kết nối lại.')) return
        setBusy(true)
        const res = await disconnectMyEmailSenderAction()
        if (res.success) await load()
        else alert(res.error || 'Có lỗi xảy ra')
        setBusy(false)
    }

    if (loading) return <p className="py-12 text-center text-sm text-gray-500">Đang tải…</p>

    return (
        <div className="mx-auto max-w-2xl p-4">
            <Link href="/tools/email-mkt" className="text-sm text-brk-primary">
                ← Quay lại Email MKT
            </Link>
            <h1 className="mt-3 text-xl font-bold">Hộp thư gửi của tôi</h1>
            <p className="mt-1 text-sm text-gray-600">
                Email gửi cho học viên sẽ đi từ Gmail của chính bạn, không dùng hộp thư của hệ thống.
                Hạn mức hiện tại: <strong>{status?.dailyLimit ?? 200} email/ngày</strong>.
            </p>

            {justConnected && (
                <div role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    Đã kết nối Gmail thành công.
                </div>
            )}
            {error && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {status && (
                <div className="mt-5 rounded-2xl border border-brk-outline bg-white p-4">
                    {status.sender ? (
                        <div className="space-y-3 text-sm">
                            <p>
                                Đang kết nối: <strong>{status.sender.email}</strong>
                            </p>
                            <p className="text-gray-600">
                                Hôm nay đã gửi {status.sentToday}/{status.dailyLimit} email — còn lại{' '}
                                <strong>{status.remaining}</strong> lượt.
                            </p>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleDisconnect()}
                                className="min-h-11 rounded-xl border border-red-200 px-4 font-semibold text-red-600 disabled:opacity-50"
                            >
                                {busy ? 'Đang xử lý…' : 'Ngắt kết nối Gmail này'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <p>Bạn chưa kết nối Gmail cá nhân. Hãy kết nối để bắt đầu gửi email cho học viên từ hộp thư của mình.</p>
                            <a
                                href="/api/admin/auth/google"
                                className="flex min-h-11 items-center justify-center rounded-xl bg-brk-primary px-4 font-semibold text-white"
                            >
                                Kết nối Gmail của tôi
                            </a>
                            <p className="text-xs text-gray-500">
                                Hệ thống chỉ xin quyền gửi email và đọc địa chỉ Gmail của bạn qua Google (OAuth) —
                                không lưu mật khẩu Gmail của bạn.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function TeacherMailboxPage() {
    return (
        <div className="min-h-screen bg-brk-background pb-20">
            <Suspense fallback={<p className="py-12 text-center text-sm text-gray-500">Đang tải…</p>}>
                <MailboxContent />
            </Suspense>
        </div>
    )
}
