import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveRecipients, sendGmailFromSender } from "@/lib/email-campaign-runner";
import { spinContent } from "@/lib/email-spin";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const campaignId = parseInt(idStr);

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { offset = 0, batchSize = 20 } = await req.json();

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        senders: {
          include: { sender: true }
        }
      }
    });

    if (!campaign) {
      return new NextResponse("Campaign not found", { status: 404 });
    }

    // Lấy toàn bộ người nhận
    const allRecipients = await resolveRecipients(campaignId);
    const recipientsBatch = allRecipients.slice(offset, offset + batchSize);

    if (recipientsBatch.length === 0) {
      return NextResponse.json({ success: true, finished: true });
    }

    // Lấy danh sách Senders còn Quota
    const activeSenders = await prisma.emailSender.findMany({
      where: {
        isActive: true,
        sentToday: { lt: prisma.emailSender.fields.dailyLimit }
      }
    });

    if (activeSenders.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Không còn email sender nào đủ quota trong ngày hôm nay." 
      }, { status: 400 });
    }

    const results = {
      sent: 0,
      failed: 0,
    };

    // Gửi từng email trong batch
    for (let i = 0; i < recipientsBatch.length; i++) {
      const recipient = recipientsBatch[i];
      
      // Chọn sender theo Round-Robin đơn giản
      const sender = activeSenders[i % activeSenders.length];

      try {
        // Kiểm tra Blacklist
        const isBlacklisted = await prisma.emailBlacklist.findUnique({
          where: { email: recipient.email }
        });

        if (isBlacklisted) {
          await prisma.emailCampaignLog.create({
            data: {
              campaignId,
              toEmail: recipient.email,
              status: "SKIPPED",
              errorType: "BLACKLISTED",
            }
          });
          results.sent++; // Tính là đã xử lý
          continue;
        }

        // --- CÁ NHÂN HÓA ---
        // Tiêu đề
        let subject = spinContent(campaign.subject);
        subject = subject.replace(/\[Tên\]/g, recipient.name || "Học viên");
        subject = subject.replace(/\[MãHV\]/g, recipient.userId?.toString() || "");

        // Nội dung HTML
        let html = spinContent(campaign.htmlContent);
        html = html.replace(/\[Tên\]/g, recipient.name || "bạn");
        html = html.replace(/\[MãHV\]/g, recipient.userId?.toString() || "");
        
        // Thêm Footer Unsubscribe
        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
        html += `
          <br><br>
          <hr style="border:none;border-top:1px solid #eee">
          <p style="font-size:10px;color:#999;text-align:center">
            Bạn nhận email này vì là học viên Học Viện BRK. 
            <a href="${unsubscribeUrl}" style="color:#666">Hủy đăng ký nhận email</a>
          </p>
        `;
        
        // Gửi qua Gmail API
        await sendGmailFromSender(sender, recipient.email, subject, html);

        // Lưu Log Thành công
        await prisma.emailCampaignLog.create({
          data: {
            campaignId,
            senderId: sender.id,
            toEmail: recipient.email,
            status: "SENT",
          }
        });

        // Cập nhật Quota của sender
        await prisma.emailSender.update({
          where: { id: sender.id },
          data: { sentToday: { increment: 1 } }
        });

        results.sent++;
        
        // Delay 1000ms (1 giây) giữa mỗi email để Gmail không block
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`Gửi email thất bại tới ${recipient.email}:`, error);
        results.failed++;

        // Lưu Log Thất bại
        await prisma.emailCampaignLog.create({
          data: {
            campaignId,
            senderId: sender.id,
            toEmail: recipient.email,
            status: "FAILED",
            errorCode: error.message,
          }
        });
      }
    }

    // Cập nhật tiến độ Campaign
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount: { increment: results.sent },
        failedCount: { increment: results.failed },
        status: (offset + recipientsBatch.length >= allRecipients.length) ? "COMPLETED" : "RUNNING",
        startedAt: campaign.startedAt || new Date(),
        completedAt: (offset + recipientsBatch.length >= allRecipients.length) ? new Date() : null,
      }
    });

    return NextResponse.json({
      success: true,
      sentInBatch: results.sent,
      failedInBatch: results.failed,
      nextOffset: offset + batchSize,
      finished: offset + recipientsBatch.length >= allRecipients.length
    });

  } catch (error: any) {
    console.error("Batch send error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
