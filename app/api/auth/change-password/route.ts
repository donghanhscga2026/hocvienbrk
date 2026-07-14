import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { sendPasswordChangedNotification } from "@/lib/notifications"

export async function POST(request: Request) {
    try {
        const session = await auth()
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
        }

        const { newPassword } = await request.json()

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 })
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
            metadata: { email: session.user.email || null }
        })

        return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công" })
    } catch (error: any) {
        console.error("Change password error:", error)
        return NextResponse.json({ error: "Lỗi khi đổi mật khẩu" }, { status: 500 })
    }
}
