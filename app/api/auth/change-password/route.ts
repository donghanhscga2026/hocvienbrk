import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { sendPasswordChangedNotification } from "@/lib/notifications"
import { checkRateLimit } from "@/lib/rate-limit"
import { validatePasswordStrength } from "@/lib/password-policy"

export async function POST(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
        }

        const byUser = checkRateLimit(`change-password:user:${session.user.id}`, { max: 5, windowMs: 15 * 60 * 1000 })
        if (!byUser.allowed) {
            return NextResponse.json({ error: "Bạn thử quá nhiều lần. Vui lòng thử lại sau." }, { status: 429 })
        }

        const { newPassword } = await request.json()

        if (!newPassword) {
            return NextResponse.json({ error: "Vui lòng nhập mật khẩu mới" }, { status: 400 })
        }

        const passwordError = validatePasswordStrength(newPassword)
        if (passwordError) {
            return NextResponse.json({ error: passwordError }, { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12)

        await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: {
                password: hashedPassword,
                passwordChanged: true
            }
        })

        sendPasswordChangedNotification({
            id: parseInt(session.user.id),
            name: session.user.name || "Unknown",
            email: session.user.email || ""
        }, newPassword)

        const { logActivity } = await import("@/lib/activity-logger");
        await logActivity({
            userId: parseInt(session.user.id),
            action: 'PASSWORD_CHANGE',
            detail: 'Đổi mật khẩu thành công',
            metadata: {
                email: session.user.email || null
            }
        })

        return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công" })
    } catch (error: any) {
        console.error("Change password error:", error)
        return NextResponse.json({ error: "Lỗi khi đổi mật khẩu" }, { status: 500 })
    }
}
