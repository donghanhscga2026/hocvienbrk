'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    getCourseAnnouncementContextAction,
    sendCourseAnnouncementAction,
} from '@/app/actions/course-announcement-actions'

type AnnouncementItem = { id: number; title: string; body: string; createdAt: string }

function AnnounceForm() {
    const params = useSearchParams()
    const courseId = Number(params.get('courseId') || 0)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [courseName, setCourseName] = useState('')
    const [recipientCount, setRecipientCount] = useState(0)
    const [emailStatus, setEmailStatus] = useState<{ senderEmail: string | null; dailyLimit: number; sentToday: number; remaining: number } | null>(null)
    const [history, setHistory] = useState<AnnouncementItem[]>([])

    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [sendEmail, setSendEmail] = useState(false)
    const [sending, setSending] = useState(false)
    const [result, setResult] = useState('')

    const loadContext = async () => {
        if (!courseId) {
            setError('Thiếu mã khóa học. Hãy mở trang này từ menu thao tác của khóa trong Quản lý khóa học.')
            setLoading(false)
            return
        }
        const res = await getCourseAnnouncementContextAction(courseId)
        if (res.success) {
            setCourseName(res.course.name)
            setRecipientCount(res.recipientCount)
            setEmailStatus(res.emailStatus ?? null)
            setHistory(res.announcements)
            setError('')
        } else {
            setError(res.error || 'Không tải được thông tin khóa học')
        }
        setLoading(false)
    }

    useEffect(() => {
        void loadContext()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId])

    const handleSend = async () => {
        if (!title.trim()) {
            alert('Hãy nhập tiêu đề thông báo')
            return
        }
        if (!body.trim()) {
            alert('Hãy nhập nội dung thông báo')
            return
        }
        if (
            !confirm(
                `Gửi thông báo này tới ${recipientCount} học viên đang học của khóa "${courseName}"?` +
                    (sendEmail ? ' Thông báo sẽ gửi kèm qua email.' : '')
            )
        )
            return
        setSending(true)
        setResult('')
        const res = await sendCourseAnnouncementAction(courseId, title, body, sendEmail)
        if (res.success) {
            setResult(res.message + (res.emailNote ? ` ${res.emailNote}` : ''))
            setTitle('')
            setBody('')
            setSendEmail(false)
            await loadContext()
        } else {
            alert(res.error || 'Có lỗi xảy ra khi gửi thông báo')
        }
        setSending(false)
    }

    if (loading) return <p className="py-12 text-center text-sm text-gray-500">Đang tải…</p>

    return (
        <div className="mx-auto max-w-2xl p-4">
            <Link href="/tools/courses" className="text-sm text-brk-primary">
                ← Quay lại Quản lý khóa học
            </Link>
            <h1 className="mt-3 text-xl font-bold">Gửi thông báo cho học viên</h1>
            {courseName && (
                <p className="mt-1 text-sm text-gray-600">
                    Khóa: <strong>{courseName}</strong> — sẽ gửi tới{' '}
                    <strong>{recipientCount}</strong> học viên đang học (ACTIVE)
                </p>
            )}

            {error && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {!error && (
                <div className="mt-5 space-y-4 rounded-2xl border border-brk-outline bg-white p-4">
                    <label className="block space-y-1 text-sm">
                        <span className="font-medium">Tiêu đề thông báo</span>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={150}
                            placeholder="Ví dụ: Lịch học tuần này thay đổi"
                            className="block min-h-11 w-full rounded-xl border border-brk-outline px-3 text-sm"
                        />
                    </label>
                    <label className="block space-y-1 text-sm">
                        <span className="font-medium">Nội dung</span>
                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            maxLength={5000}
                            rows={7}
                            placeholder="Nhập nội dung thông báo gửi tới học viên…"
                            className="block w-full rounded-xl border border-brk-outline px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={sendEmail}
                            onChange={e => setSendEmail(e.target.checked)}
                            className="h-4 w-4"
                        />
                        Gửi kèm qua email cho học viên (qua hệ thống Email MKT)
                    </label>
                    {emailStatus && (
                        emailStatus.senderEmail ? (
                            <p className="text-xs text-gray-500">
                                Email sẽ gửi từ Gmail của bạn: <strong>{emailStatus.senderEmail}</strong> — hôm nay đã gửi{' '}
                                {emailStatus.sentToday}/{emailStatus.dailyLimit} email (còn {emailStatus.remaining}).
                            </p>
                        ) : (
                            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                Bạn chưa kết nối Gmail cá nhân nên chưa gửi kèm email được.{' '}
                                <Link href="/tools/email-mkt/mailbox" className="font-semibold underline">
                                    Kết nối Gmail của bạn
                                </Link>{' '}
                                để gửi email từ hộp thư của chính mình.
                            </p>
                        )
                    )}
                    <button
                        type="button"
                        disabled={sending || recipientCount === 0}
                        onClick={() => void handleSend()}
                        className="min-h-11 w-full rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-50"
                    >
                        {sending ? 'Đang gửi…' : 'Gửi thông báo'}
                    </button>
                    {recipientCount === 0 && (
                        <p className="text-sm text-gray-500">
                            Khóa này chưa có học viên đang học (ACTIVE) nên chưa gửi được.
                        </p>
                    )}
                    {result && (
                        <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                            {result}
                        </div>
                    )}
                </div>
            )}

            {history.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-base font-semibold">Thông báo đã gửi</h2>
                    <div className="mt-3 space-y-3">
                        {history.map(item => (
                            <article key={item.id} className="rounded-2xl border border-brk-outline bg-white p-4">
                                <p className="text-sm font-semibold">{item.title}</p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                                </p>
                                <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{item.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function CourseAnnouncePage() {
    return (
        <div className="min-h-screen bg-brk-background pb-20">
            <Suspense fallback={<p className="py-12 text-center text-sm text-gray-500">Đang tải…</p>}>
                <AnnounceForm />
            </Suspense>
        </div>
    )
}
