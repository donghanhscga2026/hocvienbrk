import { NextResponse } from 'next/server'
import { createBackup, listBackups, deleteBackup, checkPgDump, BackupInfo } from '@/lib/backup-service'
import { auth } from '@/auth'

async function checkAdmin(): Promise<boolean> {
    const session = await auth()
    return session?.user?.role === 'ADMIN'
}

function unauthorized() {
    return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 })
}

// GET /api/admin/backup?method=all|json|pg_dump
export async function GET(req: Request) {
    if (!(await checkAdmin())) return unauthorized()

    const url = new URL(req.url)
    const filter = url.searchParams.get('method') || 'all'

    try {
        const backups = listBackups()
        const pgDumpStatus = checkPgDump()

        let filtered: BackupInfo[]
        if (filter === 'json') filtered = backups.filter(b => b.method === 'json')
        else if (filter === 'pg_dump') filtered = backups.filter(b => b.method === 'pg_dump')
        else filtered = backups

        return NextResponse.json({ backups: filtered, pgDumpStatus })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

// POST /api/admin/backup — create backup
// Body: { method: 'json' | 'pg_dump' }
export async function POST(req: Request) {
    if (!(await checkAdmin())) return unauthorized()

    try {
        const body = await req.json()
        const method = body.method || 'json'

        if (method !== 'json' && method !== 'pg_dump') {
            return NextResponse.json({ error: 'Method must be "json" or "pg_dump"' }, { status: 400 })
        }

        const result = await createBackup(method)
        return NextResponse.json(result)
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}

// DELETE /api/admin/backup — delete backup
// Body: { name: string }
export async function DELETE(req: Request) {
    if (!(await checkAdmin())) return unauthorized()

    try {
        const body = await req.json()
        const { name } = body

        if (!name) {
            return NextResponse.json({ error: 'Missing backup name' }, { status: 400 })
        }

        const result = deleteBackup(name)
        return NextResponse.json(result)
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
