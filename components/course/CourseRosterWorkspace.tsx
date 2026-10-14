"use client";
import { useCallback, useEffect, useState } from "react";
import { getCourseMemberRosterAction } from "@/app/actions/admin-actions";
import AdminMemberRosterTab from "./AdminMemberRosterTab";
import CourseStatsTab from "./CourseStatsTab";
import type { RosterMember, CourseMemberLabels } from "./MemberRosterPanel";

export default function CourseRosterWorkspace({
    courseId,
    courseName,
    tab,
    initialStudentId,
}: {
    courseId: number;
    courseName: string;
    tab: "members" | "stats";
    initialStudentId?: number;
}) {
    const [members, setMembers] = useState<RosterMember[]>([]);
    const [lessons, setLessons] = useState<
        { id: string; order: number; title: string }[]
    >([]);
    const [labels, setLabels] = useState<CourseMemberLabels>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const reload = useCallback(async () => {
        try {
            const result = await getCourseMemberRosterAction(courseId);
            if (!result.success)
                throw new Error(result.error || "Không tải được học viên.");
            setError("");
            setMembers((result.members || []) as RosterMember[]);
            setLessons(result.lessons || []);
            setLabels((result.labels || {}) as CourseMemberLabels);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Không tải được học viên.",
            );
        } finally {
            setLoading(false);
        }
    }, [courseId]);
    useEffect(() => {
        let cancelled = false;
        getCourseMemberRosterAction(courseId)
            .then((result) => {
                if (cancelled) return;
                if (result.success) {
                    setMembers((result.members || []) as RosterMember[]);
                    setLessons(result.lessons || []);
                    setLabels((result.labels || {}) as CourseMemberLabels);
                } else setError(result.error || "Không tải được học viên.");
                setLoading(false);
            })
            .catch(() => {
                if (!cancelled) {
                    setError("Không tải được học viên.");
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [courseId]);
    return (
        <section className="rounded-2xl border border-brk-outline bg-white">
            {loading ? (
                <p role="status" className="p-6">
                    Đang tải học viên…
                </p>
            ) : error ? (
                <div className="p-6">
                    <p role="alert" className="text-sm text-red-700">
                        {error}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setLoading(true);
                            void reload();
                        }}
                        className="mt-3 min-h-11 rounded-xl border px-4"
                    >
                        Thử lại
                    </button>
                </div>
            ) : (
                <>
                    <div hidden={tab !== "members"}>
                        <AdminMemberRosterTab
                            courseId={courseId}
                            courseName={courseName}
                            members={members}
                            labels={labels}
                            reload={() => {
                                setLoading(true);
                                void reload();
                            }}
                            initialStudentId={initialStudentId}
                        />
                    </div>
                    <div hidden={tab !== "stats"}>
                        <CourseStatsTab
                            members={members}
                            lessons={lessons}
                            labels={labels}
                        />
                    </div>
                </>
            )}
        </section>
    );
}
