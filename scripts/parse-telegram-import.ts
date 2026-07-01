import { PrismaClient, Role } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ---------- types ----------
interface RawRecord {
    id: number
    name: string | null
    email: string | null
    phone: string | null
    referrerId: number | null
    dateUnix: number
    dateIso: string
}

// ---------- helpers ----------
function reconstructText(msg: any): string {
    if (typeof msg.text === 'string') return msg.text
    if (Array.isArray(msg.text)) {
        return msg.text.map((t: any) => (typeof t === 'string' ? t : t.text || '')).join('')
    }
    return ''
}

function sanitizePhone(phone: string | null): string | null {
    if (!phone) return null
    let p = phone.trim()
    // fix double country prefix: +1+12025550123 -> +12025550123
    if (p.startsWith('+1+1')) p = '+' + p.slice(3)
    return p
}

// ---------- closure helper (inline, không phụ thuộc @/ alias) ----------
async function addUserToClosureDirect(userId: number, referrerId: number | null): Promise<void> {
    const rows: { ancestorId: number; descendantId: number; depth: number }[] = []
    rows.push({ ancestorId: userId, descendantId: userId, depth: 0 })

    if (referrerId !== null) {
        const ancestorClosures = await prisma.userClosure.findMany({
            where: { descendantId: referrerId },
            select: { ancestorId: true, depth: true }
        })
        for (const closure of ancestorClosures) {
            rows.push({
                ancestorId: closure.ancestorId,
                descendantId: userId,
                depth: closure.depth + 1
            })
        }
    }

    if (rows.length > 0) {
        await prisma.userClosure.createMany({ data: rows, skipDuplicates: true })
    }
}

// ---------- main ----------
async function main() {
    const isDryRun = process.argv.includes('--dry-run')
    if (isDryRun) console.log('🔍 DRY RUN — sẽ không ghi vào DB\n')
    else console.log('🚀 IMPORT THẬT — sẽ ghi vào DB\n')

    // 1. Read JSON
    const filePath = path.join(__dirname, '..', 'backups', 'dky_hv_21_6_to_now.json')
    if (!fs.existsSync(filePath)) {
        console.error('❌ File not found:', filePath)
        process.exit(1)
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)
    console.log(`📄 Đọc ${data.messages.length} messages từ file\n`)

    // 2. Parse messages
    const parsed: RawRecord[] = []
    let skipNoId = 0

    for (const msg of data.messages) {
        const text = reconstructText(msg)

        if (!text.includes('HỌC VIÊN MỚI ĐĂNG KÝ')) continue

        const idM = text.match(/Mã số:\s*#(\d+)/)
        if (!idM) { skipNoId++; continue }

        const nameM = text.match(/Họ tên:\s*(.+?)(?:\n|$)/)
        const emailM = text.match(/Email:\s*(\S+)/)
        const phoneM = text.match(/SĐT:\s*(\S+)/)
        const refM = text.match(/Người giới thiệu:\s*#(\d+)/)

        parsed.push({
            id: parseInt(idM[1]),
            name: nameM ? nameM[1].trim() : null,
            email: emailM ? emailM[1].trim() : null,
            phone: sanitizePhone(phoneM ? phoneM[1].trim() : null),
            referrerId: refM ? parseInt(refM[1]) : null,
            dateUnix: parseInt(msg.date_unixtime || '0'),
            dateIso: msg.date || '',
        })
    }

    console.log(`📋 Parse được ${parsed.length} records (bỏ qua ${skipNoId} msg không có ID)\n`)

    // 3. Handle duplicate IDs — keep earliest by dateUnix
    const deduped = new Map<number, RawRecord>()
    for (const r of parsed) {
        const existing = deduped.get(r.id)
        if (!existing || r.dateUnix < existing.dateUnix) {
            deduped.set(r.id, r)
        }
    }

    const totalUnique = deduped.size
    const duplicates = parsed.length - totalUnique
    if (duplicates > 0) {
        console.log(`⚠️  Phát hiện ${duplicates} bản ghi trùng ID — giữ lại bản ghi sớm nhất\n`)
        // Show which IDs were duplicated
        const seen = new Map<number, number>()
        for (const r of parsed) {
            seen.set(r.id, (seen.get(r.id) || 0) + 1)
        }
        for (const [id, count] of seen) {
            if (count > 1) {
                const kept = deduped.get(id)!
                console.log(`   #${id} (${count} lần): giữ message lúc ${kept.dateIso}`)
            }
        }
        console.log('')
    }

    // 4. Validate + Preview
    let validCount = 0
    let invalidCount = 0
    const records = [...deduped.values()].sort((a, b) => a.id - b.id)

    console.log('=== PREVIEW ===')
    console.log(' ID  | Họ tên                       | Email                          | Phone               | Người giới thiệu')
    console.log('-----+------------------------------+--------------------------------+---------------------+-----------------')

    for (const r of records) {
        const issues: string[] = []
        if (!r.email) issues.push('thiếu email')
        if (r.phone && r.phone.length > 15) issues.push(`phone ${r.phone.length} ký tự`)
        if (r.phone && r.phone.startsWith('+1+1')) issues.push('phone sai prefix')

        const flag = issues.length > 0 ? ` ⚠️${issues.join(', ')}` : ''
        console.log(
            `${String(r.id).padStart(4)} | ${(r.name || '-').padEnd(28)} | ${(r.email || '-').padEnd(30)} | ${(r.phone || '-').padEnd(19)} | ${r.referrerId ? '#' + r.referrerId : '-'}${flag}`
        )
        if (issues.length > 0) invalidCount++
        else validCount++
    }

    console.log(`\n📊 Tổng: ${records.length} records (${validCount} hợp lệ, ${invalidCount} có cảnh báo)`)
    console.log('')

    // 5. Check referrers exist in DB
    const refIds = [...new Set(records.map(r => r.referrerId).filter(Boolean) as number[])]
    console.log('🔍 Kiểm tra người giới thiệu...')
    let refMissing = 0
    for (const refId of refIds) {
        const exists = await prisma.user.findUnique({ where: { id: refId }, select: { id: true } })
        if (!exists) {
            console.log(`   ⚠️  Người giới thiệu #${refId} KHÔNG tồn tại trong DB`)
            refMissing++
        }
    }
    if (refMissing === 0) console.log('   ✅ Tất cả người giới thiệu đều tồn tại trong DB')
    console.log('')

    if (isDryRun) {
        console.log('🔍 DRY RUN hoàn tất — không có gì được ghi vào DB')
        console.log('👉 Chạy: npx tsx scripts/parse-telegram-import.ts  (không --dry-run) để import thật')
        await prisma.$disconnect()
        return
    }

    // 6. Import
    console.log('🚀 Bắt đầu import...\n')

    // Bypass FK constraints for safety
    await prisma.$executeRawUnsafe("SET session_replication_role = replica")

    const DEFAULT_PASSWORD = 'Brk#3773'
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

    let success = 0
    let errors = 0
    let skipped = 0

    for (const r of records) {
        try {
            const userData: any = {
                id: r.id,
                name: r.name,
                email: r.email,
                phone: r.phone,
                password: hashedPassword,
                passwordChanged: false,
                role: Role.STUDENT,
                referrerId: r.referrerId || null,
                createdAt: r.dateIso ? new Date(r.dateIso) : new Date(),
                updatedAt: new Date(),
            }

            await prisma.user.upsert({
                where: { id: r.id },
                update: userData,
                create: userData,
            })

            // Add closure rows for genealogy tree
            await addUserToClosureDirect(r.id, r.referrerId || null)

            success++
            if (success % 10 === 0) console.log(`   ${success} users imported...`)
        } catch (e: any) {
            console.error(`   ❌ User #${r.id} (${r.name}): ${e.message.substring(0, 150)}`)
            errors++
        }
    }

    // Re-enable FK constraints
    await prisma.$executeRawUnsafe("SET session_replication_role = DEFAULT")

    // 7. Report
    const total = await prisma.user.count()
    console.log(`\n✅ Done: ${success} imported, ${errors} errors, ${skipped} skipped`)
    console.log(`📊 Tổng users trong DB: ${total}`)

    const students = await prisma.user.count({ where: { role: Role.STUDENT } })
    console.log(`   👨‍🎓 Students: ${students}`)

    await prisma.$disconnect()
}

main()
    .catch(e => { console.error('❌ Fatal:', e); process.exit(1) })
    .finally(() => prisma.$disconnect())
