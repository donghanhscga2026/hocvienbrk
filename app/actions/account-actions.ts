'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { saveBase64Image } from "@/lib/image-utils"
import { normalizePhone } from "@/lib/phone-utils"

export async function getUserWithAccounts() {
    const session = await auth()
    if (!session?.user?.id) return null

    const userId = parseInt(session.user.id as string)
    
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            accounts: {
                select: {
                    provider: true,
                    providerAccountId: true,
                }
            }
        }
    })

    return user
}

export async function updateUserProfile(data: {
    name?: string
    phone?: string
    image?: string
}) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Unauthorized" }

    const userId = parseInt(session.user.id as string)

    // Bảo vệ tài khoản test #2689 khỏi bị sửa đổi profile bởi người khác
    if (userId === 2689 && session.user.role !== 'ADMIN') {
        return { success: false, message: "Không thể cập nhật thông tin của tài khoản test hệ thống này." }
    }

    try {
        let finalImageUrl = data.image;
        if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
            finalImageUrl = await saveBase64Image(finalImageUrl);
        }

        const normalizedPhone = data.phone ? normalizePhone(data.phone) : data.phone;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                phone: normalizedPhone,
                image: finalImageUrl,
            }
        })

        revalidatePath('/account-settings')

        try {
            const { sendTelegram } = await import("@/lib/notifications");
            const changed: string[] = [];
            if (data.name) changed.push(`tên: "${user.name}"`);
            if (data.phone) changed.push(`SĐT: ${user.phone}`);
            if (data.image) changed.push(`ảnh đại diện`);
            if (changed.length > 0) {
                const msg = `✏️ <b>THAY ĐỔI THÔNG TIN</b>\n👤 Học viên: <b>${user.name}</b> (#${user.id})\n📝 Thay đổi: ${changed.join(', ')}`;
                await sendTelegram(msg, 'CHANGE');

                const { logActivity } = await import('@/lib/activity-logger')
                await logActivity({
                    userId: user.id,
                    action: 'PROFILE_UPDATE',
                    detail: `Cập nhật: ${changed.join(', ')}`,
                    metadata: { changedFields: changed }
                })
            }
        } catch (e) {
            console.error("Telegram notification error:", e);
        }

        return { success: true, message: "Cập nhật thành công" }
    } catch (error) {
        console.error("Update profile error:", error)
        return { success: false, message: "Cập nhật thất bại" }
    }
}

export async function changePassword(currentPassword: string, newPassword: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Unauthorized" }

    const userId = parseInt(session.user.id as string)

    // Bảo vệ tài khoản test #2689 khỏi bị đổi mật khẩu bởi người khác
    if (userId === 2689 && session.user.role !== 'ADMIN') {
        return { success: false, message: "Không thể đổi mật khẩu của tài khoản test hệ thống này." }
    }

    const bcrypt = await import('bcryptjs')

    const user = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!user?.password) {
        return { success: false, message: "Tài khoản này không sử dụng mật khẩu" }
    }

    const passwordsMatch = await bcrypt.compare(currentPassword, user.password)
    if (!passwordsMatch) {
        return { success: false, message: "Mật khẩu hiện tại không đúng" }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    })

    const { logActivity } = await import('@/lib/activity-logger')
    await logActivity({
        userId,
        action: 'PASSWORD_CHANGE',
        detail: 'Đổi mật khẩu từ cài đặt tài khoản',
        metadata: { email: user?.email || null }
    })

    return { success: true, message: "Đổi mật khẩu thành công" }
}

// ==========================================
// USER BANK ACCOUNT CRUD
// ==========================================
export async function getUserBankAccountsAction() {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    try {
        const accounts = await prisma.userBankAccount.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        })
        return { success: true, accounts }
    } catch (error: any) {
        console.error("Get bank accounts error:", error)
        return { success: false, error: error.message }
    }
}

export async function createUserBankAccountAction(data: {
    accountType?: string
    accountHolder: string
    accountNumber: string
    bankName?: string
    qrCodeUrl?: string
    isDefault?: boolean
}) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    try {
        if (data.isDefault) {
            await prisma.userBankAccount.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            })
        }

        const account = await prisma.userBankAccount.create({
            data: {
                userId,
                accountType: (data.accountType as any) || 'BANK',
                accountHolder: data.accountHolder.trim(),
                accountNumber: data.accountNumber.trim(),
                bankName: data.bankName || null,
                qrCodeUrl: data.qrCodeUrl || null,
                isDefault: data.isDefault || false,
            },
        })
        revalidatePath('/account-settings')
        return { success: true, account }
    } catch (error: any) {
        console.error("Create bank account error:", error)
        return { success: false, error: error.message }
    }
}

export async function updateUserBankAccountAction(id: number, data: {
    accountType?: string
    accountHolder?: string
    accountNumber?: string
    bankName?: string
    qrCodeUrl?: string
    isDefault?: boolean
}) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    try {
        const existing = await prisma.userBankAccount.findFirst({ where: { id, userId } })
        if (!existing) return { success: false, error: "Không tìm thấy tài khoản" }

        if (data.isDefault) {
            await prisma.userBankAccount.updateMany({
                where: { userId, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            })
        }

        const updateData: any = {}
        if (data.accountType) updateData.accountType = data.accountType
        if (data.accountHolder?.trim()) updateData.accountHolder = data.accountHolder.trim()
        if (data.accountNumber?.trim()) updateData.accountNumber = data.accountNumber.trim()
        if (data.bankName !== undefined) updateData.bankName = data.bankName
        if (data.qrCodeUrl !== undefined) updateData.qrCodeUrl = data.qrCodeUrl
        if (data.isDefault !== undefined) updateData.isDefault = data.isDefault

        const account = await prisma.userBankAccount.update({ where: { id }, data: updateData })
        revalidatePath('/account-settings')
        return { success: true, account }
    } catch (error: any) {
        console.error("Update bank account error:", error)
        return { success: false, error: error.message }
    }
}

export async function deleteUserBankAccountAction(id: number) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    try {
        const existing = await prisma.userBankAccount.findFirst({ where: { id, userId } })
        if (!existing) return { success: false, error: "Không tìm thấy tài khoản" }

        await prisma.userBankAccount.delete({ where: { id } })
        revalidatePath('/account-settings')
        return { success: true }
    } catch (error: any) {
        console.error("Delete bank account error:", error)
        return { success: false, error: error.message }
    }
}
