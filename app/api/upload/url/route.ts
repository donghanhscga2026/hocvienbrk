import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from '@/lib/api-auth'
import { isBlockedHost } from '@/lib/security/url-safety'

export async function POST(req: NextRequest) {
    const denied = await requireAuth()
    if (denied) return denied

    try {
        const body = await req.json()
        const { url } = body

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 })
        }

        let parsed: URL
        try {
            parsed = new URL(url)
        } catch {
            return NextResponse.json({ success: false, error: "URL không hợp lệ" }, { status: 400 })
        }

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return NextResponse.json({ success: false, error: "URL không hợp lệ" }, { status: 400 })
        }

        if (isBlockedHost(parsed.hostname)) {
            return NextResponse.json({ success: false, error: "URL không được phép" }, { status: 400 })
        }

        // Tải ảnh ở backend (bỏ qua giới hạn CORS của trình duyệt)
        const response = await fetch(url)
        
        if (!response.ok) {
            return NextResponse.json({ success: false, error: "Không thể tải ảnh từ URL" }, { status: 400 })
        }

        const blob = await response.blob()
        
        if (!blob.type.startsWith('image/')) {
            return NextResponse.json({ success: false, error: "URL không trỏ đến một ảnh hợp lệ" }, { status: 400 })
        }

        const arrayBuffer = await blob.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = `data:${blob.type};base64,${buffer.toString('base64')}`

        return NextResponse.json({ success: true, base64 })
    } catch (error) {
        console.error("Proxy upload error:", error)
        return NextResponse.json({ success: false, error: "Lỗi hệ thống khi tải ảnh" }, { status: 500 })
    }
}
