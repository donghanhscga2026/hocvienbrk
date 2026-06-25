import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('video') as File | null

    if (!file) {
      return NextResponse.json({ error: "Thiếu file video" }, { status: 400 })
    }

    const allowedTypes = ['video/mp4', 'video/webm']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Chỉ chấp nhận file MP4 hoặc WebM" }, { status: 400 })
    }

    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File quá lớn (tối đa 100 MB)" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'account-assistant',
          public_id: `vid_${Date.now()}`,
          eager: [
            { width: 200, crop: 'fill', quality: 'auto' },
          ],
          eager_async: false,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        },
      )
      uploadStream.end(buffer)
    })

    const url = result.eager?.[0]?.secure_url || result.secure_url

    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("Upload video error:", error)
    return NextResponse.json({ error: "Lỗi upload video" }, { status: 500 })
  }
}
