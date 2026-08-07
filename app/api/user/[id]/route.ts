import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const userId = parseInt(id)

        if (isNaN(userId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
        }

        // Endpoint này công khai (dùng để tra cứu tên người giới thiệu lúc đăng ký,
        // và được UserMenu/AccountAssistantModal gọi khá thường xuyên trong luồng
        // bình thường). Giới hạn cũ (30/10 phút) quá thấp — đã chặn nhầm request
        // hợp lệ trên production (nhiều người dùng chung 1 IP, hoặc trình duyệt gọi
        // lại theo re-render). Nới rộng hơn nhiều, chỉ để chặn quét hàng loạt thật sự.
        const ip = getClientIp(request)
        const byIp = checkRateLimit(`user-lookup:ip:${ip}`, { max: 120, windowMs: 60 * 1000 })
        if (!byIp.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        }
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, image: true, email: true, phone: true }
        })
        
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        
        return NextResponse.json(user)
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
