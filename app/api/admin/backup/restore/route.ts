import { NextResponse } from 'next/server'
import { restoreBackup } from '@/lib/backup-service'
import { auth } from '@/auth'

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
