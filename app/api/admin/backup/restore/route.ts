import { NextResponse } from 'next/server'
import { restoreBackup } from '@/lib/backup-service'
import { auth } from '@/auth'

// Route dùng auth() + DB nên phải render động hoàn toàn — tránh lỗi build
// "Failed to collect page data" khi Next.js cố prerender lúc build trên Vercel.
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { name, method } = body

        if (!name || !method) {
            return NextResponse.json({ error: 'Missing name or method' }, { status: 400 })
        }

        const result = await restoreBackup(name, method)
        return NextResponse.json(result)
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
