'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

// ==========================================
// VOUCHER → QUYỀN LỢI KHÓA HỌC (bundle/quà tặng)
// Vd: mua khóa A → kích hoạt → tự động kích hoạt các khóa B, C, D
// theo quyền lợi FREE_100 (miễn phí) hoặc PARTIAL (trả thêm extraAmount).
// ==========================================

export async function getVoucherBenefits(voucherId: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Unauthorized" }
        const benefits = await prisma.voucherCourseBenefit.findMany({
            where: { voucherId },
            include: { course: { select: { id: true, id_khoa: true, name_lop: true, phi_coc: true } } },
            orderBy: { courseId: 'asc' }
        })
        return { success: true, benefits }
    } catch (error: any) {
        console.error('getVoucherBenefits error:', error)
        return { success: false, error: error.message }
    }
}

export async function setVoucherBenefits(data: {
    voucherId: number
    benefits: { courseId: number; benefitType: 'FREE_100' | 'PARTIAL'; extraAmount?: number }[]
}) {
    try {
        const session = await auth()
        if (session?.user?.role !== Role.ADMIN) {
            return { success: false, error: "Unauthorized: Admin only" }
        }

        const voucher = await prisma.voucher.findUnique({ where: { id: data.voucherId } })
        if (!voucher) return { success: false, error: "Voucher not found" }

        await prisma.$transaction([
            prisma.voucherCourseBenefit.deleteMany({ where: { voucherId: data.voucherId } }),
            ...(data.benefits.length > 0 ? [prisma.voucherCourseBenefit.createMany({
                data: data.benefits.map(b => ({
                    voucherId: data.voucherId,
                    courseId: b.courseId,
                    benefitType: b.benefitType,
                    extraAmount: b.benefitType === 'PARTIAL' ? Math.max(0, Math.floor(b.extraAmount || 0)) : 0
                }))
            })] : [])
        ])

        revalidatePath('/api/vouchers')
        return { success: true }
    } catch (error: any) {
        console.error('setVoucherBenefits error:', error)
        return { success: false, error: error.message }
    }
}

// ==========================================
// ADMIN THƯỞNG MBV TAY (GĐ3 — vòng quay MBV)
// Mỗi lần thưởng là 1 MBV_CREDIT ghi rõ nguồn trong BrkTransaction.
// ==========================================

export async function awardMbvManuallyAction(data: {
    userIdentifier: string  // id | email | phone
    amount: number
    reason: string
}) {
    try {
        const session = await auth()
        if (session?.user?.role !== Role.ADMIN) {
            return { success: false, error: "Unauthorized: Admin only" }
        }

        const amount = Math.floor(Number(data.amount) || 0)
        if (amount <= 0) return { success: false, error: "Số điểm MBV phải lớn hơn 0" }
        if (!data.reason?.trim()) return { success: false, error: "Vui lòng nhập lý do thưởng" }

        const q = data.userIdentifier.trim()
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(!isNaN(Number(q)) ? [{ id: Number(q) } as any] : []),
                    { email: q },
                    { phone: q }
                ]
            },
            select: { id: true, name: true, email: true, phone: true }
        })
        if (!user) return { success: false, error: `Không tìm thấy user "${q}"` }

        const adminId = Number(session.user.id)
        const { creditMbvWallet } = await import('@/lib/brk/wallet-service')
        await creditMbvWallet(
            user.id,
            amount,
            `Admin thưởng MBV: ${data.reason.trim()} (bởi admin #${adminId})`,
            `admin_award_${Date.now()}`,
            undefined,
            adminId
        )

        return { success: true, user: { id: user.id, name: user.name, email: user.email }, amount }
    } catch (error: any) {
        console.error('awardMbvManuallyAction error:', error)
        return { success: false, error: error.message }
    }
}

