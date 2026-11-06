'use client'

import { useCallback, useEffect, useState } from "react"
import { X, Loader2 } from "lucide-react"
import type { GieoHatSummary } from "@/lib/course/gieo-hat"
import {
    finalizeGieoHatAction,
    markGieoHatTransferredAction,
    getGieoHatPaymentInfoAction,
} from "@/app/actions/gieo-hat-actions"

/**
 * Panel "Gieo hạt cam kết" trong giao diện học.
 * GĐ1: đối chiếu số buổi nộp muộn / chưa nộp máy tính đến hết hôm qua.
 * GĐ2: học viên chốt số (giữ nguyên/tăng → tự duyệt, ra QR ngay; giảm →
 * bắt buộc lý do, chờ giảng viên duyệt), quét QR chuyển khoản về tài
 * khoản giảng viên của khóa rồi báo "Tôi đã chuyển khoản".
 * Dữ liệu do CoursePlayer nạp qua getGieoHatSummaryAction và truyền
 * xuống; sau mỗi thao tác ghi, panel gọi onChanged để nạp lại.
 */

function formatVnd(n: number): string {
    return `${n.toLocaleString("vi-VN")}đ`
}

function formatDate(ymd: string): string {
    const [y, m, d] = ymd.split("-")
    return d && m && y ? `${d}/${m}/${y}` : ymd
}

function formatDateShort(ymd: string): string {
    const [, m, d] = ymd.split("-")
    return d && m ? `${d}/${m}` : ymd
}

function formatDateTimeVN(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function parseMoney(text: string): number {
    return parseInt(text.replace(/[^\d]/g, ""), 10) || 0
}

function groupMoney(n: number): string {
    return n ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
    LATE: { text: "Nộp muộn", className: "bg-amber-100 text-amber-800" },
    MISSING: { text: "Chưa nộp", className: "bg-red-100 text-red-800" },
    PENDING_REVIEW: { text: "Đang chờ duyệt", className: "bg-sky-100 text-sky-800" },
    SETTLED: { text: "Đã chốt", className: "bg-stone-200 text-stone-600" },
}

type PaymentInfo =
    | { bankConfigured: false; finalAmount: number; transferContent: string | null }
    | {
          bankConfigured: true
          finalAmount: number
          transferContent: string
          qrCodeUrl: string
          bankName: string
          accountNumber: string
          accountHolder: string
      }

export default function GieoHatPanel({
    open,
    onClose,
    summary,
    loading,
    enrollmentId,
    onChanged,
}: {
    open: boolean
    onClose: () => void
    summary: GieoHatSummary | null
    loading: boolean
    enrollmentId: number
    onChanged: () => void
}) {
    const active = summary?.activeSettlement ?? null
    const computed = summary?.computedAmount ?? 0

    const [proposeText, setProposeText] = useState("")
    const [reason, setReason] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
    const [paymentLoading, setPaymentLoading] = useState(false)
    const [marking, setMarking] = useState(false)

    // Mở panel / số máy tính đổi → điền sẵn ô đề nghị bằng số máy tính.
    useEffect(() => {
        if (open && summary && !summary.activeSettlement) {
            setProposeText(groupMoney(summary.computedAmount))
            setErrorMsg("")
        }
    }, [open, summary])

    // Đợt đã duyệt chưa báo chuyển → nạp thông tin QR.
    const loadPaymentInfo = useCallback(async (settlementId: number) => {
        setPaymentLoading(true)
        try {
            const res = await getGieoHatPaymentInfoAction(settlementId)
            if (res.success) {
                setPaymentInfo(
                    res.bankConfigured
                        ? {
                              bankConfigured: true,
                              finalAmount: res.finalAmount,
                              transferContent: res.transferContent ?? "",
                              qrCodeUrl: res.qrCodeUrl,
                              bankName: res.bankName,
                              accountNumber: res.accountNumber,
                              accountHolder: res.accountHolder,
                          }
                        : {
                              bankConfigured: false,
                              finalAmount: res.finalAmount,
                              transferContent: res.transferContent,
                          }
                )
            }
        } catch {
            // Giữ paymentInfo = null → khối QR hiện thông báo thử lại.
        }
        setPaymentLoading(false)
    }, [])

    useEffect(() => {
        if (
            open &&
            active?.status === "APPROVED" &&
            !active.studentMarkedPaidAt &&
            (active.finalAmount ?? 0) > 0
        ) {
            setPaymentInfo(null)
            loadPaymentInfo(active.id)
        }
    }, [open, active?.id, active?.status, active?.studentMarkedPaidAt, active?.finalAmount, loadPaymentInfo])

    if (!open) return null

    const proposed = parseMoney(proposeText)
    const isDecrease = !!summary && !active && proposed < computed
    const needReason = isDecrease && reason.trim().length === 0
    const violatingCount = summary
        ? summary.items.filter(i => i.status === "LATE" || i.status === "MISSING").length
        : 0

    async function handleFinalize() {
        setErrorMsg("")
        setSubmitting(true)
        try {
            const res = await finalizeGieoHatAction(enrollmentId, proposed, reason)
            if (!res.success) {
                setErrorMsg(res.error)
            } else {
                setReason("")
                onChanged()
            }
        } catch {
            setErrorMsg("Không chốt được gieo hạt. Bạn thử lại sau nhé.")
        }
        setSubmitting(false)
    }

    async function handleMarkTransferred() {
        if (!active) return
        setMarking(true)
        try {
            const res = await markGieoHatTransferredAction(active.id)
            if (res.success) onChanged()
        } catch {
            // Nút vẫn còn để học viên bấm lại.
        }
        setMarking(false)
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#fafaf9] text-stone-900 shadow-2xl sm:rounded-3xl">
                <div className="flex items-center gap-2 px-5 pt-4">
                    <h2 className="text-base font-black sm:text-lg">🌱 Gieo hạt cam kết</h2>
                    <button
                        onClick={onClose}
                        aria-label="Đóng"
                        className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-stone-600 transition hover:bg-stone-300"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="overflow-y-auto px-5 pb-6">
                    {loading && !summary ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-stone-500">
                            <Loader2 className="h-4 w-4 animate-spin" /> Đang tính số buổi phạm cam kết…
                        </div>
                    ) : !summary ? (
                        <p className="py-8 text-center text-sm font-semibold text-red-600">
                            Không tải được thông tin gieo hạt. Bạn đóng panel rồi mở lại để thử lại nhé.
                        </p>
                    ) : summary.reason === "NOT_STARTED" ? (
                        <p className="py-6 text-sm leading-6 text-stone-600">
                            Bạn chưa chọn ngày bắt đầu học nên chưa tính được gieo hạt. Chọn ngày bắt
                            đầu xong, số buổi nộp muộn / chưa nộp sẽ tự hiện ở đây.
                        </p>
                    ) : (
                        <>
                            <p className="mt-1 text-xs text-stone-500">
                                Tự động tính đến hết hôm qua ({formatDate(summary.periodTo)}) · Mức gieo
                                hạt: <b className="text-stone-700">{formatVnd(summary.rate)}/buổi</b>
                            </p>

                            {/* ===== Đợt chốt đang xử lý (GĐ2) ===== */}
                            {active?.status === "PROPOSED" && (
                                <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-[13px] leading-6 text-amber-900">
                                    <b>Đã gửi đề nghị điều chỉnh — đang chờ giảng viên duyệt.</b>
                                    <br />
                                    Số máy tính {formatVnd(active.computedAmount)} → bạn đề nghị{" "}
                                    <b>{active.proposedAmount != null ? formatVnd(active.proposedAmount) : "—"}</b>{" "}
                                    ({active.lessonCount} bài, gửi {formatDateTimeVN(active.createdAt)}).
                                    {active.studentNote && (
                                        <>
                                            <br />
                                            Lý do của bạn: <i>“{active.studentNote}”</i>
                                        </>
                                    )}
                                    <br />
                                    Giảng viên duyệt xong, mở lại đây bạn sẽ thấy mã QR để chuyển khoản.
                                </div>
                            )}

                            {active?.status === "APPROVED" && !active.studentMarkedPaidAt && (
                                <div className="mt-3 rounded-xl border border-green-300 bg-green-50 px-3 py-3 text-center">
                                    <p className="text-[13px] font-semibold leading-6 text-green-900">
                                        Đợt chốt ngày {formatDateTimeVN(active.createdAt)} đã được duyệt.
                                        <br />
                                        Số gieo hạt cần chuyển:{" "}
                                        <span className="text-lg font-black text-red-700">
                                            {formatVnd(active.finalAmount ?? 0)}
                                        </span>
                                    </p>
                                    {(active.finalAmount ?? 0) === 0 ? (
                                        <p className="mt-1 text-[13px] text-green-800">
                                            Số tiền của đợt này là 0đ nên không cần chuyển khoản.
                                        </p>
                                    ) : paymentLoading || !paymentInfo ? (
                                        <div className="flex items-center justify-center gap-2 py-6 text-sm font-semibold text-stone-500">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Đang tạo mã QR…
                                        </div>
                                    ) : !paymentInfo.bankConfigured ? (
                                        <div className="mt-2 text-left text-[13px] leading-6 text-amber-900">
                                            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                                                Khóa học chưa cấu hình tài khoản nhận gieo hạt nên chưa
                                                hiện được mã QR. Bạn liên hệ giảng viên để được hướng
                                                dẫn chuyển khoản số tiền trên
                                                {paymentInfo.transferContent
                                                    ? " với đúng nội dung dưới đây"
                                                    : ""}
                                                .
                                            </p>
                                            {paymentInfo.transferContent && (
                                                <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-stone-700 ring-1 ring-stone-200">
                                                    {paymentInfo.transferContent}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={paymentInfo.qrCodeUrl}
                                                alt="Mã VietQR gieo hạt"
                                                className="mx-auto mt-2 h-[218px] w-[218px] rounded-xl border border-stone-200 bg-white object-contain"
                                            />
                                            <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-stone-700 ring-1 ring-stone-200">
                                                {paymentInfo.transferContent}
                                            </p>
                                            <p className="mt-1 text-xs text-stone-500">
                                                {paymentInfo.bankName} · {paymentInfo.accountNumber} ·{" "}
                                                {paymentInfo.accountHolder}
                                            </p>
                                            <button
                                                onClick={handleMarkTransferred}
                                                disabled={marking}
                                                className="mt-3 w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                                            >
                                                {marking ? "Đang ghi nhận…" : "Tôi đã chuyển khoản"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {active?.status === "APPROVED" && active.studentMarkedPaidAt && (
                                <div className="mt-3 rounded-xl border border-green-300 bg-green-50 px-3 py-3 text-[13px] leading-6 text-green-900">
                                    <b>Bạn đã báo chuyển khoản</b> lúc{" "}
                                    {formatDateTimeVN(active.studentMarkedPaidAt)} — số tiền{" "}
                                    <b>{formatVnd(active.finalAmount ?? 0)}</b>. Giảng viên đối chiếu
                                    tài khoản và xác nhận đã nhận là đợt gieo hạt này hoàn tất; các bài
                                    đã chốt không bị tính lại.
                                </div>
                            )}

                            {/* ===== Đối chiếu kỳ hiện tại ===== */}
                            {active && (
                                <h3 className="mt-4 text-xs font-black uppercase tracking-wide text-stone-400">
                                    Đối chiếu kỳ hiện tại
                                </h3>
                            )}

                            <div className="mt-3 grid grid-cols-3 gap-2">
                                <div className="rounded-xl border border-green-200 bg-green-50 px-2 py-2.5 text-center">
                                    <b className="block text-base text-green-800">{summary.lateCount}</b>
                                    <span className="text-[11px] text-stone-500">buổi nộp muộn</span>
                                </div>
                                <div className="rounded-xl border border-green-200 bg-green-50 px-2 py-2.5 text-center">
                                    <b className="block text-base text-green-800">{summary.missingCount}</b>
                                    <span className="text-[11px] text-stone-500">buổi chưa nộp</span>
                                </div>
                                <div className="rounded-xl border border-red-200 bg-red-50 px-2 py-2.5 text-center">
                                    <b className="block text-base text-red-700">{formatVnd(summary.computedAmount)}</b>
                                    <span className="text-[11px] text-stone-500">tổng máy tính</span>
                                </div>
                            </div>

                            {!active && summary.lastRejected && (
                                <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-[13px] leading-6 text-red-900">
                                    <b>Đợt chốt trước bị giảng viên trả lại</b>
                                    {summary.lastRejected.reviewedAt
                                        ? ` (${formatDateTimeVN(summary.lastRejected.reviewedAt)})`
                                        : ""}
                                    {summary.lastRejected.proposedAmount != null
                                        ? ` — số bạn đề nghị ${formatVnd(summary.lastRejected.proposedAmount)} trên số máy tính ${formatVnd(summary.lastRejected.computedAmount)}`
                                        : ""}
                                    .
                                    {summary.lastRejected.reviewNote && (
                                        <>
                                            <br />
                                            Lý do: <i>“{summary.lastRejected.reviewNote}”</i>
                                        </>
                                    )}
                                    <br />
                                    Bạn đối chiếu lại bảng kê dưới đây rồi chốt lại nhé.
                                </div>
                            )}

                            {summary.items.length > 0 ? (
                                <table className="mt-3 w-full border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-stone-200 text-left text-stone-500">
                                            <th className="py-1.5 pr-2 font-semibold">Bài</th>
                                            <th className="py-1.5 pr-2 font-semibold">Hạn nộp</th>
                                            <th className="py-1.5 font-semibold">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.items.map(item => {
                                            const st = STATUS_LABEL[item.status]
                                            return (
                                                <tr key={item.lessonId} className="border-b border-stone-100 align-top">
                                                    <td className="py-1.5 pr-2">
                                                        Bài {item.order} — {item.title}
                                                        {!item.counted && item.status !== "PENDING_REVIEW" && (
                                                            <span className="block text-[11px] text-stone-400">
                                                                (không tính tiền theo cài đặt khóa)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap py-1.5 pr-2">{formatDateShort(item.deadline)}</td>
                                                    <td className="py-1.5">
                                                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${st.className}`}>
                                                            {st.text}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                !active && (
                                    <p className="mt-4 rounded-xl bg-green-50 px-3 py-3 text-center text-[13px] font-semibold text-green-800">
                                        🎉 Tính đến hết hôm qua, bạn chưa có buổi nào phạm cam kết.
                                    </p>
                                )
                            )}

                            {summary.settledItems.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-xs font-black uppercase tracking-wide text-stone-400">
                                        Đã chốt ở các lần trước
                                    </h3>
                                    <table className="mt-1.5 w-full border-collapse text-xs text-stone-400">
                                        <tbody>
                                            {summary.settledItems.map(item => (
                                                <tr key={item.lessonId} className="border-b border-stone-100 align-top">
                                                    <td className="py-1.5 pr-2">
                                                        Bài {item.order} — {item.title}
                                                    </td>
                                                    <td className="whitespace-nowrap py-1.5 pr-2">{formatDateShort(item.deadline)}</td>
                                                    <td className="py-1.5">
                                                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_LABEL.SETTLED.className}`}>
                                                            Đã chốt{item.settledDate ? ` ${formatDateShort(item.settledDate)}` : ""}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* ===== Khu điều chỉnh + chốt (GĐ2) ===== */}
                            {!active && violatingCount > 0 && (
                                <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-3.5">
                                    <label htmlFor="gieo-hat-propose" className="block text-[13px] font-bold text-stone-800">
                                        Số tiền bạn chốt gieo hạt (đ) — sửa trực tiếp trong ô
                                    </label>
                                    <input
                                        id="gieo-hat-propose"
                                        type="text"
                                        inputMode="numeric"
                                        value={proposeText}
                                        onChange={e => {
                                            const v = parseMoney(e.target.value)
                                            setProposeText(v ? groupMoney(v) : "")
                                        }}
                                        className="mt-1.5 w-full rounded-xl border-2 border-stone-300 px-3 py-2.5 text-right text-lg font-black text-red-700 outline-none focus:border-green-500"
                                    />
                                    <p className="mt-1.5 text-[11.5px] leading-5 text-stone-500">
                                        Số máy tính: {formatVnd(computed)}. Tăng lên nếu muốn gieo thêm;
                                        giảm xuống phải ghi lý do để giảng viên duyệt.
                                    </p>
                                    <textarea
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        placeholder="Lý do điều chỉnh (bắt buộc khi giảm): ví dụ “Bài 27 em đã nộp qua nhóm nhưng chưa bấm nộp trên hệ thống…”"
                                        className="mt-2.5 min-h-[52px] w-full resize-y rounded-xl border-2 border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-green-500"
                                    />
                                    {isDecrease && (
                                        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-800">
                                            Bạn đang đề nghị <b>giảm</b> so với số máy tính — khoản này sẽ
                                            gửi giảng viên duyệt (kèm lý do) trước khi có mã QR.
                                        </p>
                                    )}
                                    {errorMsg && (
                                        <p className="mt-2 rounded-lg border border-red-300 bg-red-50 px-2.5 py-2 text-xs font-semibold leading-5 text-red-700">
                                            {errorMsg}
                                        </p>
                                    )}
                                    <button
                                        onClick={handleFinalize}
                                        disabled={submitting || needReason}
                                        className="mt-3 w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        {submitting
                                            ? "Đang chốt…"
                                            : needReason
                                              ? "Chốt số gieo hạt (cần ghi lý do khi giảm)"
                                              : "Chốt số gieo hạt"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
