import { NextResponse } from "next/server"
import { auth } from "@/auth"

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

    const maxSize = 200 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File quá lớn (tối đa 200 MB)" }, { status: 400 })
    }

    const catboxForm = new FormData()
    catboxForm.append('reqtype', 'fileupload')
    catboxForm.append('fileToUpload', file)

    const catboxRes = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: catboxForm,
    })

    if (!catboxRes.ok) {
      return NextResponse.json({ error: "Lỗi khi upload lên catbox.moe" }, { status: 502 })
    }

    const url = (await catboxRes.text()).trim()

    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("Upload video error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
