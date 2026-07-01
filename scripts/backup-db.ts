import { PrismaClient, Prisma } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const EXCLUDE_MODELS = new Set([
    '_prisma_migrations',
])

async function main() {
    const ts = new Date()
    const timestamp = `${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}-${String(ts.getMinutes()).padStart(2,'0')}-${String(ts.getSeconds()).padStart(2,'0')}`
    const backupDir = path.join(__dirname, '..', 'backups', `db_${timestamp}`)

    console.log('🚀 Database Backup (Prisma → JSON)')
    console.log(`📁 Output: ${backupDir}\n`)

    // Create backup directory
    fs.mkdirSync(backupDir, { recursive: true })

    // Get all model names from Prisma DMMF
    const models: { name: string; tableName: string }[] = Prisma.dmmf.datamodel.models.map((m: any) => ({
        name: m.name,
        tableName: m.dbName || m.name,
    }))

    const stats: Record<string, number> = {}
    let totalRecords = 0

    for (const model of models) {
        if (EXCLUDE_MODELS.has(model.name)) continue

        const modelName = model.name
        // Convert PascalCase to camelCase for Prisma access (first letter lowercase)
        const prismaKey = modelName.charAt(0).toLowerCase() + modelName.slice(1)

        try {
            const data = await (prisma as any)[prismaKey].findMany()
            const filePath = path.join(backupDir, `${modelName}.json`)
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
            stats[modelName] = data.length
            totalRecords += data.length
            console.log(`  ✅ ${modelName.padEnd(25)} ${String(data.length).padStart(6)} records`)
        } catch (e: any) {
            console.log(`  ⏭️  ${modelName.padEnd(25)} SKIP (${e.message.substring(0, 60)})`)
        }
    }

    // Write manifest
    const manifest = {
        timestamp,
        createdAt: new Date().toISOString(),
        totalModels: Object.keys(stats).length,
        totalRecords,
        stats,
    }
    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')

    // Cleanup old backups (keep last 10)
    const backupDir_parent = path.join(__dirname, '..', 'backups')
    const backups = fs.readdirSync(backupDir_parent)
        .filter(f => f.startsWith('db_'))
        .map(f => ({ name: f, time: fs.statSync(path.join(backupDir_parent, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time)

    if (backups.length > 10) {
        const toDelete = backups.slice(10)
        for (const f of toDelete) {
            const fullPath = path.join(backupDir_parent, f.name)
            if (fs.statSync(fullPath).isDirectory()) {
                fs.rmSync(fullPath, { recursive: true, force: true })
            } else {
                fs.unlinkSync(fullPath)
            }
        }
        console.log(`🗑 Xóa ${toDelete.length} bản backup cũ (giữ 10 bản gần nhất)`)
    }

    // Summary
    console.log(`\n✅ Backup hoàn tất!`)
    console.log(`   Models: ${Object.keys(stats).length}`)
    console.log(`   Records: ${totalRecords}`)
    console.log(`   Thư mục: db_${timestamp}/`)

    await prisma.$disconnect()
}

main()
    .catch(e => { console.error('❌ Fatal:', e); process.exit(1) })
    .finally(() => prisma.$disconnect())
