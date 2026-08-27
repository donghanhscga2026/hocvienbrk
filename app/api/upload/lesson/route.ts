import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { saveUploadedFile } from '@/lib/image-utils'

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

        const ext = ALLOWED_IMAGE_EXT[file.type]
        if (!ext) {
            return NextResponse.json(
                { error: 'Chỉ chấp nhận file ảnh (jpg, png, webp, gif)' },
                { status: 400 }
            )
        }

        // Giới hạn 5MB — tương tự ảnh đính kèm bình luận
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Kích thước ảnh quá lớn (vui lòng chọn ảnh < 5MB)' },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`
        const filename = `lesson-${uniqueSuffix}.${ext}`

        const url = await saveUploadedFile(buffer, filename, 'lessons', file.type)

        return NextResponse.json({ url, filename })
    } catch (error: any) {
        console.error('Lesson image upload error:', error)
        return NextResponse.json(
            { error: 'Upload failed: ' + error.message },
            { status: 500 }
        )
    }
}
