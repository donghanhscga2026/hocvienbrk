import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
    try {
        const { email, otp, newPassword } = await request.json()

        if (!email || !otp || !newPassword) {
            return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 })
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 })
        }

        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
            return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 })
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
            const msg = `🔐 <b>ĐẶT LẠI MẬT KHẨU</b>\n👤 Học viên: <b>${user.name}</b> (#${user.id})\n📧 Email: ${user.email}\n\n✅ Đã đặt lại mật khẩu thành công qua chức năng Quên mật khẩu.`
            await sendTelegram(msg, 'LESSON')
        } catch (error) {
            console.error("Telegram notification error:", error)
        }

        return NextResponse.json({ success: true, message: "Đặt lại mật khẩu thành công" })
    } catch (error: any) {
        console.error("Reset password error:", error)
        return NextResponse.json({ error: "Lỗi khi đặt lại mật khẩu" }, { status: 500 })
    }
}
