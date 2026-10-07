import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { saveUploadedFile } from '@/lib/image-utils'
import sharp from 'sharp'

// Chỉ nhận ảnh, và tự chọn phần mở rộng theo MIME đã kiểm tra
// (không tin tên file client gửi lên) để tránh upload .svg/.html chứa script.
const ALLOWED_IMAGE_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}

export async function POST(request: NextRequest) {
    const denied = await requireAuth()
    if (denied) return denied

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            )
        }

        // Kiểm tra loại file ảnh dựa trên MIME đã xác thực (không tin đuôi file client gửi)
        const ext = ALLOWED_IMAGE_EXT[file.type]
        if (!ext) {
            return NextResponse.json(
                { error: 'Chỉ chấp nhận file ảnh (jpg, png, webp, gif)' },
                { status: 400 }
            )
        }

        // Kiểm tra kích thước ảnh (Giới hạn 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Kích thước ảnh quá lớn (vui lòng chọn ảnh < 2MB)' },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const inputBuffer = Buffer.from(bytes)

        // Course artwork is public and requested frequently. Normalize raster uploads
        // to a bounded WebP so repeated CDN hits consume far less Storage egress.
        // Animated GIFs are preserved to avoid silently removing animation.
        const shouldOptimize = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
        const buffer = shouldOptimize
            ? await sharp(inputBuffer)
                .rotate()
                .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer()
            : inputBuffer

        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`
        const outputExt = shouldOptimize ? 'webp' : ext
        const outputType = shouldOptimize ? 'image/webp' : file.type
        const filename = `course-${uniqueSuffix}.${outputExt}`

        // [FIX] Trước đây ghi thẳng vào ổ đĩa server — không hoạt động trên
        // Vercel (filesystem chỉ đọc lúc runtime). Đẩy lên Supabase Storage,
        // chỉ dự phòng ghi ổ đĩa khi chạy local.
        const url = await saveUploadedFile(buffer, filename, 'courses', outputType)

        return NextResponse.json({ url, filename })
    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: 'Upload failed: ' + error.message },
            { status: 500 }
        )
    }
}
