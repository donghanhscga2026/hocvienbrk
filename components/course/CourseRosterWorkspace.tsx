"use client";
import { useCallback, useEffect, useState } from "react";
import { getCourseMemberRosterAction } from "@/app/actions/admin-actions";
import AdminMemberRosterTab from "./AdminMemberRosterTab";
import CourseStudentTable from "./CourseStudentTable";
import CourseStatsTab from "./CourseStatsTab";
import type { RosterMember, CourseMemberLabels } from "./MemberRosterPanel";

export default function CourseRosterWorkspace({
    courseId,
    courseName,
    tab,
    initialStudentId,
    onActivity,
}: {
    courseId: number;
    courseName: string;
    tab: "members" | "stats";
    initialStudentId?: number;
    onActivity?: () => void;
}) {
    const [canManage, setCanManage] = useState(false);
    const [editAssignments, setEditAssignments] = useState(false);
    const [members, setMembers] = useState<RosterMember[]>([]);
    const [lessons, setLessons] = useState<
        { id: string; order: number; title: string }[]
    >([]);
    const [labels, setLabels] = useState<CourseMemberLabels>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const reload = useCallback(async () => {
        try {
            const result = await getCourseMemberRosterAction(courseId, true);
            if (!result.success)
                throw new Error(result.error || "Không tải được học viên.");
            setError("");
            setCanManage(!!result.canViewPhone);
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
        getCourseMemberRosterAction(courseId, true)
            .then((result) => {
                if (cancelled) return;
                if (result.success) {
                    setCanManage(!!result.canViewPhone);
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
                        <div hidden={editAssignments}>
                            <CourseStudentTable courseId={courseId} courseName={courseName} members={members} labels={labels} totalLessons={lessons.length} canManage={canManage} reload={() => { void reload() }} initialStudentId={initialStudentId} onActivity={onActivity} onEditAssignments={() => setEditAssignments(true)} />
                        </div>
                        {canManage && editAssignments && <div className="p-4"><button type="button" onClick={() => setEditAssignments(false)} className="mb-3 min-h-11 rounded-lg border border-brk-outline px-3 text-sm text-brk-primary">← Bảng học viên</button><AdminMemberRosterTab courseId={courseId} courseName={courseName} members={members.filter(member => member.enrollmentStatus !== 'PENDING')} labels={labels} reload={() => { void reload() }} initialStudentId={initialStudentId} /></div>}
                    </div>
                    <div hidden={tab !== "stats"}>
                        <CourseStatsTab
                            members={members.filter(member => member.enrollmentStatus !== 'PENDING')}
                            lessons={lessons}
                            labels={labels}
                        />
                    </div>
                </>
            )}
        </section>
    );
}
