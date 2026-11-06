'use client'

import { X, Loader2 } from "lucide-react"
import type { GieoHatSummary } from "@/lib/course/gieo-hat"

/**
 * Panel "Gieo hạt cam kết" trong giao diện học — GĐ1: CHỈ XEM / ĐỐI CHIẾU.
 * Hiển thị số buổi nộp muộn / chưa nộp máy tính đến hết hôm qua, bảng kê
 * từng bài phạm và các bài đã chốt ở lần trước. Chưa có chốt số / điều
 * chỉnh / QR (sang GĐ2). Dữ liệu do CoursePlayer nạp qua
 * getGieoHatSummaryAction và truyền xuống.
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

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
    LATE: { text: "Nộp muộn", className: "bg-amber-100 text-amber-800" },
    MISSING: { text: "Chưa nộp", className: "bg-red-100 text-red-800" },
    PENDING_REVIEW: { text: "Đang chờ duyệt", className: "bg-sky-100 text-sky-800" },
    SETTLED: { text: "Đã chốt", className: "bg-stone-200 text-stone-600" },
}

export default function GieoHatPanel({
    open,
    onClose,
    summary,
    loading,
}: {
    open: boolean
    onClose: () => void
    summary: GieoHatSummary | null
    loading: boolean
}) {
    if (!open) return null

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

                            {summary.pendingSettlement && (
                                <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] leading-6 text-amber-800">
                                    Bạn có 1 đợt chốt đang <b>chờ giảng viên duyệt</b> (
                                    {summary.pendingSettlement.lessonCount} bài
                                    {summary.pendingSettlement.proposedAmount != null
                                        ? `, đề nghị ${formatVnd(summary.pendingSettlement.proposedAmount)}`
                                        : ""}
                                    ). Các bài trong đợt đó không tính lại ở kỳ này.
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
                                !summary.pendingSettlement && (
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

                            <p className="mt-4 rounded-xl bg-stone-100 px-3 py-2.5 text-center text-xs font-semibold text-stone-500">
                                Chức năng chốt số gieo hạt sẽ mở ở giai đoạn tiếp theo — hiện tại bạn
                                chỉ xem và đối chiếu.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
