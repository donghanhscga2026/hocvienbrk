import { PrismaClient } from '@prisma/client'
import { changeUserId } from '../lib/user-id-change'

// Mặc định chỉ kiểm tra. Thực thi cần --execute cùng token từ bản kiểm tra đã duyệt.
const prisma = new PrismaClient()
async function main() {
    const [currentId, newId, ...flags] = process.argv.slice(2)
    const actor = flags.find(flag => flag.startsWith('--admin-id='))?.slice(11)
    if (!currentId || !newId || !actor || !/^\d+$/.test(actor) ||
        flags.some(flag => flag !== '--execute' && !flag.startsWith('--admin-id=') && !flag.startsWith('--token='))) {
        throw new Error('Usage: npm run change-id -- <current_id> <new_id> --admin-id=<id> [--execute --token=<preview_token>]')
    }
    const result = await changeUserId(prisma, Number(actor), {
        currentId, newId, execute: flags.includes('--execute'),
        token: flags.find(flag => flag.startsWith('--token='))?.slice(8),
    })
    console.log(JSON.stringify(result, null, 2))
    if (result.plan?.blockers.length) process.exitCode = 1
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
