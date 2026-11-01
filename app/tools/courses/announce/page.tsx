'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    getCourseAnnouncementContextAction,
    getCourseStudentsAction,
    sendCourseAnnouncementAction,
} from '@/app/actions/course-announcement-actions'
import { disconnectMyEmailSenderAction } from '@/app/actions/teacher-email-actions'

type StudentItem = { userId: number; name: string; email: string; status: string }
type HistoryItem = {
    kind: 'ANNOUNCEMENT' | 'EMAIL'
    id: number
    title: string
    body: string
    createdAt: string
    scope: string
    status: string | null
    sentCount: number | null
    totalRecipients: number | null
    failedCount: number | null
}
type EmailStatus = { senderEmail: string | null; dailyLimit: number; sentToday: number; remaining: number }
type NotifyStatus = { sentToday: number; limit: number; remaining: number }

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: 'Đã kích hoạt', className: 'text-green-600' },
    PENDING: { label: 'Chờ kích hoạt', className: 'text-amber-600' },
    REJECTED: { label: 'Chưa được duyệt', className: 'text-red-500' },
    CANCELLED: { label: 'Đã hủy', className: 'text-gray-400' },
}
const STATUS_ORDER = ['ACTIVE', 'PENDING', 'REJECTED', 'CANCELLED']

const RICH_HTML_RE = /<(p|br|div|strong|b|em|i|u|ul|ol|li|a|span)[\s>]/i
function isRichHtml(text: string) {
    return RICH_HTML_RE.test(text)
}
function stripHtmlText(html: string) {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function AnnounceForm() {
    const params = useSearchParams()
    const courseId = Number(params.get('courseId') || 0)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [courseName, setCourseName] = useState('')
    const [recipientCount, setRecipientCount] = useState(0)
    const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null)
    const [notifyStatus, setNotifyStatus] = useState<NotifyStatus | null>(null)
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [disconnecting, setDisconnecting] = useState(false)

    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [bodyText, setBodyText] = useState('')
    const editorRef = useRef<HTMLDivElement>(null)
    const [notifyChannel, setNotifyChannel] = useState(true)
    const [emailChannel, setEmailChannel] = useState(false)
    const [mode, setMode] = useState<'ALL' | 'SELECTED'>('ALL')

    const [students, setStudents] = useState<StudentItem[] | null>(null)
    const [studentsLoading, setStudentsLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [selected, setSelected] = useState<Set<number>>(new Set())

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
            setNotifyStatus(res.notifyStatus ?? null)
            setHistory(res.history as HistoryItem[])
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

    const handleDisconnect = async () => {
        if (!confirm('Ngắt kết nối Gmail này? Sau khi ngắt, bạn sẽ không gửi email cho học viên được cho tới khi kết nối lại.'))
            return
        setDisconnecting(true)
        const res = await disconnectMyEmailSenderAction()
        if (res.success) {
            await loadContext()
        } else {
            alert(res.error || 'Không ngắt kết nối được, hãy thử lại')
        }
        setDisconnecting(false)
    }

    const loadStudents = async () => {
        if (students !== null || studentsLoading) return
        setStudentsLoading(true)
        const res = await getCourseStudentsAction(courseId)
        if (res.success) setStudents(res.students)
        else alert(res.error || 'Không tải được danh sách học viên')
        setStudentsLoading(false)
    }

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const st of students ?? []) counts[st.status] = (counts[st.status] ?? 0) + 1
        return counts
    }, [students])

    const visibleStudents = useMemo(() => {
        if (!students) return []
        const byStatus = statusFilter === 'ALL' ? students : students.filter(st => st.status === statusFilter)
        const q = search.trim().toLowerCase()
        if (!q) return byStatus
        return byStatus.filter(
            st => st.name.toLowerCase().includes(q) || st.email.toLowerCase().includes(q)
        )
    }, [students, search, statusFilter])

    const toggleStudent = (userId: number) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(userId)) next.delete(userId)
            else next.add(userId)
            return next
        })
    }

    const selectAllVisible = () => {
        setSelected(prev => {
            const next = new Set(prev)
            visibleStudents.forEach(st => next.add(st.userId))
            return next
        })
    }

    const targetCount = mode === 'ALL' ? recipientCount : selected.size

    const syncEditor = () => {
        const html = editorRef.current?.innerHTML ?? ''
        setBody(html)
        setBodyText(stripHtmlText(html))
    }

    const runFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value)
        syncEditor()
    }

    const insertLink = () => {
        const raw = window.prompt('Dán địa chỉ link (ví dụ https://…):')
        if (!raw || !raw.trim()) return
        const trimmed = raw.trim()
        const url = /^(https?:\/\/|mailto:)/i.test(trimmed) ? trimmed : `https://${trimmed}`
        runFormat('createLink', url)
    }

    const handleEditorPaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, text)
    }

    const handleSend = async () => {
        if (!title.trim()) {
            alert('Hãy nhập tiêu đề')
            return
        }
        if (!bodyText) {
            alert('Hãy nhập nội dung')
            return
        }
        if (bodyText.length > 5000) {
            alert('Nội dung tối đa 5000 ký tự')
            return
        }
        if (!notifyChannel && !emailChannel) {
            alert('Hãy chọn ít nhất một kênh gửi: Thông báo hoặc Email')
            return
        }
        if (mode === 'SELECTED' && selected.size === 0) {
            alert('Hãy chọn ít nhất một học viên để gửi')
            return
        }
        const channels = [notifyChannel ? 'thông báo trong hệ thống' : null, emailChannel ? 'email' : null]
            .filter(Boolean)
            .join(' + ')
        if (
            !confirm(
                `Gửi ${channels} tới ${targetCount} học viên của khóa "${courseName}"?`
            )
        )
            return
        setSending(true)
        setResult('')
        const res = await sendCourseAnnouncementAction(courseId, title, body, {
            notify: notifyChannel,
            email: emailChannel,
            userIds: mode === 'SELECTED' ? [...selected] : null,
        })
        if (res.success) {
            setResult(res.message)
            setTitle('')
            setBody('')
            setBodyText('')
            if (editorRef.current) editorRef.current.innerHTML = ''
            await loadContext()
        } else {
            alert(res.error || 'Có lỗi xảy ra khi gửi')
        }
        setSending(false)
    }

    const emailFootnote = !emailStatus
        ? 'Gửi từ hộp thư hệ thống'
        : emailStatus.senderEmail
          ? `Còn ${emailStatus.remaining} email hôm nay`
          : 'Chưa kết nối Gmail — hãy kết nối ở thẻ phía trên'

    if (loading) return <p className="py-12 text-center text-sm text-gray-500">Đang tải…</p>

    return (
        <div className="mx-auto max-w-2xl p-4">
            <Link href="/tools/courses" className="text-sm text-brk-primary">
                ← Quay lại Quản lý khóa học
            </Link>
            <h1 className="mt-3 text-xl font-bold">Gửi thông báo / email cho học viên</h1>
            {courseName && (
                <p className="mt-1 text-sm text-gray-600">
                    Khóa: <strong>{courseName}</strong> — có <strong>{recipientCount}</strong> học viên đang học (ACTIVE)
                </p>
            )}

            {error && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {!error && emailStatus && emailStatus.senderEmail && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-green-300 bg-green-50 p-4">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-600" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Hộp thư gửi của bạn</p>
                        <p className="truncate text-xs text-gray-600">Đang kết nối: {emailStatus.senderEmail}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">
                            Hôm nay đã gửi {emailStatus.sentToday} / {emailStatus.dailyLimit}
                        </p>
                        <button
                            type="button"
                            disabled={disconnecting}
                            onClick={() => void handleDisconnect()}
                            className="mt-1 min-h-9 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 disabled:opacity-50"
                        >
                            {disconnecting ? 'Đang ngắt…' : 'Ngắt kết nối'}
                        </button>
                        <Link href="/tools/email-mkt/mailbox" className="mt-1 block text-xs font-semibold text-brk-primary">
                            Hộp thư của tôi →
                        </Link>
                    </div>
                </div>
            )}

            {!error && emailStatus && !emailStatus.senderEmail && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                    <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white"
                        aria-hidden="true"
                    >
                        !
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-amber-900">Chưa kết nối Gmail</p>
                        <p className="text-xs text-amber-800">Kết nối để gửi email cho học viên từ hộp thư của bạn</p>
                    </div>
                    <a
                        href="/api/admin/auth/google"
                        className="flex min-h-11 items-center rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white"
                    >
                        Kết nối Gmail của tôi
                    </a>
                </div>
            )}

            {!error && !emailStatus && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brk-outline bg-white px-4 py-3">
                    <p className="min-w-0 flex-1 text-sm text-gray-600">
                        Hộp thư hệ thống — email được gửi từ hộp thư hệ thống của học viện.
                    </p>
                    <Link
                        href="/tools/email-mkt/mailbox"
                        className="flex min-h-9 items-center rounded-lg border border-brk-outline bg-white px-3 text-xs font-semibold text-brk-primary"
                    >
                        Hộp thư của tôi →
                    </Link>
                </div>
            )}

            {!error && (
                <div className="mt-4 space-y-4 rounded-2xl border border-brk-outline bg-white p-4">
                    <label className="block space-y-1 text-sm">
                        <span className="font-medium">Tiêu đề</span>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={150}
                            placeholder="Ví dụ: Lịch học tuần này thay đổi"
                            className="block min-h-11 w-full rounded-xl border border-brk-outline px-3 text-sm"
                        />
                    </label>
                    <div className="space-y-1 text-sm">
                        <span className="font-medium">Nội dung</span>
                        <div className="overflow-hidden rounded-xl border border-brk-outline">
                            <div className="flex flex-wrap items-center gap-1 border-b border-brk-outline bg-brk-background px-2 py-1.5">
                                <button
                                    type="button"
                                    title="Chữ đậm"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => runFormat('bold')}
                                    className="min-h-9 min-w-9 rounded-lg px-2 font-bold hover:bg-white"
                                >
                                    B
                                </button>
                                <button
                                    type="button"
                                    title="Chữ nghiêng"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => runFormat('italic')}
                                    className="min-h-9 min-w-9 rounded-lg px-2 italic hover:bg-white"
                                >
                                    I
                                </button>
                                <button
                                    type="button"
                                    title="Chèn link vào chữ đã bôi đen"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={insertLink}
                                    className="min-h-9 rounded-lg px-2 text-brk-primary underline hover:bg-white"
                                >
                                    Chèn link
                                </button>
                                <button
                                    type="button"
                                    title="Danh sách gạch đầu dòng"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => runFormat('insertUnorderedList')}
                                    className="min-h-9 rounded-lg px-2 hover:bg-white"
                                >
                                    • Danh sách
                                </button>
                                <span className="ml-1 hidden text-xs text-gray-400 md:inline">
                                    Bôi đen chữ rồi bấm nút để định dạng
                                </span>
                            </div>
                            <div
                                ref={editorRef}
                                contentEditable
                                suppressContentEditableWarning
                                role="textbox"
                                aria-label="Nội dung thông báo"
                                onInput={syncEditor}
                                onPaste={handleEditorPaste}
                                className="min-h-36 px-3 py-2 text-sm outline-none [&_a]:text-brk-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-400">
                                Định dạng giữ nguyên khi tới email và trang thông báo của học viên.
                            </p>
                            <p className="shrink-0 text-xs text-gray-400">{bodyText.length}/5000</p>
                        </div>
                    </div>

                    <fieldset className="text-sm">
                        <legend className="font-medium">Kênh gửi</legend>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            <label
                                className={`block cursor-pointer rounded-xl border p-3 ${
                                    notifyChannel ? 'border-green-400 bg-green-50' : 'border-brk-outline bg-white'
                                }`}
                            >
                                <span className="flex min-h-6 items-center gap-2 font-medium">
                                    <input
                                        type="checkbox"
                                        checked={notifyChannel}
                                        onChange={e => setNotifyChannel(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    Thông báo trong hệ thống
                                </span>
                                <span className="mt-1 block text-xs text-gray-500">
                                    Học viên nhận chuông + thông báo đẩy
                                </span>
                                <span className="mt-2 block text-xs font-semibold text-green-700">
                                    {notifyStatus
                                        ? `Hôm nay còn ${notifyStatus.remaining}/${notifyStatus.limit} lượt`
                                        : ' '}
                                </span>
                            </label>
                            <label
                                className={`block cursor-pointer rounded-xl border p-3 ${
                                    emailChannel ? 'border-green-400 bg-green-50' : 'border-brk-outline bg-white'
                                }`}
                            >
                                <span className="flex min-h-6 items-center gap-2 font-medium">
                                    <input
                                        type="checkbox"
                                        checked={emailChannel}
                                        onChange={e => setEmailChannel(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    Email cho học viên
                                </span>
                                <span className="mt-1 block text-xs text-gray-500">
                                    {emailStatus?.senderEmail
                                        ? `Gửi từ Gmail của bạn: ${emailStatus.senderEmail}`
                                        : 'Email gửi tới địa chỉ của học viên'}
                                </span>
                                <span className="mt-2 block text-xs font-semibold text-green-700">{emailFootnote}</span>
                            </label>
                        </div>
                    </fieldset>

                    <fieldset className="space-y-2 text-sm">
                        <legend className="font-medium">Người nhận</legend>
                        <label className="flex min-h-11 items-center gap-2">
                            <input
                                type="radio"
                                name="recipient-mode"
                                checked={mode === 'ALL'}
                                onChange={() => setMode('ALL')}
                                className="h-4 w-4"
                            />
                            Tất cả học viên đang học ({recipientCount})
                        </label>
                        <label className="flex min-h-11 items-center gap-2">
                            <input
                                type="radio"
                                name="recipient-mode"
                                checked={mode === 'SELECTED'}
                                onChange={() => {
                                    setMode('SELECTED')
                                    void loadStudents()
                                }}
                                className="h-4 w-4"
                            />
                            Chọn học viên ({selected.size} đã chọn)
                        </label>
                        {mode === 'SELECTED' && (
                            <div className="space-y-2 rounded-xl border border-brk-outline p-3">
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('ALL')}
                                        className={
                                            statusFilter === 'ALL'
                                                ? 'min-h-9 rounded-full bg-brk-primary px-3 text-xs font-semibold text-white'
                                                : 'min-h-9 rounded-full border border-brk-outline bg-white px-3 text-xs'
                                        }
                                    >
                                        Tất cả ({students?.length ?? 0})
                                    </button>
                                    {STATUS_ORDER.filter(st => (statusCounts[st] ?? 0) > 0).map(st => (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => setStatusFilter(st)}
                                            className={
                                                statusFilter === st
                                                    ? 'min-h-9 rounded-full bg-brk-primary px-3 text-xs font-semibold text-white'
                                                    : 'min-h-9 rounded-full border border-brk-outline bg-white px-3 text-xs'
                                            }
                                        >
                                            {STATUS_LABELS[st]?.label ?? st} ({statusCounts[st]})
                                        </button>
                                    ))}
                                </div>
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Tìm theo tên hoặc email…"
                                    className="block min-h-11 w-full rounded-xl border border-brk-outline px-3 text-sm"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={selectAllVisible}
                                        className="min-h-11 rounded-xl border border-brk-outline px-3 text-sm"
                                    >
                                        Chọn tất cả đang hiện
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelected(new Set())}
                                        className="min-h-11 rounded-xl border border-brk-outline px-3 text-sm"
                                    >
                                        Bỏ chọn hết
                                    </button>
                                </div>
                                {studentsLoading && <p className="text-sm text-gray-500">Đang tải danh sách…</p>}
                                {students && (
                                    <ul className="max-h-64 space-y-1 overflow-y-auto">
                                        {visibleStudents.map(st => (
                                            <li key={st.userId}>
                                                <label className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-brk-background">
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.has(st.userId)}
                                                        onChange={() => toggleStudent(st.userId)}
                                                        className="h-4 w-4"
                                                    />
                                                    <span className="font-medium">{st.name || '(chưa có tên)'}</span>
                                                    <span className="text-gray-500">{st.email}</span>
                                                    <span
                                                        className={`ml-auto text-xs font-medium ${STATUS_LABELS[st.status]?.className ?? 'text-gray-400'}`}
                                                    >
                                                        {STATUS_LABELS[st.status]?.label ?? st.status}
                                                    </span>
                                                </label>
                                            </li>
                                        ))}
                                        {visibleStudents.length === 0 && (
                                            <li className="px-2 py-3 text-sm text-gray-500">Không tìm thấy học viên nào.</li>
                                        )}
                                    </ul>
                                )}
                                <p className="text-xs text-gray-500">
                                    Thông báo trong hệ thống chỉ gửi tới học viên có trạng thái ACTIVE trong nhóm đã chọn;
                                    email gửi tới học viên có email hợp lệ.
                                </p>
                            </div>
                        )}
                    </fieldset>

                    <button
                        type="button"
                        disabled={sending || targetCount === 0}
                        onClick={() => void handleSend()}
                        className="min-h-11 w-full rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-50"
                    >
                        {sending ? 'Đang gửi…' : `Gửi tới ${targetCount} học viên`}
                    </button>
                    {targetCount === 0 && (
                        <p className="text-sm text-gray-500">Chưa có người nhận nào được chọn.</p>
                    )}
                    {result && (
                        <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                            {result}
                        </div>
                    )}
                </div>
            )}

            {history.length > 0 && (
                <details className="mt-6 rounded-2xl border border-brk-outline bg-white">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                        <span className="text-base font-semibold">Lịch sử đã gửi</span>
                        <span className="text-xs text-gray-500">· {history.length} mục gần nhất</span>
                        <span className="ml-auto text-xs text-gray-400">Bấm để xem ▾</span>
                    </summary>
                    <div className="space-y-3 border-t border-brk-outline p-4">
                        {history.map(item => (
                            <article key={`${item.kind}-${item.id}`} className="rounded-2xl border border-brk-outline bg-brk-background p-4">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={
                                            item.kind === 'EMAIL'
                                                ? 'rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700'
                                                : 'rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700'
                                        }
                                    >
                                        {item.kind === 'EMAIL' ? 'Email' : 'Thông báo'}
                                    </span>
                                    <p className="text-sm font-semibold">{item.title}</p>
                                </div>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    {new Date(item.createdAt).toLocaleString('vi-VN')} · {item.scope}
                                    {item.kind === 'EMAIL' &&
                                        ` · Trạng thái: ${item.status} · Đã gửi ${item.sentCount ?? 0}/${item.totalRecipients ?? 0}` +
                                            ((item.failedCount ?? 0) > 0 ? ` · Lỗi ${item.failedCount}` : '')}
                                </p>
                                {item.body &&
                                    (isRichHtml(item.body) ? (
                                        <div
                                            className="mt-2 text-sm text-gray-700 [&_a]:text-brk-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                                            dangerouslySetInnerHTML={{ __html: item.body }}
                                        />
                                    ) : (
                                        <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{item.body}</p>
                                    ))}
                            </article>
                        ))}
                    </div>
                </details>
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
