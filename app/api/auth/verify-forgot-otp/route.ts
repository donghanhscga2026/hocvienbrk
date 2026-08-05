import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: Request) {
    try {
        const { email, otp } = await request.json()

        if (!email || !otp) {
            return NextResponse.json({ error: "Thiếu thông tin email hoặc mã OTP" }, { status: 400 })
        }

        // OTP chỉ có 6 số — bắt buộc giới hạn số lần thử để chống dò brute-force
        const ip = getClientIp(request)
        const byEmail = checkRateLimit(`verify-forgot-otp:email:${email}`, { max: 8, windowMs: 15 * 60 * 1000 })
        const byIp = checkRateLimit(`verify-forgot-otp:ip:${ip}`, { max: 30, windowMs: 15 * 60 * 1000 })
        if (!byEmail.allowed || !byIp.allowed) {
            return NextResponse.json({ error: "Bạn thử sai quá nhiều lần. Vui lòng thử lại sau ít phút." }, { status: 429 })
        }

        const normalizedEmail = email.toLowerCase().trim()
        const user = await prisma.user.findFirst({
            where: {
                email: { equals: normalizedEmail, mode: 'insensitive' }
            }
        })
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

        return NextResponse.json({ success: true, message: "Mã OTP hợp lệ" })
    } catch (error: any) {
        console.error("Verify forgot OTP error:", error)
        return NextResponse.json({ error: "Lỗi khi xác minh mã OTP" }, { status: 500 })
    }
}
