'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { getTeacherEmailStatus } from '@/lib/teacher-email'

async function requireTeacherOrAdmin() {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user?.id || (role !== 'TEACHER' && role !== 'ADMIN')) return null
    return { userId: Number(session.user.id), role: role as string }
}

/** Trạng thái hộp thư gửi riêng của người đang đăng nhập (cho trang Hộp thư của tôi). */
export async function getMyEmailStatusAction() {
    const me = await requireTeacherOrAdmin()
    if (!me) return { success: false as const, error: 'Unauthorized' }
    const st = await getTeacherEmailStatus(me.userId)
    return {
        success: true as const,
        sender: st.sender
            ? {
                  email: st.sender.email,
                  isActive: st.sender.isActive,
                  dailyLimit: st.sender.dailyLimit,
                  sentToday: st.sender.sentToday,
              }
            : null,
        dailyLimit: st.dailyLimit,
        sentToday: st.sentToday,
        remaining: st.remaining,
    }
}

/** Ngắt kết nối Gmail cá nhân: vô hiệu hóa hộp thư của chính mình và xóa refresh token đã lưu. */
export async function disconnectMyEmailSenderAction() {
    const me = await requireTeacherOrAdmin()
    if (!me) return { success: false as const, error: 'Unauthorized' }
    await prisma.emailSender.updateMany({
        where: { ownerId: me.userId, provider: 'gmail' },
        data: { isActive: false, refreshToken: null },
    })
    revalidatePath('/tools/email-mkt/mailbox')
    return { success: true as const }
}
