import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { getEffectiveDailyLimit } from "@/lib/email-config"
import { getBrevoTodayStats } from "@/lib/brevo"
import { tryDecrypt } from "@/lib/email-encryptor"

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
        senderName: true,
        apiKeyEncrypted: true
      }
    })

    const result = await Promise.all(senders.map(async (s) => {
      const effectiveLimit = getEffectiveDailyLimit({ createdAt: s.createdAt, dailyLimit: s.dailyLimit, warmupPhase: s.warmupPhase })
      const totalSent = s.senderLogs.reduce((sum, log) => sum + log.sentCount, 0)
      const totalFailed = s.senderLogs.reduce((sum, log) => sum + log.failedCount, 0)
      const totalBounced = s.senderLogs.reduce((sum, log) => sum + log.bounceCount, 0)
      const deliverability = totalSent > 0 ? ((totalSent - totalBounced) / totalSent * 100).toFixed(1) : 'N/A'

      let realSentToday: number | null = null
      let realRemaining: number | null = null
      if (s.provider === 'brevo' && s.apiKeyEncrypted) {
        try {
          const apiKey = tryDecrypt(s.apiKeyEncrypted)
          const stats = await getBrevoTodayStats(apiKey)
          realSentToday = stats.requests
          realRemaining = Math.max(0, (s.dailyLimit || 300) - stats.requests)
        } catch (err) {
          console.error(`[SenderStats] Lỗi lấy real quota cho ${s.label}:`, err)
        }
      }

      return {
        id: s.id, label: s.label, email: s.email, isActive: s.isActive,
        sentToday: s.sentToday, dailyLimit: s.dailyLimit,
        effectiveLimit, warmupPhase: s.warmupPhase,
        cooldownUntil: s.cooldownUntil, lastUsedAt: s.lastUsedAt,
        totalSent, totalFailed, totalBounced, deliverability,
        provider: s.provider,
        logs: s.senderLogs,
        realSentToday,
        realRemaining,
      }
    }))

    return NextResponse.json({ senders: result })
  } catch (error: any) {
    console.error("[SenderStats] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
