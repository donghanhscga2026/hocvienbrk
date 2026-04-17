/**
 * Debug: Trace dữ liệu từ Chrome Extension
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function debug() {
  console.log('=== Debug Chrome Extension Data ===\n')
  
  // Load dữ liệu từ file JSON của Chrome Extension
  const fs = await import('fs')
  const path = await import('path')
  
  // Tìm file JSON gần nhất
  const files = fs.readdirSync('.')
    .filter(f => f.startsWith('tca_tree_') && f.endsWith('.json'))
    .sort()
    .reverse()
  
  if (files.length === 0) {
    console.log('Không tìm thấy file tca_tree_*.json')
    return
  }
  
  const latestFile = files[0]
  console.log('File mới nhất:', latestFile)
  
  const data = JSON.parse(fs.readFileSync(latestFile, 'utf-8'))
  
  console.log('\nTree structure:')
  data.tree.forEach((folder: any) => {
    console.log(`\nFolder: ${folder.id}`)
    folder.nodes?.forEach((node: any) => {
      console.log(`  Node ${node.id}: ${node.name}, parentFolderId=${node.parentFolderId}`)
    })
  })
  
  // Tìm các nodes với parentFolderId = 60073
  console.log('\n\n=== Nodes có parentFolderId = 60073 ===')
  const nodes60073: any[] = []
  
  data.tree.forEach((folder: any) => {
    folder.nodes?.forEach((node: any) => {
      if (node.parentFolderId === 60073 || node.parentFolderId === '60073') {
        nodes60073.push(node)
        console.log(`  TCA ${node.id}: ${node.name}`)
      }
    })
  })
  
  // Kiểm tra xem TCA 60073 có trong dữ liệu không
  console.log('\n\n=== Kiểm tra TCA 60073 ===')
  let found60073 = false
  data.tree.forEach((folder: any) => {
    if (folder.id === 60073 || folder.id === '60073') {
      found60073 = true
      console.log('TCA 60073 là FOLDER:', folder.nodes?.map((n: any) => `${n.id} - ${n.name}`))
    }
    folder.nodes?.forEach((node: any) => {
      if (node.id === 60073 || node.id === '60073') {
        found60073 = true
        console.log('TCA 60073 là ITEM:', node)
      }
    })
  })
  
  if (!found60073) {
    console.log('TCA 60073 KHÔNG có trong dữ liệu (có thể đã bị scan trước đó)')
  }
  
  await prisma.$disconnect()
}

debug().catch(console.error)
