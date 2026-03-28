/**
 * Script Migration: Populate UserClosure Table (Optimized)
 * ========================================================
 * Purpose: Tao closure rows cho tat ca user hien co trong database
 * 
 * Optimized: Load ALL users vao memory, xu ly trong memory
 * thay vi query tung user -> Giam tu 856 queries xuong 1 query
 * 
 * Run: npx tsx scripts/migrate-closure-table.ts
 */

import prisma from '../lib/prisma'

async function migrateClosureTable() {
    console.log('='.repeat(60))
    console.log('MIGRATION: Populate UserClosure Table (Optimized)')
    console.log('='.repeat(60))
    console.log()
    
    const startTime = Date.now()
    
    try {
        // Buoc 1: Xoa toan bo closure hien co (reset)
        console.log('[1/5] Reset existing closure data...')
        const deleted = await prisma.userClosure.deleteMany({})
        console.log(`    Da xoa ${deleted.count} rows cu`)
        
        // Buoc 2: Load ALL users vao memory (chi 1 query)
        console.log('[2/5] Loading ALL users into memory...')
        const users = await prisma.user.findMany({
            select: { id: true, referrerId: true }
        })
        console.log(`    Da load ${users.length} users`)
        
        // Buoc 3: Build map de trace nhanh
        console.log('[3/5] Building referrer map...')
        const referrerMap = new Map<number, number>()
        for (const user of users) {
            if (user.referrerId !== null && user.referrerId !== 0) {
                referrerMap.set(user.id, user.referrerId)
            }
        }
        console.log(`    Co ${referrerMap.size} users co referrerId valid`)
        
        // Buoc 4: Build closure rows trong memory
        console.log('[4/5] Building closure rows in memory...')
        const closureRows: { ancestorId: number; descendantId: number; depth: number }[] = []
        
        for (let i = 0; i < users.length; i++) {
            const user = users[i]
            let currentId: number | null = user.id
            let depth = 0
            
            while (currentId !== null) {
                closureRows.push({
                    ancestorId: currentId,
                    descendantId: user.id,
                    depth: depth
                })
                
                // Tim referrer tiep theo trong memory
                if (currentId === user.id) {
                    // Lan dau tien: tim referrer cua user hien tai
                    currentId = referrerMap.get(user.id) || null
                } else {
                    // Cac lan sau: tiep tuc trace len
                    currentId = referrerMap.get(currentId) || null
                }
                
                depth++
            }
            
            if ((i + 1) % 200 === 0) {
                console.log(`    Da xu ly ${i + 1}/${users.length} users...`)
            }
        }
        
        console.log(`    Tong so closure rows: ${closureRows.length}`)
        
        // Buoc 5: Insert vao database (batch)
        console.log('[5/5] Inserting closure rows into database...')
        
        const BATCH_SIZE = 1000
        let inserted = 0
        
        for (let i = 0; i < closureRows.length; i += BATCH_SIZE) {
            const batch = closureRows.slice(i, i + BATCH_SIZE)
            await prisma.userClosure.createMany({
                data: batch
            })
            inserted += batch.length
            const percent = Math.round((inserted / closureRows.length) * 100)
            console.log(`    Inserted ${inserted}/${closureRows.length} rows (${percent}%)`)
        }
        
        const duration = Date.now() - startTime
        
        console.log()
        console.log('='.repeat(60))
        console.log('MIGRATION COMPLETED!')
        console.log('='.repeat(60))
        console.log(`  - Users processed: ${users.length}`)
        console.log(`  - Closure rows created: ${closureRows.length}`)
        console.log(`  - Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`)
        console.log()
        
        // Thong ke
        console.log('STATISTICS BY DEPTH:')
        const stats = await prisma.$queryRaw<{ depth: number; count: bigint }[]>`
            SELECT depth, COUNT(*) as count 
            FROM user_closure 
            GROUP BY depth 
            ORDER BY depth
        `
        
        for (const stat of stats) {
            console.log(`  - Depth ${stat.depth}: ${stat.count} rows`)
        }
        
        // Verify: kiem tra user 150 va 129
        console.log()
        console.log('VERIFICATION:')
        
        const verify150 = await prisma.$queryRaw<{ depth: number; count: bigint }[]>`
            SELECT depth, COUNT(*) as count 
            FROM user_closure 
            WHERE ancestor_id = 150 
            GROUP BY depth 
            ORDER BY depth
        `
        console.log(`  User #150 (Tran Duc Duy) - co ${verify150.reduce((a, b) => a + Number(b.count), 0)} descendants:`)
        for (const v of verify150) {
            console.log(`    - Depth ${v.depth}: ${v.count} users`)
        }
        
        const verify129 = await prisma.$queryRaw<{ depth: number; count: bigint }[]>`
            SELECT depth, COUNT(*) as count 
            FROM user_closure 
            WHERE ancestor_id = 129 
            GROUP BY depth 
            ORDER BY depth
        `
        console.log(`  User #129 (Nguyen Thi Diem Tuyen) - co ${verify129.reduce((a, b) => a + Number(b.count), 0)} descendants:`)
        for (const v of verify129) {
            console.log(`    - Depth ${v.depth}: ${v.count} users`)
        }
        
    } catch (error) {
        console.error('Migration failed:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Run migration
migrateClosureTable()
    .then(() => {
        console.log('\nSuccess! Closure table is ready.')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\nMigration error:', error)
        process.exit(1)
    })
