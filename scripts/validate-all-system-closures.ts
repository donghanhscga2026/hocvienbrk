import { PrismaClient } from '@prisma/client'
import { validateSystemClosures } from '../lib/system-closure-helpers'

const prisma = new PrismaClient()

interface SystemResult {
    onSystem: number
    nameSystem: string
    memberCount: number
    issues: { userId: number; autoId: number; issue: string }[]
}

async function validateAll() {
    const args = process.argv.slice(2)
    const systemFlag = args.find(a => a.startsWith('--system='))
    const onlySystem = systemFlag ? parseInt(systemFlag.split('=')[1]) : null

    console.log('=== VALIDATE ALL SYSTEM CLOSURES ===\n')

    const trees = await prisma.systemTree.findMany({
        orderBy: { onSystem: 'asc' },
        ...(onlySystem ? { where: { onSystem: onlySystem } } : {})
    })

    if (trees.length === 0) {
        console.log(onlySystem ? `System #${onlySystem} not found.` : 'No active systems found.')
        await prisma.$disconnect()
        return
    }

    console.log(`Found ${trees.length} system(s): ${trees.map(t => `#${t.onSystem}`).join(', ')}\n`)

    const results: SystemResult[] = []

    for (const tree of trees) {
        const memberCount = await prisma.system.count({ where: { onSystem: tree.onSystem } })
        const issues = await validateSystemClosures(tree.onSystem)

        results.push({
            onSystem: tree.onSystem,
            nameSystem: tree.nameSystem,
            memberCount,
            issues
        })
    }

    // Print results
    for (const r of results) {
        console.log(`── System #${r.onSystem} (${r.nameSystem}) ──`)
        console.log(`  Members: ${r.memberCount}`)

        if (r.issues.length === 0) {
            console.log(`  Issues: 0 ✅\n`)
        } else {
            console.log(`  Issues: ${r.issues.length}`)
            for (const issue of r.issues) {
                console.log(`    #${issue.userId} (autoId=${issue.autoId}): ${issue.issue}`)
            }
            console.log()
        }
    }

    // Summary
    const totalMembers = results.reduce((sum, r) => sum + r.memberCount, 0)
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0)
    const affectedSystems = results.filter(r => r.issues.length > 0)

    console.log('══ SUMMARY ══')
    console.log(`Total members: ${totalMembers}`)
    console.log(`Total issues: ${totalIssues}`)

    if (affectedSystems.length === 0) {
        console.log('Affected systems: None ✅')
    } else {
        console.log(`Affected systems: ${affectedSystems.length} (${affectedSystems.map(r => `#${r.onSystem}`).join(', ')})`)
    }

    await prisma.$disconnect()
}

validateAll()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1) })
