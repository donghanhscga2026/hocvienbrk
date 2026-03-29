/**
 * Script import System data từ Google Sheet
 * Usage: npx tsx scripts/import-system-from-sheet.ts <sheetUrl> <systemId>
 * 
 * Ví dụ: npx tsx scripts/import-system-from-sheet.ts "https://docs.google.com/spreadsheets/d/xxx/export?format=csv" 1
 * 
 * Sheet format (CSV public):
 * UserID,OnSystem,RefSysID
 * 101,1,0
 * 102,1,101
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SheetRow {
    UserID: string
    OnSystem: string
    RefSysID: string
}

async function parseCSV(csvText: string): Promise<SheetRow[]> {
    const lines = csvText.trim().split('\n')
    const rows: SheetRow[] = []
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''))
        if (cols.length >= 3) {
            rows.push({
                UserID: cols[0],
                OnSystem: cols[1],
                RefSysID: cols[2]
            })
        }
    }
    
    return rows
}

async function importSystemFromSheet(sheetUrl: string, systemId: number) {
    console.log(`🚀 Bắt đầu import System #${systemId} từ sheet...`)
    
    // Fetch CSV
    console.log('📡 Đang tải sheet...')
    const response = await fetch(sheetUrl)
    if (!response.ok) {
        throw new Error(`Failed to fetch sheet: ${response.statusText}`)
    }
    const csvText = await response.text()
    
    // Parse CSV
    const rows = await parseCSV(csvText)
    console.log(`📊 Đã parse ${rows.length} dòng dữ liệu`)
    
    // Xóa closure cũ của system này
    console.log('🗑️ Xóa closure cũ...')
    await prisma.systemClosure.deleteMany({ where: { systemId } })
    
    // Map userId -> autoId sau khi insert
    const userIdToAutoId = new Map<number, number>()
    
    // Insert System records (upsert)
    console.log('💾 Đang insert System records...')
    for (const row of rows) {
        const userId = parseInt(row.UserID)
        const onSystem = parseInt(row.OnSystem)
        const refSysId = parseInt(row.RefSysID)
        
        if (isNaN(userId) || isNaN(onSystem)) {
            console.warn(`⚠️ Bỏ qua dòng không hợp lệ: ${JSON.stringify(row)}`)
            continue
        }
        
        const system = await prisma.system.upsert({
            where: { userId },
            update: { onSystem, refSysId },
            create: { userId, onSystem, refSysId }
        })
        
        userIdToAutoId.set(userId, system.autoId)
    }
    console.log(`✅ Đã insert ${userIdToAutoId.size} System records`)
    
    // Tạo closures
    console.log('🔗 Đang tạo closures...')
    let closureCount = 0
    
    for (const row of rows) {
        const userId = parseInt(row.UserID)
        const refSysId = parseInt(row.RefSysID)
        const autoId = userIdToAutoId.get(userId)
        
        if (!autoId) continue
        
        // Closure cho chính mình (depth = 0)
        await prisma.systemClosure.create({
            data: { ancestorId: autoId, descendantId: autoId, depth: 0, systemId }
        }).catch(() => {})
        closureCount++
        
        // Nếu có upline, copy closures từ upline
        if (refSysId > 0) {
            const uplineAutoId = userIdToAutoId.get(refSysId)
            if (uplineAutoId) {
                const uplineClosures = await prisma.systemClosure.findMany({
                    where: { ancestorId: uplineAutoId, systemId }
                })
                
                for (const closure of uplineClosures) {
                    await prisma.systemClosure.create({
                        data: {
                            ancestorId: closure.ancestorId,
                            descendantId: autoId,
                            depth: closure.depth + 1,
                            systemId
                        }
                    }).catch(() => {})
                    closureCount++
                }
            }
        }
    }
    
    console.log(`✅ Đã tạo ${closureCount} closures`)
    console.log('🎉 Import hoàn tất!')
    
    return { systemCount: userIdToAutoId.size, closureCount }
}

// Main
async function main() {
    const args = process.argv.slice(2)
    
    if (args.length < 2) {
        console.log(`
📖 Hướng dẫn sử dụng:
   
   npx tsx scripts/import-system-from-sheet.ts <sheetUrl> <systemId>
   
   Ví dụ:
   npx tsx scripts/import-system-from-sheet.ts "https://docs.google.com/spreadsheets/d/xxx/export?format=csv" 1
   
   systemId: 1 = TCA, 2 = KTC
   
   Sheet format (CSV public):
   UserID,OnSystem,RefSysID
   101,1,0
   102,1,101
        `)
        process.exit(1)
    }
    
    const sheetUrl = args[0]
    const systemId = parseInt(args[1])
    
    if (isNaN(systemId) || systemId < 1 || systemId > 2) {
        console.error('❌ systemId phải là 1 (TCA) hoặc 2 (KTC)')
        process.exit(1)
    }
    
    try {
        await importSystemFromSheet(sheetUrl, systemId)
    } catch (error) {
        console.error('❌ Lỗi:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
