
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
    const systemId = 1
    console.log(`📂 Bắt đầu backup system_closure cho systemId: ${systemId}...`)
    
    const closures = await prisma.systemClosure.findMany({
        where: { systemId }
    })

    const backupPath = path.join(process.cwd(), 'plan_temp', `backup_system_closure_${Date.now()}.json`)
    fs.writeFileSync(backupPath, JSON.stringify(closures, null, 2))
    
    console.log(`✅ Đã backup ${closures.length} records vào: ${backupPath}`)
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
