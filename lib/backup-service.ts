import { PrismaClient, Prisma } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { execSync, spawnSync } from 'child_process'

const prisma = new PrismaClient()
const BACKUP_DIR = path.join(process.cwd(), 'backups')

const EXCLUDE_MODELS = new Set(['_prisma_migrations'])

// ─── Types ───────────────────────────────────────────────────────
export interface BackupInfo {
    name: string
    method: 'json' | 'pg_dump'
    createdAt: string
    totalModels: number
    totalRecords: number
    sizeBytes: number
    stats: Record<string, number>
}

export interface BackupResult {
    success: boolean
    error?: string
    method: string
    name?: string
    stats?: Record<string, number>
    totalRecords?: number
}

export interface PgDumpStatus {
    available: boolean
    path: string | null
    version: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────
function getTimestamp(): string {
    const ts = new Date()
    return `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}_${String(ts.getHours()).padStart(2, '0')}-${String(ts.getMinutes()).padStart(2, '0')}-${String(ts.getSeconds()).padStart(2, '0')}`
}

const LIBPQ_PARAMS = new Set([
    'host', 'hostaddr', 'port', 'dbname', 'user', 'password', 'passfile',
    'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'sslcrl', 'sslcompression',
    'sslminprotocolversion', 'sslmaxprotocolversion', 'requirepeer',
    'krbsrvname', 'gsslib', 'gssencmode', 'connect_timeout', 'keepalives',
    'keepalives_idle', 'keepalives_interval', 'keepalives_count',
    'application_name', 'fallback_application_name', 'client_encoding',
    'options', 'search_path', 'target_session_attrs', 'load_balance_hosts',
    'tcp_user_timeout',
])

function cleanDbUrl(url: string): string {
    try {
        const idx = url.indexOf('?')
        if (idx === -1) return url
        const base = url.slice(0, idx)
        const params = new URLSearchParams(url.slice(idx + 1))
        const clean = new URLSearchParams()
        for (const [k, v] of params) {
            if (LIBPQ_PARAMS.has(k)) clean.set(k, v)
        }
        const qs = clean.toString()
        return qs ? `${base}?${qs}` : base
    } catch { return url }
}

// ─── Check pg_dump availability ──────────────────────────────────
export function checkPgDump(): PgDumpStatus {
    const candidates = [
        'pg_dump',
        '"C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe"',
        '"C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe"',
        '"C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe"',
        '"C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe"',
        '"C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe"',
    ]
    for (const cmd of candidates) {
        try {
            const out = execSync(`${cmd} --version`, { encoding: 'utf-8', timeout: 5000 }).trim()
            return { available: true, path: cmd.replace(/"/g, ''), version: out }
        } catch { }
    }
    return { available: false, path: null, version: null }
}

// ─── Method 1: JSON Backup (via Prisma) ─────────────────────────
async function backupJson(): Promise<BackupResult> {
    const timestamp = getTimestamp()
    const backupDir = path.join(BACKUP_DIR, `db_${timestamp}`)
    fs.mkdirSync(backupDir, { recursive: true })

    const models: { name: string; tableName: string }[] = Prisma.dmmf.datamodel.models.map((m: any) => ({
        name: m.name,
        tableName: m.dbName || m.name,
    }))

    const stats: Record<string, number> = {}
    let totalRecords = 0

    for (const model of models) {
        if (EXCLUDE_MODELS.has(model.name)) continue
        const prismaKey = model.name.charAt(0).toLowerCase() + model.name.slice(1)

        try {
            const data = await (prisma as any)[prismaKey].findMany()
            const filePath = path.join(backupDir, `${model.name}.json`)
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
            stats[model.name] = data.length
            totalRecords += data.length
        } catch { }
    }

    const manifest = { timestamp, createdAt: new Date().toISOString(), method: 'json', totalModels: Object.keys(stats).length, totalRecords, stats }
    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')

    cleanupOldBackups(10)

    return { success: true, method: 'json', name: `db_${timestamp}`, stats, totalRecords }
}

// ─── Method 2: pg_dump Backup ────────────────────────────────────
async function backupPgDump(): Promise<BackupResult> {
    const status = checkPgDump()
    if (!status.available) {
        return { success: false, method: 'pg_dump', error: 'pg_dump không được cài đặt. Tải PostgreSQL tại: https://www.postgresql.org/download/' }
    }

    const timestamp = getTimestamp()
    const outputPath = path.join(BACKUP_DIR, `db_${timestamp}.sql`)

    const dbUrl = process.env.DATABASE_URL || ''
    if (!dbUrl) {
        return { success: false, method: 'pg_dump', error: 'DATABASE_URL không được cấu hình' }
    }

    try {
        const cleanUrl = cleanDbUrl(dbUrl)
        const result = spawnSync(status.path!, ['--dbname', cleanUrl, '--file', outputPath, '--verbose', '--no-owner', '--no-acl'], {
            timeout: 120000,
            stdio: 'pipe',
            encoding: 'utf-8',
        })
        if (result.error) throw result.error
        if (result.status !== 0) {
            throw new Error(result.stderr?.substring(0, 300) || `pg_dump exit code ${result.status}`)
        }

        const size = fs.statSync(outputPath).size
        // Write companion manifest
        const manifest = { timestamp, createdAt: new Date().toISOString(), method: 'pg_dump', totalModels: 0, totalRecords: 0, sizeBytes: size }
        fs.writeFileSync(path.join(path.dirname(outputPath), `db_${timestamp}.manifest.json`), JSON.stringify(manifest, null, 2), 'utf-8')

        cleanupOldBackups(10)

        return { success: true, method: 'pg_dump', name: `db_${timestamp}.sql`, totalRecords: 0 }
    } catch (e: any) {
        return { success: false, method: 'pg_dump', error: `pg_dump thất bại: ${e.message.substring(0, 200)}` }
    }
}

// ─── List backups ────────────────────────────────────────────────
export function listBackups(): BackupInfo[] {
    if (!fs.existsSync(BACKUP_DIR)) return []
    const items = fs.readdirSync(BACKUP_DIR)

    const results: BackupInfo[] = []

    for (const name of items) {
        const fullPath = path.join(BACKUP_DIR, name)

        // JSON backup (directory)
        if (name.startsWith('db_') && fs.statSync(fullPath).isDirectory()) {
            const manifestPath = path.join(fullPath, 'manifest.json')
            if (fs.existsSync(manifestPath)) {
                try {
                    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
                    results.push({
                        name,
                        method: 'json',
                        createdAt: m.createdAt || m.timestamp,
                        totalModels: m.totalModels || 0,
                        totalRecords: m.totalRecords || 0,
                        sizeBytes: dirSize(fullPath),
                        stats: m.stats || {},
                    })
                } catch { }
            }
        }

        // pg_dump backup (.sql file with manifest)
        if (name.startsWith('db_') && name.endsWith('.sql')) {
            const manifestPath = path.join(BACKUP_DIR, name.replace('.sql', '.manifest.json'))
            const size = fs.statSync(fullPath).size
            let createdAt = fs.statSync(fullPath).mtime.toISOString()
            try {
                if (fs.existsSync(manifestPath)) {
                    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
                    createdAt = m.createdAt || createdAt
                }
            } catch { }
            results.push({
                name,
                method: 'pg_dump',
                createdAt,
                totalModels: 0,
                totalRecords: 0,
                sizeBytes: size,
                stats: {},
            })
        }
    }

    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// ─── Delete backup ───────────────────────────────────────────────
export function deleteBackup(name: string): { success: boolean; error?: string } {
    const fullPath = path.join(BACKUP_DIR, name)
    if (!fs.existsSync(fullPath)) {
        return { success: false, error: 'Backup không tồn tại' }
    }

    try {
        if (fs.statSync(fullPath).isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true })
        } else {
            fs.unlinkSync(fullPath)
            // Also try to delete companion manifest
            const manifestPath = fullPath.replace('.sql', '.manifest.json')
            if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath)
        }
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─── Create backup ───────────────────────────────────────────────
export async function createBackup(method: 'json' | 'pg_dump'): Promise<BackupResult> {
    if (method === 'pg_dump') return backupPgDump()
    return backupJson()
}

// ─── Restore backup ─────────────────────────────────────────────
export async function restoreBackup(name: string, method: 'json' | 'pg_dump'): Promise<{ success: boolean; error?: string; details?: string }> {
    if (method === 'pg_dump') {
        const status = checkPgDump()
        if (!status.available) {
            return { success: false, error: 'pg_dump không được cài đặt để restore' }
        }
        const sqlPath = path.join(BACKUP_DIR, name)
        if (!fs.existsSync(sqlPath)) {
            return { success: false, error: 'File SQL không tồn tại' }
        }
        const dbUrl = process.env.DATABASE_URL || ''
        if (!dbUrl) {
            return { success: false, error: 'DATABASE_URL không được cấu hình' }
        }

        try {
            const psqlPath = status.path?.replace('pg_dump', 'psql') || 'psql'
            const cleanUrl = cleanDbUrl(dbUrl)
            const result = spawnSync(psqlPath, ['--dbname', cleanUrl, '--file', sqlPath], {
                timeout: 300000,
                stdio: 'pipe',
                encoding: 'utf-8',
            })
            if (result.error) throw result.error
            if (result.status !== 0) {
                throw new Error(result.stderr?.substring(0, 300) || `psql exit code ${result.status}`)
            }
            return { success: true, details: 'Restore từ file SQL hoàn tất' }
        } catch (e: any) {
            return { success: false, error: `Restore SQL thất bại: ${e.message.substring(0, 200)}` }
        }
    }

    // JSON restore
    const backupDir = path.join(BACKUP_DIR, name)
    if (!fs.existsSync(backupDir) || !fs.statSync(backupDir).isDirectory()) {
        return { success: false, error: 'Thư mục backup không tồn tại' }
    }

    const modelFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.json') && f !== 'manifest.json')

    try {
        await prisma.$executeRawUnsafe("SET session_replication_role = replica")

        let imported = 0
        for (const file of modelFiles) {
            const modelName = file.replace('.json', '')
            const data = JSON.parse(fs.readFileSync(path.join(backupDir, file), 'utf-8'))
            if (data.length === 0) continue

            const prismaKey = modelName.charAt(0).toLowerCase() + modelName.slice(1)
            let batchCount = 0

            for (let i = 0; i < data.length; i += 100) {
                const batch = data.slice(i, i + 100)
                await Promise.all(batch.map(async (record: any) => {
                    const idField = findIdField(record)
                    if (idField) {
                        try {
                            await (prisma as any)[prismaKey].upsert({
                                where: { [idField]: record[idField] },
                                update: record,
                                create: record,
                            })
                        } catch {
                            try { await (prisma as any)[prismaKey].create({ data: record }) } catch { }
                        }
                    } else {
                        try { await (prisma as any)[prismaKey].create({ data: record }) } catch { }
                    }
                }))
                batchCount += batch.length
            }
            imported += batchCount
        }

        await prisma.$executeRawUnsafe("SET session_replication_role = DEFAULT")
        return { success: true, details: `Restore hoàn tất: ${imported} records từ ${modelFiles.length} models` }
    } catch (e: any) {
        await prisma.$executeRawUnsafe("SET session_replication_role = DEFAULT")
        return { success: false, error: `Restore thất bại: ${e.message.substring(0, 200)}` }
    }
}

// ─── Internal helpers ────────────────────────────────────────────
function findIdField(record: any): string | null {
    const candidates = ['id', 'autoId', 'tcaId', 'token', 'identifier_token']
    for (const key of candidates) {
        if (record[key] !== undefined) return key
    }
    for (const key of Object.keys(record)) {
        if (key.endsWith('Id') && record[key] !== null && record[key] !== undefined) return key
    }
    return null
}

function dirSize(dirPath: string): number {
    let total = 0
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true })
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name)
            if (entry.isFile()) total += fs.statSync(fullPath).size
            else if (entry.isDirectory()) total += dirSize(fullPath)
        }
    } catch { }
    return total
}

function cleanupOldBackups(maxKeep: number) {
    if (!fs.existsSync(BACKUP_DIR)) return
    const backups = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('db_'))
        .sort()
        .reverse()

    if (backups.length > maxKeep) {
        for (const f of backups.slice(maxKeep)) {
            const fullPath = path.join(BACKUP_DIR, f)
            if (fs.statSync(fullPath).isDirectory()) fs.rmSync(fullPath, { recursive: true, force: true })
            else fs.unlinkSync(fullPath)
        }
    }
}
