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
    
    // Xóa dữ liệu cũ (dùng raw query để bypass FK)
    console.log('🗑️ Xóa dữ liệu cũ...')
    await prisma.$executeRaw`DELETE FROM system_closure WHERE "systemId" = ${systemId}`
    await prisma.$executeRaw`DELETE FROM system WHERE "onSystem" = ${systemId}`
    
    // Sort rows by userId to ensure parent is inserted before child
    rows.sort((a, b) => parseInt(a.UserID) - parseInt(b.UserID))
    
    // Insert System records với refSysId = 0 trước
    console.log('💾 Đang insert System records...')
    const userIdToAutoId = new Map<number, number>()
    const userIdToRefSysId = new Map<number, number>()
    
    for (const row of rows) {
        const userId = parseInt(row.UserID)
        const onSystem = parseInt(row.OnSystem)
        const refSysId = parseInt(row.RefSysID)
        
        if (isNaN(userId) || isNaN(onSystem)) {
            console.warn(`⚠️ Bỏ qua dòng không hợp lệ: ${JSON.stringify(row)}`)
            continue
        }
        
        userIdToRefSysId.set(userId, refSysId)
        
        const system = await prisma.system.create({
            data: { userId, onSystem, refSysId: 0 }
        })
        
        userIdToAutoId.set(userId, system.autoId)
    }
    console.log(`✅ Đã insert ${userIdToAutoId.size} System records`)
    
    // Update refSysId sau khi tất cả đã được insert (dùng raw query để bypass FK)
    // refSysId trong DB tham chiếu đến userId của upline
    console.log('💾 Đang update refSysId...')
    let updateSuccess = false
    try {
        for (const [userId, refSysId] of userIdToRefSysId) {
            if (refSysId > 0) {
                const autoId = userIdToAutoId.get(userId)
                await prisma.$executeRaw`UPDATE "system" SET "refSysId" = ${refSysId} WHERE "autoId" = ${autoId}`
            }
        }
        console.log('✅ Đã update refSysId')
        updateSuccess = true
    } catch (e) {
        console.log('❌ Update refSysId thất bại!')
    }
    
    if (!updateSuccess) {
        console.log('❌ Dừng lại do update thất bại. Không tạo closures.')
        return { systemCount: 0, closureCount: 0 }
    }
    
    console.log('🎉 Import hoàn tất! Vui lòng chạy scripts/generate-system-closures.ts để tạo closures.')
    
    return { systemCount: userIdToAutoId.size, closureCount: 0 }
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
