import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const prisma = new PrismaClient()

const BACKUP_DIR = path.join(__dirname, '..', 'backups')

// Models that need careful handling
const HANDLE_LAST = new Set([
    'UserClosure',
    'SystemClosure',
    'SyncLog',
])

async function ask(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase()) }))
}

function listBackups(): { name: string; time: string; records: number }[] {
    if (!fs.existsSync(BACKUP_DIR)) return []

    const items = fs.readdirSync(BACKUP_DIR).filter(f =>
        f.startsWith('db_') && (f.endsWith('.tar.gz') || f.endsWith('.zip') || fs.statSync(path.join(BACKUP_DIR, f)).isDirectory())
    )
    return items.map(name => {
        const fullPath = path.join(BACKUP_DIR, name)
        const stat = fs.statSync(fullPath)
        return { name, time: stat.mtime.toISOString().substring(0, 19), records: 0 }
    }).sort((a, b) => b.name.localeCompare(a.name))
}

function resolveBackupPath(backupName: string): string {
    const fullPath = path.join(BACKUP_DIR, backupName)
    // If it's a directory, use it directly
    if (fs.statSync(fullPath).isDirectory()) {
        return fullPath
    }
    // If it's an archive, extract to temp
    const extractDir = path.join(BACKUP_DIR, `_restore_temp_${Date.now()}`)
    fs.mkdirSync(extractDir, { recursive: true })
    const { execSync } = require('child_process')
    if (backupName.endsWith('.tar.gz')) {
        execSync(`tar -xzf "${fullPath}" -C "${extractDir}"`, { stdio: 'ignore' })
    } else if (backupName.endsWith('.zip')) {
        execSync(`powershell -Command "Expand-Archive -Path '${fullPath}' -DestinationPath '${extractDir}' -Force"`, { stdio: 'ignore', shell: 'powershell' })
    }
    return extractDir
}

async function main() {
    const isDryRun = process.argv.includes('--dry-run')

    console.log(isDryRun ? '🔍 DRY RUN — sẽ không ghi vào DB\n' : '🚀 RESTORE DATABASE\n')

    // 1. List available backups
    const backups = listBackups()
    if (backups.length === 0) {
        console.error('❌ Không tìm thấy file backup nào trong', BACKUP_DIR)
        console.log('   File phải có dạng: db_YYYY-MM-DD_HH-mm-ss/ (directory) hoặc .tar.gz/.zip')
        process.exit(1)
    }

    console.log('📦 Các bản backup có sẵn:')
    backups.forEach((b, i) => console.log(`   ${i + 1}. ${b.name} (${b.time})`))
    console.log('')

    const choice = await ask('Chọn số thứ tự để restore (hoặc "exit"): ')
    if (choice === 'exit') { console.log('Đã hủy.'); process.exit(0) }

    const idx = parseInt(choice) - 1
    if (isNaN(idx) || idx < 0 || idx >= backups.length) {
        console.error('❌ Lựa chọn không hợp lệ')
        process.exit(1)
    }

    const selected = backups[idx]
    console.log(`\n📂 Chọn: ${selected.name}`)

    // 2. Resolve backup path (directory or archive)
    const extractDir = resolveBackupPath(selected.name)

    // Read manifest
    const manifestPath = path.join(extractDir, 'manifest.json')
    if (!fs.existsSync(manifestPath)) {
        console.error('❌ Không tìm thấy manifest.json trong backup')
        fs.rmSync(extractDir, { recursive: true, force: true })
        process.exit(1)
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    console.log(`   Models: ${manifest.totalModels}, Records: ${manifest.totalRecords}`)

    // List files (excluding manifest)
    const modelFiles = fs.readdirSync(extractDir)
        .filter(f => f.endsWith('.json') && f !== 'manifest.json')
        .sort()

    console.log('\n📋 Các model sẽ được restore:')
    for (const file of modelFiles) {
        const data = JSON.parse(fs.readFileSync(path.join(extractDir, file), 'utf-8'))
        const modelName = file.replace('.json', '')
        console.log(`   ${modelName.padEnd(25)} ${String(data.length).padStart(6)} records`)
    }

    // 3. Confirm
    if (!isDryRun) {
        const confirm = await ask(`\n⚠️  CẢNH BÁO: Thao tác này sẽ GHI ĐÈ dữ liệu hiện tại!\n   Tiếp tục? (yes/no): `)
        if (confirm !== 'yes' && confirm !== 'y') {
            console.log('Đã hủy.')
            fs.rmSync(extractDir, { recursive: true, force: true })
            process.exit(0)
        }
    }

    console.log('')

    // 4. Process models
    // Sort: handle_LAST models go last, others first
    const sortedFiles = [
        ...modelFiles.filter(f => !HANDLE_LAST.has(f.replace('.json', ''))),
        ...modelFiles.filter(f => HANDLE_LAST.has(f.replace('.json', ''))),
    ]

    // Bypass FK constraints
    if (!isDryRun) {
        await prisma.$executeRawUnsafe("SET session_replication_role = replica")
    }

    let success = 0
    let errors = 0
    let skipped = 0

    for (const file of sortedFiles) {
        const modelName = file.replace('.json', '')
        const data = JSON.parse(fs.readFileSync(path.join(extractDir, file), 'utf-8'))

        if (data.length === 0) { skipped++; continue }

        // Convert model name to Prisma key (camelCase)
        const prismaKey = modelName.charAt(0).toLowerCase() + modelName.slice(1)

        console.log(`   📥 ${modelName} (${data.length} records)...`)

        if (isDryRun) {
            success++
            continue
        }

        try {
            let imported = 0
            // Process in batches of 100
            for (let i = 0; i < data.length; i += 100) {
                const batch = data.slice(i, i + 100)
                await Promise.all(batch.map(async (record: any) => {
                    const idField = findIdField(record)
                    if (idField) {
                        const where = { [idField]: record[idField] }
                        try {
                            await (prisma as any)[prismaKey].upsert({
                                where,
                                update: record,
                                create: record,
                            })
                        } catch (inner: any) {
                            // If upsert fails (e.g., compound key), try create
                            try {
                                await (prisma as any)[prismaKey].create({ data: record })
                            } catch { /* skip if already exists */ }
                        }
                    } else {
                        try {
                            await (prisma as any)[prismaKey].create({ data: record })
                        } catch { /* skip if already exists */ }
                    }
                }))
                imported += batch.length
            }
            success++
            console.log(`      ✅ ${imported} records imported`)
        } catch (e: any) {
            errors++
            console.error(`      ❌ ${e.message.substring(0, 100)}`)
        }
    }

    // Re-enable FK constraints
    if (!isDryRun) {
        await prisma.$executeRawUnsafe("SET session_replication_role = DEFAULT")
    }

    // Cleanup temp dir
    fs.rmSync(extractDir, { recursive: true, force: true })

    if (isDryRun) {
        console.log(`\n🔍 DRY RUN: ${success} models sẵn sàng, ${errors} lỗi, ${skipped} skip`)
        console.log('👉 Chạy không --dry-run để restore thật')
    } else {
        console.log(`\n✅ Restore hoàn tất!`)
        console.log(`   Thành công: ${success} models, Lỗi: ${errors}, Skip: ${skipped}`)
    }

    await prisma.$disconnect()
}

function findIdField(record: any): string | null {
    const candidates = ['id', 'autoId', 'tcaId', 'token', 'identifier_token']
    for (const key of candidates) {
        if (record[key] !== undefined) return key
    }
    // Try any field ending with 'Id' that is not null
    for (const key of Object.keys(record)) {
        if (key.endsWith('Id') && record[key] !== null && record[key] !== undefined) {
            return key
        }
    }
    return null
}

main()
    .catch(e => { console.error('❌ Fatal:', e); process.exit(1) })
    .finally(() => prisma.$disconnect())
