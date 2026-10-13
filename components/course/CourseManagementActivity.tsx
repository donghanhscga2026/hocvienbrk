"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Loader2 } from "lucide-react";

export type ActivitySummary = {
    courseId: number;
    comments: number;
    submissions: number;
    requests: number;
    since: string;
};
type Student = { id: number; name: string | null };
type Lesson = { id: string; title: string; order: number };
type Activity = {
    through: string;
    summary: ActivitySummary[];
    comments: {
        id: number;
        content: string;
        imageUrl: string | null;
        createdAt: string;
        user: Student;
        lesson: Lesson;
    }[];
    submissions: {
        id: number;
        submittedAt: string;
        totalScore: number;
        assignment: Record<string, unknown> | null;
        enrollment: { user: Student };
        lesson: Lesson;
    }[];
    requests: {
        id: string;
        name: string;
        content: string;
        category: string;
        status: string;
        createdAt: string;
    }[];
};

export default function CourseManagementActivity({
    courseId,
    onOpenStudent,
    onSeen,
}: {
    courseId: number;
    onOpenStudent?: (id: number) => void;
    onSeen?: () => void;
}) {
    const [data, setData] = useState<Activity | null>(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        fetch(`/api/courses/management-activity?ids=${courseId}&detail=1`, {
            cache: "no-store",
            signal: controller.signal,
        })
            .then(async (response) => {
                const result = await response.json();
                if (!response.ok)
                    throw new Error(
                        result.error || "Không tải được hoạt động.",
                    );
                if (!controller.signal.aborted) {
                    setData(result);
                    setError("");
                }
            })
            .catch((error) => {
                if (!controller.signal.aborted) setError(error.message);
            });
        return () => controller.abort();
    }, [courseId, revision]);
    async function markSeen() {
        if (!data || busy) return;
        const total = data.summary[0].comments + data.summary[0].submissions;
        if (
            !window.confirm(
                `Đánh dấu ${total} hoạt động tính đến thời điểm tải này là đã xem? Đây không phải xác nhận đã chấm bài hoặc giải đáp.`,
            )
        )
            return;
        setBusy(true);
        setError("");
        try {
            const response = await fetch("/api/courses/management-activity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId, through: data.through }),
            });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error || "Không lưu được mốc đã xem.");
            setData(null);
            setRevision((value) => value + 1);
            onSeen?.();
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Không lưu được mốc đã xem.",
            );
        } finally {
            setBusy(false);
        }
    }
    const summary = data?.summary[0];
    const button =
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brk-outline px-3 text-sm font-semibold text-brk-primary disabled:opacity-50";
    return (
        <section className="space-y-5 rounded-2xl border border-brk-outline bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Hoạt động học viên</h2>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                        setData(null);
                        setError("");
                        setRevision((value) => value + 1);
                    }}
                    className={button}
                >
                    <RefreshCw size={16} />
                    Tải lại
                </button>
            </div>
            <p className="text-sm leading-6 text-gray-600">
                Yêu cầu học tập / hỗ trợ dùng chung trạng thái với CRM. Bài nộp
                và bình luận chỉ đánh dấu đã xem, không tự chuyển thành yêu cầu
                CRM hay xác nhận đã chấm bài. Lần đầu hiển thị hoạt động trong 7
                ngày gần nhất; mốc đã xem lưu riêng cho từng người quản lý.
            </p>
            {error && (
                <p role="alert" className="text-sm text-red-700">
                    {error}
                </p>
            )}
            {!data && !error && (
                <p role="status" className="flex items-center gap-2 text-sm">
                    <Loader2 size={18} className="animate-spin" />
                    Đang tải hoạt động…
                </p>
            )}
            {summary && (
                <>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {[
                            ["Yêu cầu cần trả lời", summary.requests],
                            ["Bài nộp chưa xem", summary.submissions],
                            ["Bình luận chưa xem", summary.comments],
                        ].map(([label, count]) => (
                            <div
                                key={label}
                                className="rounded-xl bg-brk-background p-4"
                            >
                                <p className="text-2xl font-bold text-brk-primary">
                                    {count}
                                </p>
                                <p className="mt-1 text-sm">{label}</p>
                            </div>
                        ))}
                    </div>
                    <section className="space-y-3">
                        <h3 className="font-bold">Yêu cầu cần trả lời</h3>
                        <p className="text-xs text-gray-500">
                            Mới gửi hoặc đang xử lý. Xử lý và phản hồi tại hồ sơ
                            CRM gốc; tư vấn mua khóa không nằm trong danh sách
                            này.
                        </p>
                        {data.requests.length ? (
                            data.requests.map((item) => (
                                <article
                                    key={item.id}
                                    className="rounded-xl border border-brk-outline p-3"
                                >
                                    <p className="text-sm font-semibold">
                                        {item.name} ·{" "}
                                        {item.category === "LEARNING"
                                            ? "Câu hỏi học tập"
                                            : "Hỗ trợ kỹ thuật"}{" "}
                                        ·{" "}
                                        {item.status === "NEW"
                                            ? "Mới gửi"
                                            : "Đang xử lý"}
                                    </p>
                                    <p className="my-2 whitespace-pre-wrap break-words text-sm text-gray-600">
                                        {item.content}
                                    </p>
                                    <Link
                                        className={button}
                                        href={`/tools/crm?view=requests&request=${encodeURIComponent(item.id)}`}
                                    >
                                        Mở yêu cầu để trả lời →
                                    </Link>
                                </article>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">
                                Không có yêu cầu đang chờ trong phạm vi phụ
                                trách.
                            </p>
                        )}
                        {summary.requests > data.requests.length && (
                            <p className="text-xs text-gray-500">
                                Hiển thị 50 yêu cầu mới nhất. Xem các yêu cầu
                                còn lại trong CRM.
                            </p>
                        )}
                    </section>
                    <section className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="font-bold">Hoạt động chưa xem</h3>
                            <button
                                type="button"
                                onClick={() => void markSeen()}
                                disabled={
                                    busy ||
                                    summary.comments + summary.submissions === 0
                                }
                                className={button}
                            >
                                {busy ? "Đang lưu…" : "Đánh dấu tất cả đã xem"}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Tính từ{" "}
                            {new Date(summary.since).toLocaleString("vi-VN", {
                                timeZone: "Asia/Ho_Chi_Minh",
                            })}
                            . Mỗi nhóm hiển thị tối đa 50 hoạt động mới nhất;
                            đánh dấu tất cả áp dụng toàn bộ hoạt động đến thời
                            điểm tải.
                        </p>
                        {data.submissions.map((item) => (
                            <article
                                key={`s-${item.id}`}
                                className="rounded-xl border border-brk-outline p-3"
                            >
                                <p className="text-sm font-semibold">
                                    {item.enrollment.user.name ||
                                        `#${item.enrollment.user.id}`}{" "}
                                    · Nộp bài · Bài {item.lesson.order}:{" "}
                                    {item.lesson.title}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    {new Date(item.submittedAt).toLocaleString(
                                        "vi-VN",
                                        { timeZone: "Asia/Ho_Chi_Minh" },
                                    )}{" "}
                                    · Điểm hiện tại: {item.totalScore}
                                </p>
                                {typeof item.assignment?.reflection ===
                                    "string" && (
                                    <p className="my-2 whitespace-pre-wrap break-words text-sm text-gray-600">
                                        {item.assignment.reflection}
                                    </p>
                                )}
                                {onOpenStudent && (
                                    <button
                                        type="button"
                                        className={button}
                                        onClick={() =>
                                            onOpenStudent(
                                                item.enrollment.user.id,
                                            )
                                        }
                                    >
                                        Xem bài nộp của học viên →
                                    </button>
                                )}
                            </article>
                        ))}
                        {data.comments.map((item) => (
                            <article
                                key={`c-${item.id}`}
                                className="rounded-xl border border-brk-outline p-3"
                            >
                                <p className="text-sm font-semibold">
                                    {item.user.name || `#${item.user.id}`} ·
                                    Bình luận · Bài {item.lesson.order}:{" "}
                                    {item.lesson.title}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    {new Date(item.createdAt).toLocaleString(
                                        "vi-VN",
                                        { timeZone: "Asia/Ho_Chi_Minh" },
                                    )}
                                </p>
                                <p className="my-2 whitespace-pre-wrap break-words text-sm text-gray-600">
                                    {item.content}
                                </p>
                                {item.imageUrl && (
                                    <a
                                        href={item.imageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={button}
                                    >
                                        Xem ảnh đính kèm ↗
                                    </a>
                                )}
                            </article>
                        ))}
                        {!data.comments.length && !data.submissions.length && (
                            <p className="text-sm text-gray-500">
                                Không có hoạt động chưa xem. Nhật ký vẫn lưu các
                                hoạt động đã xem.
                            </p>
                        )}
                    </section>
                </>
            )}
        </section>
    );
}
