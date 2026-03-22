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
        // GHI CHÚ: Subject và Content cần được xử lý spin và replace trước khi gửi qua Gmail API
        let subject = spinContent(campaign.subject || "").trim();
        subject = subject.replace(/\[Tên\]/g, recipient.name || "Học viên");
        subject = subject.replace(/\[MãHV\]/g, recipient.userId?.toString() || "");

        // Nội dung HTML
        let rawHtml = spinContent(campaign.htmlContent || "").trim();
        rawHtml = rawHtml.replace(/\[Tên\]/g, recipient.name || "bạn");
        rawHtml = rawHtml.replace(/\[MãHV\]/g, recipient.userId?.toString() || "");
        
        // Tự động chuyển xuống dòng nếu người dùng không dùng thẻ HTML
        if (!rawHtml.includes('<p>') && !rawHtml.includes('<br')) {
          rawHtml = rawHtml.replace(/\n/g, '<br/>');
        }

        // --- WRAP TRONG TEMPLATE CHUYÊN NGHIỆP ---
        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://giautoandien.io.vn'}/api/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
        
        const finalHtml = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #eeeeee; border-radius: 20px; overflow: hidden;">
            <div style="background-color: #000000; padding: 30px; text-align: center;">
              <a href="https://giautoandien.io.vn" style="text-decoration: none;">
                <img src="https://giautoandien.io.vn/logobrk-50px.png" alt="HỌC VIỆN BRK" style="height: 40px; display: block; margin: 0 auto; color: #FACC15; font-weight: bold; font-size: 20px; border: 0;">
              </a>
              <div style="color: #FACC15; font-size: 10px; font-weight: bold; margin-top: 5px; letter-spacing: 2px;">THE NEW GENERATION</div>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
              <div style="font-size: 16px; color: #333333;">
                ${rawHtml}
              </div>
            </div>
            <div style="padding: 30px; background-color: #f9f9f9; border-top: 1px solid #eeeeee; text-align: center;">
              <p style="font-size: 11px; color: #999999; margin: 0; line-height: 1.8;">
                Bạn nhận được thông báo này vì là thành viên của <b>Học Viện BRK</b>.<br>
                Nếu không muốn nhận những email này, bạn có thể <a href="${unsubscribeUrl}" style="color: #000000; text-decoration: underline;">Hủy đăng ký tại đây</a>.
              </p>
            </div>
          </div>
        `;
        
        // Gửi qua Gmail API
        await sendGmailFromSender(sender, recipient.email, subject, finalHtml);

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
