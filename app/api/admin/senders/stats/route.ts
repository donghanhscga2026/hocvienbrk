import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { getEffectiveDailyLimit } from "@/lib/email-config"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const senders = await prisma.emailSender.findMany({
      orderBy: { label: 'asc' },
      select: {
        id: true, label: true, email: true, isActive: true,
        sentToday: true, dailyLimit: true, createdAt: true,
        warmupPhase: true, cooldownUntil: true, lastUsedAt: true,
        senderLogs: {
          orderBy: { date: 'desc' },
          take: 30,
          select: { date: true, sentCount: true, failedCount: true, bounceCount: true, cooldownCount: true, cooldownMinutes: true }
        },
        provider: true,
        senderName: true
      }
    })

    const result = senders.map(s => {
      const effectiveLimit = getEffectiveDailyLimit({ createdAt: s.createdAt, dailyLimit: s.dailyLimit, warmupPhase: s.warmupPhase })
      const totalSent = s.senderLogs.reduce((sum, log) => sum + log.sentCount, 0)
      const totalFailed = s.senderLogs.reduce((sum, log) => sum + log.failedCount, 0)
      const totalBounced = s.senderLogs.reduce((sum, log) => sum + log.bounceCount, 0)
      const deliverability = totalSent > 0 ? ((totalSent - totalBounced) / totalSent * 100).toFixed(1) : 'N/A'
      return {
        id: s.id, label: s.label, email: s.email, isActive: s.isActive,
        sentToday: s.sentToday, dailyLimit: s.dailyLimit,
        effectiveLimit, warmupPhase: s.warmupPhase,
        cooldownUntil: s.cooldownUntil, lastUsedAt: s.lastUsedAt,
        totalSent, totalFailed, totalBounced, deliverability,
        logs: s.senderLogs
      }
    })

    return NextResponse.json({ senders: result })
  } catch (error: any) {
    console.error("[SenderStats] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
