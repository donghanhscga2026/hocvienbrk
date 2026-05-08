import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { 
  resolveRecipients, 
  sendGmailFromSender, 
  getRandomMessageFooter, 
  injectFooter,
  getAvailableSender,
  updateSenderCooldown,
  incrementSenderSentCount,
  checkBatchStatus,
  performCooldown
} from "@/lib/email-campaign-runner";
import { spinContent } from "@/lib/email-spin";
import { getEmailConfig, randomBetween } from "@/lib/email-config";
import { sendEmailCampaignNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";

let campaignStats: Map<number, { total: number; sent: number; success: number; failed: number; emailsInBatch: number }> = new Map();

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
    const config = await getEmailConfig();

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

    const allRecipients = await resolveRecipients(campaignId);
    const recipientsBatch = allRecipients.slice(offset, offset + batchSize);

    if (recipientsBatch.length === 0) {
      return NextResponse.json({ success: true, finished: true });
    }

    if (!campaignStats.has(campaignId)) {
      campaignStats.set(campaignId, { total: allRecipients.length, sent: 0, success: 0, failed: 0, emailsInBatch: 0 });
      
      if (config.enableTelegramAlert) {
        await sendEmailCampaignNotification({
          event: 'START',
          campaignTitle: campaign.title,
          total: allRecipients.length,
          sent: 0,
          success: 0,
          failed: 0
        });
      }
    }

    const stats = campaignStats.get(campaignId)!;

    const results = {
      sent: 0,
      failed: 0,
    };

    for (let i = 0; i < recipientsBatch.length; i++) {
      const recipient = recipientsBatch[i];

      const sender = await getAvailableSender(campaignId);

      if (!sender) {
        console.log("[EmailCampaign] Không có sender khả dụng (hết quota hoặc đang cooldown)");
        
        if (config.enableTelegramAlert) {
          await sendEmailCampaignNotification({
            event: 'ERROR',
            campaignTitle: campaign.title,
            total: allRecipients.length,
            sent: stats.sent,
            success: stats.success,
            failed: stats.failed,
            error: 'Không có sender khả dụng'
          });
        }

        return NextResponse.json({ 
          success: false, 
          error: "Tất cả email sender đã hết quota hoặc đang trong thời gian chờ.",
          needsCooldown: true
        }, { status: 429 });
      }

      try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!recipient.email || !emailRegex.test(recipient.email)) {
          await prisma.emailCampaignLog.create({
            data: {
              campaignId,
              toEmail: recipient.email || "N/A",
              status: "FAILED",
              errorType: "INVALID_FORMAT",
              errorCode: "Định dạng email không hợp lệ",
            }
          });
          results.failed++;
          stats.failed++;
          continue;
        }

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
          stats.sent++;
          results.sent++;
          continue;
        }

        let subject = spinContent(campaign.subject || "").trim();
        subject = subject.replace(/\[Tên\]/g, recipient.name || "Học viên");
        subject = subject.replace(/\[MãHV\]/g, recipient.userId?.toString() || "");

        let rawHtml = spinContent(campaign.htmlContent || "").trim();
        rawHtml = rawHtml.replace(/\[Tên\]/g, recipient.name || "bạn");
        rawHtml = rawHtml.replace(/\[MãHV\]/g, recipient.userId?.toString() || "");
        
        if (!rawHtml.includes('<p>') && !rawHtml.includes('<br')) {
          rawHtml = rawHtml.replace(/\n/g, '<br/>');
        }

        if (config.enableRandomMessageFooter) {
          const footer = await getRandomMessageFooter();
          rawHtml = injectFooter(rawHtml, footer);
        }

        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://giautoandien.io.vn'}/api/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
        
        const finalHtml = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #eeeeee; border-radius: 20px; overflow: hidden;">
            <div style="background-color: #000000; padding: 30px; text-align: center;">
              <a href="https://giautoandien.io.vn" style="text-decoration: none;">
                <img src="https://giautoandien.io.vn/logobrk-50px.png" alt="HỌC VIỆN BRK" style="height: 40px; display: block; margin: 0 auto; color: #FACC15; font-weight: bold; font-size: 20px; border: 0;">
              </a>
              <div style="color: #FACC15; font-size: 10px; font-weight: bold; margin-top: 5px; letter-spacing: 2px;">NGÂN HÀNG PHƯỚC BÁU</div>
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
        
        await sendGmailFromSender(sender, recipient.email, subject, finalHtml);

        await prisma.emailCampaignLog.create({
          data: {
            campaignId,
            senderId: sender.id,
            toEmail: recipient.email,
            status: "SENT",
          }
        });

        await incrementSenderSentCount(sender.id);
        stats.sent++;
        stats.success++;
        stats.emailsInBatch++;
        results.sent++;

        const batchStatus = await checkBatchStatus(sender.id, stats.emailsInBatch);

        if (batchStatus.shouldPause) {
          console.log(`[EmailCampaign] Đã gửi ${stats.emailsInBatch} emails. Bắt đầu pause ${batchStatus.pauseDuration} phút.`);
          
          stats.emailsInBatch = 0;

          await performCooldown(
            campaign.title,
            sender.id,
            stats.sent,
            allRecipients.length,
            stats.success,
            stats.failed,
            batchStatus.pauseDuration
          );

          if (config.enableTelegramAlert) {
            await sendEmailCampaignNotification({
              event: 'RESUME',
              campaignTitle: campaign.title,
              total: allRecipients.length,
              sent: stats.sent,
              success: stats.success,
              failed: stats.failed
            });
          }
        } else {
          const delay = randomBetween(config.interEmailDelayMin, config.interEmailDelayMax);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }

      } catch (error: any) {
        console.error(`Gửi email thất bại tới ${recipient.email}:`, error);
        results.failed++;
        stats.failed++;

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

    if (offset + recipientsBatch.length >= allRecipients.length) {
      campaignStats.delete(campaignId);

      if (config.enableTelegramAlert) {
        await sendEmailCampaignNotification({
          event: 'COMPLETE',
          campaignTitle: campaign.title,
          total: allRecipients.length,
          sent: allRecipients.length,
          success: stats.success,
          failed: stats.failed
        });
      }
    }

    return NextResponse.json({
      success: true,
      sentInBatch: results.sent,
      failedInBatch: results.failed,
      nextOffset: offset + batchSize,
      finished: offset + recipientsBatch.length >= allRecipients.length,
      stats: {
        totalSent: stats.sent,
        totalSuccess: stats.success,
        totalFailed: stats.failed
      }
    });

  } catch (error: any) {
    console.error("Batch send error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
