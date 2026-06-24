import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: Request) {
    try {
        const { email, otp } = await request.json()

        if (!email || !otp) {
            return NextResponse.json({ error: "Thiếu thông tin email hoặc mã OTP" }, { status: 400 })
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

        return NextResponse.json({ success: true, message: "Mã OTP hợp lệ" })
    } catch (error: any) {
        console.error("Verify forgot OTP error:", error)
        return NextResponse.json({ error: "Lỗi khi xác minh mã OTP" }, { status: 500 })
    }
}
