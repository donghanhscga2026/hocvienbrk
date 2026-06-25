import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();

  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const { recipients } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, error: "Danh sách người nhận trống" }, { status: 400 });
    }

    const userId = parseInt(session.user.id || "0");
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Định dạng lại danh sách người nhận theo chuẩn SELECTED_LIST
    const formattedRecipients = recipients.map((r: any) => ({
      email: (r.email || "").toLowerCase().trim(),
      name: r.name || "",
      userId: r.id,
    }));

    // Tạo chiến dịch email verifier đặc biệt
    const campaign = await prisma.emailCampaign.create({
      data: {
        title: `[Xác thực Email] Chiến dịch #${randomCode}`,
        status: "RUNNING",
        notificationType: "VERIFY_TEST",
        recipientSource: "SELECTED_LIST",
        recipientCsvData: JSON.stringify(formattedRecipients),
        subject: "[Xác thực kết nối] Kiểm tra kỹ thuật tự động #[NgauNhien]",
        htmlContent: "Xin chào [Tên], đây là email kiểm tra kết nối kỹ thuật tự động từ hệ thống Học Viện BRK.<br/><br/>Mã xác nhận kết nối của bạn: <b>#[NgauNhien]</b> (Mã học viên: #[MãHV]).<br/>Hệ thống đang kiểm tra xem email của bạn có nhận được thư hay không.<br/>Vui lòng bỏ qua email này.<br/><br/>Trân trọng,<br/>Đội ngũ kỹ thuật BRK.",
        totalRecipients: formattedRecipients.length,
        createdBy: userId,
      },
    });

    // Gán các senders khả dụng cho campaign này (mặc định lấy tất cả active senders)
    const activeSenders = await prisma.emailSender.findMany({
      where: { isActive: true },
    });

    if (activeSenders.length > 0) {
      await prisma.emailCampaignSender.createMany({
        data: activeSenders.map((s) => ({
          campaignId: campaign.id,
          senderId: s.id,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      totalRecipients: formattedRecipients.length,
      title: campaign.title,
    });
  } catch (error: any) {
    console.error("[EmailVerifier API] Start verification error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
