import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { sendGmail } from "@/lib/notifications"

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ error: "Email là bắt buộc" }, { status: 400 })
        }

        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
            return NextResponse.json({ error: "Không tìm thấy tài khoản với email này" }, { status: 404 })
        }

        const otp = generateOTP()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

        await prisma.passwordReset.deleteMany({ where: { userId: user.id } })

        await prisma.passwordReset.create({
            data: {
                userId: user.id,
                token: otp,
                expiresAt
            }
        })

        const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f97316;">HỌC VIỆN BRK - QUÊN MẬT KHẨU</h2>
                <p>Xin chào <b>${user.name}</b>,</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                <div style="background: #1f2937; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
                    <p style="color: #9ca3af; margin: 0 0 10px 0;">Mã xác minh của bạn:</p>
                    <h1 style="color: #f97316; font-size: 32px; margin: 0; letter-spacing: 8px;">${otp}</h1>
                </div>
                <p style="color: #ef4444;"><b>Lưu ý:</b> Mã này có hiệu lực trong <b>10 phút</b>.</p>
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            </div>
        `

        await sendGmail(email, "Mã xác minh đặt lại mật khẩu - Học Viện BRK", htmlBody)

        return NextResponse.json({ 
            success: true, 
            message: "Mã xác minh đã được gửi đến email của bạn",
            email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        })
    } catch (error: any) {
        console.error("Forgot password error:", error)
        return NextResponse.json({ error: "Lỗi khi xử lý yêu cầu" }, { status: 500 })
    }
}
