import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/email-encryptor";
import { validateApiKey } from "@/lib/brevo";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { label, apiKey } = await req.json();

    if (!label || !apiKey) {
      return NextResponse.json(
        { error: "Thiếu label hoặc apiKey" },
        { status: 400 },
      );
    }

    const account = await validateApiKey(apiKey);
    const email = account.email;
    const senderName = `${account.firstName} ${account.lastName}`.trim() || label;

    const encrypted = encrypt(apiKey);

    const sender = await prisma.emailSender.create({
      data: {
        label,
        email,
        senderName,
        provider: 'brevo',
        apiKeyEncrypted: encrypted,
        dailyLimit: 300,
        isMain: false,
      },
    });

    return NextResponse.json({
      success: true,
      sender: {
        id: sender.id,
        label: sender.label,
        email: sender.email,
        senderName: sender.senderName,
        provider: sender.provider,
      },
      account: {
        email: account.email,
        company: account.companyName,
        plan: account.plan,
      },
    });
  } catch (error: any) {
    console.error("[Brevo Sender] POST error:", error);
    return NextResponse.json(
      { error: error.message || "Không thể thêm Brevo sender" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const brevoSenders = await prisma.emailSender.findMany({
      where: { provider: 'brevo' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        email: true,
        senderName: true,
        provider: true,
        isActive: true,
        dailyLimit: true,
        sentToday: true,
        createdAt: true,
        senderLogs: {
          orderBy: { date: 'desc' },
          take: 10,
          select: { date: true, sentCount: true, failedCount: true, bounceCount: true },
        },
      },
    });

    return NextResponse.json({ senders: brevoSenders });
  } catch (error: any) {
    console.error("[Brevo Sender] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
