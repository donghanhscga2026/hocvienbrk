import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = parseInt(session.user.id || "0");

  try {
    // TEACHER chỉ restart được campaign của mình
    if (session.user.role === "TEACHER") {
      const own = await prisma.emailCampaign.findUnique({ where: { id }, select: { createdBy: true } });
      if (!own || own.createdBy !== userId) {
        return new NextResponse("Không có quyền", { status: 403 });
      }
    }

    // 1. Xóa toàn bộ nhật ký cũ của chiến dịch này
    await prisma.emailCampaignLog.deleteMany({
      where: { campaignId: id }
    });

    // 2. Đặt lại các thông số về 0 và trạng thái về ACTIVE
    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "ACTIVE",
        sentCount: 0,
        failedCount: 0,
        startedAt: null,
        completedAt: null,
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
