import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

// API kiểm tra user hiện tại có password không (không expose password hash)
export async function GET() {
    try {
        const session = await auth()
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(session.user.id) },
            select: { 
                password: true // Chỉ dùng để kiểm tra null, không trả về client
            }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Trả về chỉ boolean, không trả về password hash
        const hasPassword = !!user.password

        return NextResponse.json({ hasPassword })
    } catch (error) {
        console.error("Has password check error:", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
