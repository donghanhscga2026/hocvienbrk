/**
 * Script generate matrix data cho System
 * Usage: npx tsx scripts/generate-matrix-data.ts [levels] [branchingFactor] [systemId]
 * 
 * Ví dụ: npx tsx scripts/generate-matrix-data.ts 5 4 1
 *   - levels: 5 (độ sâu tối đa)
 *   - branchingFactor: 4 (hệ số nhánh)
 *   - systemId: 1 (TCA)
 * 
 * Chỉ thêm users đã tồn tại trong database
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface MatrixRow {
  userId: number
  onSystem: number
  refSysId: number
}

function generateMatrixData(levels: number, branchingFactor: number = 4): MatrixRow[] {
  const data: MatrixRow[] = []
  
  // Tính tổng số lượng thành viên đến cấp n
  const totalMembers = Math.floor((Math.pow(branchingFactor, levels + 1) - 1) / (branchingFactor - 1))
  
  for (let userId = 0; userId < totalMembers; userId++) {
    const onSystem = 1
    
    let refSysId: number
    if (userId === 0) {
      refSysId = 0
    } else {
      refSysId = Math.floor((userId - 1) / branchingFactor)
    }
    
    data.push({ userId, onSystem, refSysId })
  }
  
  return data
}

async function exportToCSV(data: MatrixRow[], filename: string) {
  const header = 'userId,onSystem,refSysId\n'
  const rows = data.map(r => `${r.userId},${r.onSystem},${r.refSysId}`).join('\n')
  const csv = header + rows
  
  const filepath = path.join(process.cwd(), filename)
  fs.writeFileSync(filepath, csv)
  console.log(`📁 Exported to: ${filepath}`)
  return filepath
}

async function importExistingUsers(data: MatrixRow[], systemId: number) {
  console.log(`\n🗑️ Xóa dữ liệu cũ của System #${systemId}...`)
  
  await prisma.systemClosure.deleteMany({ where: { systemId } })
  await prisma.system.deleteMany({ where: { onSystem: systemId } })
  
  // Lấy danh sách userId hiện có trong database
  console.log(`📋 Lấy danh sách users trong database...`)
  const existingUsers = await prisma.user.findMany({
    select: { id: true }
  })
  const existingUserIds = new Set(existingUsers.map(u => u.id))
  console.log(`   Tìm thấy ${existingUserIds.size} users`)
  
  // Lọc chỉ lấy những user đã tồn tại
  const validData = data.filter(row => existingUserIds.has(row.userId))
  
  // Kiểm tra refSysId - nếu refSysId không tồn tại trong validData, cần thay đổi
  const validUserIds = new Set(validData.map(r => r.userId))
  
  // Với những refSysId không tồn tại, gán = 0 (gốc)
  const finalData = validData.map(row => ({
    ...row,
    refSysId: validUserIds.has(row.refSysId) ? row.refSysId : 0
  }))
  
  console.log(`   Có ${finalData.length} users hợp lệ để import`)
  
  if (finalData.length === 0) {
    console.log(`❌ Không có user nào để import!`)
    return { systemCount: 0, closureCount: 0 }
  }
  
  // Import System records
  console.log(`💾 Importing ${finalData.length} System records...`)
  const userIdToAutoId = new Map<number, number>()
  
  for (const row of finalData) {
    const system = await prisma.system.create({
      data: {
        userId: row.userId,
        onSystem: row.onSystem,
        refSysId: row.refSysId
      }
    })
    userIdToAutoId.set(row.userId, system.autoId)
  }
  
  console.log(`🔗 Generating closures...`)
  
  // Generate closures
  let closureCount = 0
  for (const row of finalData) {
    const autoId = userIdToAutoId.get(row.userId)!
    const refSysId = row.refSysId
    
    // Closure cho chính mình (depth = 0)
    await prisma.systemClosure.upsert({
      where: { ancestorId_descendantId_systemId: { ancestorId: autoId, descendantId: autoId, systemId } },
      update: {},
      create: { ancestorId: autoId, descendantId: autoId, depth: 0, systemId }
    })
    closureCount++
    
    // Nếu có upline, copy closures từ upline
    if (refSysId > 0) {
      const uplineAutoId = userIdToAutoId.get(refSysId)
      if (uplineAutoId) {
        const uplineClosures = await prisma.systemClosure.findMany({
          where: { ancestorId: uplineAutoId, systemId }
        })
        
        for (const closure of uplineClosures) {
          await prisma.systemClosure.upsert({
            where: { 
              ancestorId_descendantId_systemId: { 
                ancestorId: closure.ancestorId, 
                descendantId: autoId, 
                systemId 
              } 
            },
            update: {},
            create: {
              ancestorId: closure.ancestorId,
              descendantId: autoId,
              depth: closure.depth + 1,
              systemId
            }
          })
          closureCount++
        }
      }
    }
  }
  
  console.log(`✅ Hoàn tất!`)
  console.log(`   - System records: ${finalData.length}`)
  console.log(`   - Closures: ${closureCount}`)
  
  return { systemCount: finalData.length, closureCount }
}

async function main() {
  const args = process.argv.slice(2)
  
  const levels = args[0] ? parseInt(args[0]) : 5
  const branchingFactor = args[1] ? parseInt(args[1]) : 4
  const systemId = args[2] ? parseInt(args[2]) : 1
  
  console.log(`
╔══════════════════════════════════════════╗
║   Generate Matrix Data for System      ║
╠══════════════════════════════════════════╣
║  Levels:         ${levels.toString().padEnd(24)}║
║  Branching Factor: ${branchingFactor.toString().padEnd(22)}║
║  System ID:       ${systemId.toString().padEnd(24)}║
╚══════════════════════════════════════════╝
  `)
  
  // Generate data
  const data = generateMatrixData(levels, branchingFactor)
  
  console.log(`\n📊 Generated ${data.length} records (tổng lý thuyết)`)
  console.log(`\n📋 First 10 records:`)
  console.table(data.slice(0, 10))
  console.log(`\n📋 Last 10 records:`)
  console.table(data.slice(-10))
  
  // Export to CSV (chỉ khi không có flag --import)
  if (!process.argv.includes('--import')) {
    const filename = `matrix_data_level_${levels}_bf${branchingFactor}_system${systemId}.csv`
    await exportToCSV(data, filename)
  }
  
  // Import to database (chỉ users đã tồn tại)
  const args2 = process.argv.slice(3)
  if (args2.includes('--import')) {
    try {
      await importExistingUsers(data, systemId)
    } catch (error) {
      console.error('❌ Lỗi:', error)
    }
  } else {
    console.log(`\n💡 Để import vào database, chạy với flag --import:`)
    console.log(`   npx tsx scripts/generate-matrix-data.ts ${levels} ${branchingFactor} ${systemId} --import`)
  }
  
  await prisma.$disconnect()
}

main()
