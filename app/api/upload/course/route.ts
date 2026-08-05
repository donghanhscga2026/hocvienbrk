import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { requireAuth } from '@/lib/api-auth'

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
        const buffer = Buffer.from(bytes)

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'courses')

        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true })
        }

        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`
        const filename = `course-${uniqueSuffix}.${ext}`
        const filepath = path.join(uploadDir, filename)

        await writeFile(filepath, buffer)

        const url = `/uploads/courses/${filename}`

        return NextResponse.json({ url, filename })
    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: 'Upload failed: ' + error.message },
            { status: 500 }
        )
    }
}
