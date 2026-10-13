import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { CrmError } from "@/lib/crm/service";
import { requestScope } from "@/lib/crm/requests";
import type { CrmActor } from "@/lib/crm/shared";

const prefix = "course:activity-seen:v1:";
export const managementCourseIds = z
    .array(z.number().int().positive())
    .min(1)
    .max(100);
export const seenActivityInput = z
    .object({
        courseId: z.number().int().positive(),
        through: z.iso.datetime(),
    })
    .strict();
const markerKey = (actorId: number, courseId: number) =>
    `${prefix}${actorId}:${courseId}`;

// Quyền quản lý được kiểm tra ở DB, không tin danh sách khóa từ trình duyệt.
export async function managedActivityCourses(
    db: PrismaClient,
    actor: CrmActor,
    ids: number[],
) {
    if (!["ADMIN", "TEACHER", "INSTRUCTOR"].includes(actor.role))
        throw new CrmError("Bạn không có quyền quản lý khóa học.", 403);
    const courses = await db.course.findMany({
        where: {
            id: { in: ids },
            ...(actor.role === "ADMIN" ? {} : { teacherId: actor.id }),
        },
        select: { id: true, name_lop: true },
    });
    if (courses.length !== new Set(ids).size)
        throw new CrmError("Bạn không có quyền xem một số khóa học.", 403);
    return courses;
}

export async function readManagementActivity(
    db: PrismaClient,
    actor: CrmActor,
    ids: number[],
    detail = false,
) {
    await managedActivityCourses(db, actor, ids);
    const through = new Date();
    // Lần đầu chỉ lấy 7 ngày; sau đó tính từ mốc đã xem của từng người quản lý.
    const defaultSince = new Date(through.getTime() - 7 * 86400000);
    const markers = await db.systemConfig.findMany({
        where: { key: { in: ids.map((id) => markerKey(actor.id, id)) } },
        select: { key: true, value: true },
    });
    const since = new Map(
        ids.map((id) => {
            const value = markers.find(
                (row) => row.key === markerKey(actor.id, id),
            )?.value as { through?: string } | undefined;
            const date = value?.through
                ? new Date(value.through)
                : defaultSince;
            return [
                id,
                Number.isFinite(date.getTime()) ? date : defaultSince,
            ] as const;
        }),
    );
    const commentWhere = {
        userId: { not: actor.id },
        OR: ids.map((id) => ({
            lesson: { courseId: id },
            createdAt: { gt: since.get(id)!, lte: through },
        })),
    };
    const submissionWhere = {
        status: { not: "RESET" },
        enrollment: { userId: { not: actor.id } },
        OR: ids.map((id) => ({
            lesson: { courseId: id },
            submittedAt: { gt: since.get(id)!, lte: through },
        })),
    };
    const requestWhere = {
        AND: [
            requestScope(actor),
            {
                courseId: { in: ids },
                category: { in: ["LEARNING", "SUPPORT"] },
                status: { in: ["NEW", "IN_PROGRESS"] },
            },
        ],
    };
    // Gom số đếm thay vì đọc toàn bộ nội dung của tất cả khóa học.
    const [comments, submissions, requests, lessons] = await Promise.all([
        db.lessonComment.groupBy({
            by: ["lessonId"],
            where: commentWhere,
            _count: { _all: true },
        }),
        db.lessonProgress.groupBy({
            by: ["lessonId"],
            where: submissionWhere,
            _count: { _all: true },
        }),
        db.crmRequest.groupBy({
            by: ["courseId"],
            where: requestWhere,
            _count: { _all: true },
        }),
        db.lesson.findMany({
            where: { courseId: { in: ids } },
            select: { id: true, courseId: true },
        }),
    ]);
    const lessonCourses = new Map(
        lessons.map((lesson) => [lesson.id, lesson.courseId]),
    );
    const summary = ids.map((courseId) => ({
        courseId,
        comments: comments
            .filter((row) => lessonCourses.get(row.lessonId) === courseId)
            .reduce((sum, row) => sum + row._count._all, 0),
        submissions: submissions
            .filter((row) => lessonCourses.get(row.lessonId) === courseId)
            .reduce((sum, row) => sum + row._count._all, 0),
        requests:
            requests.find((row) => row.courseId === courseId)?._count._all || 0,
        since: since.get(courseId)!.toISOString(),
    }));
    if (!detail) return { through: through.toISOString(), summary };
    const [commentRows, submissionRows, requestRows] = await Promise.all([
        db.lessonComment.findMany({
            where: commentWhere,
            take: 50,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                content: true,
                imageUrl: true,
                createdAt: true,
                user: { select: { id: true, name: true } },
                lesson: { select: { id: true, title: true, order: true } },
            },
        }),
        db.lessonProgress.findMany({
            where: submissionWhere,
            take: 50,
            orderBy: { submittedAt: "desc" },
            select: {
                id: true,
                assignment: true,
                totalScore: true,
                submittedAt: true,
                enrollment: {
                    select: { user: { select: { id: true, name: true } } },
                },
                lesson: { select: { id: true, title: true, order: true } },
            },
        }),
        db.crmRequest.findMany({
            where: requestWhere,
            take: 50,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                content: true,
                category: true,
                status: true,
                createdAt: true,
            },
        }),
    ]);
    return {
        through: through.toISOString(),
        summary,
        comments: commentRows,
        submissions: submissionRows,
        requests: requestRows,
    };
}

export async function markManagementActivitySeen(
    db: PrismaClient,
    actor: CrmActor,
    raw: unknown,
) {
    const input = seenActivityInput.parse(raw);
    await managedActivityCourses(db, actor, [input.courseId]);
    const through = new Date(input.through);
    if (through.getTime() > Date.now())
        throw new CrmError("Mốc đã xem không hợp lệ.");
    // Mốc không lùi khi hai thiết bị cùng đánh dấu. Hoạt động phát sinh sau
    // snapshot đang xem không bị đánh dấu nhầm là đã đọc.
    return db.$transaction(async (tx) => {
        const key = markerKey(actor.id, input.courseId);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
        const previous = await tx.systemConfig.findUnique({ where: { key } });
        const old = (previous?.value as { through?: string } | undefined)
            ?.through;
        if (old && new Date(old).getTime() >= through.getTime())
            return { success: true };
        const value = { through: through.toISOString() };
        await tx.systemConfig.upsert({
            where: { key },
            create: { key, value },
            update: { value },
        });
        return { success: true };
    });
}
