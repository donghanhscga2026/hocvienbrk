import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'
import { execSync, spawnSync } from 'child_process'
import { supabase } from '@/lib/supabase'

const BACKUP_DIR = path.join(process.cwd(), 'backups')
// [FIX] Backup JSON trước đây chỉ ghi vào ổ đĩa server — không hoạt động
// trên Vercel (filesystem chỉ đọc lúc runtime). Đẩy lên Supabase Storage khi
// có cấu hình, chỉ dự phòng ghi ổ đĩa khi chạy local/VPS. Lưu ý: phương thức
// pg_dump vẫn CHỈ dùng được khi chạy local/VPS có cài pg_dump — đây là giới
// hạn của chính binary pg_dump (không có trên Vercel), không phải vấn đề nơi
// lưu trữ nên không thể khắc phục bằng cách đổi storage.
const SUPABASE_BACKUP_PREFIX = 'backups'

function isSupabaseConfigured(): boolean {
    return Boolean(
        (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    )
}

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
    const backupName = `db_${timestamp}`
    const useSupabase = isSupabaseConfigured()

    const models: { name: string; tableName: string }[] = Prisma.dmmf.datamodel.models.map((m: any) => ({
        name: m.name,
        tableName: m.dbName || m.name,
    }))

    const stats: Record<string, number> = {}
    let totalRecords = 0
    // Gom nội dung trong bộ nhớ trước — dùng chung cho cả 2 đích lưu, tránh
    // phải query lại nếu Supabase lỗi phải rơi về ghi local.
    const files: { name: string; content: string }[] = []

    for (const model of models) {
        if (EXCLUDE_MODELS.has(model.name)) continue
        const prismaKey = model.name.charAt(0).toLowerCase() + model.name.slice(1)

        try {
            const data = await (prisma as any)[prismaKey].findMany()
            files.push({ name: `${model.name}.json`, content: JSON.stringify(data, null, 2) })
            stats[model.name] = data.length
            totalRecords += data.length
        } catch { }
    }

    const manifest = { timestamp, createdAt: new Date().toISOString(), method: 'json', totalModels: Object.keys(stats).length, totalRecords, stats }
    files.push({ name: 'manifest.json', content: JSON.stringify(manifest, null, 2) })

    if (useSupabase) {
        let uploadFailed = false
        for (const file of files) {
            const { error } = await supabase.storage
                .from('uploads')
                .upload(`${SUPABASE_BACKUP_PREFIX}/${backupName}/${file.name}`, Buffer.from(file.content, 'utf-8'), {
                    contentType: 'application/json',
                    upsert: true,
                })
            if (error) {
                console.error(`❌ [Backup] Lỗi upload ${file.name} lên Supabase Storage:`, error.message)
                uploadFailed = true
                break
            }
        }
        if (!uploadFailed) {
            await cleanupOldBackups(10)
            return { success: true, method: 'json', name: backupName, stats, totalRecords }
        }
        console.warn('⚠️ [Backup] Đẩy lên Supabase Storage thất bại, chuyển sang ghi ổ đĩa local (chỉ dùng được khi chạy local/VPS).')
    }

    // Dự phòng: ghi ổ đĩa local — CHỈ chạy được lúc local/VPS, không chạy được trên Vercel
    const backupDir = path.join(BACKUP_DIR, backupName)
    fs.mkdirSync(backupDir, { recursive: true })
    for (const file of files) {
        fs.writeFileSync(path.join(backupDir, file.name), file.content, 'utf-8')
    }

    await cleanupOldBackups(10)

    return { success: true, method: 'json', name: backupName, stats, totalRecords }
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

        await cleanupOldBackups(10)

        return { success: true, method: 'pg_dump', name: `db_${timestamp}.sql`, totalRecords: 0 }
    } catch (e: any) {
        return { success: false, method: 'pg_dump', error: `pg_dump thất bại: ${e.message.substring(0, 200)}` }
    }
}

// ─── List backups ────────────────────────────────────────────────
async function listSupabaseJsonBackups(): Promise<BackupInfo[]> {
    const { data: folders, error } = await supabase.storage
        .from('uploads')
        .list(SUPABASE_BACKUP_PREFIX, { sortBy: { column: 'name', order: 'desc' } })

    if (error || !folders) return []

    const results: BackupInfo[] = []
    for (const folder of folders) {
        // Supabase Storage không có khái niệm "thư mục" thật — folder.id === null
        // đánh dấu đây là 1 prefix (thư mục ảo), không phải file.
        if (folder.id !== null) continue

        const { data: files } = await supabase.storage
            .from('uploads')
            .list(`${SUPABASE_BACKUP_PREFIX}/${folder.name}`)
        if (!files) continue

        const manifestFile = files.find(f => f.name === 'manifest.json')
        if (!manifestFile) continue

        const { data: manifestBlob } = await supabase.storage
            .from('uploads')
            .download(`${SUPABASE_BACKUP_PREFIX}/${folder.name}/manifest.json`)
        if (!manifestBlob) continue

        try {
            const m = JSON.parse(await manifestBlob.text())
            const sizeBytes = files.reduce((sum, f) => sum + (f.metadata?.size || 0), 0)
            results.push({
                name: folder.name,
                method: 'json',
                createdAt: m.createdAt || m.timestamp,
                totalModels: m.totalModels || 0,
                totalRecords: m.totalRecords || 0,
                sizeBytes,
                stats: m.stats || {},
            })
        } catch { }
    }
    return results
}

export async function listBackups(): Promise<BackupInfo[]> {
    const results: BackupInfo[] = isSupabaseConfigured() ? await listSupabaseJsonBackups() : []

    // pg_dump chỉ có thể chạy + lưu ở local/VPS — luôn đọc từ ổ đĩa local
    // dù JSON backup đã chuyển sang Supabase Storage.
    if (!fs.existsSync(BACKUP_DIR)) {
        return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    const items = fs.readdirSync(BACKUP_DIR)

    for (const name of items) {
        const fullPath = path.join(BACKUP_DIR, name)

        // JSON backup (directory) — chỉ đọc từ local khi KHÔNG có Supabase
        // Storage (tránh liệt kê trùng 2 nguồn cùng lúc lúc chạy dev/local).
        if (!isSupabaseConfigured() && name.startsWith('db_') && fs.statSync(fullPath).isDirectory()) {
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
export async function deleteBackup(name: string): Promise<{ success: boolean; error?: string }> {
    // pg_dump luôn có đuôi .sql và chỉ tồn tại ở local — JSON backup (Supabase
    // hoặc local dự phòng) không có đuôi file.
    if (!name.endsWith('.sql') && isSupabaseConfigured()) {
        const { data: files } = await supabase.storage
            .from('uploads')
            .list(`${SUPABASE_BACKUP_PREFIX}/${name}`)
        if (files && files.length > 0) {
            const { error } = await supabase.storage
                .from('uploads')
                .remove(files.map(f => `${SUPABASE_BACKUP_PREFIX}/${name}/${f.name}`))
            if (error) return { success: false, error: error.message }
            return { success: true }
        }
    }

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

    // JSON restore — đọc từ Supabase Storage nếu có, dự phòng ổ đĩa local
    const allFileNames = await listBackupFileNames(name)
    if (!allFileNames) {
        return { success: false, error: 'Không tìm thấy backup (đã kiểm tra cả Supabase Storage và ổ đĩa local)' }
    }
    const modelFiles = allFileNames.filter(f => f.endsWith('.json') && f !== 'manifest.json')

    try {
        await prisma.$executeRawUnsafe("SET session_replication_role = replica")

        let imported = 0
        for (const file of modelFiles) {
            const modelName = file.replace('.json', '')
            const content = await readBackupFile(name, file)
            if (!content) continue
            const data = JSON.parse(content)
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
// Đọc danh sách tên file của 1 backup JSON — ưu tiên Supabase Storage,
// dự phòng ổ đĩa local. Dùng cho restore.
async function listBackupFileNames(name: string): Promise<string[] | null> {
    if (isSupabaseConfigured()) {
        const { data: files } = await supabase.storage
            .from('uploads')
            .list(`${SUPABASE_BACKUP_PREFIX}/${name}`)
        if (files && files.length > 0) return files.map(f => f.name)
    }
    const backupDir = path.join(BACKUP_DIR, name)
    if (fs.existsSync(backupDir) && fs.statSync(backupDir).isDirectory()) {
        return fs.readdirSync(backupDir)
    }
    return null
}

// Đọc nội dung 1 file trong backup JSON — ưu tiên Supabase Storage, dự phòng
// ổ đĩa local.
async function readBackupFile(name: string, filename: string): Promise<string | null> {
    if (isSupabaseConfigured()) {
        const { data: blob } = await supabase.storage
            .from('uploads')
            .download(`${SUPABASE_BACKUP_PREFIX}/${name}/${filename}`)
        if (blob) return await blob.text()
    }
    const filePath = path.join(BACKUP_DIR, name, filename)
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf-8')
    return null
}

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

async function cleanupOldBackups(maxKeep: number) {
    // JSON backups: dọn trên Supabase Storage nếu có cấu hình, ngược lại
    // dọn thư mục JSON ở local.
    if (isSupabaseConfigured()) {
        const { data: folders } = await supabase.storage
            .from('uploads')
            .list(SUPABASE_BACKUP_PREFIX, { sortBy: { column: 'name', order: 'desc' } })
        const backupFolders = (folders || []).filter(f => f.id === null && f.name.startsWith('db_'))
        if (backupFolders.length > maxKeep) {
            for (const folder of backupFolders.slice(maxKeep)) {
                const { data: files } = await supabase.storage
                    .from('uploads')
                    .list(`${SUPABASE_BACKUP_PREFIX}/${folder.name}`)
                if (files && files.length > 0) {
                    await supabase.storage
                        .from('uploads')
                        .remove(files.map(f => `${SUPABASE_BACKUP_PREFIX}/${folder.name}/${f.name}`))
                }
            }
        }
    } else if (fs.existsSync(BACKUP_DIR)) {
        const jsonBackups = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('db_') && fs.statSync(path.join(BACKUP_DIR, f)).isDirectory())
            .sort()
            .reverse()
        if (jsonBackups.length > maxKeep) {
            for (const f of jsonBackups.slice(maxKeep)) {
                fs.rmSync(path.join(BACKUP_DIR, f), { recursive: true, force: true })
            }
        }
    }

    // pg_dump (.sql) luôn chỉ nằm ở local (binary pg_dump không có trên
    // Vercel) — dọn độc lập, không phụ thuộc Supabase có cấu hình hay không.
    if (fs.existsSync(BACKUP_DIR)) {
        const sqlBackups = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort()
            .reverse()
        if (sqlBackups.length > maxKeep) {
            for (const f of sqlBackups.slice(maxKeep)) {
                fs.unlinkSync(path.join(BACKUP_DIR, f))
                const manifestPath = path.join(BACKUP_DIR, f.replace('.sql', '.manifest.json'))
                if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath)
            }
        }
    }
}
