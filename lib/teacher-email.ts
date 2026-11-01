import prisma from '@/lib/prisma'

// Hạn mức email mặc định cho mỗi giảng viên / ngày (admin có thể đổi qua
// SystemConfig key "teacherEmailDailyLimit" — value là số hoặc { limit: số }).
export const DEFAULT_TEACHER_DAILY_EMAIL_LIMIT = 200

export async function getTeacherDailyEmailLimit(): Promise<number> {
    try {
        const cfg = await prisma.systemConfig.findUnique({
            where: { key: 'teacherEmailDailyLimit' },
        })
        const raw: any = cfg?.value as any
        const v = Number(raw?.limit ?? raw)
        if (Number.isFinite(v) && v > 0) return Math.floor(v)
    } catch {
        // Chưa có cấu hình — dùng mặc định
    }
    return DEFAULT_TEACHER_DAILY_EMAIL_LIMIT
}

/** Gmail gửi riêng đang hoạt động của giảng viên (ownerId = teacherId), nếu có. */
export async function getTeacherOwnSender(teacherId: number) {
    return prisma.emailSender.findFirst({
        where: { ownerId: teacherId, provider: 'gmail', isActive: true },
        orderBy: { id: 'asc' },
    })
}

/** Số email giảng viên đã gửi thành công hôm nay (qua mọi chiến dịch của mình). */
export async function countTeacherSentToday(teacherId: number): Promise<number> {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return prisma.emailCampaignLog.count({
        where: {
            status: 'SENT',
            sentAt: { gte: start },
            campaign: { createdBy: teacherId },
        },
    })
}

export async function getTeacherEmailStatus(teacherId: number) {
    const [sender, dailyLimit, sentToday] = await Promise.all([
        getTeacherOwnSender(teacherId),
        getTeacherDailyEmailLimit(),
        countTeacherSentToday(teacherId),
    ])
    return {
        sender,
        dailyLimit,
        sentToday,
        remaining: Math.max(0, dailyLimit - sentToday),
    }
}
