import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { validateApiKey } from "@/lib/brevo";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { label, envVarName } = await req.json();

    if (!label || !envVarName) {
      return NextResponse.json(
        { error: "Thiếu label hoặc tên biến môi trường" },
        { status: 400 },
      );
    }

    const apiKey = process.env[envVarName];
    if (!apiKey) {
      return NextResponse.json(
        { error: `Biến môi trường "${envVarName}" chưa được cấu hình trên server` },
        { status: 400 },
      );
    }

    const account = await validateApiKey(apiKey);
    const email = account.email;
    const senderName = `${account.firstName} ${account.lastName}`.trim() || label;

    const sender = await prisma.emailSender.create({
      data: {
        label,
        email,
        senderName,
        provider: 'brevo',
        apiKeyEnvVar: envVarName,
        apiKeyEncrypted: null,
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
        apiKeyEnvVar: sender.apiKeyEnvVar,
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
        apiKeyEnvVar: true,
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
