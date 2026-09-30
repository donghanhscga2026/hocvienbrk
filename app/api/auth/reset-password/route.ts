import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validatePasswordStrength } from "@/lib/password-policy"
import { resolveUserForPasswordReset, rateLimitKeyFor } from "@/lib/password-reset-lookup"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: Request) {
    try {
        const { email, studentId, otp, newPassword } = await request.json()

        const ip = getClientIp(request)
        const byIdentifier = await checkRateLimit(
            `reset-password:${rateLimitKeyFor({ studentId, email })}`,
            { max: 5, windowMs: 15 * 60 * 1000 }
        )
        const byIp = await checkRateLimit(`reset-password:ip:${ip}`, { max: 20, windowMs: 15 * 60 * 1000 })
        if (!byIdentifier.allowed || !byIp.allowed) {
            return NextResponse.json({ error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." }, { status: 429 })
        }

        if ((!email && !studentId) || !otp || !newPassword) {
            return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 })
        }

        const passwordError = validatePasswordStrength(newPassword)
        if (passwordError) {
            return NextResponse.json({ error: passwordError }, { status: 400 })
        }

        const user = await resolveUserForPasswordReset({ studentId, email })
        if (!user) {
            // Keep recovery responses generic to avoid account enumeration.
            return NextResponse.json({ error: "Mã xác minh không hợp lệ hoặc đã hết hạn" }, { status: 400 })
        }

        const resetRecord = await prisma.passwordReset.findFirst({
            where: {
                userId: user.id,
                token: otp,
                expiresAt: { gt: new Date() }
            }
        })

        if (!resetRecord) {
            return NextResponse.json({ error: "Mã xác minh không hợp lệ hoặc đã hết hạn" }, { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12)

        await prisma.user.update({
            where: { id: user.id },
            data: { 
                password: hashedPassword,
                passwordChanged: true // Đánh dấu đã đổi mật khẩu
            }
        })

        await prisma.passwordReset.deleteMany({ where: { userId: user.id } })

        // Gửi thông báo Telegram
        try {
            const { sendTelegram } = await import("@/lib/notifications")
            const msg = `🔐 <b>ĐẶT LẠI MẬT KHẨU</b>\n👤 Thành viên: <b>${user.name}</b> (#${user.id})\n📧 Email: ${user.email}\n\n✅ Đã đặt lại mật khẩu thành công qua chức năng Quên mật khẩu.`
            await sendTelegram(msg, 'CHANGE')

            const { logActivity } = await import("@/lib/activity-logger");
            await logActivity({
                userId: user.id,
                action: 'PASSWORD_RESET',
                detail: 'Đặt lại mật khẩu qua Quên mật khẩu',
                metadata: { 
                    email: user.email || null,
                }
            })
        } catch (error) {
            console.error("Telegram notification error:", error)
        }

        return NextResponse.json({ success: true, message: "Đặt lại mật khẩu thành công" })
    } catch (error: any) {
        console.error("Reset password error:", error)
        return NextResponse.json({ error: "Lỗi khi đặt lại mật khẩu" }, { status: 500 })
    }
}
