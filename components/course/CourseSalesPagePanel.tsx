"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    getCoursePages,
    createCoursePage,
    updateCoursePage,
    applyCoursePageTemplate,
} from "@/app/actions/course-page-actions";
import {
    applyStoredCoursePageTemplate,
    getStoredCoursePageTemplateOptions,
} from "@/app/actions/course-page-template-actions";
import {
    COURSE_TEMPLATE_LIBRARY,
    type CourseTemplateKey,
} from "@/lib/course-page/templates";

type Page = { id: string; slug: string; useTemplate: boolean; status: string };
type Template = { id: string; name: string; description?: string | null };
export default function CourseSalesPagePanel({
    slug,
    courseName,
    canEdit,
}: {
    slug: string;
    courseName: string;
    canEdit: boolean;
}) {
    const [page, setPage] = useState<Page | null>(null);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<"system" | "mine" | "import">("system");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [ready, setReady] = useState(false);
    const dialog = useRef<HTMLDialogElement>(null);
    async function reload() {
        setReady(false);
        setError("");
        try {
            const [pages, result] = await Promise.all([
                getCoursePages(),
                getStoredCoursePageTemplateOptions(),
            ]);
            setPage((pages.find((item) => item.slug === slug) as Page) || null);
            if (!result.success)
                throw new Error(result.error || "Không tải được mẫu.");
            setTemplates(result.templates || []);
            setReady(true);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Không tải được trang bán khóa học.",
            );
        }
    }
    useEffect(() => {
        let cancelled = false;
        getCoursePages()
            .then((pages) => {
                if (!cancelled) {
                    setPage(
                        (pages.find((item) => item.slug === slug) as Page) ||
                            null,
                    );
                    setReady(true);
                }
            })
            .catch(() => {
                if (!cancelled) setError("Không tải được trang bán khóa học.");
            });
        return () => {
            cancelled = true;
        };
    }, [slug]);
    useEffect(() => {
        if (open) dialog.current?.showModal();
        else dialog.current?.close();
    }, [open]);
    async function apply(key: string, name: string, stored = false) {
        if (!canEdit || busy || !ready) return;
        if (
            !window.confirm(
                `Áp dụng mẫu “${name}” cho “${courseName}”? Bố cục trang bán của khóa này sẽ được thay thế. Hãy lưu các chỉnh sửa hiện tại trước khi tiếp tục.`,
            )
        )
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const result = stored
                ? await applyStoredCoursePageTemplate(key, slug, courseName)
                : await applyCoursePageTemplate(
                      slug,
                      courseName,
                      key as CourseTemplateKey,
                  );
            if (!result.success)
                throw new Error(result.error || "Không áp dụng được mẫu.");
            await reload();
            setOpen(false);
            setNotice(
                "Đã áp dụng mẫu cho khóa học này. Mở Chỉnh nội dung để kiểm tra và xuất bản.",
            );
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Không áp dụng được mẫu.",
            );
        } finally {
            setBusy(false);
        }
    }
    async function toggle() {
        if (!canEdit || busy || !ready) return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const result = page
                ? await updateCoursePage(page.id, {
                      useTemplate: !page.useTemplate,
                  })
                : await createCoursePage({
                      slug,
                      name: courseName,
                      useTemplate: true,
                  });
            if (!result.success)
                throw new Error(
                    result.error || "Không cập nhật được giao diện.",
                );
            await reload();
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Không cập nhật được giao diện.",
            );
        } finally {
            setBusy(false);
        }
    }
    const button =
        "inline-flex min-h-11 items-center justify-center rounded-xl border border-brk-outline px-4 text-sm font-semibold text-brk-primary disabled:opacity-50";
    return (
        <section className="space-y-5 rounded-2xl border border-brk-outline bg-white p-4 sm:p-6">
            <div>
                <h2 className="text-xl font-bold">Trang bán khóa học</h2>
                <p className="mt-2 text-sm text-gray-600">
                    {courseName} · /khoa-hoc/{slug}
                </p>
            </div>
            <p className="text-sm leading-6 text-gray-600">
                Chọn mẫu → chỉnh nội dung riêng → xem trước → xuất bản. Nhập
                HTML/ZIP hoặc URL vào thư viện rồi chọn mẫu vừa lưu để áp dụng
                cho khóa này.
            </p>
            <div className="rounded-xl bg-brk-background p-4 text-sm">
                Giao diện:{" "}
                <strong>
                    {page?.useTemplate
                        ? "Dùng mẫu Sales Page"
                        : "Trang khóa học mặc định"}
                </strong>
                {page && (
                    <span>
                        {" "}
                        · Trạng thái trang mẫu:{" "}
                        {page.status === "published"
                            ? "Đã xuất bản"
                            : page.status === "archived"
                              ? "Lưu trữ"
                              : "Bản nháp"}
                    </span>
                )}
            </div>
            <div className="flex flex-wrap gap-3">
                <button
                    type="button"
                    disabled={!canEdit || busy || !ready}
                    onClick={() => {
                        setOpen(true);
                        void reload();
                    }}
                    className="min-h-11 rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-50"
                >
                    Chọn mẫu
                </button>
                <button
                    type="button"
                    disabled={!canEdit || busy || !ready}
                    onClick={() => void toggle()}
                    className={button}
                >
                    {page?.useTemplate
                        ? "Dùng trang mặc định"
                        : "Bật trang mẫu"}
                </button>
                {page && canEdit && (
                    <Link
                        href={`/tools/courses/pages/${page.id}`}
                        className={button}
                    >
                        Chỉnh nội dung
                    </Link>
                )}
                <Link
                    href={`/khoa-hoc/${encodeURIComponent(slug)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={button}
                >
                    Xem trang công khai ↗
                </Link>
            </div>
            {!canEdit && (
                <p className="text-sm text-gray-500">
                    Quyền thay mẫu và chỉnh Sales Page hiện dành cho quản trị
                    viên. Các quyền quản lý khóa học của giảng viên được giữ
                    nguyên.
                </p>
            )}
            {notice && (
                <p role="status" className="text-sm text-green-700">
                    {notice}
                </p>
            )}
            {error && (
                <p role="alert" className="text-sm text-red-700">
                    {error}
                </p>
            )}
            <dialog
                ref={dialog}
                onCancel={(event) => {
                    event.preventDefault();
                    if (!busy) setOpen(false);
                }}
                aria-label={`Chọn mẫu cho ${courseName}`}
                className="m-auto h-[92dvh] max-h-[92dvh] w-[calc(100%_-_1rem)] max-w-5xl overflow-y-auto rounded-2xl bg-white p-0 backdrop:bg-black/50"
            >
                <div className="sticky top-0 z-10 space-y-3 border-b bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold">Chọn mẫu · {courseName}</h3>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => setOpen(false)}
                            className={button}
                        >
                            Đóng
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(
                            [
                                { id: "system", name: "Mẫu có sẵn" },
                                { id: "mine", name: "Mẫu của tôi" },
                                { id: "import", name: "Nhập mẫu ngoài" },
                            ] as const
                        ).map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                aria-pressed={tab === item.id}
                                disabled={busy}
                                onClick={() => {
                                    setTab(item.id);
                                    if (item.id === "mine") void reload();
                                }}
                                className={
                                    button +
                                    (tab === item.id
                                        ? " bg-brk-background"
                                        : "")
                                }
                            >
                                {item.name}
                            </button>
                        ))}
                    </div>
                    {error && (
                        <p role="alert" className="text-sm text-red-700">
                            {error}
                        </p>
                    )}
                </div>
                <div className="p-4">
                    {tab === "system" && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {COURSE_TEMPLATE_LIBRARY.map((item) => (
                                <article
                                    key={item.key}
                                    className="space-y-3 rounded-xl border p-4"
                                >
                                    <h4 className="font-bold">{item.name}</h4>
                                    <p className="text-sm text-gray-600">
                                        {item.description}
                                    </p>
                                    <button
                                        type="button"
                                        disabled={busy || !ready}
                                        onClick={() =>
                                            void apply(item.key, item.name)
                                        }
                                        className={button}
                                    >
                                        Áp dụng cho khóa này
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                    {tab === "mine" && (
                        <div className="space-y-4">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void reload()}
                                className={button}
                            >
                                Tải lại mẫu của tôi
                            </button>
                            {!ready ? (
                                <p>Đang tải…</p>
                            ) : templates.length ? (
                                templates.map((item) => (
                                    <article
                                        key={item.id}
                                        className="space-y-2 rounded-xl border p-4"
                                    >
                                        <h4 className="font-bold">
                                            {item.name}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            {item.description}
                                        </p>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() =>
                                                void apply(
                                                    item.id,
                                                    item.name,
                                                    true,
                                                )
                                            }
                                            className={button}
                                        >
                                            Áp dụng cho khóa này
                                        </button>
                                    </article>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">
                                    Chưa có mẫu. Vào Nhập mẫu ngoài để thêm
                                    HTML/ZIP hoặc URL.
                                </p>
                            )}
                        </div>
                    )}
                    {tab === "import" && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                Bấm Nhập mẫu từ Website trong thư viện bên dưới,
                                chọn HTML/ZIP hoặc URL, xem trước rồi lưu. Sau
                                đó mở Mẫu của tôi để áp dụng. Không tự thay
                                trang bán khi mới tải file.
                            </p>
                            <Link
                                href="/tools/courses/templates"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={button}
                            >
                                Mở thư viện trong tab mới ↗
                            </Link>
                            <iframe
                                title="Thư viện nhập mẫu HTML ZIP và URL"
                                src="/tools/courses/templates"
                                className="h-[65dvh] w-full rounded-xl border"
                            />
                        </div>
                    )}
                </div>
            </dialog>
        </section>
    );
}
