import { PrismaClient } from '@prisma/client'
import { addUserToSystemClosure } from '../lib/system-closure-helpers'

const prisma = new PrismaClient()

interface Mismatch {
    autoId: number
    userId: number
    userName: string | null
    refSysId: number
    depth1Ancestors: { ancestorId: number; userId: number; name: string | null }[]
    issue: string
}

async function findAndFixMismatches(systemId: number = 1, dryRun: boolean = true) {
    console.log(`\n=== SYSTEM CLOSURE CLEANUP (systemId=${systemId}, dryRun=${dryRun}) ===\n`)

    const systems = await prisma.system.findMany({
        where: { onSystem: systemId },
        orderBy: { autoId: 'asc' }
    })
    console.log(`Total System records: ${systems.length}\n`)

    const mismatches: Mismatch[] = []

    for (const sys of systems) {
        const depth1Ancestors = await prisma.systemClosure.findMany({
            where: { descendantId: sys.autoId, depth: 1, systemId },
            include: {
                ancestor: {
                    include: { user: { select: { id: true, name: true } } }
                }
            }
        })

        const user = await prisma.user.findUnique({
            where: { id: sys.userId },
            select: { name: true }
        })

        const ancestorInfo = depth1Ancestors.map(a => ({
            ancestorId: a.ancestorId,
            userId: a.ancestor.userId,
            name: a.ancestor.user?.name ?? null
        }))

        let issue: string | null = null

        if (sys.refSysId === 0) {
            if (depth1Ancestors.length > 0) {
                issue = `Root user (refSysId=0) but has ${depth1Ancestors.length} depth=1 ancestor(s) — should have none`
            }
        } else {
            const hasCorrectAncestor = depth1Ancestors.some(a => a.ancestor.userId === sys.refSysId)

            if (depth1Ancestors.length === 0) {
                issue = `Has refSysId=${sys.refSysId} but no depth=1 ancestor`
            } else if (depth1Ancestors.length > 1) {
                issue = `Has ${depth1Ancestors.length} depth=1 ancestors (expected 1 for refSysId=${sys.refSysId})`
            } else if (!hasCorrectAncestor) {
                issue = `Depth=1 ancestor userId=${ancestorInfo[0].userId} does not match refSysId=${sys.refSysId}`
            }
        }

        if (issue) {
            mismatches.push({
                autoId: sys.autoId,
                userId: sys.userId,
                userName: user?.name ?? null,
                refSysId: sys.refSysId,
                depth1Ancestors: ancestorInfo,
                issue
            })
        }
    }

    if (mismatches.length === 0) {
        console.log('✅ No mismatches found — all SystemClosure data is consistent.')
        await prisma.$disconnect()
        return
    }

    console.log(`\n⚠️  Found ${mismatches.length} system(s) with closure mismatches:\n`)
    for (const m of mismatches) {
        console.log(`  User #${m.userId} (${m.userName ?? '?'}) — System autoId=${m.autoId}, refSysId=${m.refSysId}`)
        console.log(`    Current depth=1 ancestors: ${JSON.stringify(m.depth1Ancestors)}`)
        console.log(`    Issue: ${m.issue}\n`)
    }

    if (dryRun) {
        console.log('🔍 Dry-run mode — no changes made.')
        console.log('   Run with dryRun=false to fix.\n')
        await prisma.$disconnect()
        return
    }

    console.log('🔧 Fixing mismatches...\n')
    let fixed = 0
    let failed = 0

    for (const m of mismatches) {
        try {
            await addUserToSystemClosure(m.userId, m.refSysId, systemId)
            console.log(`  ✅ Fixed user #${m.userId} (${m.userName}) — refSysId=${m.refSysId}`)
            fixed++
        } catch (err) {
            console.error(`  ❌ Failed user #${m.userId}:`, err)
            failed++
        }
    }

    console.log(`\nDone: ${fixed} fixed, ${failed} failed.`)
}

async function main() {
    const args = process.argv.slice(2)
    const isDryRun = !args.includes('--apply')
    const systemId = 1

    await findAndFixMismatches(systemId, isDryRun)
    await prisma.$disconnect()
}

main().catch(err => {
    console.error('Script error:', err)
    prisma.$disconnect()
})
