import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveRecipients } from "@/lib/email-campaign-runner";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();

  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "TEACHER") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = parseInt(session.user.id || "0");

  try {
    const data = await req.json();
    const { 
      title, 
      notificationType, 
      recipientSource, 
      recipientFilter, 
      recipientCsvData,
      subject, 
      htmlContent 
    } = data;

    // TEACHER không được dùng DB_ALL
    if (role === "TEACHER" && recipientSource === "DB_ALL") {
      return new NextResponse("Không có quyền gửi đến tất cả học viên", { status: 403 });
    }

    // Tạo chiến dịch DRAFT trước để lấy ID
    const campaign = await prisma.emailCampaign.create({
      data: {
        title,
        notificationType,
        recipientSource,
        recipientFilter,
        recipientCsvData,
        subject,
        htmlContent,
        createdBy: userId,
        status: "DRAFT",
      }
    });

    // Tính toán tổng số người nhận ngay lúc này
    const recipients = await resolveRecipients(campaign.id);
    
    const updatedCampaign = await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { totalRecipients: recipients.length }
    });

    return NextResponse.json(updatedCampaign);

  } catch (error: any) {
    console.error("Create campaign error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
