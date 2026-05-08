import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            )
        }

        // Kiểm tra loại file ảnh
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'Chỉ chấp nhận file ảnh' },
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
        const ext = file.name.split('.').pop() || 'jpg'
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
