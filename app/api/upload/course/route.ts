import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { PublicImageStorageError, uploadPublicImage } from '@/lib/public-image-storage'

export const runtime = 'nodejs'
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])

/** Covers/logos selected in the editor go through the server, never expose R2 keys. */
export async function POST(request: NextRequest) {
    const denied = await requireAuth()
    if (denied) return denied
    try {
        const formData = await request.formData()
        const file = formData.get('file')
        if (!(file instanceof File) || !file.size) return NextResponse.json({ error: 'Vui lòng chọn một ảnh.' }, { status: 400 })
        if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Chỉ chấp nhận ảnh JPG, PNG, WebP, GIF hoặc AVIF.' }, { status: 400 })
        if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Vui lòng chọn ảnh không quá 2 MB.' }, { status: 400 })
        // The shared writer checks actual bytes and compresses once, before uploading.
        const url = await uploadPublicImage(Buffer.from(await file.arrayBuffer()), 'courses')
        return NextResponse.json({ url, filename: url.split('/').pop() })
    } catch (error) {
        if (error instanceof PublicImageStorageError) return NextResponse.json({ error: error.message }, { status: error.status })
        console.error('[Public image upload]', error instanceof Error ? error.name : 'Unknown')
        return NextResponse.json({ error: 'Không thể tải ảnh lên. Vui lòng thử lại.' }, { status: 500 })
    }
}
