import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { processCampaignBatch } from "@/lib/email-campaign-runner";
import { NextResponse } from "next/server";

// [OPTIMIZE] Gửi 1 batch email lặp tuần tự qua nhiều người nhận + nhiều nhà
// cung cấp (Gmail/Brevo), có thể vượt giới hạn thời gian mặc định khi batch lớn.
export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const campaignId = parseInt(idStr);

  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "TEACHER") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const userId = parseInt(session.user.id || "0");

  try {
    const { batchSize = 20 } = await req.json();

    // TEACHER chỉ gửi được campaign của mình, và không được gửi DB_ALL
    if (role === "TEACHER") {
      const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
      if (!campaign) return new NextResponse("Campaign not found", { status: 404 });
      if (campaign.createdBy !== userId) {
        return new NextResponse("Không có quyền gửi chiến dịch này", { status: 403 });
      }
      if (campaign.recipientSource === "DB_ALL") {
        return new NextResponse("Không có quyền gửi đến tất cả thành viên", { status: 403 });
      }
    }

    const result = await processCampaignBatch(campaignId, batchSize);

    if (result.notFound) {
      return new NextResponse("Campaign not found", { status: 404 });
    }
    if (!result.success) {
      return NextResponse.json(result, { status: 429 });
    }
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Batch send error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
