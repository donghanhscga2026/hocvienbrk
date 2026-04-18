'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
import fs from 'fs'
import path from 'path'

interface TCANode {
  id: number
  type: 'folder' | 'item'
  level: string
  name: string
  location: string
  rawHtml: string
  parentFolderId?: number
}

interface TCATreeData {
  timestamp: number
  stats: {
    total: number
    folders: number
    items: number
  }
  tree: any[]
  allNodes: TCANode[]
}

async function importTCAData(jsonFilePath: string) {
  console.log('==========================================')
  console.log('TCA DATA IMPORT SCRIPT')
  console.log('==========================================\n')

  // Read JSON file
  const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8')
  const data: TCATreeData = JSON.parse(jsonContent)

  console.log(`📊 Scan Stats:`)
  console.log(`   Total: ${data.stats.total}`)
  console.log(`   Folders: ${data.stats.folders}`)
  console.log(`   Items: ${data.stats.items}`)
  console.log(`   Timestamp: ${new Date(data.timestamp).toISOString()}\n`)

  // Build parent-child map from the tree structure
  console.log('🔍 Building parent-child relationships...')
  
  const nodeMap = new Map<number, TCANode>()
  const parentChildMap = new Map<number, number[]>()
  
  // First pass: build node map
  for (const node of data.allNodes) {
    nodeMap.set(node.id, node)
  }
  
  // Second pass: build parent-child relationships
  // Based on the order in the tree, nodes that come after a folder are children of that folder
  let currentParent: number | null = null
  for (const folder of data.tree) {
    if (folder.id === 'root') {
      // Root level nodes have no parent
      continue
    }
    
    const parentId = parseInt(folder.id)
    currentParent = parentId
    
    // Nodes in this folder's response
    for (const node of folder.nodes || []) {
      if (node.id !== parentId) {
        // This is a child
        const children = parentChildMap.get(parentId) || []
        children.push(node.id)
        parentChildMap.set(parentId, children)
      }
    }
  }

  console.log(`📋 Parent-child relationships: ${parentChildMap.size} folders with children\n`)

  // Create a map from TCA ID to System autoId
  const tcaIdToSystemId = new Map<number, number>()

  console.log('📦 Starting import...\n')

  let imported = 0
  let skipped = 0
  let usersCreated = 0

  // Process each node
  for (const node of data.allNodes) {
    // Check if already exists
    const existing = await prisma.system.findFirst({
      where: { userId: node.id, onSystem: 1 }
    })

    if (existing) {
      console.log(`   ⏭️  Skip existing: TCA ID ${node.id} (${node.name.substring(0, 30)}...)`)
      tcaIdToSystemId.set(node.id, existing.autoId)
      skipped++
      continue
    }

    // Check if User exists, if not create placeholder
    let user = await prisma.user.findUnique({
      where: { id: node.id }
    })

    if (!user) {
      // Extract name from TCA data (e.g., "THÁI SƠN - NGUYỄN BIÊN CƯƠNG - 17.483 / 17.483 - Cấp 1")
      const nameParts = node.name.split(' - ')
      const fullName = nameParts[1] || nameParts[0] || `TCA User ${node.id}`
      
      user = await prisma.user.create({
        data: {
          id: node.id,
          name: fullName,
          email: `tca_${node.id}@placeholder.local`,
          phone: null,
        }
      })
      usersCreated++
      console.log(`   👤 Created placeholder user: ${fullName}`)
    }

    // Determine parent: lấy parentSystem qua parentFolderId, rồi lấy userId của parent
    let parentUserId = 0
    if (node.parentFolderId) {
      const parentAutoId = tcaIdToSystemId.get(node.parentFolderId)
      if (parentAutoId) {
        const parentSystem = await prisma.system.findUnique({ where: { autoId: parentAutoId } })
        parentUserId = parentSystem?.userId || 0
      }
    }

    // Create System record với refSysId = parent userId (ĐÚNG theo schema)
    const systemRecord = await prisma.system.create({
      data: {
        userId: node.id,
        onSystem: 1, // TCA
        refSysId: parentUserId
      }
    })

    tcaIdToSystemId.set(node.id, systemRecord.autoId)

    // Create closure entry for self
    await prisma.systemClosure.create({
      data: {
        ancestorId: systemRecord.autoId,
        descendantId: systemRecord.autoId,
        depth: 0,
        systemId: 1
      }
    })

    // If has parent, create closure entries for all ancestors
    if (parentUserId > 0) {
      const parentAutoId = tcaIdToSystemId.get(node.parentFolderId ?? 0)
      if (parentAutoId != null) {
        const ancestors = await prisma.systemClosure.findMany({
          where: { descendantId: parentAutoId, systemId: 1 }
        })

        for (const ancestor of ancestors) {
          await prisma.systemClosure.create({
            data: {
              ancestorId: ancestor.ancestorId,
              descendantId: systemRecord.autoId,
              depth: ancestor.depth + 1,
              systemId: 1
            }
          })
        }
      }
    }

    console.log(`   ✅ Imported: TCA ID ${node.id} (${node.name.substring(0, 30)}...) - Parent: ${parentUserId || 'ROOT'}`)
    imported++
  }

  console.log('\n==========================================')
  console.log('IMPORT COMPLETE!')
  console.log('==========================================')
  console.log(`   Users created: ${usersCreated}`)
  console.log(`   System records imported: ${imported}`)
  console.log(`   Skipped (existing): ${skipped}`)
  console.log(`   Total processed: ${data.allNodes.length}\n`)

  // Verify
  const totalSystems = await prisma.system.count({
    where: { onSystem: 1 }
  })
  const totalClosures = await prisma.systemClosure.count({
    where: { systemId: 1 }
  })

  console.log('📊 Database verification:')
  console.log(`   System records (TCA): ${totalSystems}`)
  console.log(`   Closure records: ${totalClosures}`)
  console.log('==========================================\n')

  return { imported, skipped, totalSystems, totalClosures }
}

// Run
const jsonPath = path.join(process.cwd(), 'chrome-extension-tca', 'tca_tree_1776342471021.json')
importTCAData(jsonPath)
  .then(result => {
    console.log('Script completed successfully!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Error:', error)
    process.exit(1)
  })
