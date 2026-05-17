import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { exportCampaignToSheet } from "@/lib/email-campaign-export";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      select: { title: true, id: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Không tìm thấy chiến dịch" }, { status: 404 });
    }

    const { statusFilter } = await req.json().catch(() => ({}));

    const result = await exportCampaignToSheet(campaign.id, campaign.title, statusFilter);

    if (!result) {
      return NextResponse.json({ error: "Không có log nào để export" }, { status: 400 });
    }

    if (result.sheetUrl) {
      return NextResponse.json({ success: true, sheetUrl: result.sheetUrl });
    }

    // Fallback: không tạo được Sheet → trả về CSV để user copy thủ công
    return NextResponse.json({
      success: false,
      error: "Không thể tạo Google Sheets. Chi tiết lỗi: " + (result.sheetError || "Không rõ"),
      csvContent: result.csvContent,
      fileName: result.fileName,
      totalRows: result.totalRows,
    });

  } catch (error: any) {
    console.error("[ExportSheet] Lỗi:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
