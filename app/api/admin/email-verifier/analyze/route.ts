import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const campaignIdStr = searchParams.get("campaignId");

  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  if (!campaignIdStr) {
    return NextResponse.json({ success: false, error: "Thiếu campaignId" }, { status: 400 });
  }

  const campaignId = parseInt(campaignIdStr);

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        logs: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: "Không tìm thấy chiến dịch" }, { status: 404 });
    }

    // Lấy toàn bộ blacklist để check chéo
    const blacklist = await prisma.emailBlacklist.findMany({
      select: { email: true, reason: true },
    });
    const blacklistEmails = new Set(blacklist.map((b) => b.email.toLowerCase()));

    // Lọc và phân loại
    const activeEmails: any[] = [];
    const bouncedEmails: any[] = [];
    const failedEmails: any[] = [];
    const skippedEmails: any[] = [];

    // Danh sách recipients ban đầu từ campaign setup
    const initialRecipients: any[] = JSON.parse(campaign.recipientCsvData || "[]");
    const recipientMap = new Map(initialRecipients.map((r) => [r.email.toLowerCase(), r]));

    // Quét qua logs của campaign
    for (const log of campaign.logs) {
      const emailLower = log.toEmail.toLowerCase();
      const recipientInfo = recipientMap.get(emailLower) || { name: "", userId: null };

      const item = {
        userId: recipientInfo.userId,
        name: recipientInfo.name || "Học viên",
        email: log.toEmail,
        sentAt: log.sentAt,
        status: log.status,
        errorCode: log.errorCode,
        errorType: log.errorType,
      };

      if (log.status === "BOUNCED" || blacklistEmails.has(emailLower)) {
        bouncedEmails.push(item);
      } else if (log.status === "FAILED") {
        failedEmails.push(item);
      } else if (log.status === "SKIPPED") {
        skippedEmails.push(item);
      } else if (log.status === "SENT") {
        activeEmails.push(item);
      }
    }

    // Đếm số lượng
    const stats = {
      total: campaign.totalRecipients,
      sent: campaign.sentCount,
      active: activeEmails.length,
      bounced: bouncedEmails.length,
      failed: failedEmails.length,
      skipped: skippedEmails.length,
    };

    return NextResponse.json({
      success: true,
      stats,
      active: activeEmails,
      bounced: bouncedEmails,
      failed: failedEmails,
      skipped: skippedEmails,
    });
  } catch (error: any) {
    console.error("[EmailVerifier API] Analyze campaign error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
