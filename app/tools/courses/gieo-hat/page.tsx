'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Sprout } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import ManagementWorkspace from '@/components/layout/ManagementWorkspace'
import {
    listGieoHatForReviewAction,
    getGieoHatSettlementDetailAction,
    reviewGieoHatAction,
    confirmGieoHatReceivedAction,
    type GieoHatReviewItem,
} from '@/app/actions/gieo-hat-actions'

/**
 * Trang duyệt gieo hạt cam kết của giảng viên / admin (GĐ2).
 * - "Đề nghị chờ duyệt": học viên đề nghị giảm → giảng viên xem bảng kê
 *   từng bài, chốt số cuối rồi Duyệt hoặc Trả lại kèm lý do.
 * - "Chờ xác nhận tiền về": học viên đã báo chuyển khoản → giảng viên đối
 *   chiếu tài khoản của mình rồi bấm "Đã nhận tiền".
 * Phạm vi dữ liệu do server quyết định: giảng viên chỉ thấy khóa của
 * mình, admin thấy mọi khóa.
 */

function formatVnd(n: number): string {
    return `${n.toLocaleString('vi-VN')}đ`
}

function formatDate(ymd: string): string {
    const [y, m, d] = (ymd || '').split('-')
    return d && m && y ? `${d}/${m}/${y}` : ymd
}

function formatDateTimeVN(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function parseMoney(text: string): number {
    return parseInt((text || '').replace(/[^\d]/g, ''), 10) || 0
}

function groupMoney(n: number): string {
    return n ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
}

type DetailState = {
    loading: boolean
    items?: { order: number; title: string; deadline: string; status: string }[]
    error?: string
}

const LESSON_STATUS: Record<string, { text: string; className: string }> = {
    LATE: { text: 'Nộp muộn', className: 'bg-amber-100 text-amber-800' },
    MISSING: { text: 'Chưa nộp', className: 'bg-red-100 text-red-800' },
    ON_TIME: { text: 'Đúng hạn', className: 'bg-green-100 text-green-800' },
}

function GieoHatReviewContent() {
    const searchParams = useSearchParams()
    const initialCourseId = Number(searchParams.get('courseId')) || 0

    const [courses, setCourses] = useState<{ id: number; name: string; code: string }[]>([])
    const [courseId, setCourseId] = useState(initialCourseId)
    const [pendingReview, setPendingReview] = useState<GieoHatReviewItem[]>([])
    const [awaitingConfirm, setAwaitingConfirm] = useState<GieoHatReviewItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [busyId, setBusyId] = useState<number | null>(null)
    const [finalText, setFinalText] = useState<Record<number, string>>({})
    const [rejectNote, setRejectNote] = useState<Record<number, string>>({})
    const [details, setDetails] = useState<Record<number, DetailState>>({})

    const load = useCallback(async (cid: number) => {
        setLoading(true)
        setError('')
        try {
            const res = await listGieoHatForReviewAction(cid || undefined)
            if (!res.success) {
                setError(res.error)
                setPendingReview([])
                setAwaitingConfirm([])
            } else {
                setCourses(res.courses)
                setPendingReview(res.pendingReview)
                setAwaitingConfirm(res.awaitingConfirm)
                setFinalText(prev => {
                    const next = { ...prev }
                    for (const item of res.pendingReview) {
                        if (next[item.id] === undefined) {
                            next[item.id] = groupMoney(item.proposedAmount ?? item.computedAmount)
                        }
                    }
                    return next
                })
            }
        } catch {
            setError('Không tải được danh sách duyệt gieo hạt.')
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        load(courseId)
    }, [load, courseId])

    async function toggleDetail(item: GieoHatReviewItem) {
        if (details[item.id] && !details[item.id].loading) {
            setDetails(prev => {
                const next = { ...prev }
                delete next[item.id]
                return next
            })
            return
        }
        setDetails(prev => ({ ...prev, [item.id]: { loading: true } }))
        try {
            const res = await getGieoHatSettlementDetailAction(item.id)
            if (res.success) {
                setDetails(prev => ({ ...prev, [item.id]: { loading: false, items: res.items } }))
            } else {
                setDetails(prev => ({ ...prev, [item.id]: { loading: false, error: res.error } }))
            }
        } catch {
            setDetails(prev => ({ ...prev, [item.id]: { loading: false, error: 'Không tải được bảng kê.' } }))
        }
    }

    async function handleReview(item: GieoHatReviewItem, decision: 'APPROVE' | 'REJECT') {
        setBusyId(item.id)
        setError('')
        setNotice('')
        try {
            const res =
                decision === 'APPROVE'
                    ? await reviewGieoHatAction(item.id, 'APPROVE', parseMoney(finalText[item.id] || ''), null)
                    : await reviewGieoHatAction(item.id, 'REJECT', null, rejectNote[item.id] || '')
            if (!res.success) {
                setError(res.error)
            } else {
                setNotice(
                    decision === 'APPROVE'
                        ? `Đã duyệt đề nghị của ${item.studentName}.`
                        : `Đã trả lại đề nghị của ${item.studentName}.`
                )
                await load(courseId)
            }
        } catch {
            setError('Không xử lý được đề nghị. Vui lòng thử lại.')
        }
        setBusyId(null)
    }

    async function handleConfirm(item: GieoHatReviewItem) {
        setBusyId(item.id)
        setError('')
        setNotice('')
        try {
            const res = await confirmGieoHatReceivedAction(item.id)
            if (!res.success) {
                setError(res.error)
            } else {
                setNotice(`Đã xác nhận nhận tiền gieo hạt của ${item.studentName}.`)
                await load(courseId)
            }
        } catch {
            setError('Không xác nhận được. Vui lòng thử lại.')
        }
        setBusyId(null)
    }

    return (
        <div className="min-h-screen bg-[#F7F9F5] text-[#24352A]">
            <MainHeader title="Duyệt gieo hạt" toolSlug="courses" />
            <ManagementWorkspace active="courses">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-brk-primary">
                        <Sprout className="h-6 w-6" /> Duyệt gieo hạt cam kết
                    </h1>
                    <p className="mt-2 text-sm text-[#617066]">
                        Học viên giữ nguyên hoặc tăng số tiền thì hệ thống tự duyệt và sinh mã QR ngay —
                        danh sách dưới đây chỉ gồm đề nghị giảm cần bạn duyệt và các khoản chờ xác nhận
                        tiền về.
                    </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="text-sm font-semibold" htmlFor="gieo-hat-course-filter">
                        Khóa học
                    </label>
                    <select
                        id="gieo-hat-course-filter"
                        value={courseId}
                        onChange={e => setCourseId(Number(e.target.value) || 0)}
                        className="min-h-11 rounded-xl border border-[#CFE2CB] bg-white px-3 text-sm outline-none focus:border-green-500"
                    >
                        <option value={0}>Tất cả khóa trong phạm vi của bạn</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} ({c.code})
                            </option>
                        ))}
                    </select>
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-[#617066]" />}
                </div>

                {error && (
                    <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {error}
                    </p>
                )}
                {notice && (
                    <p className="mt-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
                        {notice}
                    </p>
                )}

                {/* ===== Đề nghị chờ duyệt ===== */}
                <h2 className="mt-6 text-lg font-bold text-brk-primary">
                    Đề nghị chờ duyệt ({pendingReview.length})
                </h2>
                {!loading && pendingReview.length === 0 ? (
                    <p className="mt-2 rounded-2xl border border-[#E2E8DC] bg-white px-4 py-5 text-sm text-[#617066] shadow-sm">
                        Không có đề nghị giảm nào đang chờ duyệt.
                    </p>
                ) : (
                    <div className="mt-3 space-y-3">
                        {pendingReview.map(item => {
                            const detail = details[item.id]
                            return (
                                <div key={item.id} className="rounded-2xl border border-[#E2E8DC] bg-white p-4 shadow-sm">
                                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                        <b className="text-[15px]">{item.studentName || 'Học viên'}</b>
                                        <span className="text-xs text-[#617066]">HV {item.studentId}</span>
                                        <span className="text-xs text-[#617066]">{item.courseName}</span>
                                        <span className="ml-auto text-xs text-[#617066]">
                                            Gửi {formatDateTimeVN(item.createdAt)}
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-sm leading-6">
                                        {item.lateCount} buổi nộp muộn, {item.missingCount} buổi chưa nộp
                                        ({item.lessonCount} bài) · Số máy tính{' '}
                                        <b>{formatVnd(item.computedAmount)}</b> → đề nghị{' '}
                                        <b className="text-red-700">
                                            {item.proposedAmount != null ? formatVnd(item.proposedAmount) : '—'}
                                        </b>
                                    </p>
                                    {item.studentNote && (
                                        <p className="mt-1 rounded-lg bg-[#F7F9F5] px-3 py-2 text-[13px] leading-6 text-[#43544A]">
                                            Lý do của học viên: <i>“{item.studentNote}”</i>
                                        </p>
                                    )}

                                    <button
                                        onClick={() => toggleDetail(item)}
                                        className="mt-2 text-[13px] font-bold text-green-700 underline-offset-2 hover:underline"
                                    >
                                        {detail ? 'Ẩn bảng kê từng bài' : 'Xem bảng kê từng bài'}
                                    </button>
                                    {detail?.loading && (
                                        <p className="mt-2 flex items-center gap-2 text-[13px] text-[#617066]">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải bảng kê…
                                        </p>
                                    )}
                                    {detail?.error && (
                                        <p className="mt-2 text-[13px] font-semibold text-red-600">{detail.error}</p>
                                    )}
                                    {detail?.items && (
                                        <table className="mt-2 w-full max-w-xl border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b border-[#E2E8DC] text-left text-[#617066]">
                                                    <th className="py-1.5 pr-2 font-semibold">Bài</th>
                                                    <th className="py-1.5 pr-2 font-semibold">Hạn nộp</th>
                                                    <th className="py-1.5 font-semibold">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detail.items.map(row => {
                                                    const st = LESSON_STATUS[row.status]
                                                    return (
                                                        <tr key={row.order} className="border-b border-[#F0F3EC] align-top">
                                                            <td className="py-1.5 pr-2">
                                                                Bài {row.order} — {row.title}
                                                            </td>
                                                            <td className="whitespace-nowrap py-1.5 pr-2">
                                                                {row.deadline ? formatDate(row.deadline) : ''}
                                                            </td>
                                                            <td className="py-1.5">
                                                                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${st?.className || ''}`}>
                                                                    {st?.text || row.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    )}

                                    <div className="mt-3 flex flex-wrap items-end gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-[#617066]" htmlFor={`final-${item.id}`}>
                                                Số cuối cùng duyệt (đ)
                                            </label>
                                            <input
                                                id={`final-${item.id}`}
                                                type="text"
                                                inputMode="numeric"
                                                value={finalText[item.id] || ''}
                                                onChange={e => {
                                                    const v = parseMoney(e.target.value)
                                                    setFinalText(prev => ({ ...prev, [item.id]: v ? groupMoney(v) : '' }))
                                                }}
                                                className="mt-1 min-h-11 w-40 rounded-xl border border-[#CFE2CB] px-3 text-right text-[15px] font-bold outline-none focus:border-green-500"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleReview(item, 'APPROVE')}
                                            disabled={busyId === item.id}
                                            className="min-h-11 rounded-xl bg-green-600 px-5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                                        >
                                            Duyệt
                                        </button>
                                        <div className="min-w-52 flex-1">
                                            <label className="block text-xs font-semibold text-[#617066]" htmlFor={`reject-${item.id}`}>
                                                Lý do trả lại (bắt buộc khi trả lại)
                                            </label>
                                            <input
                                                id={`reject-${item.id}`}
                                                type="text"
                                                value={rejectNote[item.id] || ''}
                                                onChange={e => setRejectNote(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                placeholder="Ví dụ: Bài 27 vẫn chưa thấy bài nộp trên hệ thống…"
                                                className="mt-1 min-h-11 w-full rounded-xl border border-[#CFE2CB] px-3 text-sm outline-none focus:border-green-500"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleReview(item, 'REJECT')}
                                            disabled={busyId === item.id || !(rejectNote[item.id] || '').trim()}
                                            className="min-h-11 rounded-xl bg-red-100 px-5 text-sm font-bold text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Trả lại
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* ===== Chờ xác nhận tiền về ===== */}
                <h2 className="mt-8 text-lg font-bold text-brk-primary">
                    Chờ xác nhận tiền về ({awaitingConfirm.length})
                </h2>
                {!loading && awaitingConfirm.length === 0 ? (
                    <p className="mt-2 rounded-2xl border border-[#E2E8DC] bg-white px-4 py-5 text-sm text-[#617066] shadow-sm">
                        Không có khoản nào đang chờ xác nhận tiền về.
                    </p>
                ) : (
                    <div className="mt-3 space-y-3">
                        {awaitingConfirm.map(item => (
                            <div key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-[#E2E8DC] bg-white p-4 shadow-sm">
                                <div className="min-w-52 flex-1">
                                    <b className="text-[15px]">{item.studentName || 'Học viên'}</b>{' '}
                                    <span className="text-xs text-[#617066]">HV {item.studentId} · {item.courseName}</span>
                                    <p className="mt-0.5 text-sm leading-6">
                                        Số tiền <b>{formatVnd(item.finalAmount ?? item.proposedAmount ?? 0)}</b> ·
                                        học viên báo đã chuyển {formatDateTimeVN(item.studentMarkedPaidAt)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleConfirm(item)}
                                    disabled={busyId === item.id}
                                    className="min-h-11 rounded-xl bg-green-600 px-5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                                >
                                    Đã nhận tiền
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </ManagementWorkspace>
        </div>
    )
}

export default function GieoHatReviewPage() {
    return (
        <Suspense fallback={null}>
            <GieoHatReviewContent />
        </Suspense>
    )
}
