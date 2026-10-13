import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { domainContext } from "@/lib/website/domain-context";
import { CrmError } from "@/lib/crm/service";
import { crmBody, crmFailure, crmResponse } from "@/lib/crm/http";
import {
    managementCourseIds,
    readManagementActivity,
    markManagementActivitySeen,
} from "@/lib/course/management-activity";

async function actor() {
    if (await domainContext())
        throw new CrmError("Quản lý khóa học tại hệ thống chính.", 403);
    const session = await auth();
    if (session?.user?.id == null)
        throw new CrmError("Vui lòng đăng nhập.", 401);
    const id = Number(session.user.id);
    if (!Number.isSafeInteger(id) || id < 0)
        throw new CrmError("Phiên đăng nhập không hợp lệ.", 401);
    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, name: true },
    });
    if (!user) throw new CrmError("Vui lòng đăng nhập lại.", 401);
    return { ...user, name: user.name || "" };
}
export async function GET(request: Request) {
    try {
        const params = new URL(request.url).searchParams;
        const ids = managementCourseIds.parse(
            (params.get("ids") || "").split(",").map(Number),
        );
        const detail = params.get("detail") === "1";
        if (detail && ids.length !== 1)
            throw new CrmError("Chọn một khóa học để xem hoạt động.");
        return crmResponse(
            await readManagementActivity(
                prisma,
                await actor(),
                [...new Set(ids)],
                detail,
            ),
        );
    } catch (error) {
        return crmFailure(error);
    }
}
export async function POST(request: Request) {
    try {
        return crmResponse(
            await markManagementActivitySeen(
                prisma,
                await actor(),
                await crmBody(request, 2000),
            ),
        );
    } catch (error) {
        return crmFailure(error);
    }
}
