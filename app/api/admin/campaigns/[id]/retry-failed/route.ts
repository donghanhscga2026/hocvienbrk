import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Gửi lại riêng các email lỗi của chiến dịch đã hoàn thành.
 * Chỉ xóa log FAILED/BOUNCED, giữ nguyên SENT/SKIPPED để không gửi trùng.
 */
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
    if (session.user.role === "TEACHER") {
      const own = await prisma.emailCampaign.findUnique({ where: { id }, select: { createdBy: true } });
      if (!own || own.createdBy !== userId) {
        return new NextResponse("Không có quyền", { status: 403 });
      }
    }

    const failedCount = await prisma.emailCampaignLog.count({
      where: { campaignId: id, status: { in: ["FAILED", "BOUNCED"] } },
    });

    if (failedCount === 0) {
      return NextResponse.json({ success: true, retried: 0, message: "Không có email lỗi để gửi lại" });
    }

    await prisma.emailCampaignLog.deleteMany({
      where: { campaignId: id, status: { in: ["FAILED", "BOUNCED"] } },
    });

    const sentCount = await prisma.emailCampaignLog.count({
      where: { campaignId: id, status: { in: ["SENT", "SKIPPED"] } },
    });
    const remainingFailed = await prisma.emailCampaignLog.count({
      where: { campaignId: id, status: "FAILED" },
    });

    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "RUNNING",
        sentCount,
        failedCount: remainingFailed,
        completedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      retried: failedCount,
      sentCount,
      status: updated.status,
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
