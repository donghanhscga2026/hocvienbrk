import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

interface BrevoWebhookPayload {
  event: string;
  email: string;
  "message-id"?: string;
  reason?: string;
  tag?: string;
  ts_epoch?: number;
  link?: string;
  user_agent?: string;
  contact_id?: number;
}

export async function POST(req: Request) {
  const body: BrevoWebhookPayload = await req.json();

  const { event, email, "message-id": messageId, reason, tag, link } = body;

  console.log(`[Brevo Webhook] Event: ${event} | Email: ${email} | MessageID: ${messageId}`);

  try {
    switch (event) {
      case 'hard_bounce': {
        await prisma.emailCampaignLog.updateMany({
          where: { toEmail: { equals: email, mode: 'insensitive' }, status: "SENT" },
          data: {
            status: "BOUNCED",
            errorType: "HARD_BOUNCE",
            errorCode: reason || `Hard bounce (Brevo webhook)`,
          },
        });

        await prisma.user.updateMany({
          where: { email: { equals: email, mode: 'insensitive' } },
          data: { emailVerified: null },
        });

        const existing = await prisma.emailBlacklist.findUnique({
          where: { email },
        });
        if (!existing) {
          await prisma.emailBlacklist.create({
            data: { email, reason: "HARD_BOUNCE" },
          });
        }
        break;
      }

      case 'soft_bounce': {
        await prisma.emailCampaignLog.updateMany({
          where: { toEmail: { equals: email, mode: 'insensitive' }, status: "SENT" },
          data: {
            status: "BOUNCED",
            errorType: "SOFT_BOUNCE",
            errorCode: reason || `Soft bounce (Brevo webhook)`,
          },
        });
        break;
      }

      case 'delivered': {
        await prisma.emailCampaignLog.updateMany({
          where: { toEmail: { equals: email, mode: 'insensitive' }, status: "SENT" },
          data: { errorCode: "DELIVERED" },
        });
        break;
      }

      case 'opened': {
        await prisma.emailCampaignLog.updateMany({
          where: { toEmail: { equals: email, mode: 'insensitive' } },
          data: { errorCode: "OPENED" },
        });
        break;
      }

      case 'click': {
        if (link) {
          await prisma.emailCampaignLog.updateMany({
            where: { toEmail: { equals: email, mode: 'insensitive' } },
            data: { errorCode: `CLICKED: ${link.substring(0, 100)}` },
          });
        }
        break;
      }

      case 'unsubscribed': {
        const existing = await prisma.emailBlacklist.findUnique({
          where: { email },
        });
        if (!existing) {
          await prisma.emailBlacklist.create({
            data: { email, reason: "Hủy đăng ký" },
          });
        }
        break;
      }

      case 'spam': {
        const existing = await prisma.emailBlacklist.findUnique({
          where: { email },
        });
        if (!existing) {
          await prisma.emailBlacklist.create({
            data: { email, reason: "SPAM" },
          });
        }
        break;
      }

      default:
        console.log(`[Brevo Webhook] Unknown event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`[Brevo Webhook] Error processing ${event}:`, error);
    return NextResponse.json({ received: true, error: error.message });
  }
}
