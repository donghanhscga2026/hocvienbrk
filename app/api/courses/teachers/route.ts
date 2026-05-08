import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"

/**
 * GET /api/courses/teachers - Lấy danh sách TEACHER (ADMIN only)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userRole = session.user.role as Role
        if (userRole !== Role.ADMIN) {
            return NextResponse.json({ error: "Forbidden: Chỉ ADMIN được truy cập" }, { status: 403 })
        }

        const teachers = await prisma.user.findMany({
            where: { role: Role.TEACHER },
            select: { id: true, name: true, email: true }
        })

        return NextResponse.json({ teachers })
    } catch (error: any) {
        console.error('GET /api/courses/teachers error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
