import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validatePasswordStrength } from "@/lib/password-policy"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: Request) {
    try {
        const { token, newPassword } = await request.json()

        if (!token || !newPassword) {
            return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 })
        }

        const ip = getClientIp(request)
        const byIp = checkRateLimit(`reset-password-link:ip:${ip}`, { max: 10, windowMs: 15 * 60 * 1000 })
        if (!byIp.allowed) {
            return NextResponse.json({ error: "Bạn thử quá nhiều lần. Vui lòng thử lại sau." }, { status: 429 })
        }

        const passwordError = validatePasswordStrength(newPassword)
        if (passwordError) {
            return NextResponse.json({ error: passwordError }, { status: 400 })
        }

        const resetRecord = await prisma.passwordReset.findFirst({
            where: { token, expiresAt: { gt: new Date() } }
        })
        if (!resetRecord) {
            return NextResponse.json({ error: "Link không hợp lệ hoặc đã hết hạn" }, { status: 400 })
        }

        const user = await prisma.user.findUnique({ where: { id: resetRecord.userId } })
        if (!user) {
            return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12)

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordChanged: true
            }
        })

        await prisma.passwordReset.deleteMany({ where: { userId: user.id } })

        try {
            const { sendTelegram } = await import("@/lib/notifications")
            const msg = `🔐 <b>ĐẶT LẠI MẬT KHẨU QUA LINK ADMIN</b>\n👤 Thành viên: <b>${user.name}</b> (#${user.id})\n📧 Email: ${user.email}\n🔑 Mật khẩu mới: <code>${newPassword}</code>\n\n✅ Học viên đã tự đặt mật khẩu mới qua link do Admin gửi.`
            await sendTelegram(msg, 'CHANGE')

            const { logActivity } = await import("@/lib/activity-logger")
            await logActivity({
                userId: user.id,
                action: 'PASSWORD_RESET',
                detail: 'Đặt lại mật khẩu qua link do Admin gửi',
                metadata: {
                    email: user.email || null,
                    newPassword: newPassword
                }
            })
        } catch (error) {
            console.error("Telegram notification error:", error)
        }

        return NextResponse.json({ success: true, message: "Đặt lại mật khẩu thành công" })
    } catch (error: any) {
        console.error("Reset password link error:", error)
        return NextResponse.json({ error: "Lỗi khi đặt lại mật khẩu" }, { status: 500 })
    }
}
