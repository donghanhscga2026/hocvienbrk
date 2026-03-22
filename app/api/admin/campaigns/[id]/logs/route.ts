import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
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
    const logs = await prisma.emailCampaignLog.findMany({
      where: { campaignId: id },
      orderBy: { sentAt: "desc" },
    });

    const allSenders = await prisma.emailSender.findMany({
      select: { id: true, email: true, label: true },
      orderBy: { id: 'asc' }
    });

    const logsBySender: Record<number, typeof logs> = {};
    const logsNoSender: typeof logs = [];

    for (const log of logs) {
      if (log.senderId && allSenders.find(s => s.id === log.senderId)) {
        if (!logsBySender[log.senderId]) {
          logsBySender[log.senderId] = [];
        }
        logsBySender[log.senderId].push(log);
      } else {
        logsNoSender.push(log);
      }
    }

    const senderStats = allSenders.map(sender => ({
      ...sender,
      total: logsBySender[sender.id]?.length || 0,
      sent: logsBySender[sender.id]?.filter(l => l.status === 'SENT').length || 0,
      bounced: logsBySender[sender.id]?.filter(l => l.status === 'BOUNCED').length || 0,
      failed: logsBySender[sender.id]?.filter(l => l.status === 'FAILED').length || 0,
    }));

    return NextResponse.json({
      logsBySender,
      senders: allSenders,
      senderStats,
      logsNoSender,
      summary: {
        total: logs.length,
        sent: logs.filter(l => l.status === 'SENT').length,
        bounced: logs.filter(l => l.status === 'BOUNCED').length,
        failed: logs.filter(l => l.status === 'FAILED').length,
        skipped: logs.filter(l => l.status === 'SKIPPED').length,
      }
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
